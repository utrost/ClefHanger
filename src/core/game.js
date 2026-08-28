export const NOTE_BUTTONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const LEVEL_ONE_NOTES = [
  { noteName: 'C', octave: 4, staffStep: -2, label: 'middle C' },
  { noteName: 'D', octave: 4, staffStep: -1, label: 'D4' },
  { noteName: 'E', octave: 4, staffStep: 0, label: 'bottom line E' },
  { noteName: 'F', octave: 4, staffStep: 1, label: 'F4' },
  { noteName: 'G', octave: 4, staffStep: 2, label: 'G4' },
  { noteName: 'A', octave: 4, staffStep: 3, label: 'A4' },
  { noteName: 'B', octave: 4, staffStep: 4, label: 'B4' },
  { noteName: 'C', octave: 5, staffStep: 5, label: 'C5' },
  { noteName: 'D', octave: 5, staffStep: 6, label: 'D5' },
  { noteName: 'E', octave: 5, staffStep: 7, label: 'top space E' },
  { noteName: 'F', octave: 5, staffStep: 8, label: 'top line F' },
];

export function createInitialState({ roundLengthMs = 60000, nowMs = 0, seed = Date.now() } = {}) {
  return {
    phase: 'idle',
    roundLengthMs,
    startedAtMs: nowMs,
    endsAtMs: nowMs + roundLengthMs,
    seed: seed >>> 0,
    noteCounter: 0,
    activeNote: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    missed: 0,
    feedback: { kind: 'idle', text: 'Tap Start when ready.' },
  };
}

export function createNote({ id, noteName, octave, spawnedAtMs, travelMs = 5200, staffStep }) {
  const definition = LEVEL_ONE_NOTES.find((note) => note.noteName === noteName && note.octave === octave);
  return {
    id,
    clef: 'treble',
    noteName,
    octave,
    answer: noteName,
    spawnedAtMs,
    deadlineMs: spawnedAtMs + travelMs,
    status: 'active',
    ...(staffStep === undefined && definition ? {} : { staffStep }),
  };
}

function cloneState(state) {
  return {
    ...state,
    activeNote: state.activeNote ? { ...state.activeNote } : null,
    feedback: { ...state.feedback },
  };
}

function nextRandom(seed) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function spawnNextNote(state, nowMs) {
  const next = cloneState(state);
  const seed = nextRandom(next.seed || 1);
  const index = seed % LEVEL_ONE_NOTES.length;
  const source = LEVEL_ONE_NOTES[index];
  next.seed = seed;
  next.noteCounter += 1;
  next.activeNote = {
    ...createNote({
      id: `note-${next.noteCounter}`,
      noteName: source.noteName,
      octave: source.octave,
      spawnedAtMs: nowMs,
      travelMs: 5200,
      staffStep: source.staffStep,
    }),
    staffStep: source.staffStep,
    label: source.label,
  };
  return next;
}

export function startRound(state, nowMs) {
  const next = createInitialState({ roundLengthMs: state.roundLengthMs, nowMs, seed: state.seed });
  next.phase = 'running';
  next.feedback = { kind: 'running', text: 'Name the note before it drops.' };
  return spawnNextNote(next, nowMs);
}

export function answerActiveNote(state, answer, nowMs) {
  if (state.phase !== 'running' && state.phase !== 'idle') return cloneState(state);
  if (!state.activeNote) return cloneState(state);

  const next = cloneState(state);
  if (answer === next.activeNote.answer) {
    next.correct += 1;
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.score += 100 + Math.min(50, (next.streak - 1) * 10);
    next.feedback = { kind: 'correct', text: `${answer} — held on!` };
    next.activeNote = null;
  } else {
    next.wrong += 1;
    next.streak = 0;
    next.feedback = { kind: 'wrong', text: `${answer} is not it. Try again.` };
  }
  next.lastInputAtMs = nowMs;
  return next;
}

export function missExpiredNotes(state, nowMs) {
  if (!state.activeNote || nowMs <= state.activeNote.deadlineMs) return cloneState(state);
  const next = cloneState(state);
  next.missed += 1;
  next.streak = 0;
  next.feedback = { kind: 'missed', text: `${next.activeNote.answer} fell off the staff.` };
  next.activeNote = null;
  return next;
}

export function maybeEndRound(state, nowMs) {
  if (state.phase === 'running' && nowMs >= state.endsAtMs) {
    const next = cloneState(state);
    next.phase = 'ended';
    next.activeNote = null;
    next.feedback = { kind: 'ended', text: 'Sprint complete.' };
    return next;
  }
  return cloneState(state);
}

export function updateRound(state, nowMs) {
  let next = missExpiredNotes(state, nowMs);
  next = maybeEndRound(next, nowMs);
  if (next.phase === 'running' && !next.activeNote) {
    next = spawnNextNote(next, nowMs);
  }
  return next;
}

export function getRemainingSeconds(state, nowMs) {
  return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
}

export function getRoundSummary(state) {
  const attempts = state.correct + state.wrong + state.missed;
  const accuracy = attempts === 0 ? 0 : Math.round((state.correct / attempts) * 100);
  return {
    title: 'Sprint complete',
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    missed: state.missed,
    bestStreak: state.bestStreak,
    accuracy,
  };
}
