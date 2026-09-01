import { getBeginnerLesson, getLessonPool } from './lessons.js?v=clefhanger-slice47-version-consistency-2026-09-01';
import { answerLabel } from './music-theory.js?v=clefhanger-slice47-version-consistency-2026-09-01';
import {
  BASS_NOTES,
  LEVEL_ONE_NOTES,
  getDifficulty,
  getMode,
  getSpeed,
} from './content.js?v=clefhanger-slice47-version-consistency-2026-09-01';
import { buildRoundSummary, calculatePoints } from './scoring.js?v=clefhanger-slice47-version-consistency-2026-09-01';
export { SEMITONES_FROM_C, accidentalSymbol, answerLabel, createGhostNoteFromPitch, getPitchFrequency, getPromptFrequencies, getStaffStepForPitch } from './music-theory.js?v=clefhanger-slice47-version-consistency-2026-09-01';
export { buildRoundSummary, calculateAccuracy, calculatePoints, getHighScoreKey, getSpeedBonus, getStreakBonus } from './scoring.js?v=clefhanger-slice47-version-consistency-2026-09-01';
export {
  ACCIDENTAL_BUTTONS,
  BASS_NOTES,
  CHORDS,
  DIFFICULTY_LEVELS,
  FLAT_NOTES,
  GAME_MODES,
  LEVEL_ONE_NOTES,
  NOTE_BUTTONS,
  PIANO_BLACK_KEYS,
  PIANO_WHITE_KEYS,
  SHARP_NOTES,
  SPEED_SETTINGS,
  getAnswerOptions,
  getDifficulty,
  getMode,
  getSpeed,
} from './content.js?v=clefhanger-slice47-version-consistency-2026-09-01';


export const STAFF_LAYOUT = {
  clefX: 26,
  trebleGLineY: 112,
  trebleClefLoopOffsetY: 20,
  trebleClefY: 92,
  bassClefY: 112,
  bottomLineY: 132,
  lineGap: 20,
  halfStep: 10,
  ledgerXOffset: 22,
};

export function getLedgerLinesForStaffStep(staffStep = 0) {
  const lines = [];
  if (staffStep <= -2) {
    for (let step = -2; step >= staffStep; step -= 2) lines.push({ staffStep: step, y: STAFF_LAYOUT.bottomLineY - step * STAFF_LAYOUT.halfStep });
    return lines.reverse();
  }
  if (staffStep >= 10) {
    for (let step = 10; step <= staffStep; step += 2) lines.push({ staffStep: step, y: STAFF_LAYOUT.bottomLineY - step * STAFF_LAYOUT.halfStep });
  }
  return lines;
}

export function getClefPresentation(clef = 'treble') {
  if (clef === 'bass') {
    return { clef: 'bass', glyph: '𝄢', x: STAFF_LAYOUT.clefX, y: STAFF_LAYOUT.bassClefY, anchorLine: 'F3 line' };
  }
  return { clef: 'treble', glyph: '𝄞', x: STAFF_LAYOUT.clefX, y: STAFF_LAYOUT.trebleClefY, anchorLine: 'G4 line' };
}

export function normalizeAnswer(answer) {
  return String(answer || '')
    .trim()
    .toUpperCase()
    .replaceAll('♯', '#')
    .replaceAll('♭', 'B')
    .replace(/^([A-G])#$/, '$1♯')
    .replace(/^([A-G])B$/, '$1♭')
    .replace(/[^A-G♯♭#]/g, '')
    .replace(/^([A-G])#$/, '$1♯')
    .replace(/^([A-G])B$/, '$1♭')
    .replace(/^[A-G]{3}$/, (value) => value.split('').join('-'));
}

export function createInitialState({ roundLengthMs = 60000, nowMs = 0, seed = Date.now(), modeId = 'basics', speedId = '5', difficultyId = 'beginner', lessonId = 'first-steps' } = {}) {
  const mode = getMode(modeId);
  const speed = getSpeed(speedId);
  const difficulty = getDifficulty(difficultyId);
  return {
    phase: 'idle',
    modeId: mode.id,
    speedId: speed.id,
    difficultyId: difficulty.id,
    lessonId: getBeginnerLesson(lessonId).id,
    roundLengthMs,
    startedAtMs: nowMs,
    endsAtMs: nowMs + roundLengthMs,
    seed: seed >>> 0,
    noteCounter: 0,
    activeNote: null,
    previousPrompt: null,
    noteQueue: [],
    correction: null,
    score: 0,
    pointsEarned: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    missed: 0,
    lastOutcome: null,
    feedback: { kind: 'idle', text: 'Tap Start when ready.' },
  };
}

export function createNote({ id, noteName, accidental, octave = 4, clef = 'treble', spawnedAtMs, travelMs = 5200, staffStep, kind = 'note', chordName, quality = 'major', notes, staffSteps }) {
  if (kind === 'chord') {
    const answer = notes.join('-');
    return { id, kind: 'chord', clef, chordName, quality, notes: [...notes], staffSteps: [...(staffSteps || [])], answer, displayName: `${chordName} ${quality}`, spawnedAtMs, deadlineMs: spawnedAtMs + travelMs, status: 'active' };
  }

  const pool = clef === 'bass' ? BASS_NOTES : LEVEL_ONE_NOTES;
  const definition = pool.find((note) => note.noteName === noteName && note.octave === octave);
  const answer = answerLabel(noteName, accidental);
  return { id, kind: 'note', clef, noteName, accidental, octave, answer, displayName: `${answer}${octave}`, spawnedAtMs, deadlineMs: spawnedAtMs + travelMs, status: 'active', ...(staffStep === undefined && definition ? {} : { staffStep }) };
}

function cloneNote(note) {
  return note ? { ...note, notes: note.notes ? [...note.notes] : undefined, staffSteps: note.staffSteps ? [...note.staffSteps] : undefined } : null;
}

function cloneState(state) {
  const noteQueue = (state.noteQueue || []).map(cloneNote);
  return {
    ...state,
    activeNote: state.activeNote ? cloneNote(state.activeNote) : (noteQueue[0] || null),
    previousPrompt: state.previousPrompt ? cloneNote(state.previousPrompt) : null,
    lastOutcome: state.lastOutcome ? { ...state.lastOutcome, prompt: cloneNote(state.lastOutcome.prompt) } : null,
    noteQueue,
    feedback: { ...state.feedback },
  };
}

function buildOutcome({ result, prompt, expectedAnswer, givenAnswer, pointsEarned = 0, streak = 0, modeId, lessonId, phase }) {
  return {
    result,
    prompt: cloneNote(prompt),
    expectedAnswer,
    givenAnswer,
    pointsEarned,
    streak,
    modeId,
    lessonId,
    phase,
  };
}

function nextRandom(seed) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function travelMsFor(mode, speed, difficulty) {
  const base = mode.kind === 'chord' ? 6200 : mode.id === 'basics' || mode.id === 'bass' ? 5200 : 5600;
  return Math.round(base * speed.multiplier * difficulty.travelMultiplier);
}

function createPromptFromSource(source, mode, noteCounter, spawnedAtMs, travelMs) {
  if (mode.kind === 'chord') {
    return { ...createNote({ id: `note-${noteCounter}`, kind: 'chord', clef: source.clef || mode.clef, chordName: source.chordName, quality: source.quality, notes: source.notes, staffSteps: source.staffSteps, spawnedAtMs, travelMs }), label: `${source.chordName} ${source.quality}` };
  }

  return { ...createNote({ id: `note-${noteCounter}`, clef: source.clef || mode.clef, noteName: source.noteName, accidental: source.accidental, octave: source.octave, spawnedAtMs, travelMs, staffStep: source.staffStep }), staffStep: source.staffStep, label: source.label || `${answerLabel(source.noteName, source.accidental)}${source.octave}` };
}

export function spawnNextNote(state, nowMs) {
  const next = cloneState(state);
  const mode = getMode(next.modeId);
  const speed = getSpeed(next.speedId);
  const difficulty = getDifficulty(next.difficultyId);
  next.speedId = speed.id;
  next.difficultyId = difficulty.id;

  const pool = next.phase === 'practice' && mode.id === 'basics' ? getLessonPool(mode.pool, next.lessonId) : mode.pool;
  const targetQueueSize = next.phase === 'practice' ? 1 : difficulty.noteQueueSize;

  while (next.noteQueue.length < targetQueueSize) {
    const seed = nextRandom(next.seed || 1);
    const index = seed % pool.length;
    const source = pool[index];
    const travelMs = travelMsFor(mode, speed, difficulty);
    const offsetMs = next.noteQueue.length * Math.round(travelMs * 0.18);
    next.seed = seed;
    next.noteCounter += 1;
    next.noteQueue.push(createPromptFromSource(source, mode, next.noteCounter, nowMs + offsetMs, travelMs));
  }

  next.activeNote = next.noteQueue[0] || null;
  return next;
}

export function startRound(state, nowMs, modeId = state.modeId, speedId = state.speedId, difficultyId = state.difficultyId) {
  const speed = getSpeed(speedId);
  const difficulty = getDifficulty(difficultyId);
  const next = createInitialState({ roundLengthMs: state.roundLengthMs || 60000, nowMs, seed: state.seed, modeId, speedId: speed.id, difficultyId: difficulty.id, lessonId: state.lessonId });
  next.phase = 'running';
  next.feedback = { kind: 'running', text: `${getMode(modeId).label} · ${speed.label} · ${difficulty.label}: name the front note.` };
  return spawnNextNote(next, nowMs);
}

export function startPractice(state, nowMs, modeId = state.modeId, lessonId = state.lessonId || 'first-steps') {
  const lesson = getBeginnerLesson(lessonId);
  const next = createInitialState({ roundLengthMs: null, nowMs, seed: state.seed, modeId, speedId: '1', difficultyId: 'beginner', lessonId: lesson.id });
  next.phase = 'practice';
  next.endsAtMs = null;
  next.feedback = { kind: 'practice', text: `Practice: ${lesson.title}. No timer — learn the note shape.` };
  return spawnNextNote(next, nowMs);
}

export function answerActiveNote(state, answer, nowMs) {
  if (!['running', 'idle', 'practice'].includes(state.phase)) return cloneState(state);
  if (!state.activeNote) return cloneState(state);

  const next = cloneState(state);
  const normalized = normalizeAnswer(answer);
  if (normalized === next.activeNote.answer) {
    const mode = getMode(next.modeId);
    const speed = getSpeed(next.speedId);
    const difficulty = getDifficulty(next.difficultyId);
    const points = calculatePoints({ mode, speed, difficulty, streak: next.streak });
    const answeredPrompt = cloneNote(next.activeNote);
    next.correct += 1;
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.pointsEarned = points;
    next.score += points;
    next.lastOutcome = buildOutcome({ result: 'correct', prompt: answeredPrompt, expectedAnswer: answeredPrompt.answer, givenAnswer: normalized, pointsEarned: points, streak: next.streak, modeId: next.modeId, lessonId: next.lessonId, phase: next.phase });
    next.feedback = next.phase === 'practice'
      ? { kind: 'correct', text: `${normalized} — correct. +${points}`, correctAnswer: normalized }
      : { kind: 'correct', text: `${normalized} — held on! +${points}` };
    next.correction = null;
    next.previousPrompt = cloneNote(answeredPrompt);
    next.noteQueue = (next.noteQueue || []).slice(1);
    next.activeNote = next.noteQueue[0] || null;
  } else {
    next.wrong += 1;
    next.streak = 0;
    next.pointsEarned = 0;
    next.lastOutcome = buildOutcome({ result: 'wrong', prompt: next.activeNote, expectedAnswer: next.activeNote.answer, givenAnswer: normalized || answer, pointsEarned: 0, streak: 0, modeId: next.modeId, lessonId: next.lessonId, phase: next.phase });
    next.feedback = { kind: 'wrong', text: `${normalized || answer || 'That'} is not it. Try again.`, correctAnswer: next.activeNote.answer };
    next.correction = null;
  }
  next.lastInputAtMs = nowMs;
  return next;
}

export function missExpiredNotes(state, nowMs) {
  if (state.phase === 'practice' || !state.activeNote || nowMs <= state.activeNote.deadlineMs) return cloneState(state);
  const next = cloneState(state);
  next.missed += 1;
  next.streak = 0;
  next.pointsEarned = 0;
  next.feedback = { kind: 'missed', text: `${next.activeNote.answer} fell off the staff.` };
  next.lastOutcome = buildOutcome({ result: 'missed', prompt: next.activeNote, expectedAnswer: next.activeNote.answer, givenAnswer: null, pointsEarned: 0, streak: 0, modeId: next.modeId, lessonId: next.lessonId, phase: next.phase });
  next.previousPrompt = cloneNote(next.activeNote);
  next.noteQueue = (next.noteQueue || []).slice(1);
  next.activeNote = next.noteQueue[0] || null;
  return next;
}

export function maybeEndRound(state, nowMs) {
  if (state.phase === 'running' && nowMs >= state.endsAtMs) {
    const next = cloneState(state);
    next.phase = 'ended';
    next.activeNote = null;
    next.noteQueue = [];
    next.feedback = { kind: 'ended', text: 'Sprint complete.' };
    return next;
  }
  return cloneState(state);
}

export function updateRound(state, nowMs) {
  let next = missExpiredNotes(state, nowMs);
  next = maybeEndRound(next, nowMs);
  if (next.phase === 'running') next = spawnNextNote(next, nowMs);
  return next;
}

export function getRemainingSeconds(state, nowMs) {
  if (state.phase === 'practice' || state.endsAtMs === null) return '∞';
  return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
}

export function getRoundSummary(state) {
  return buildRoundSummary(state);
}
