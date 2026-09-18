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
    async command(method, params = {}) {
      await ready;
      const id = ++nextId;
      return new Promise((resolveCommand, rejectCommand) => {
        pending.set(id, { resolveCommand, rejectCommand });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
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
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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

test('critical DOM flows cover settings, ended Rush focus, microphone cleanup, and basic accessibility states', { timeout: 60000 }, async (t) => {
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

  const debugPort = await getFreePort();
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
  await cdp.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await waitFor(() => cdp.evaluate("Boolean(window.__clefHanger && document.querySelector('#open-settings'))"));

  const result = await cdp.evaluate(`(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scanA11y = (label) => {
      const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      const unnamedButtons = [...document.querySelectorAll('button')]
        .filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label'))
        .map((button) => button.id || button.className || button.outerHTML.slice(0, 40));
      const visibleDialogsWithoutLabel = [...document.querySelectorAll('dialog,[role="dialog"]')]
        .filter((dialog) => !dialog.hidden && !dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby'))
        .map((dialog) => dialog.id || dialog.outerHTML.slice(0, 40));
      return { label, duplicateIds, unnamedButtons, visibleDialogsWithoutLabel };
    };
    const states = [scanA11y('idle')];

    document.querySelector('#open-settings').click();
    const settingsOpen = document.querySelector('#settings-dialog').open;
    document.querySelector('[data-mode="bass"]').click();
    document.querySelector('[data-difficulty="normal"]').click();
    document.querySelector('[data-input-mode="buttons"]').click();
    const settingsState = {
      mode: window.__clefHanger.getState().modeId,
      activeMode: document.querySelector('#mode-buttons [data-active="true"]').dataset.mode,
      activeDifficulty: document.querySelector('#difficulty-buttons [data-active="true"]').dataset.difficulty,
      activeInputMode: document.querySelector('#input-mode-buttons [data-active="true"]').dataset.inputMode,
    };
    states.push(scanA11y('settings'));
    document.querySelector('#close-settings').click();

    document.querySelector('[data-mode="basics"]').click();
    document.querySelector('[data-play-style="practice"]').click();
    document.querySelector('[data-input-mode="buttons"]').click();
    document.querySelector('#start-round').click();
    states.push(scanA11y('active-practice'));

    window.__fakeMic = { getUserMediaCalls: 0, stopCalls: 0 };
    const makeTrack = () => ({ kind: 'audio', readyState: 'live', enabled: true, muted: false, stop() { this.readyState = 'ended'; window.__fakeMic.stopCalls += 1; } });
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'prompt' }) } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      window.__fakeMic.getUserMediaCalls += 1;
      const track = makeTrack();
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } } });
    class FakeAudioContext {
      constructor() { this.state = 'running'; this.destination = {}; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() { return { fftSize: 0, connect() {}, disconnect() {}, getFloatTimeDomainData(buffer) { buffer.fill(0); } }; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createOscillator() { return { frequency: { setValueAtTime() {} }, type: 'sine', connect() {}, start() {}, stop() {} }; }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
    document.querySelector('[data-input-mode="microphone"]').click();
    document.querySelector('#start-microphone-main').click();
    await sleep(100);
    document.querySelector('#start-microphone-main').click();
    await sleep(100);
    document.querySelector('#open-settings').click();
    document.querySelector('#stop-microphone').click();
    await sleep(50);
    const microphone = { ...window.__fakeMic, listening: window.__clefHanger.getMicrophoneState().listening };
    document.querySelector('#close-settings').click();

    window.__clefHanger.selectPlayStyle('rush');
    window.__clefHanger.beginRound();
    const rushState = window.__clefHanger.getState();
    rushState.endsAtMs = performance.now() - 1;
    await sleep(80);
    const ended = {
      phase: window.__clefHanger.getState().phase,
      summaryVisible: !document.querySelector('#summary').hidden,
      activeElementId: document.activeElement.id,
      backgroundInert: document.querySelector('#app-background').inert,
      replayCopy: document.querySelector('#summary-restart').textContent,
    };
    states.push(scanA11y('ended'));

    return { settingsOpen, settingsState, microphone, ended, states };
  })()`);

  assert.equal(result.settingsOpen, true);
  assert.deepEqual(result.settingsState, {
    mode: 'bass', activeMode: 'bass', activeDifficulty: 'beginner', activeInputMode: 'buttons',
  });
  assert.equal(result.microphone.getUserMediaCalls, 2, 'real DOM retry path starts microphone twice');
  assert.ok(result.microphone.stopCalls >= 1, 'retry or switching away stops an existing microphone track');
  assert.equal(result.microphone.listening, false);
  assert.equal(result.ended.phase, 'ended');
  assert.equal(result.ended.summaryVisible, true);
  assert.equal(result.ended.activeElementId, 'summary-restart');
  assert.equal(result.ended.backgroundInert, true);
  assert.match(result.ended.replayCopy, /another 60s rush/i);
  for (const state of result.states) {
    assert.deepEqual(state.duplicateIds, [], `${state.label} has no duplicate IDs`);
    assert.deepEqual(state.unnamedButtons, [], `${state.label} has no unnamed buttons`);
    assert.deepEqual(state.visibleDialogsWithoutLabel, [], `${state.label} has no visible unlabeled dialogs`);
  }
});
