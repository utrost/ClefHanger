import {
  NOTE_BUTTONS,
  ACCIDENTAL_BUTTONS,
  PIANO_WHITE_KEYS,
  PIANO_BLACK_KEYS,
  GAME_MODES,
  SPEED_SETTINGS,
  DIFFICULTY_LEVELS,
  STAFF_LAYOUT,
  createInitialState,
  startRound,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
  getHighScoreKey,
  getMode,
  getSpeed,
  getDifficulty,
  getClefPresentation,
  getAnswerOptions,
  getPromptFrequencies,
} from './core/game.js';
import { playPianoVoice } from './core/audio.js';

const appVersion = 'clefhanger-slice8-piano-audio-2026-08-28';
const staff = document.querySelector('#staff');
const buttons = document.querySelector('#note-buttons');
const pianoStrip = document.querySelector('#piano-strip');
const inputModeButtons = document.querySelector('#input-mode-buttons');
const modeButtons = document.querySelector('#mode-buttons');
const speedSlider = document.querySelector('#speed-slider');
const difficultyButtons = document.querySelector('#difficulty-buttons');
const startButton = document.querySelector('#start-round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const timerEl = document.querySelector('#timer');
const feedbackEl = document.querySelector('#feedback');
const summaryEl = document.querySelector('#summary');
const bestEl = document.querySelector('#best-score');
const modeLabelEl = document.querySelector('#mode-label');
const modeHelpEl = document.querySelector('#mode-help');
const speedLabelEl = document.querySelector('#speed-label');
const difficultyLabelEl = document.querySelector('#difficulty-label');
const difficultyHelpEl = document.querySelector('#difficulty-help');

let selectedModeId = localStorage.getItem('clefhanger.selectedMode.v3') || 'basics';
let selectedSpeedId = getSpeed(localStorage.getItem('clefhanger.selectedSpeed.v6') || localStorage.getItem('clefhanger.selectedSpeed.v3') || '5').id;
let selectedDifficultyId = localStorage.getItem('clefhanger.selectedDifficulty.v4') || 'beginner';
let selectedInputMode = localStorage.getItem('clefhanger.selectedInputMode.v5') || 'buttons';
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId });
let rafId = null;
let audioContext = null;

function getBestScore(modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  return Number.parseInt(localStorage.getItem(getHighScoreKey(modeId, speedId, difficultyId)) || '0', 10) || 0;
}

function setBestScore(score, modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  if (score > getBestScore(modeId, speedId, difficultyId)) localStorage.setItem(getHighScoreKey(modeId, speedId, difficultyId), String(score));
}

function yForStaffStep(step) {
  return STAFF_LAYOUT.bottomLineY - step * STAFF_LAYOUT.halfStep;
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
  const mode = getMode(state.modeId);
  const clef = getClefPresentation(note?.clef || mode.clef || 'treble');
  const lines = [52, 72, 92, 112, 132]
    .map((y) => `<line x1="18" y1="${y}" x2="318" y2="${y}" class="staff-line" />`)
    .join('');

  const cliff = `
    <line x1="294" y1="38" x2="294" y2="154" class="cliff-line" />
    <path d="M294 154 l18 16 l-36 0 z" class="cliff-rock" />
    <text x="${clef.x}" y="${clef.y}" class="clef clef-${clef.clef}" aria-label="${clef.clef} clef">${clef.glyph}</text>
  `;

  let active = '';
  const queue = state.noteQueue?.length ? state.noteQueue : (note ? [note] : []);
  active = [
    ...queue.slice(1).map((queuedNote, index) => ({ queuedNote, index: index + 1 })),
    ...queue.slice(0, 1).map((queuedNote) => ({ queuedNote, index: 0 })),
  ]
    .map(({ queuedNote, index }) => {
      const progress = Math.min(1, Math.max(0, (nowMs - queuedNote.spawnedAtMs) / (queuedNote.deadlineMs - queuedNote.spawnedAtMs)));
      const x = 72 + progress * 202;
      const noteMarkup = queuedNote.kind === 'chord'
        ? renderChord(queuedNote, x)
        : renderSingleNote(queuedNote, x, yForStaffStep(queuedNote.staffStep ?? 0));
      const previewClass = index === 0 ? 'lead-note' : 'preview-note';
      return `<g class="queue-note ${previewClass}" data-queue-index="${index}">${noteMarkup}</g>`;
    })
    .join('');

  staff.innerHTML = `
    <svg viewBox="0 0 330 180" role="img" aria-label="${clef.clef} staff with cliff edge">
      ${lines}
      ${cliff}
      ${active}
    </svg>
  `;
}

function renderHud(nowMs) {
  const mode = getMode(selectedModeId);
  const speed = getSpeed(selectedSpeedId);
  const difficulty = getDifficulty(selectedDifficultyId);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
  timerEl.textContent = String(getRemainingSeconds(state, nowMs));
  feedbackEl.textContent = state.feedback.text;
  feedbackEl.dataset.kind = state.feedback.kind;
  bestEl.textContent = String(getBestScore(selectedModeId, selectedSpeedId, selectedDifficultyId));
  modeLabelEl.textContent = mode.label;
  modeHelpEl.textContent = mode.help;
  speedLabelEl.textContent = speed.label;
  speedSlider.value = speed.id;
  difficultyLabelEl.textContent = difficulty.label;
  difficultyHelpEl.textContent = difficulty.help;
  startButton.textContent = state.phase === 'running' ? 'Restart sprint' : 'Start 60s sprint';
  for (const button of modeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.mode === selectedModeId ? 'true' : 'false';
  for (const button of difficultyButtons.querySelectorAll('button')) button.dataset.active = button.dataset.difficulty === selectedDifficultyId ? 'true' : 'false';
  for (const button of inputModeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.inputMode === selectedInputMode ? 'true' : 'false';
  buttons.hidden = selectedInputMode !== 'buttons';
  pianoStrip.hidden = selectedInputMode !== 'piano';

  if (state.phase === 'ended') {
    const summary = getRoundSummary(state);
    summaryEl.hidden = false;
    summaryEl.innerHTML = `<h2>${summary.title}</h2><p>${summary.mode} · ${summary.speed} · ${summary.difficulty} · <strong>${summary.score}</strong> points · ${summary.accuracy}% accuracy</p><p>${summary.correct} correct · ${summary.wrong} wrong · ${summary.missed} missed · best streak ${summary.bestStreak}</p>`;
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
    setBestScore(state.score, state.modeId, state.speedId, state.difficultyId);
    render(nowMs);
    rafId = null;
    return;
  }
  render(nowMs);
  rafId = requestAnimationFrame(tick);
}

function resetIdleState() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  state = createInitialState({ roundLengthMs: state.roundLengthMs, nowMs: performance.now(), seed: state.seed, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId });
  installButtons();
  installPiano();
  render();
}

function beginRound() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  const now = performance.now();
  state = startRound(state, now, selectedModeId, selectedSpeedId, selectedDifficultyId);
  summaryEl.hidden = true;
  render(now);
  rafId = requestAnimationFrame(tick);
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playPromptAudio(prompt) {
  const context = getAudioContext();
  if (!context) return;
  const frequencies = getPromptFrequencies(prompt);
  frequencies.forEach((frequency, index) => {
    const startAt = context.currentTime + index * 0.085;
    playPianoVoice(context, frequency, startAt);
  });
}

function handleAnswer(answer) {
  const now = performance.now();
  const answeredPrompt = state.activeNote;
  state = answerActiveNote(state, answer, now);
  if (state.feedback.kind === 'correct') playPromptAudio(answeredPrompt);
  if (state.phase === 'running') state = updateRound(state, now);
  render(now);
}

function installButtons() {
  buttons.innerHTML = '';
  const answers = getAnswerOptions(selectedModeId);
  for (const option of answers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = option.label.length === 1 ? 'note-button' : 'note-button accidental-button';
    button.textContent = option.label;
    button.setAttribute('aria-label', `Answer ${option.label}`);
    button.addEventListener('click', () => handleAnswer(option.answer));
    buttons.append(button);
  }
}

function blackKeyAnswer(key, mode) {
  if (mode.id === 'flats') return key.flat;
  if (mode.id === 'sharps') return key.sharp;
  return null;
}

function installPiano() {
  pianoStrip.innerHTML = '';
  const mode = getMode(selectedModeId);
  for (const note of PIANO_WHITE_KEYS) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'piano-key white-key';
    key.textContent = note;
    key.setAttribute('aria-label', `Piano key ${note}`);
    key.addEventListener('click', () => handleAnswer(note));
    pianoStrip.append(key);
  }

  for (const keyDefinition of PIANO_BLACK_KEYS) {
    const answer = blackKeyAnswer(keyDefinition, mode);
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'piano-key black-key';
    key.dataset.after = keyDefinition.after;
    key.textContent = answer || keyDefinition.sharp;
    key.disabled = !answer;
    key.setAttribute('aria-label', answer ? `Piano black key ${answer}` : `Black key ${keyDefinition.sharp}`);
    if (answer) key.addEventListener('click', () => handleAnswer(answer));
    pianoStrip.append(key);
  }
}

function installInputModes() {
  for (const button of inputModeButtons.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      selectedInputMode = button.dataset.inputMode === 'piano' ? 'piano' : 'buttons';
      localStorage.setItem('clefhanger.selectedInputMode.v5', selectedInputMode);
      render();
    });
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
      localStorage.setItem('clefhanger.selectedMode.v3', selectedModeId);
      resetIdleState();
    });
    modeButtons.append(button);
  }
}

function installSpeedSlider() {
  speedSlider.addEventListener('input', () => {
    selectedSpeedId = getSpeed(speedSlider.value).id;
    localStorage.setItem('clefhanger.selectedSpeed.v6', selectedSpeedId);
    resetIdleState();
  });
}

function installDifficulties() {
  difficultyButtons.innerHTML = '';
  for (const difficulty of DIFFICULTY_LEVELS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'difficulty-button';
    button.dataset.difficulty = difficulty.id;
    button.textContent = difficulty.label;
    button.addEventListener('click', () => {
      selectedDifficultyId = difficulty.id;
      localStorage.setItem('clefhanger.selectedDifficulty.v4', selectedDifficultyId);
      resetIdleState();
    });
    difficultyButtons.append(button);
  }
}

startButton.addEventListener('click', beginRound);
installInputModes();
installModes();
installSpeedSlider();
installDifficulties();
installButtons();
installPiano();
render();

window.__clefHanger = {
  appVersion,
  NOTE_BUTTONS,
  ACCIDENTAL_BUTTONS,
  PIANO_WHITE_KEYS,
  PIANO_BLACK_KEYS,
  GAME_MODES,
  SPEED_SETTINGS,
  DIFFICULTY_LEVELS,
  STAFF_LAYOUT,
  getState: () => state,
  beginRound,
  selectMode: (modeId) => {
    selectedModeId = getMode(modeId).id;
    resetIdleState();
  },
  selectSpeed: (speedId) => {
    selectedSpeedId = getSpeed(speedId).id;
    localStorage.setItem('clefhanger.selectedSpeed.v6', selectedSpeedId);
    resetIdleState();
  },
  selectDifficulty: (difficultyId) => {
    selectedDifficultyId = getDifficulty(difficultyId).id;
    resetIdleState();
  },
  selectInputMode: (inputMode) => {
    selectedInputMode = inputMode === 'piano' ? 'piano' : 'buttons';
    render();
  },
  playPromptAudio,
};
