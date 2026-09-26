import assert from 'node:assert/strict';
import test from 'node:test';
import { launchBrowser } from './helpers/browser.js';

async function answer(browser, correct = true) {
  const selector = await browser.evaluate(`(() => {
    const answer = window.__clefHanger.getState().activeNote.answer;
    const buttons = [...document.querySelectorAll('#note-buttons button')];
    const index = buttons.findIndex((button) => ${correct ? 'button.textContent === answer' : 'button.textContent !== answer'});
    return '#note-buttons button:nth-child(' + (index + 1) + ')';
  })()`);
  await browser.tap(selector);
}

test('the illustrated guide follows the lesson and answering after viewing it is assisted', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('#use-note-buttons');
  await browser.tap('#start-round');
  const buttonWidths = await browser.evaluate("[...document.querySelectorAll('#note-buttons button')].map((button) => button.getBoundingClientRect().width)");
  assert.ok(buttonWidths.every((width) => width >= 110), 'three beginner answers use the available row width');
  await browser.tap('#note-guide summary');
  assert.equal(await browser.evaluate("document.querySelectorAll('#note-guide-content .guide-note').length"), 3);
  assert.match(await browser.evaluate("document.querySelector('#note-guide-content svg').getAttribute('aria-label')"), /C4: first ledger line below staff/);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await browser.tap('#note-guide summary');
  await answer(browser);
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /0\/0 on your own · 1 with help/);
  await browser.evaluate("document.querySelector('#lesson-select').value = 'line-notes'; document.querySelector('#lesson-select').dispatchEvent(new Event('change'))");
  await browser.tap('#note-guide summary');
  assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('#note-guide-content .guide-note')].map((node) => Number(node.dataset.staffStep))"), [0, 2, 4, 6, 8]);
  await browser.evaluate("document.querySelector('#lesson-select').value = 'space-notes'; document.querySelector('#lesson-select').dispatchEvent(new Event('change'))");
  assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('#note-guide-content .guide-note')].map((node) => Number(node.dataset.staffStep))"), [1, 3, 5, 7]);
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 1, mobile: true });
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await browser.tap('[data-play-style="rush"]');
  assert.equal(await browser.evaluate("document.querySelector('#note-guide').hidden"), true);
});

test('revealed corrections count as help, while hints-off practice keeps answers concealed', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('#use-note-buttons');
  await browser.tap('#start-round');
  await answer(browser, false);
  assert.match(await browser.evaluate("document.querySelector('#feedback').textContent"), /line|space/);
  await answer(browser);
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /0\/1 on your own · 1 with help/);
  await browser.tap('#open-settings');
  await browser.tap('#lesson-help > summary');
  await browser.tap('#hint-toggle');
  await browser.tap('#close-settings');
  await answer(browser, false);
  assert.equal(await browser.evaluate("document.querySelector('#staff .correction-label')"), null);
  assert.match(await browser.evaluate("document.querySelector('#feedback').textContent"), /is not it. Try again/);
  assert.equal(await browser.evaluate('window.__clefHanger.getState().correction'), null);
  await answer(browser);
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /1\/3 on your own · 1 with help/);
});


test('returning from a harder Rush still gives Practice its three beginner answer choices', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.tap('#use-note-buttons');
  await browser.tap('[data-play-style="rush"]');
  await browser.tap('#open-settings');
  await browser.tap('[data-difficulty="hard"]');
  await browser.tap('#close-settings');
  await browser.tap('[data-play-style="practice"]');
  assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('#note-buttons button')].map((button) => button.textContent)"), ['C', 'D', 'E']);
  await browser.tap('#start-round');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().difficultyId'), 'beginner');
});
