import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createStorageAdapter, STORAGE_KEYS } from '../src/platform/storage.js';
import { getHighScoreKey } from '../src/core/scoring.js';

function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

function createThrowingStorage() {
  return {
    getItem() { throw new Error('storage unavailable'); },
    setItem() { throw new Error('storage unavailable'); },
  };
}

test('storage adapter reads safe preference defaults when storage is missing', () => {
  const adapter = createStorageAdapter(null);

  assert.deepEqual(adapter.readPreferences(), {
    modeId: 'basics',
    speedId: '5',
    difficultyId: 'beginner',
    inputMode: 'buttons',
    playStyle: 'practice',
    lessonId: 'first-steps',
    showHints: true,
    lessonIntroHidden: false,
    tutorialDismissed: false,
  });
});

test('storage adapter normalizes stored preferences and legacy keys', () => {
  const storage = createFakeStorage({
    [STORAGE_KEYS.selectedMode]: 'not-real',
    [STORAGE_KEYS.selectedSpeedLegacy]: '9',
    [STORAGE_KEYS.selectedDifficulty]: 'impossible',
    [STORAGE_KEYS.selectedInputModeLegacy]: 'microphone',
    [STORAGE_KEYS.selectedPlayStyle]: 'marathon',
    [STORAGE_KEYS.selectedLesson]: 'line-notes',
    [STORAGE_KEYS.showHints]: 'false',
    [STORAGE_KEYS.lessonIntroHidden]: 'true',
    [STORAGE_KEYS.tutorialDismissed]: 'true',
  });
  const adapter = createStorageAdapter(storage);

  assert.deepEqual(adapter.readPreferences(), {
    modeId: 'basics',
    speedId: '9',
    difficultyId: 'beginner',
    inputMode: 'microphone',
    playStyle: 'practice',
    lessonId: 'line-notes',
    showHints: false,
    lessonIntroHidden: true,
    tutorialDismissed: true,
  });
});

test('storage adapter writes preferences through stable keys', () => {
  const storage = createFakeStorage();
  const adapter = createStorageAdapter(storage);

  adapter.writePreference('selectedMode', 'bass');
  adapter.writePreference('selectedSpeed', '8');
  adapter.writePreference('selectedDifficulty', 'hard');
  adapter.writePreference('selectedInputMode', 'piano');
  adapter.writePreference('selectedPlayStyle', 'rush');
  adapter.writePreference('selectedLesson', 'ledger-lines');
  adapter.writePreference('showHints', false);
  adapter.writePreference('lessonIntroHidden', true);
  adapter.writePreference('tutorialDismissed', true);

  assert.deepEqual(storage.dump(), {
    [STORAGE_KEYS.selectedMode]: 'bass',
    [STORAGE_KEYS.selectedSpeed]: '8',
    [STORAGE_KEYS.selectedDifficulty]: 'hard',
    [STORAGE_KEYS.selectedInputMode]: 'piano',
    [STORAGE_KEYS.selectedPlayStyle]: 'rush',
    [STORAGE_KEYS.selectedLesson]: 'ledger-lines',
    [STORAGE_KEYS.showHints]: 'false',
    [STORAGE_KEYS.lessonIntroHidden]: 'true',
    [STORAGE_KEYS.tutorialDismissed]: 'true',
  });
});

test('storage adapter reads and writes high scores with comparable scoring keys', () => {
  const storage = createFakeStorage({ [getHighScoreKey('bass', '7', 'hard')]: '345' });
  const adapter = createStorageAdapter(storage);

  assert.equal(adapter.readHighScore('bass', '7', 'hard'), 345);
  adapter.writeHighScore(200, 'bass', '7', 'hard');
  assert.equal(adapter.readHighScore('bass', '7', 'hard'), 345);
  adapter.writeHighScore(400, 'bass', '7', 'hard');
  assert.equal(adapter.readHighScore('bass', '7', 'hard'), 400);
});

test('storage adapter swallows unavailable storage errors', () => {
  const adapter = createStorageAdapter(createThrowingStorage());

  assert.doesNotThrow(() => adapter.writePreference('selectedMode', 'bass'));
  assert.doesNotThrow(() => adapter.writeHighScore(100, 'basics', '5', 'beginner'));
  assert.equal(adapter.readHighScore('basics', '5', 'beginner'), 0);
  assert.equal(adapter.readPreferences().modeId, 'basics');
});

test('app composition root uses storage adapter instead of direct localStorage calls', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(app, /createStorageAdapter/);
  assert.doesNotMatch(app, /localStorage\.(getItem|setItem)/);
});
