import { spawn } from 'node:child_process';
import { constants, accessSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, extname, join, resolve } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
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

async function getFreePort() {
  const probe = createServer();
  await new Promise((resolveListen) => probe.listen(0, '127.0.0.1', resolveListen));
  const { port } = probe.address();
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}

function connectCdp(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Browser connection closed'));
    }
    pending.clear();
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser connection timed out')), 15000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Browser connection failed')); }, { once: true });
  });
  async function command(method, params = {}) {
    await ready;
    if (socket.readyState !== WebSocket.OPEN) throw new Error('Browser connection is not open');
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
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


export async function launchBrowser(t, { width = 390, height = 844, transformResponse = (_path, data) => data } = {}) {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filePath = join(ROOT, pathname === '/' ? 'index.html' : pathname);
    try {
      const data = await import('node:fs/promises').then(({ readFile }) => readFile(filePath));
      response.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(transformResponse(filePath, data));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = await getFreePort();
  const profile = mkdtempSync(join(tmpdir(), 'clefhanger-browser-'));
  const chrome = spawn(findChromeExecutable(), ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  t.after(async () => {
    await new Promise((done) => { if (chrome.exitCode !== null || chrome.signalCode !== null) return done(); chrome.once('exit', done); chrome.kill('SIGKILL'); });
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  const page = await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json())).find((p) => p.type === 'page'));
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  t.after(() => cdp.close());
  await cdp.command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
  await cdp.command('Emulation.setTouchEmulationEnabled', { enabled: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await cdp.command('Page.navigate', { url: origin });
  await waitFor(() => cdp.evaluate('Boolean(window.__clefHanger)'));
  async function tap(selector) {
    const point = await cdp.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element || element.disabled) throw new Error('Missing or disabled control');
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      if (!rect.width || !rect.height || !element.contains(document.elementFromPoint(x, y))) throw new Error('Control is hidden or occluded');
      return { x, y };
    })()`);
    await cdp.command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await cdp.command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  return { ...cdp, tap, waitFor, origin, goOffline: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }) };
}
