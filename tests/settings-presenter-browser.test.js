import assert from 'node:assert/strict';
import test from 'node:test';
import { launchBrowser } from './helpers/browser.js';

test('settings restore native and accessible controls through Practice, Rush, Chords and Treble transitions', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  async function controls() {
    return browser.evaluate(`(() => {
      const slider = document.querySelector('#speed-slider');
      const attributes = (button) => ({ disabled: button.disabled, ariaDisabled: button.getAttribute('aria-disabled'), pressed: button.getAttribute('aria-pressed'), active: button.dataset.active, title: button.title });
      return {
        speed: { disabled: slider.disabled, ariaDisabled: slider.getAttribute('aria-disabled'), valueText: slider.getAttribute('aria-valuetext') },
        difficulty: [...document.querySelectorAll('#difficulty-buttons button')].map(attributes),
        microphone: attributes(document.querySelector('[data-input-mode="microphone"]')),
        piano: attributes(document.querySelector('[data-input-mode="piano"]')),
        notes: attributes(document.querySelector('[data-input-mode="buttons"]')),
        selectedMode: document.querySelector('#mode-buttons [aria-pressed="true"]').dataset.mode,
        selectedDifficulty: document.querySelector('#difficulty-buttons [aria-pressed="true"]').dataset.difficulty,
        selectedPlayStyle: document.querySelector('.play-style-row [aria-pressed="true"]').dataset.playStyle,
        summary: document.querySelector('#settings-line').textContent,
      };
    })()`);
  }
  await browser.tap('#open-settings');
  let view = await controls();
  assert.deepEqual(view.speed, { disabled: true, ariaDisabled: 'true', valueText: 'Practice ignores speed' });
  assert.ok(view.difficulty.every((button) => button.disabled && button.ariaDisabled === 'true'));
  assert.equal(view.microphone.pressed, 'true');
  assert.equal(view.selectedPlayStyle, 'practice');
  assert.equal(view.selectedMode, 'basics');
  await browser.tap('#close-settings');
  await browser.tap('[data-play-style="rush"]');
  await browser.tap('#open-settings');
  view = await controls();
  assert.equal(view.selectedPlayStyle, 'rush');
  assert.equal(view.speed.disabled, false);
  assert.equal(view.speed.ariaDisabled, 'false');
  assert.equal(view.speed.valueText, 'Speed 5');
  assert.ok(view.difficulty.every((button) => !button.disabled && button.ariaDisabled === 'false' && button.title === ''));
  await browser.tap('[data-difficulty="hard"]');
  await browser.tap('[data-mode="chords"]');
  view = await controls();
  assert.equal(view.selectedMode, 'chords');
  assert.equal(view.selectedDifficulty, 'hard');
  for (const button of [view.microphone, view.piano]) {
    assert.equal(button.disabled, true);
    assert.equal(button.ariaDisabled, 'true');
    assert.equal(button.title, 'Chord mode needs Notes answers.');
  }
  assert.equal(view.notes.pressed, 'true');
  assert.equal(view.notes.active, 'true');
  await browser.tap('[data-mode="basics"]');
  view = await controls();
  assert.equal(view.microphone.disabled, false);
  assert.equal(view.microphone.ariaDisabled, 'false');
  assert.equal(view.microphone.title, '');
  await browser.tap('[data-input-mode="microphone"]');
  await browser.tap('#close-settings');
  await browser.tap('[data-play-style="practice"]');
  view = await controls();
  assert.equal(view.summary, 'Treble · Practice: First steps · Sing/Play');
  assert.equal(view.microphone.pressed, 'true');
  assert.equal(view.notes.pressed, 'false');
  assert.equal(view.speed.disabled, true);
});
