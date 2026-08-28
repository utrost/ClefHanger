import {
  NOTE_BUTTONS,
  ACCIDENTAL_BUTTONS,
  GAME_MODES,
  createInitialState,
  startRound,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
  getHighScoreKey,
  getMode,
  normalizeAnswer,
} from './core/game.js';

const appVersion = 'clefhanger-slice2-2026-08-28';
const staff = document.querySelector('#staff');
const buttons = document.querySelector('#note-buttons');
const modeButtons = document.querySelector('#mode-buttons');
const startButton = document.querySelector('#start-round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const timerEl = document.querySelector('#timer');
const feedbackEl = document.querySelector('#feedback');
const summaryEl = document.querySelector('#summary');
const bestEl = document.querySelector('#best-score');
const modeLabelEl = document.querySelector('#mode-label');
const modeHelpEl = document.querySelector('#mode-help');
const answerEntry = document.querySelector('#answer-entry');
const submitAnswer = document.querySelector('#submit-answer');

let selectedModeId = localStorage.getItem('clefhanger.selectedMode.v2') || 'basics';
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975, modeId: selectedModeId });
let rafId = null;

function getBestScore(modeId = selectedModeId) {
  return Number.parseInt(localStorage.getItem(getHighScoreKey(modeId)) || '0', 10) || 0;
}

function setBestScore(score, modeId = selectedModeId) {
  if (score > getBestScore(modeId)) {
    localStorage.setItem(getHighScoreKey(modeId), String(score));
  }
}

function yForStaffStep(step) {
  const bottomLineY = 132;
  const halfStep = 10;
  return bottomLineY - step * halfStep;
}

function accidentalGlyph(note) {
  if (note.accidental === 'sharp') return '♯';
  if (note.accidental === 'flat') return '♭';
  return '';
}

function renderSingleNote(note, x, y) {
  const accidental = accidentalGlyph(note);
  return `
    <g class="active-note" aria-label="Current note">
      ${accidental ? `<text x="${(x - 31).toFixed(1)}" y="${(y + 9).toFixed(1)}" class="accidental">${accidental}</text>` : ''}
      <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="9" transform="rotate(-18 ${x.toFixed(1)} ${y.toFixed(1)})" />
      <line x1="${(x + 12).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 12).toFixed(1)}" y2="${(y - 48).toFixed(1)}" />
      ${note.staffStep < 0 ? `<line x1="${(x - 22).toFixed(1)}" y1="152" x2="${(x + 22).toFixed(1)}" y2="152" class="ledger" />` : ''}
    </g>
  `;
}

function renderChord(note, x) {
  return note.staffSteps
    .map((step, index) => {
      const y = yForStaffStep(step);
      const offset = index % 2 === 0 ? -5 : 9;
      return `<ellipse cx="${(x + offset).toFixed(1)}" cy="${y.toFixed(1)}" rx="12" ry="8" transform="rotate(-18 ${(x + offset).toFixed(1)} ${y.toFixed(1)})" />`;
    })
    .join('') + `<line x1="${(x + 21).toFixed(1)}" y1="36" x2="${(x + 21).toFixed(1)}" y2="136" />`;
}

function renderStaff(nowMs) {
  const note = state.activeNote;
  const lines = [52, 72, 92, 112, 132]
    .map((y) => `<line x1="18" y1="${y}" x2="318" y2="${y}" class="staff-line" />`)
    .join('');

  const cliff = `
    <line x1="294" y1="38" x2="294" y2="154" class="cliff-line" />
    <path d="M294 154 l18 16 l-36 0 z" class="cliff-rock" />
    <text x="26" y="36" class="clef">𝄞</text>
  `;

  let active = '';
  if (note) {
    const progress = Math.min(1, Math.max(0, (nowMs - note.spawnedAtMs) / (note.deadlineMs - note.spawnedAtMs)));
    const x = 56 + progress * 218;
    if (note.kind === 'chord') {
      active = `<g class="active-note chord-note" aria-label="Current chord">${renderChord(note, x)}</g>`;
    } else {
      active = renderSingleNote(note, x, yForStaffStep(note.staffStep ?? 0));
    }
  }

  staff.innerHTML = `
    <svg viewBox="0 0 330 180" role="img" aria-label="Treble staff with cliff edge">
      ${lines}
      ${cliff}
      ${active}
    </svg>
  `;
}

function renderHud(nowMs) {
  const mode = getMode(selectedModeId);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
  timerEl.textContent = String(getRemainingSeconds(state, nowMs));
  feedbackEl.textContent = state.feedback.text;
  feedbackEl.dataset.kind = state.feedback.kind;
  bestEl.textContent = String(getBestScore(selectedModeId));
  modeLabelEl.textContent = mode.label;
  modeHelpEl.textContent = mode.help;
  startButton.textContent = state.phase === 'running' ? 'Restart sprint' : 'Start 60s sprint';
  answerEntry.placeholder = mode.kind === 'chord' ? 'Chord answer, e.g. C-E-G' : 'Optional typed answer, e.g. F# or Bb';

  for (const button of modeButtons.querySelectorAll('button')) {
    button.dataset.active = button.dataset.mode === selectedModeId ? 'true' : 'false';
  }

  if (state.phase === 'ended') {
    const summary = getRoundSummary(state);
    summaryEl.hidden = false;
    summaryEl.innerHTML = `
      <h2>${summary.title}</h2>
      <p>${summary.mode} · <strong>${summary.score}</strong> points · ${summary.accuracy}% accuracy</p>
      <p>${summary.correct} correct · ${summary.wrong} wrong · ${summary.missed} missed · best streak ${summary.bestStreak}</p>
    `;
  } else {
    summaryEl.hidden = true;
  }
}

function render(nowMs = performance.now()) {
  renderStaff(nowMs);
  renderHud(nowMs);
}

function tick(nowMs) {
  state = updateRound(state, nowMs);
  if (state.phase === 'ended') {
    setBestScore(state.score, state.modeId);
    render(nowMs);
    rafId = null;
    return;
  }
  render(nowMs);
  rafId = requestAnimationFrame(tick);
}

function beginRound() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  const now = performance.now();
  state = startRound(state, now, selectedModeId);
  summaryEl.hidden = true;
  answerEntry.value = '';
  render(now);
  rafId = requestAnimationFrame(tick);
}

function handleAnswer(answer) {
  const now = performance.now();
  state = answerActiveNote(state, answer, now);
  if (state.phase === 'running' && !state.activeNote) {
    state = updateRound(state, now);
  }
  answerEntry.value = '';
  render(now);
}

function installButtons() {
  buttons.innerHTML = '';
  const answers = [...NOTE_BUTTONS, ...ACCIDENTAL_BUTTONS];
  for (const note of answers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = note.length === 1 ? 'note-button' : 'note-button accidental-button';
    button.textContent = note;
    button.setAttribute('aria-label', `Answer ${note}`);
    button.addEventListener('click', () => handleAnswer(note));
    buttons.append(button);
  }
}

function installModes() {
  modeButtons.innerHTML = '';
  for (const mode of GAME_MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-button';
    button.dataset.mode = mode.id;
    button.textContent = mode.label;
    button.addEventListener('click', () => {
      selectedModeId = mode.id;
      localStorage.setItem('clefhanger.selectedMode.v2', selectedModeId);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      state = createInitialState({ roundLengthMs: state.roundLengthMs, nowMs: performance.now(), seed: state.seed, modeId: selectedModeId });
      render();
    });
    modeButtons.append(button);
  }
}

submitAnswer.addEventListener('click', () => handleAnswer(normalizeAnswer(answerEntry.value)));
answerEntry.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleAnswer(normalizeAnswer(answerEntry.value));
});
startButton.addEventListener('click', beginRound);
installModes();
installButtons();
render();

window.__clefHanger = {
  appVersion,
  NOTE_BUTTONS,
  ACCIDENTAL_BUTTONS,
  GAME_MODES,
  getState: () => state,
  beginRound,
  selectMode: (modeId) => {
    selectedModeId = getMode(modeId).id;
    state = createInitialState({ roundLengthMs: state.roundLengthMs, nowMs: performance.now(), seed: state.seed, modeId: selectedModeId });
    render();
  },
};
