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

test('Next practice note preserves progress and Restart practice resets it', { timeout: 60000 }, async (t) => {
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

  const debugPort = 41000 + Math.floor(Math.random() * 1000);
  const profile = mkdtempSync(join(tmpdir(), 'clefhanger-chrome-'));
  const chrome = spawn(findChromeExecutable(), [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`,
  ], { stdio: 'ignore' });
  t.after(() => {
    chrome.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  });

  const page = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
    const pages = await response.json();
    return pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith('http://127.0.0.1'));
  });
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  t.after(() => cdp.close());
  await waitFor(() => cdp.evaluate("Boolean(window.__clefHanger && document.querySelector('#restart-practice'))"));

  const result = await cdp.evaluate(`(async () => {
    const start = document.querySelector('#start-round');
    const restart = document.querySelector('#restart-practice');
    const restartInitiallyHidden = restart.hidden;
    start.click();
    const restartVisibleDuringPractice = !restart.hidden;

    const clickAnswer = (answer) => {
      [...document.querySelectorAll('#note-buttons button')]
        .find((button) => button.textContent === answer)
        .click();
    };
    const correctAnswer = window.__clefHanger.getState().activeNote.answer;
    const wrongAnswer = [...document.querySelectorAll('#note-buttons button')]
      .find((button) => button.textContent !== correctAnswer)
      .textContent;
    clickAnswer(wrongAnswer);
    clickAnswer(correctAnswer);

    const beforeNext = structuredClone(window.__clefHanger.getState());
    start.click();
    const afterNext = structuredClone(window.__clefHanger.getState());
    restart.click();
    const afterRestart = structuredClone(window.__clefHanger.getState());
    return {
      startCopy: start.textContent,
      restartCopy: restart.textContent,
      restartInitiallyHidden,
      restartVisibleDuringPractice,
      beforeNext,
      afterNext,
      afterRestart,
    };
  })()`);

  assert.equal(result.startCopy, 'Next practice note');
  assert.equal(result.restartCopy, 'Restart practice');
  assert.equal(result.restartInitiallyHidden, true);
  assert.equal(result.restartVisibleDuringPractice, true);

  const { beforeNext, afterNext, afterRestart } = result;
  assert.equal(beforeNext.correct, 1);
  assert.equal(beforeNext.wrong, 1);
  assert.ok(beforeNext.score > 0);
  assert.equal(beforeNext.streak, 1);
  assert.notEqual(afterNext.activeNote.id, beforeNext.activeNote.id);
  assert.equal(afterNext.noteCounter, beforeNext.noteCounter + 1, 'Next must advance exactly one prompt');
  for (const field of ['correct', 'wrong', 'score', 'streak']) {
    assert.equal(afterNext[field], beforeNext[field], `Next must preserve ${field}`);
  }
  assert.deepEqual(afterNext.lastOutcome, beforeNext.lastOutcome);
  assert.deepEqual(afterNext.previousPrompt, beforeNext.previousPrompt);

  assert.equal(afterRestart.phase, 'practice');
  assert.equal(afterRestart.correct, 0);
  assert.equal(afterRestart.wrong, 0);
  assert.equal(afterRestart.score, 0);
  assert.equal(afterRestart.streak, 0);
  assert.equal(afterRestart.bestStreak, 0);
  assert.equal(afterRestart.pointsEarned, 0);
  assert.equal(afterRestart.missed, 0);
  assert.equal(afterRestart.lastOutcome, null);
  assert.equal(afterRestart.previousPrompt, null);
  assert.equal(afterRestart.noteCounter, 1);
  assert.ok(afterRestart.activeNote);
});

test('launch query overrides stored mode and invalid mode falls back in a real browser', { timeout: 60000 }, async (t) => {
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

  const debugPort = 42000 + Math.floor(Math.random() * 1000);
  const profile = mkdtempSync(join(tmpdir(), 'clefhanger-chrome-'));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn(findChromeExecutable(), [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, `${origin}/`,
  ], { stdio: 'ignore' });
  t.after(() => {
    chrome.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  });

  const page = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
    const pages = await response.json();
    return pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith(origin));
  });
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  t.after(() => cdp.close());
  await waitFor(() => cdp.evaluate("Boolean(window.__clefHanger)"));

  async function launch(storedMode, query) {
    await cdp.evaluate(`localStorage.setItem('clefhanger.selectedMode.v3', ${JSON.stringify(storedMode)}); location.href = ${JSON.stringify(`${origin}/${query}`)}`);
    await waitFor(() => cdp.evaluate(`location.search === ${JSON.stringify(query)} && Boolean(window.__clefHanger)`));
    return cdp.evaluate(`({
      modeId: window.__clefHanger.getState().modeId,
      modeLabel: document.querySelector('#mode-label').textContent,
      activeMode: document.querySelector('#mode-buttons [data-active="true"]').dataset.mode,
      storedMode: localStorage.getItem('clefhanger.selectedMode.v3'),
    })`);
  }

  assert.deepEqual(await launch('basics', '?mode=bass'), {
    modeId: 'bass', modeLabel: 'Bass', activeMode: 'bass', storedMode: 'basics',
  });
  assert.deepEqual(await launch('bass', '?mode=sharps'), {
    modeId: 'sharps', modeLabel: 'Sharps #', activeMode: 'sharps', storedMode: 'bass',
  });
  assert.deepEqual(await launch('bass', '?mode=not-a-mode'), {
    modeId: 'bass', modeLabel: 'Bass', activeMode: 'bass', storedMode: 'bass',
  });
});
