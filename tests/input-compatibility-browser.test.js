import { spawn } from 'node:child_process';
import { constants, accessSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, extname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function findChromeExecutable() {
  const executableNames = process.platform === 'win32'
    ? ['chrome.exe', 'google-chrome.exe', 'chromium.exe']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  const candidates = [
    process.env.CHROME_BIN,
    ...String(process.env.PATH || '').split(delimiter).flatMap((directory) => executableNames.map((name) => join(directory, name))),
    ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  throw new Error('Chrome prerequisite missing: install Google Chrome or Chromium, or set CHROME_BIN to its executable.');
}

function waitFor(check, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolveWait, reject) => {
    const poll = async () => {
      try {
        const value = await check();
        if (value) return resolveWait(value);
      } catch {}
      if (Date.now() - started >= timeoutMs) return reject(new Error('Timed out waiting for browser'));
      setTimeout(poll, 50);
    };
    poll();
  });
}

function connectCdp(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolveCommand, rejectCommand } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectCommand(new Error(message.error.message));
    else resolveCommand(message.result);
  });
  const ready = new Promise((resolveReady, rejectReady) => {
    socket.addEventListener('open', resolveReady, { once: true });
    socket.addEventListener('error', rejectReady, { once: true });
  });
  return {
    async evaluate(expression) {
      await ready;
      const id = ++nextId;
      const result = await new Promise((resolveCommand, rejectCommand) => {
        pending.set(id, { resolveCommand, rejectCommand });
        socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    close() { socket.close(); },
  };
}

test('Chords prevents Sing/Play and Piano in the real app shell before practice starts', { timeout: 60000 }, async (t) => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filePath = join(ROOT, pathname === '/' ? 'index.html' : pathname);
    try {
      const file = await import('node:fs/promises').then(({ readFile }) => readFile(filePath));
      response.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
      response.end(file);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => server.close());

  const debugPort = 43000 + Math.floor(Math.random() * 1000);
  const profile = mkdtempSync(join(tmpdir(), 'clefhanger-chrome-'));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn(findChromeExecutable(), [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, `${origin}/`,
  ], { stdio: 'ignore' });
  t.after(() => {
    chrome.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const page = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
    const pages = await response.json();
    return pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith(origin));
  });
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  t.after(() => cdp.close());
  await waitFor(() => cdp.evaluate("Boolean(window.__clefHanger && document.querySelector('[data-mode=chords]'))"));

  const result = await cdp.evaluate(`(async () => {
    window.__clefHanger.selectInputMode('microphone');
    document.querySelector('[data-mode="chords"]').click();
    document.querySelector('#start-round').click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      stateMode: window.__clefHanger.getState().modeId,
      activeInputMode: document.querySelector('#input-mode-buttons [data-active="true"]').dataset.inputMode,
      microphoneDisabled: document.querySelector('[data-input-mode="microphone"]').disabled,
      pianoDisabled: document.querySelector('[data-input-mode="piano"]').disabled,
      noteButtonsHidden: document.querySelector('#note-buttons').hidden,
      pianoHidden: document.querySelector('#piano-strip').hidden,
      microphonePanelHidden: document.querySelector('#microphone-panel').hidden,
      coach: document.querySelector('#learning-coach').textContent,
      live: document.querySelector('#game-announcer').textContent,
      firstAnswer: document.querySelector('#note-buttons button')?.textContent,
      phase: window.__clefHanger.getState().phase,
    };
  })()`);

  assert.equal(result.stateMode, 'chords');
  assert.equal(result.phase, 'practice');
  assert.equal(result.activeInputMode, 'buttons');
  assert.equal(result.microphoneDisabled, true);
  assert.equal(result.pianoDisabled, true);
  assert.equal(result.noteButtonsHidden, false);
  assert.equal(result.pianoHidden, true);
  assert.equal(result.microphonePanelHidden, true);
  assert.match(result.coach, /Chord mode needs Notes/);
  assert.match(result.live, /Chord mode needs Notes/);
  assert.ok(result.firstAnswer, 'chord answer buttons are available');
});
