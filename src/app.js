import {
  NOTE_BUTTONS,
  createInitialState,
  startRound,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
} from './core/game.js';

const appVersion = 'clefhanger-slice1-2026-08-28';
const staff = document.querySelector('#staff');
const buttons = document.querySelector('#note-buttons');
const startButton = document.querySelector('#start-round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const timerEl = document.querySelector('#timer');
const feedbackEl = document.querySelector('#feedback');
const summaryEl = document.querySelector('#summary');
const bestEl = document.querySelector('#best-score');

const STORAGE_KEY = 'clefhanger.bestScore.v1';
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975 });
let rafId = null;

function getBestScore() {
  return Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
}

function setBestScore(score) {
  if (score > getBestScore()) {
    localStorage.setItem(STORAGE_KEY, String(score));
  }
}

function yForStaffStep(step) {
  const bottomLineY = 132;
  const halfStep = 10;
  return bottomLineY - step * halfStep;
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
    const y = yForStaffStep(note.staffStep ?? 0);
    active = `
      <g class="active-note" aria-label="Current note">
        <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="9" transform="rotate(-18 ${x.toFixed(1)} ${y.toFixed(1)})" />
        <line x1="${(x + 12).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 12).toFixed(1)}" y2="${(y - 48).toFixed(1)}" />
        ${note.staffStep < 0 ? `<line x1="${(x - 22).toFixed(1)}" y1="152" x2="${(x + 22).toFixed(1)}" y2="152" class="ledger" />` : ''}
      </g>
    `;
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
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
  timerEl.textContent = String(getRemainingSeconds(state, nowMs));
  feedbackEl.textContent = state.feedback.text;
  feedbackEl.dataset.kind = state.feedback.kind;
  bestEl.textContent = String(getBestScore());
  startButton.textContent = state.phase === 'running' ? 'Restart sprint' : 'Start 60s sprint';

  if (state.phase === 'ended') {
    const summary = getRoundSummary(state);
    summaryEl.hidden = false;
    summaryEl.innerHTML = `
      <h2>${summary.title}</h2>
      <p><strong>${summary.score}</strong> points · ${summary.accuracy}% accuracy</p>
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
    setBestScore(state.score);
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
  state = startRound(state, now);
  summaryEl.hidden = true;
  render(now);
  rafId = requestAnimationFrame(tick);
}

function handleAnswer(answer) {
  const now = performance.now();
  state = answerActiveNote(state, answer, now);
  if (state.phase === 'running' && !state.activeNote) {
    state = updateRound(state, now);
  }
  render(now);
}

function installButtons() {
  buttons.innerHTML = '';
  for (const note of NOTE_BUTTONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-button';
    button.textContent = note;
    button.setAttribute('aria-label', `Answer ${note}`);
    button.addEventListener('click', () => handleAnswer(note));
    buttons.append(button);
  }
}

startButton.addEventListener('click', beginRound);
installButtons();
render();

window.__clefHanger = {
  appVersion,
  NOTE_BUTTONS,
  getState: () => state,
  beginRound,
};
