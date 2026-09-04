import { getDifficulty, getMode, getSpeed } from '../core/content.js?v=clefhanger-slice52-hide-answer-reveal-2026-09-04';
import { getBeginnerLesson } from '../core/lessons.js?v=clefhanger-slice52-hide-answer-reveal-2026-09-04';
import { normalizeMicrophoneInputMode } from '../core/pitch.js?v=clefhanger-slice52-hide-answer-reveal-2026-09-04';
import { getHighScoreKey } from '../core/scoring.js?v=clefhanger-slice52-hide-answer-reveal-2026-09-04';

export const STORAGE_KEYS = {
  selectedMode: 'clefhanger.selectedMode.v3',
  selectedSpeed: 'clefhanger.selectedSpeed.v6',
  selectedSpeedLegacy: 'clefhanger.selectedSpeed.v3',
  selectedDifficulty: 'clefhanger.selectedDifficulty.v4',
  selectedInputMode: 'clefhanger.selectedInputMode.v7',
  selectedInputModeLegacy: 'clefhanger.selectedInputMode.v5',
  selectedPlayStyle: 'clefhanger.selectedPlayStyle.v1',
  selectedLesson: 'clefhanger.selectedLesson.v1',
  showHints: 'clefhanger.showHints.v1',
  matchAnyOctave: 'clefhanger.matchAnyOctave.v1',
  lessonIntroHidden: 'clefhanger.lessonIntroHidden.v1',
  tutorialDismissed: 'clefhanger.tutorialDismissed.v1',
};

function getSafe(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function setSafe(storage, key, value) {
  try {
    storage?.setItem?.(key, String(value));
  } catch {
    // Browser storage can be unavailable in private modes or restricted embeds.
  }
}

function normalizePlayStyle(value) {
  return value === 'rush' ? 'rush' : 'practice';
}

function normalizeBoolean(value, defaultValue) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createStorageAdapter(storage = undefined) {
  const backingStorage = resolveStorage(storage);

  function readPreferences() {
    const selectedMode = getSafe(backingStorage, STORAGE_KEYS.selectedMode);
    const selectedSpeed = getSafe(backingStorage, STORAGE_KEYS.selectedSpeed)
      || getSafe(backingStorage, STORAGE_KEYS.selectedSpeedLegacy);
    const selectedDifficulty = getSafe(backingStorage, STORAGE_KEYS.selectedDifficulty);
    const selectedInputMode = getSafe(backingStorage, STORAGE_KEYS.selectedInputMode)
      || getSafe(backingStorage, STORAGE_KEYS.selectedInputModeLegacy);
    const selectedLesson = getSafe(backingStorage, STORAGE_KEYS.selectedLesson);

    return {
      modeId: getMode(selectedMode || 'basics').id,
      speedId: getSpeed(selectedSpeed || '5').id,
      difficultyId: getDifficulty(selectedDifficulty || 'beginner').id,
      inputMode: normalizeMicrophoneInputMode(selectedInputMode || 'buttons'),
      playStyle: normalizePlayStyle(getSafe(backingStorage, STORAGE_KEYS.selectedPlayStyle)),
      lessonId: getBeginnerLesson(selectedLesson || 'first-steps').id,
      showHints: normalizeBoolean(getSafe(backingStorage, STORAGE_KEYS.showHints), true),
      matchAnyOctave: normalizeBoolean(getSafe(backingStorage, STORAGE_KEYS.matchAnyOctave), true),
      lessonIntroHidden: normalizeBoolean(getSafe(backingStorage, STORAGE_KEYS.lessonIntroHidden), false),
      tutorialDismissed: normalizeBoolean(getSafe(backingStorage, STORAGE_KEYS.tutorialDismissed), false),
    };
  }

  function writePreference(name, value) {
    const key = STORAGE_KEYS[name];
    if (!key) return;
    if (typeof value === 'boolean') setSafe(backingStorage, key, value ? 'true' : 'false');
    else setSafe(backingStorage, key, value);
  }

  function readHighScore(modeId, speedId, difficultyId) {
    return Number.parseInt(getSafe(backingStorage, getHighScoreKey(modeId, speedId, difficultyId)) || '0', 10) || 0;
  }

  function writeHighScore(score, modeId, speedId, difficultyId) {
    if (score > readHighScore(modeId, speedId, difficultyId)) {
      setSafe(backingStorage, getHighScoreKey(modeId, speedId, difficultyId), score);
    }
  }

  return {
    readPreferences,
    writePreference,
    readHighScore,
    writeHighScore,
  };
}
