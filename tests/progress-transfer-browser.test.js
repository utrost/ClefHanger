import assert from 'node:assert/strict';
import test from 'node:test';
import { launchBrowser } from './helpers/browser.js';

test('browser export control downloads native-compatible progress JSON', { timeout: 60000 }, async (t) => {
  const browser = await launchBrowser(t);
  await browser.evaluate(`(() => {
    localStorage.setItem('clefhanger.progress.basics.first-steps.v1', JSON.stringify({ attempts: 2, correct: 1, assisted: 1, recent: [false] }));
    localStorage.setItem('clefhanger.highScore.basics.speed5.beginner.v5', '280');
    URL.createObjectURL = (blob) => { window.__exportedProgressBlob = blob; return 'blob:clefhanger-test'; };
    URL.revokeObjectURL = () => {};
  })()`);
  await browser.tap('#open-settings');
  await browser.tap('#export-progress');
  const transfer = await browser.evaluate('(async () => JSON.parse(await window.__exportedProgressBlob.text()))()');
  assert.equal(transfer.schema, 'clefhanger-progress-transfer-v1');
  assert.equal(transfer.progress['first-steps'].attempts, 2);
  assert.equal(transfer.highScores['rush.highScore.treble.speed5.beginner'], 280);
});
