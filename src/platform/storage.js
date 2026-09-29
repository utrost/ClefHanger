import { normalizeProgress } from '../core/progress.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { DIFFICULTY_LEVELS, GAME_MODES, SPEED_SETTINGS, getDifficulty, getMode, getSpeed } from '../core/content.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { BEGINNER_LESSONS, getBeginnerLesson } from '../core/lessons.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { normalizeMicrophoneInputMode } from '../core/pitch.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { getHighScoreKey } from '../core/scoring.js?v=clefhanger-slice73-progress-export-2026-09-30';

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

export function resolveStartupPreferences(storedPreferences, search = '') {
  const requestedMode = new URLSearchParams(search).get('mode');
  const validRequestedMode = requestedMode && getMode(requestedMode).id === requestedMode;
  return validRequestedMode
    ? { ...storedPreferences, modeId: requestedMode }
    : storedPreferences;
}

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
      inputMode: normalizeMicrophoneInputMode(selectedInputMode || 'microphone'),
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

  function progressKey(modeId, lessonId) {
    const mode = getMode(modeId).id;
    const lesson = mode === 'basics' ? getBeginnerLesson(lessonId).id : 'all';
    return `clefhanger.progress.${mode}.${lesson}.v1`;
  }

  function readProgress(modeId, lessonId) {
    try { return normalizeProgress(JSON.parse(getSafe(backingStorage, progressKey(modeId, lessonId)))); }
    catch { return normalizeProgress(null); }
  }

  function writeProgress(modeId, lessonId, progress) {
    setSafe(backingStorage, progressKey(modeId, lessonId), JSON.stringify(normalizeProgress(progress)));
  }

  function exportProgress() {
    const progress = {};
    for (const lesson of BEGINNER_LESSONS) {
      const value = readProgress('basics', lesson.id);
      if (value.attempts > 0) progress[lesson.id] = value;
    }
    for (const mode of GAME_MODES.filter((entry) => entry.id !== 'basics')) {
      const value = readProgress(mode.id, 'all');
      if (value.attempts > 0) progress[`mode.${mode.id}`] = value;
    }
    const highScores = {};
    for (const mode of GAME_MODES) {
      for (const speed of SPEED_SETTINGS) {
        for (const difficulty of DIFFICULTY_LEVELS) {
          const score = readHighScore(mode.id, speed.id, difficulty.id);
          if (score > 0) {
            const nativeMode = mode.id === 'basics' ? 'treble' : mode.id;
            highScores[`rush.highScore.${nativeMode}.speed${speed.id}.${difficulty.id}`] = score;
          }
        }
      }
    }
    return { schema: 'clefhanger-progress-transfer-v1', exportedAt: new Date().toISOString(), progress, highScores };
  }

  return {
    readProgress,
    writeProgress,
    readPreferences,
    writePreference,
    readHighScore,
    writeHighScore,
    exportProgress,
  };
}
