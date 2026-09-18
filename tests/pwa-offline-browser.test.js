import { spawn } from 'node:child_process';
import { constants, accessSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, extname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

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
  async function command(method, params = {}) {
    await ready;
    const id = ++nextId;
    return new Promise((resolveCommand, rejectCommand) => {
      pending.set(id, { resolveCommand, rejectCommand });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  return {
    command,
    async evaluate(expression) {
      const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    },
    close() { socket.close(); },
  };
}

test('clean install makes versioned ES modules available from the installed service worker', { timeout: 60000 }, async (t) => {
  const requests = [];
  let serverClosed = false;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push(url.pathname + url.search);
    const filePath = join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
    try {
      const file = await import('node:fs/promises').then(({ readFile }) => readFile(filePath));
      response.writeHead(200, {
        'content-type': MIME[extname(filePath)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(file);
    } catch {
      response.writeHead(404, { 'cache-control': 'no-store' }).end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => {
    if (!serverClosed) server.close();
  });

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
  await cdp.command('Network.enable');
  await cdp.command('Page.enable');
  await cdp.command('Network.setCacheDisabled', { cacheDisabled: true });

  await waitFor(() => cdp.evaluate("Boolean(window.__clefHanger)"));
  await waitFor(() => cdp.evaluate("navigator.serviceWorker.ready.then(() => Boolean(navigator.serviceWorker.controller))"));
  await waitFor(async () => {
    const count = requests.length;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return requests.length === count ? count : false;
  });
  const onlineRequestCount = requests.length;
  await new Promise((resolveClose) => server.close(resolveClose));
  serverClosed = true;

  const result = await cdp.evaluate(`(async () => ({
    appVersion: window.__clefHanger.appVersion,
    cachedModules: await Promise.all([
      './src/app.js?v=clefhanger-slice69-tester-readiness-2026-09-16',
      './src/core/game.js?v=clefhanger-slice69-tester-readiness-2026-09-16',
      './src/ui/staff-renderer.js?v=clefhanger-slice69-tester-readiness-2026-09-16',
    ].map(async (url) => {
      const response = await fetch(url);
      return { url, ok: response.ok, text: await response.text() };
    })),
    marker: document.querySelector('.microcopy')?.textContent,
    controller: Boolean(navigator.serviceWorker.controller),
    startCopy: document.querySelector('#start-round')?.textContent,
  }))()`);
  assert.equal(requests.length, onlineRequestCount, 'versioned module fetches must complete after the HTTP server is unavailable');
  assert.equal(result.appVersion, 'clefhanger-slice69-tester-readiness-2026-09-16');
  assert.deepEqual(result.cachedModules.map(({ ok }) => ok), [true, true, true]);
  assert.match(result.cachedModules[0].text, /const appVersion = 'clefhanger-slice69-tester-readiness-2026-09-16'/);
  assert.match(result.cachedModules[1].text, /export function createInitialState/);
  assert.match(result.cachedModules[2].text, /export function renderStaffSvg/);
  assert.equal(result.marker, 'Slice 69: tester readiness');
  assert.equal(result.controller, true);
  assert.equal(result.startCopy, 'Start practice');
});
