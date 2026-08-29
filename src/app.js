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
import { getCalibrationTone, playPianoVoice } from './core/audio.js';
import {
  buildCalibrationReading,
  buildHeardNoteMessage,
  classifyVocalMatch,
  createMicrophoneState,
  detectPitchFromTimeDomain,
  frequencyToNearestPitch,
  normalizeMicrophoneInputMode,
} from './core/pitch.js';

const appVersion = 'clefhanger-slice12-heard-note-display-2026-08-29';
const staff = document.querySelector('#staff');
const buttons = document.querySelector('#note-buttons');
const pianoStrip = document.querySelector('#piano-strip');
const calibrationPanel = document.querySelector('#calibration-panel');
const playCalibrationToneButton = document.querySelector('#play-calibration-tone');
const startMicrophoneButton = document.querySelector('#start-microphone');
const stopMicrophoneButton = document.querySelector('#stop-microphone');
const microphonePanel = document.querySelector('#microphone-panel');
const microphoneStatusEl = document.querySelector('#microphone-status');
const heardNoteEl = document.querySelector('#heard-note');
const calibrationReadingEl = document.querySelector('#calibration-reading');
const settingsLineEl = document.querySelector('#settings-line');
const openSettingsButton = document.querySelector('#open-settings');
const closeSettingsButton = document.querySelector('#close-settings');
const settingsDialog = document.querySelector('#settings-dialog');
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
let selectedInputMode = normalizeInputMode(localStorage.getItem('clefhanger.selectedInputMode.v7') || localStorage.getItem('clefhanger.selectedInputMode.v5') || 'buttons');
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId });
let rafId = null;
let audioContext = null;
let microphoneState = createMicrophoneState();
let microphoneStream = null;
let microphoneAnalyser = null;
let microphoneBuffer = null;
let microphoneRafId = null;

function getBestScore(modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  return Number.parseInt(localStorage.getItem(getHighScoreKey(modeId, speedId, difficultyId)) || '0', 10) || 0;
}

function setBestScore(score, modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  if (score > getBestScore(modeId, speedId, difficultyId)) localStorage.setItem(getHighScoreKey(modeId, speedId, difficultyId), String(score));
}

function normalizeInputMode(inputMode) {
  return normalizeMicrophoneInputMode(inputMode);
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
  const inputLabel = selectedInputMode === 'piano' ? 'Piano' : selectedInputMode === 'microphone' ? 'Mic' : 'Notes';
  settingsLineEl.textContent = `${mode.label} · ${difficulty.label} · ${speed.label} · ${inputLabel}`;
  startButton.textContent = state.phase === 'running' ? 'Restart sprint' : 'Start 60s sprint';
  for (const button of modeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.mode === selectedModeId ? 'true' : 'false';
  for (const button of difficultyButtons.querySelectorAll('button')) button.dataset.active = button.dataset.difficulty === selectedDifficultyId ? 'true' : 'false';
  for (const button of inputModeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.inputMode === selectedInputMode ? 'true' : 'false';
  buttons.hidden = selectedInputMode !== 'buttons';
  pianoStrip.hidden = selectedInputMode !== 'piano';
  microphonePanel.hidden = selectedInputMode !== 'microphone';
  microphoneStatusEl.textContent = microphoneStatusText();
  heardNoteEl.textContent = buildHeardNoteMessage(microphoneState.note);
  calibrationReadingEl.textContent = microphoneState.calibration?.message || 'Grant mic, tap Play A, then sing A for a live cents reading.';
  calibrationReadingEl.dataset.status = microphoneState.calibration?.status || microphoneState.permission;

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

function playCalibrationTone() {
  const context = getAudioContext();
  if (!context) return;
  const tone = getCalibrationTone();
  playPianoVoice(context, tone.frequency, context.currentTime);
  feedbackEl.dataset.kind = 'correct';
  feedbackEl.textContent = `${tone.label}: ${tone.help}`;
}

function microphoneStatusText() {
  if (microphoneState.permission === 'blocked') return `Mic blocked: ${microphoneState.error || 'permission denied'}`;
  if (microphoneState.listening && microphoneState.note) {
    const cents = microphoneState.cents === null ? '' : ` (${microphoneState.cents > 0 ? '+' : ''}${microphoneState.cents}¢)`;
    return `Listening: ${microphoneState.note.answer}${microphoneState.note.octave} ${Math.round(microphoneState.frequency)} Hz${cents}`;
  }
  if (microphoneState.listening) return 'Listening: sing a steady note.';
  if (microphoneState.permission === 'granted') return 'Mic ready. Sing notes to answer.';
  return 'Mic off. Grant mic to calibrate and sing answers.';
}

function stopMicrophone() {
  if (microphoneRafId !== null) cancelAnimationFrame(microphoneRafId);
  microphoneRafId = null;
  if (microphoneStream) {
    for (const track of microphoneStream.getTracks()) track.stop();
  }
  microphoneStream = null;
  microphoneAnalyser = null;
  microphoneBuffer = null;
  microphoneState = { ...microphoneState, listening: false };
  render();
}

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    microphoneState = { ...microphoneState, permission: 'blocked', listening: false, error: 'getUserMedia unavailable' };
    render();
    return false;
  }
  try {
    const context = getAudioContext();
    if (!context) throw new Error('AudioContext unavailable');
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const source = context.createMediaStreamSource(microphoneStream);
    microphoneAnalyser = context.createAnalyser();
    microphoneAnalyser.fftSize = 2048;
    microphoneBuffer = new Float32Array(microphoneAnalyser.fftSize);
    source.connect(microphoneAnalyser);
    microphoneState = { ...microphoneState, permission: 'granted', listening: true, error: null };
    processMicrophoneFrame();
    render();
    return true;
  } catch (error) {
    microphoneState = { ...microphoneState, permission: 'blocked', listening: false, error: error?.message || 'permission denied' };
    render();
    return false;
  }
}

function processMicrophoneFrame(frequencyOverride = null, nowMs = performance.now()) {
  let frequency = frequencyOverride;
  if (frequency === null && microphoneAnalyser && microphoneBuffer) {
    microphoneAnalyser.getFloatTimeDomainData(microphoneBuffer);
    frequency = detectPitchFromTimeDomain(microphoneBuffer, audioContext?.sampleRate || 44100);
  }

  if (frequency) {
    const note = frequencyToNearestPitch(frequency);
    const calibration = buildCalibrationReading(frequency);
    microphoneState = { ...microphoneState, frequency, note, cents: note?.cents ?? null, calibration };
    if (selectedInputMode === 'microphone' && state.phase === 'running') {
      const match = classifyVocalMatch({ prompt: state.activeNote, frequency, nowMs, lastAcceptedAtMs: microphoneState.lastAcceptedAtMs });
      if (match.status === 'match') {
        microphoneState = { ...microphoneState, lastAcceptedAtMs: nowMs };
        handleAnswer(match.answer);
      }
    }
  } else {
    microphoneState = { ...microphoneState, frequency: null, note: null, cents: null };
  }

  render(nowMs);
  if (microphoneState.listening && frequencyOverride === null) microphoneRafId = requestAnimationFrame(processMicrophoneFrame);
  return microphoneState;
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
      selectedInputMode = normalizeInputMode(button.dataset.inputMode);
      localStorage.setItem('clefhanger.selectedInputMode.v7', selectedInputMode);
      render();
    });
  }
}

function openSettings() {
  if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal();
  else settingsDialog.setAttribute('open', '');
}

function closeSettings() {
  if (typeof settingsDialog.close === 'function') settingsDialog.close();
  else settingsDialog.removeAttribute('open');
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
playCalibrationToneButton.addEventListener('click', playCalibrationTone);
startMicrophoneButton.addEventListener('click', startMicrophone);
stopMicrophoneButton.addEventListener('click', stopMicrophone);
openSettingsButton.addEventListener('click', openSettings);
closeSettingsButton.addEventListener('click', closeSettings);
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
    selectedInputMode = normalizeInputMode(inputMode);
    render();
  },
  playPromptAudio,
  playCalibrationTone,
  startMicrophone,
  stopMicrophone,
  processMicrophoneFrame,
  getMicrophoneState: () => microphoneState,
  openSettings,
  closeSettings,
};
