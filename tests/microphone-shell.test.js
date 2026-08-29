import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('settings expose microphone input and live calibration controls', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.match(html, /data-input-mode="microphone"/);
  assert.match(html, /id="start-microphone"/);
  assert.match(html, /id="stop-microphone"/);
  assert.match(html, /id="microphone-status"/);
  assert.match(html, /id="calibration-reading"/);
  assert.match(html, /Actual calibration/);
  assert.match(html, /Grant mic/);
  assert.match(html, /Sing A/);
  assert.match(html, /data-app-version="clefhanger-slice16-chrome-mic-permission-help/);

  assert.match(app, /Microphone permission denied/);
  assert.match(app, /tap the lock/);
  assert.match(app, /formatMicrophoneError/);
  assert.match(app, /Requesting mic/);
  assert.match(app, /calibrationReadingText/);
  assert.match(app, /withMicrophoneRequestTimeout/);
  assert.match(app, /Microphone request timed out/);
  assert.match(app, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(app, /selectInputMode: \(inputMode\)/);
  assert.match(app, /microphone/);
  assert.match(app, /processMicrophoneFrame/);
});
