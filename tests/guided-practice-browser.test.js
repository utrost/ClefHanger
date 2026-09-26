import assert from 'node:assert/strict';
import test from 'node:test';
import { launchBrowser } from './helpers/browser.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('fresh mobile Practice keeps the staff, listening and microphone controls together', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  for (const [width, height] of [[390, 844], [360, 740]]) {
    await browser.command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    const layout = await browser.evaluate(`({
      overflow: document.documentElement.scrollWidth > innerWidth,
      controls: ['notation-stage', 'hear-note', 'start-microphone-main', 'mic-guidance'].map((id) => {
        const rect = document.getElementById(id).getBoundingClientRect();
        return { id, top: rect.top, bottom: rect.bottom, width: rect.width };
      }),
      timerHidden: getComputedStyle(document.querySelector('.timer-card')).display === 'none',
      helpInSettings: Boolean(document.querySelector('#settings-dialog #tutorial-card')),
    })`);
    assert.equal(layout.overflow, false);
    assert.equal(layout.timerHidden, true);
    assert.equal(layout.helpInSettings, true);
    for (const control of layout.controls) {
      assert.ok(control.width > 0 && control.top >= 0 && control.bottom <= height, `${width}x${height}: ${control.id} ends at ${control.bottom}`);
    }
  }
  await browser.tap('#hear-note');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'practice');
});

test('listen then imitate blocks speaker scoring, shows guidance, and saves assisted progress across reloads', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('#hear-note');
  await browser.evaluate('(async () => { window.__promptFrequency = (await import("./src/core/music-theory.js")).getPromptFrequencies; })()');
  const blocked = await browser.evaluate(`(() => {
    const app = window.__clefHanger;
    const frequency = window.__promptFrequency(app.getState().activeNote)[0];
    const now = performance.now();
    app.clefhangerInjectPitch(frequency, now);
    app.clefhangerInjectPitch(frequency, now + 200);
    return { correct: app.getState().correct, guidance: document.querySelector('#mic-guidance').textContent };
  })()`);
  assert.equal(blocked.correct, 0);
  assert.match(blocked.guidance, /scoring waits/);
  await browser.waitFor(() => browser.evaluate("!document.querySelector('#hear-note').disabled"));
  await browser.evaluate(`(() => {
    const app = window.__clefHanger;
    app.clefhangerInjectPitch(window.__promptFrequency(app.getState().activeNote)[0] * 2 ** (2/12));
  })()`);
  assert.match(await browser.evaluate("document.querySelector('#mic-guidance').textContent"), /I hear/);
  await browser.evaluate(`(() => {
    const app = window.__clefHanger;
    app.clefhangerInjectPitch(window.__promptFrequency(app.getState().activeNote)[0]);
  })()`);
  assert.match(await browser.evaluate("document.querySelector('#mic-guidance').textContent"), /Hold/);
  await delay(180);
  await browser.evaluate(`(() => {
    const app = window.__clefHanger;
    app.clefhangerInjectPitch(window.__promptFrequency(app.getState().activeNote)[0]);
  })()`);
  assert.equal(await browser.evaluate('window.__clefHanger.getState().correct'), 1);
  await browser.command('Page.reload');
  await browser.waitFor(() => browser.evaluate("Boolean(window.__clefHanger && document.querySelector('#lesson-progress').textContent.includes('1 with help'))"));
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /0\/0 on your own/);
});

test('recent success recovers after mistakes and a real tap advances to the next saved lesson', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('#use-note-buttons');
  await browser.tap('#start-round');
  for (let i = 0; i < 12; i++) {
    const selector = await browser.evaluate(`(() => {
      const answer = window.__clefHanger.getState().activeNote.answer;
      const buttons = [...document.querySelectorAll('#note-buttons button')];
      const index = buttons.findIndex((button) => ${i === 0 ? 'button.textContent !== answer' : 'button.textContent === answer'});
      return '#note-buttons button:nth-child(' + (index + 1) + ')';
    })()`);
    await browser.tap(selector);
  }
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /10\/10 on your own/);
  await browser.tap('#next-lesson');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().lessonId'), 'line-notes');
  await browser.command('Page.reload');
  await browser.waitFor(() => browser.evaluate("window.__clefHanger?.getState().lessonId === 'line-notes'"));
});

test('Rush Settings pause time, resume is explicit, and results allow Practice and Escape exits', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('[data-play-style="rush"]');
  await browser.tap('#start-round');
  await browser.tap('#open-settings');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'paused');
  const seconds = await browser.evaluate("document.querySelector('#timer').textContent");
  await delay(1100);
  assert.equal(await browser.evaluate("document.querySelector('#timer').textContent"), seconds);
  await browser.tap('#close-settings');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'paused');
  await browser.tap('#pause-rush');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'running');
  async function finish() {
    await browser.evaluate('window.__clefHanger.getState().endsAtMs = performance.now() - 1');
    await browser.waitFor(() => browser.evaluate("window.__clefHanger.getState().phase === 'ended'"));
  }
  await finish();
  await browser.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await browser.evaluate('document.activeElement.id'), 'summary-practice');
  await browser.tap('#summary-practice');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'practice');
  assert.equal(await browser.evaluate("document.querySelector('#app-background').inert"), false);
  await browser.tap('[data-play-style="rush"]');
  await browser.tap('#start-round');
  await finish();
  await browser.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'practice');
});

test('switching from an active microphone to note buttons stops the capture track', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.evaluate(`(() => {
    window.__stopCount = 0;
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'prompt' }) } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      const track = { readyState: 'live', enabled: true, muted: false, stop() { this.readyState = 'ended'; window.__stopCount++; } };
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } } });
    class FakeAudioContext {
      constructor() { this.state = 'running'; this.destination = {}; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() { return { connect() {}, disconnect() {}, getFloatTimeDomainData(buffer) { buffer.fill(0); } }; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
  })()`);
  await browser.tap('#start-microphone-main');
  await browser.waitFor(() => browser.evaluate('window.__clefHanger.getMicrophoneState().listening'));
  await browser.tap('#use-note-buttons');
  assert.equal(await browser.evaluate('window.__stopCount'), 1);
  assert.equal(await browser.evaluate('window.__clefHanger.getMicrophoneState().listening'), false);
});
