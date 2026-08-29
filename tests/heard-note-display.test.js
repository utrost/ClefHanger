import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHeardNoteMessage } from '../src/core/pitch.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('builds a plain heard-note message from microphone pitch', () => {
  assert.equal(buildHeardNoteMessage(null), 'You played —');
  assert.equal(buildHeardNoteMessage({ answer: 'A', octave: 4, frequency: 440, cents: 0 }), 'You played A4 · 440 Hz · in tune');
  assert.equal(buildHeardNoteMessage({ answer: 'B', octave: 4, frequency: 493.88, cents: -12 }), 'You played B4 · 494 Hz · 12¢ flat');
  assert.equal(buildHeardNoteMessage({ answer: 'C♯', octave: 5, frequency: 556, cents: 18 }), 'You played C♯5 · 556 Hz · 18¢ sharp');
});

test('microphone panel has a dedicated visible heard-note readout', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.match(html, /id="heard-note"/);
  assert.match(html, /You played/);
  assert.match(app, /heardNoteEl/);
  assert.match(app, /buildHeardNoteMessage/);
  assert.match(app, /heardNoteEl\.textContent/);
});
