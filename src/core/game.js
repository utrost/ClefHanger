export const NOTE_BUTTONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const ACCIDENTAL_BUTTONS = ['C♯', 'D♯', 'F♯', 'G♯', 'A♯', 'D♭', 'E♭', 'G♭', 'A♭', 'B♭'];

export const STAFF_LAYOUT = {
  clefX: 26,
  trebleGLineY: 112,
  trebleClefLoopOffsetY: 20,
  trebleClefY: 92,
  bassClefY: 112,
  bottomLineY: 132,
  lineGap: 20,
  halfStep: 10,
};

export function getClefPresentation(clef = 'treble') {
  if (clef === 'bass') {
    return { clef: 'bass', glyph: '𝄢', x: STAFF_LAYOUT.clefX, y: STAFF_LAYOUT.bassClefY, anchorLine: 'F3 line' };
  }
  return { clef: 'treble', glyph: '𝄞', x: STAFF_LAYOUT.clefX, y: STAFF_LAYOUT.trebleClefY, anchorLine: 'G4 line' };
}

export const SPEED_SETTINGS = [
  { id: 'slow', label: 'Slow', multiplier: 1.35 },
  { id: 'normal', label: 'Normal', multiplier: 1 },
  { id: 'fast', label: 'Fast', multiplier: 0.72 },
];

export const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', noteQueueSize: 1, travelMultiplier: 1.2, scoreMultiplier: 1, help: 'Slow single notes in a forgiving starter lane.' },
  { id: 'easy', label: 'Easy', noteQueueSize: 1, travelMultiplier: 1, scoreMultiplier: 1, help: 'Classic one-note rush with normal scoring.' },
  { id: 'normal', label: 'Normal', noteQueueSize: 2, travelMultiplier: 0.9, scoreMultiplier: 1.35, help: 'Two-note preview: answer the front note first.' },
  { id: 'hard', label: 'Hard', noteQueueSize: 3, travelMultiplier: 0.78, scoreMultiplier: 1.8, help: 'Three notes on the staff and higher reward.' },
];

export function getSpeed(speedId = 'normal') {
  return SPEED_SETTINGS.find((speed) => speed.id === speedId) || SPEED_SETTINGS[1];
}

export function getDifficulty(difficultyId = 'beginner') {
  return DIFFICULTY_LEVELS.find((difficulty) => difficulty.id === difficultyId) || DIFFICULTY_LEVELS[0];
}

export const LEVEL_ONE_NOTES = [
  { clef: 'treble', noteName: 'C', octave: 4, staffStep: -2, label: 'middle C' },
  { clef: 'treble', noteName: 'D', octave: 4, staffStep: -1, label: 'D4' },
  { clef: 'treble', noteName: 'E', octave: 4, staffStep: 0, label: 'bottom line E' },
  { clef: 'treble', noteName: 'F', octave: 4, staffStep: 1, label: 'F4' },
  { clef: 'treble', noteName: 'G', octave: 4, staffStep: 2, label: 'G4' },
  { clef: 'treble', noteName: 'A', octave: 4, staffStep: 3, label: 'A4' },
  { clef: 'treble', noteName: 'B', octave: 4, staffStep: 4, label: 'B4' },
  { clef: 'treble', noteName: 'C', octave: 5, staffStep: 5, label: 'C5' },
  { clef: 'treble', noteName: 'D', octave: 5, staffStep: 6, label: 'D5' },
  { clef: 'treble', noteName: 'E', octave: 5, staffStep: 7, label: 'top space E' },
  { clef: 'treble', noteName: 'F', octave: 5, staffStep: 8, label: 'top line F' },
];

export const BASS_NOTES = [
  { clef: 'bass', noteName: 'E', octave: 2, staffStep: -2, label: 'low E' },
  { clef: 'bass', noteName: 'F', octave: 2, staffStep: -1, label: 'F2' },
  { clef: 'bass', noteName: 'G', octave: 2, staffStep: 0, label: 'bottom line G' },
  { clef: 'bass', noteName: 'A', octave: 2, staffStep: 1, label: 'A2' },
  { clef: 'bass', noteName: 'B', octave: 2, staffStep: 2, label: 'B2' },
  { clef: 'bass', noteName: 'C', octave: 3, staffStep: 3, label: 'C3' },
  { clef: 'bass', noteName: 'D', octave: 3, staffStep: 4, label: 'D3' },
  { clef: 'bass', noteName: 'E', octave: 3, staffStep: 5, label: 'E3' },
  { clef: 'bass', noteName: 'F', octave: 3, staffStep: 6, label: 'F3' },
  { clef: 'bass', noteName: 'G', octave: 3, staffStep: 7, label: 'G3' },
  { clef: 'bass', noteName: 'A', octave: 3, staffStep: 8, label: 'A3' },
];

export const SHARP_NOTES = [
  { clef: 'treble', noteName: 'C', accidental: 'sharp', octave: 4, staffStep: -2 },
  { clef: 'treble', noteName: 'D', accidental: 'sharp', octave: 4, staffStep: -1 },
  { clef: 'treble', noteName: 'F', accidental: 'sharp', octave: 4, staffStep: 1 },
  { clef: 'treble', noteName: 'G', accidental: 'sharp', octave: 4, staffStep: 2 },
  { clef: 'treble', noteName: 'A', accidental: 'sharp', octave: 4, staffStep: 3 },
  { clef: 'treble', noteName: 'C', accidental: 'sharp', octave: 5, staffStep: 5 },
  { clef: 'treble', noteName: 'D', accidental: 'sharp', octave: 5, staffStep: 6 },
];

export const FLAT_NOTES = [
  { clef: 'treble', noteName: 'D', accidental: 'flat', octave: 4, staffStep: -1 },
  { clef: 'treble', noteName: 'E', accidental: 'flat', octave: 4, staffStep: 0 },
  { clef: 'treble', noteName: 'G', accidental: 'flat', octave: 4, staffStep: 2 },
  { clef: 'treble', noteName: 'A', accidental: 'flat', octave: 4, staffStep: 3 },
  { clef: 'treble', noteName: 'B', accidental: 'flat', octave: 4, staffStep: 4 },
  { clef: 'treble', noteName: 'D', accidental: 'flat', octave: 5, staffStep: 6 },
  { clef: 'treble', noteName: 'E', accidental: 'flat', octave: 5, staffStep: 7 },
];

export const CHORDS = [
  { clef: 'treble', chordName: 'C', quality: 'major', notes: ['C', 'E', 'G'], staffSteps: [-2, 0, 2] },
  { clef: 'treble', chordName: 'D', quality: 'minor', notes: ['D', 'F', 'A'], staffSteps: [-1, 1, 3] },
  { clef: 'treble', chordName: 'E', quality: 'minor', notes: ['E', 'G', 'B'], staffSteps: [0, 2, 4] },
  { clef: 'treble', chordName: 'F', quality: 'major', notes: ['F', 'A', 'C'], staffSteps: [1, 3, 5] },
  { clef: 'treble', chordName: 'G', quality: 'major', notes: ['G', 'B', 'D'], staffSteps: [2, 4, 6] },
  { clef: 'treble', chordName: 'A', quality: 'minor', notes: ['A', 'C', 'E'], staffSteps: [3, 5, 7] },
];

export const GAME_MODES = [
  { id: 'basics', label: 'Treble', shortLabel: 'Treble', kind: 'note', clef: 'treble', pool: LEVEL_ONE_NOTES, basePoints: 100, help: 'Natural treble notes.' },
  { id: 'bass', label: 'Bass', shortLabel: 'Bass', kind: 'note', clef: 'bass', pool: BASS_NOTES, basePoints: 120, help: 'Natural bass-clef notes.' },
  { id: 'sharps', label: 'Sharps #', shortLabel: '#', kind: 'note', clef: 'treble', pool: SHARP_NOTES, basePoints: 150, help: 'Treble notes with sharps.' },
  { id: 'flats', label: 'Flats ♭', shortLabel: '♭', kind: 'note', clef: 'treble', pool: FLAT_NOTES, basePoints: 150, help: 'Treble notes with flats.' },
  { id: 'chords', label: 'Chords', shortLabel: 'Chords', kind: 'chord', clef: 'treble', pool: CHORDS, basePoints: 240, help: 'Name the three-note stack.' },
];

export function getMode(modeId = 'basics') {
  return GAME_MODES.find((mode) => mode.id === modeId) || GAME_MODES[0];
}

export function accidentalSymbol(accidental) {
  if (accidental === 'sharp') return '♯';
  if (accidental === 'flat') return '♭';
  return '';
}

export function answerLabel(noteName, accidental) {
  return `${noteName}${accidentalSymbol(accidental)}`;
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

export function getHighScoreKey(modeId = 'basics', speedId = 'normal', difficultyId = 'beginner') {
  return `clefhanger.highScore.${getMode(modeId).id}.${getSpeed(speedId).id}.${getDifficulty(difficultyId).id}.v4`;
}

export function createInitialState({ roundLengthMs = 60000, nowMs = 0, seed = Date.now(), modeId = 'basics', speedId = 'normal', difficultyId = 'beginner' } = {}) {
  const mode = getMode(modeId);
  const speed = getSpeed(speedId);
  const difficulty = getDifficulty(difficultyId);
  return {
    phase: 'idle',
    modeId: mode.id,
    speedId: speed.id,
    difficultyId: difficulty.id,
    roundLengthMs,
    startedAtMs: nowMs,
    endsAtMs: nowMs + roundLengthMs,
    seed: seed >>> 0,
    noteCounter: 0,
    activeNote: null,
    noteQueue: [],
    score: 0,
    pointsEarned: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    missed: 0,
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
    noteQueue,
    feedback: { ...state.feedback },
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

  while (next.noteQueue.length < difficulty.noteQueueSize) {
    const seed = nextRandom(next.seed || 1);
    const index = seed % mode.pool.length;
    const source = mode.pool[index];
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
  const difficulty = getDifficulty(difficultyId);
  const next = createInitialState({ roundLengthMs: state.roundLengthMs, nowMs, seed: state.seed, modeId, speedId, difficultyId: difficulty.id });
  next.phase = 'running';
  next.feedback = { kind: 'running', text: `${getMode(modeId).label} · ${getSpeed(speedId).label} · ${difficulty.label}: name the front note.` };
  return spawnNextNote(next, nowMs);
}

export function answerActiveNote(state, answer, nowMs) {
  if (state.phase !== 'running' && state.phase !== 'idle') return cloneState(state);
  if (!state.activeNote) return cloneState(state);

  const next = cloneState(state);
  const normalized = normalizeAnswer(answer);
  if (normalized === next.activeNote.answer) {
    const mode = getMode(next.modeId);
    const speed = getSpeed(next.speedId);
    const difficulty = getDifficulty(next.difficultyId);
    const streakBonus = Math.min(80, Math.max(0, next.streak) * 20);
    const speedBonus = speed.id === 'fast' ? 40 : 0;
    const points = Math.round((mode.basePoints + speedBonus + streakBonus) * difficulty.scoreMultiplier);
    next.correct += 1;
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.pointsEarned = points;
    next.score += points;
    next.feedback = { kind: 'correct', text: `${normalized} — held on! +${points}` };
    next.noteQueue = (next.noteQueue || []).slice(1);
    next.activeNote = next.noteQueue[0] || null;
  } else {
    next.wrong += 1;
    next.streak = 0;
    next.pointsEarned = 0;
    next.feedback = { kind: 'wrong', text: `${normalized || answer} is not it. Try again.` };
  }
  next.lastInputAtMs = nowMs;
  return next;
}

export function missExpiredNotes(state, nowMs) {
  if (!state.activeNote || nowMs <= state.activeNote.deadlineMs) return cloneState(state);
  const next = cloneState(state);
  next.missed += 1;
  next.streak = 0;
  next.pointsEarned = 0;
  next.feedback = { kind: 'missed', text: `${next.activeNote.answer} fell off the staff.` };
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
  return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
}

export function getRoundSummary(state) {
  const attempts = state.correct + state.wrong + state.missed;
  const accuracy = attempts === 0 ? 0 : Math.round((state.correct / attempts) * 100);
  return { title: 'Sprint complete', mode: getMode(state.modeId).label, speed: getSpeed(state.speedId).label, difficulty: getDifficulty(state.difficultyId).label, score: state.score, correct: state.correct, wrong: state.wrong, missed: state.missed, bestStreak: state.bestStreak, accuracy };
}
