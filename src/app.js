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
  startPractice,
  spawnNextNote,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
  getHighScoreKey,
  getMode,
  getSpeed,
  getDifficulty,
  getClefPresentation,
  getLedgerLinesForStaffStep,
  getAnswerOptions,
  getPromptFrequencies,
  createGhostNoteFromPitch,
} from './core/game.js?v=clefhanger-slice40-accidental-learning-2026-09-01';
import { getCalibrationTone, playPianoVoice } from './core/audio.js?v=clefhanger-slice40-accidental-learning-2026-09-01';
import {
  buildCalibrationReading,
  buildHeardNoteMessage,
  buildMicrophoneListeningMessage,
  createMicrophoneState,
  detectPitchFromRecordedAudio,
  detectPitchFromTimeDomain,
  evaluateVocalMatchFrame,
  frequencyToNearestPitch,
  getBuiltInVocalMicrophoneConstraints,
  getCenteredRms,
  normalizeMicrophoneInputMode,
} from './core/pitch.js?v=clefhanger-slice40-accidental-learning-2026-09-01';
import { buildMicDiagnosticReport, buildMicDiagnosticTextFile, formatDiagnosticLevelPercent } from './core/mic-diagnostics.js?v=clefhanger-slice40-accidental-learning-2026-09-01';
import { BEGINNER_LESSONS, buildAccidentalLearningHint, buildBeginnerMicMessage, buildCorrectionOverlay, buildLearningRecommendation, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getScaffoldedAnswerOptions } from './core/learning.js?v=clefhanger-slice40-accidental-learning-2026-09-01';

const appVersion = 'clefhanger-slice40-accidental-learning-2026-09-01';
const staff = document.querySelector('#staff');
const buttons = document.querySelector('#note-buttons');
const pianoStrip = document.querySelector('#piano-strip');
const calibrationPanel = document.querySelector('#calibration-panel');
const playCalibrationToneButton = document.querySelector('#play-calibration-tone');
const startMicrophoneButton = document.querySelector('#start-microphone');
const stopMicrophoneButton = document.querySelector('#stop-microphone');
const recordMicrophoneDiagnosticButton = document.querySelector('#record-microphone-diagnostic');
const exportMicReportButton = document.querySelector('#export-mic-report');
const micLabLabelEl = document.querySelector('#mic-lab-label');
const micReportPreviewEl = document.querySelector('#mic-report-preview');
const microphonePanel = document.querySelector('#microphone-panel');
const microphoneStatusEl = document.querySelector('#microphone-status');
const heardNoteEl = document.querySelector('#heard-note');
const microphoneRecordingDiagnosticEl = document.querySelector('#microphone-recording-diagnostic');
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
const tutorialCard = document.querySelector('#tutorial-card');
const tutorialText = document.querySelector('#tutorial-text');
const tutorialNextButton = document.querySelector('#tutorial-next');
const tutorialDismissButton = document.querySelector('#tutorial-dismiss');
const playStyleButtons = document.querySelectorAll('[data-play-style]');
const lessonSelect = document.querySelector('#lesson-select');
const lessonIntro = document.querySelector('#lesson-intro');
const lessonIntroTitle = document.querySelector('#lesson-intro-title');
const lessonIntroBody = document.querySelector('#lesson-intro-body');
const lessonIntroExamples = document.querySelector('#lesson-intro-examples');
const lessonIntroDismissButton = document.querySelector('#lesson-intro-dismiss');
const hintToggle = document.querySelector('#hint-toggle');
const microphoneDebugTextEl = document.querySelector('#microphone-debug-text');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const timerEl = document.querySelector('#timer');
const feedbackEl = document.querySelector('#feedback');
const learningCoachEl = document.querySelector('#learning-coach');
const summaryEl = document.querySelector('#summary');
const summaryTitleEl = document.querySelector('#summary-title');
const summaryContextEl = document.querySelector('#summary-context');
const summaryHeadlineEl = document.querySelector('#summary-headline');
const summaryDetailEl = document.querySelector('#summary-detail');
const summaryRestartButton = document.querySelector('#summary-restart');
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
let selectedPlayStyle = localStorage.getItem('clefhanger.selectedPlayStyle.v1') || 'practice';
let selectedLessonId = getBeginnerLesson(localStorage.getItem('clefhanger.selectedLesson.v1') || 'first-steps').id;
let showHints = localStorage.getItem('clefhanger.showHints.v1') !== 'false';
let lessonIntroHidden = localStorage.getItem('clefhanger.lessonIntroHidden.v1') === 'true';
let tutorialStepIndex = 0;
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId, lessonId: selectedLessonId });
let rafId = null;
let audioContext = null;
let microphoneState = createMicrophoneState();
let microphoneStream = null;
let microphoneSource = null;
let microphoneAnalyser = null;
let microphoneKeepAliveGain = null;
let microphoneBuffer = null;
let microphoneRafId = null;
let microphoneRecordingDiagnostic = 'Recording test: not run yet.';
let microphoneDebugText = 'No recording details yet.';
let lastMicRecordingEvidence = null;
let lastMicReport = null;

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

function escapeSvgText(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function renderLedgerLines(note, x) {
  return getLedgerLinesForStaffStep(note.staffStep ?? 0)
    .map((line) => `<line x1="${(x - STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y1="${line.y}" x2="${(x + STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y2="${line.y}" class="ledger" data-ledger-step="${line.staffStep}" />`)
    .join('');
}

function renderSingleNote(note, x, y, correction = null) {
  const accidental = accidentalGlyph(note);
  const correctionMarkup = correction ? `
      <g class="correction-label" role="img" aria-label="${escapeSvgText(correction.ariaLabel)}">
        <rect x="${(x - 17).toFixed(1)}" y="${(y - 68).toFixed(1)}" width="34" height="30" rx="10" />
        <text x="${x.toFixed(1)}" y="${(y - 52).toFixed(1)}">${escapeSvgText(correction.label)}</text>
      </g>` : '';
  return `
    <g class="active-note" aria-label="Current note">
      ${accidental ? `<text x="${(x - 31).toFixed(1)}" y="${(y + 9).toFixed(1)}" class="accidental">${accidental}</text>` : ''}
      <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="9" transform="rotate(-18 ${x.toFixed(1)} ${y.toFixed(1)})" />
      <line x1="${(x + 12).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 12).toFixed(1)}" y2="${(y - 48).toFixed(1)}" />
      ${renderLedgerLines(note, x)}
      ${correctionMarkup}
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

function renderGhostNote(clef, x = 98) {
  if (selectedInputMode !== 'microphone' || !microphoneState.note) return '';
  const ghost = createGhostNoteFromPitch(microphoneState.note, clef);
  if (!ghost) return '';
  const y = yForStaffStep(ghost.staffStep);
  return `
    <g class="ghost-note" aria-label="Ghost note you played: ${escapeSvgText(ghost.displayName)}">
      ${renderSingleNote(ghost, x, y)}
      <text x="${x.toFixed(1)}" y="166" class="ghost-label">you played ${escapeSvgText(ghost.displayName)}</text>
    </g>
  `;
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
      const isLeadNote = index === 0;
      const storedCorrection = isLeadNote && state.correction?.answer === queuedNote.answer && (!state.correction.frozenUntilMs || nowMs <= state.correction.frozenUntilMs) ? state.correction : null;
      const correction = storedCorrection;
      const progressNowMs = correction?.shouldFreezeNote && correction.frozenAtMs ? Math.min(nowMs, correction.frozenAtMs) : nowMs;
      const progress = Math.min(1, Math.max(0, (progressNowMs - queuedNote.spawnedAtMs) / (queuedNote.deadlineMs - queuedNote.spawnedAtMs)));
      const x = 72 + progress * 202;
      const noteMarkup = queuedNote.kind === 'chord'
        ? renderChord(queuedNote, x)
        : renderSingleNote(queuedNote, x, yForStaffStep(queuedNote.staffStep ?? 0), correction);
      const previewClass = isLeadNote ? 'lead-note' : 'preview-note';
      return `<g class="queue-note ${previewClass}" data-queue-index="${index}" data-correction-active="${correction ? 'true' : 'false'}">${noteMarkup}</g>`;
    })
    .join('');

  const ghostX = note
    ? Math.max(98, 72 + Math.min(1, Math.max(0, (nowMs - note.spawnedAtMs) / (note.deadlineMs - note.spawnedAtMs))) * 202)
    : 98;
  staff.innerHTML = `
    <svg viewBox="0 0 330 180" role="img" aria-label="${clef.clef} staff with cliff edge">
      ${lines}
      ${cliff}
      ${renderGhostNote(clef.clef, ghostX)}
      ${active}
    </svg>
  `;
}

function calibrationReadingText() {
  if (microphoneState.calibration?.message) return microphoneState.calibration.message;
  if (microphoneState.permission === 'requesting' || microphoneState.permission === 'blocked' || microphoneState.permission === 'granted') {
    return microphoneStatusText();
  }
  return 'Grant mic, then sing any steady comfortable note; Play A is only a reference.';
}

function renderLessonIntro() {
  const intro = getLessonIntroCard(selectedLessonId);
  lessonIntro.hidden = lessonIntroHidden;
  lessonIntroTitle.textContent = intro.title;
  lessonIntroBody.textContent = intro.body;
  lessonIntroExamples.textContent = intro.examples.join(' · ');
}

function currentLearningRecommendation() {
  const accidentalHint = buildAccidentalLearningHint({ modeId: selectedModeId, prompt: state.activeNote });
  if (accidentalHint) return accidentalHint;
  const attempts = state.correct + state.wrong + state.missed;
  const accuracy = attempts > 0 ? Math.round((state.correct / attempts) * 100) : 0;
  const microphoneStable = selectedInputMode !== 'microphone' || Boolean(microphoneState.note && microphoneState.frequency);
  return buildLearningRecommendation({
    playStyle: state.phase === 'running' || state.phase === 'ended' ? 'rush' : 'practice',
    lessonId: selectedLessonId,
    correct: state.correct,
    wrong: state.wrong,
    missed: state.missed,
    bestStreak: state.bestStreak,
    accuracy,
    speedId: selectedSpeedId,
    inputMode: selectedInputMode,
    microphoneStable,
  });
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
  const learningRecommendation = currentLearningRecommendation();
  learningCoachEl.textContent = learningRecommendation.text;
  learningCoachEl.dataset.kind = learningRecommendation.kind;
  bestEl.textContent = String(getBestScore(selectedModeId, selectedSpeedId, selectedDifficultyId));
  modeLabelEl.textContent = mode.label;
  modeHelpEl.textContent = mode.help;
  speedLabelEl.textContent = speed.label;
  speedSlider.value = speed.id;
  difficultyLabelEl.textContent = difficulty.label;
  difficultyHelpEl.textContent = difficulty.help;
  const inputLabel = selectedInputMode === 'piano' ? 'Piano' : selectedInputMode === 'microphone' ? 'Sing/Play' : 'Notes';
  const lesson = getBeginnerLesson(selectedLessonId);
  settingsLineEl.textContent = `${mode.label} · ${difficulty.label} · ${speed.label} · ${inputLabel} · ${selectedPlayStyle === 'practice' ? lesson.label : 'Rush'}`;
  startButton.textContent = state.phase === 'running' ? 'Restart sprint' : state.phase === 'ended' ? 'Play another 60s rush' : state.phase === 'practice' ? 'Next practice note' : selectedPlayStyle === 'practice' ? 'Start practice' : 'Start 60s sprint';
  for (const button of modeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.mode === selectedModeId ? 'true' : 'false';
  for (const button of difficultyButtons.querySelectorAll('button')) button.dataset.active = button.dataset.difficulty === selectedDifficultyId ? 'true' : 'false';
  for (const button of inputModeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.inputMode === selectedInputMode ? 'true' : 'false';
  for (const button of playStyleButtons) button.dataset.active = button.dataset.playStyle === selectedPlayStyle ? 'true' : 'false';
  lessonSelect.value = selectedLessonId;
  hintToggle.checked = showHints;
  const roundEnded = state.phase === 'ended';
  buttons.hidden = roundEnded || selectedInputMode !== 'buttons';
  pianoStrip.hidden = roundEnded || selectedInputMode !== 'piano';
  microphonePanel.hidden = roundEnded || selectedInputMode !== 'microphone';
  microphoneStatusEl.textContent = microphoneStatusText();
  heardNoteEl.textContent = buildHeardNoteMessage(microphoneState.note);
  microphoneRecordingDiagnosticEl.textContent = microphoneRecordingDiagnostic;
  microphoneDebugTextEl.textContent = microphoneDebugText;
  micReportPreviewEl.textContent = lastMicReport ? `Last report: ${lastMicReport.capture.label} · ${lastMicReport.interpretation}` : 'No exported report yet.';
  for (const button of buttons.querySelectorAll('button')) {
    button.setAttribute('data-correct-answer', state.activeNote?.answer === button.textContent ? 'true' : 'false');
  }
  calibrationReadingEl.textContent = calibrationReadingText();
  calibrationReadingEl.dataset.status = microphoneState.calibration?.status || microphoneState.permission;

  if (state.phase === 'ended') {
    const summary = getRoundSummary(state);
    summaryEl.hidden = false;
    summaryTitleEl.textContent = summary.title;
    summaryContextEl.textContent = `${summary.mode} · ${summary.speed} · ${summary.difficulty}`;
    summaryHeadlineEl.textContent = summary.headline;
    summaryDetailEl.textContent = `${summary.detail} · ${learningRecommendation.text}`;
    summaryRestartButton.textContent = summary.primaryAction;
  } else {
    summaryEl.hidden = true;
  }
}

function render(nowMs = performance.now()) {
  renderStaff(nowMs);
  renderLessonIntro();
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
  state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: state.seed, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId, lessonId: selectedLessonId });
  installButtons();
  installPiano();
  render();
}

function beginRound() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  const now = performance.now();
  if (selectedPlayStyle === 'practice') {
    state = startPractice(state, now, selectedModeId, selectedLessonId);
    summaryEl.hidden = true;
    render(now);
    return;
  }
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

function formatMicrophoneError(error) {
  const message = error?.message || String(error || 'permission denied');
  const name = error?.name || '';
  const lower = `${name} ${message}`.toLowerCase();
  if (lower.includes('denied') || lower.includes('notallowed') || lower.includes('permission')) {
    return 'Microphone permission denied. In Chrome, tap the lock/site icon in the address bar → Permissions → Microphone → Allow, then reload. If Allow still returns denied, Android Settings may be blocking Chrome itself: Android Settings → Apps → Chrome → Permissions → Microphone → Allow.';
  }
  return message;
}

async function checkMicrophonePermissionState() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'microphone' });
    return status.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

function microphoneStatusText() {
  if (microphoneState.permission === 'requesting') return 'Requesting mic… check the browser permission prompt.';
  if (microphoneState.permission === 'blocked') return `Mic blocked: ${microphoneState.error || 'permission denied'}`;
  const listeningMessage = buildMicrophoneListeningMessage(microphoneState);
  if (listeningMessage) return listeningMessage;
  if (microphoneState.permission === 'granted') return 'Mic ready. Sing notes to answer.';
  return 'Mic off. Grant mic to calibrate and sing answers.';
}

function getMicrophoneTrackState() {
  const track = microphoneStream?.getAudioTracks?.()[0];
  if (!track) return 'none';
  if (track.readyState === 'ended') return 'ended';
  if (track.muted) return 'muted';
  return track.enabled === false ? 'disabled' : 'live';
}

function stopMicrophone() {
  if (microphoneRafId !== null) cancelAnimationFrame(microphoneRafId);
  microphoneRafId = null;
  if (microphoneStream) {
    for (const track of microphoneStream.getTracks()) track.stop();
  }
  microphoneStream = null;
  microphoneSource = null;
  microphoneAnalyser = null;
  microphoneKeepAliveGain = null;
  microphoneBuffer = null;
  microphoneState = { ...microphoneState, listening: false, trackState: 'none' };
  render();
}

function withMicrophoneRequestTimeout(requestPromise, timeoutMs = 8000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Microphone request timed out. In Chrome, check Site settings → Microphone for simiono.com.')), timeoutMs);
  });
  return Promise.race([requestPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    microphoneState = { ...microphoneState, permission: 'blocked', listening: false, error: 'getUserMedia unavailable' };
    render();
    return false;
  }
  try {
    microphoneState = { ...microphoneState, permission: 'requesting', listening: false, error: null, frequency: null, note: null, cents: null, inputLevel: 0, silentFrameCount: 0, trackState: 'none', vocalCandidate: null };
    render();
    const permissionState = await checkMicrophonePermissionState();
    if (permissionState === 'denied') {
      throw new DOMException('Permission denied before request', 'NotAllowedError');
    }
    microphoneStream = await withMicrophoneRequestTimeout(navigator.mediaDevices.getUserMedia(getBuiltInVocalMicrophoneConstraints()));
    const context = getAudioContext();
    if (!context) throw new Error('AudioContext unavailable');
    if (context.state === 'suspended') await context.resume();
    microphoneSource = context.createMediaStreamSource(microphoneStream);
    microphoneAnalyser = context.createAnalyser();
    microphoneAnalyser.fftSize = 4096;
    microphoneKeepAliveGain = context.createGain();
    microphoneKeepAliveGain.gain.value = 0;
    microphoneBuffer = new Float32Array(microphoneAnalyser.fftSize);
    microphoneSource.connect(microphoneAnalyser);
    microphoneAnalyser.connect(microphoneKeepAliveGain);
    microphoneKeepAliveGain.connect(context.destination);
    microphoneState = { ...microphoneState, permission: 'granted', listening: true, trackState: getMicrophoneTrackState(), error: null };
    processMicrophoneFrame();
    render();
    return true;
  } catch (error) {
    if (microphoneStream) {
      for (const track of microphoneStream.getTracks()) track.stop();
    }
    microphoneStream = null;
    microphoneSource = null;
    microphoneAnalyser = null;
    microphoneKeepAliveGain = null;
    microphoneBuffer = null;
    microphoneState = { ...microphoneState, permission: 'blocked', listening: false, trackState: 'none', error: formatMicrophoneError(error) };
    render();
    return false;
  }
}

async function recordMicrophoneDiagnostic() {
  if (!window.MediaRecorder) {
    microphoneRecordingDiagnostic = 'Recording test: MediaRecorder is not available in this browser.';
    render();
    return { status: 'unavailable', message: microphoneRecordingDiagnostic };
  }
  if (!microphoneStream) {
    microphoneRecordingDiagnostic = 'Recording test: tap Grant mic first, then Record 1s test.';
    render();
    return { status: 'no-stream', message: microphoneRecordingDiagnostic };
  }

  microphoneRecordingDiagnostic = 'Recording test: recording for 1 second… sing any steady comfortable note now.';
  render();
  try {
    const chunks = [];
    const recorder = new MediaRecorder(microphoneStream);
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', () => reject(recorder.error || new Error('MediaRecorder failed')), { once: true });
    });
    recorder.start(250);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    recorder.requestData?.();
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    let message = `Recording test: captured ${blob.size} bytes.`;
    let decodedRms = null;
    let recordedFrequency = null;
    let recordedPitch = null;
    let decodedSamples = null;
    let decodedSampleRate = null;
    if (blob.size > 0) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await getAudioContext().decodeAudioData(arrayBuffer.slice(0));
        decodedSamples = decoded.getChannelData(0);
        decodedSampleRate = decoded.sampleRate;
        decodedRms = getCenteredRms(decodedSamples);
        recordedFrequency = detectPitchFromRecordedAudio(decodedSamples, decoded.sampleRate);
        recordedPitch = frequencyToNearestPitch(recordedFrequency);
        message += ` Decoded level ${formatDiagnosticLevelPercent(decodedRms)}.`;
        if (recordedPitch) {
          const pitchLabel = `${recordedPitch.answer}${recordedPitch.octave}`;
          microphoneDebugText = buildBeginnerMicMessage({ pitchLabel, frequency: recordedFrequency, decodedLevel: decodedRms, bytes: blob.size, advanced: true });
          message += ` ${buildBeginnerMicMessage({ pitchLabel, frequency: recordedFrequency, decodedLevel: decodedRms, bytes: blob.size })}`;
        } else {
          message += ' No steady recorded pitch found.';
        }
      } catch {
        message += ' Browser recorded data, but Web Audio could not decode it here.';
      }
    }
    if (blob.size === 0) {
      const liveLevel = formatDiagnosticLevelPercent(microphoneState.inputLevel);
      message = `Recording test: MediaRecorder returned 0 bytes. live mic level ${liveLevel}; try live Mic play anyway, or retest in Chrome/Safari if export stays empty.`;
    }
    else if (decodedRms === 0) message += ' Decoded audio is silent.';
    lastMicRecordingEvidence = { bytes: blob.size, mimeType: blob.type, samples: decodedSamples, sampleRate: decodedSampleRate };
    microphoneRecordingDiagnostic = message;
    render();
    return { status: 'ok', bytes: blob.size, decodedRms, recordedFrequency, recordedPitch, message };
  } catch (error) {
    microphoneRecordingDiagnostic = `Recording test failed: ${error?.message || String(error)}`;
    render();
    return { status: 'error', message: microphoneRecordingDiagnostic };
  }
}

function buildCurrentMicReport() {
  const track = microphoneStream?.getAudioTracks?.()[0];
  lastMicReport = buildMicDiagnosticReport({
    appVersion,
    label: micLabLabelEl.value || 'capture',
    userAgent: navigator.userAgent,
    url: window.location.href,
    audioContext: audioContext ? { sampleRate: audioContext.sampleRate, state: audioContext.state } : {},
    live: { inputLevel: microphoneState.inputLevel, frequency: microphoneState.frequency, trackState: microphoneState.trackState },
    recording: lastMicRecordingEvidence,
    track: track ? { readyState: track.readyState, muted: track.muted, enabled: track.enabled, settings: track.getSettings?.() || {} } : {},
  });
  return lastMicReport;
}

function downloadMicReport() {
  const report = buildCurrentMicReport();
  const file = buildMicDiagnosticTextFile(report);
  const blob = new Blob([file.text], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  microphoneDebugText = `Exported ${file.filename}. Send that .txt file back for fixture-based mic debugging.`;
  render();
  return file;
}

function processMicrophoneFrame(frequencyOverride = null, nowMs = performance.now()) {
  let frequency = frequencyOverride;
  let inputLevel = microphoneState.inputLevel || 0;
  if (frequency === null && microphoneAnalyser && microphoneBuffer) {
    microphoneAnalyser.getFloatTimeDomainData(microphoneBuffer);
    inputLevel = getCenteredRms(microphoneBuffer);
    frequency = detectPitchFromTimeDomain(microphoneBuffer, audioContext?.sampleRate || 44100);
  }

  if (frequency) {
    const note = frequencyToNearestPitch(frequency);
    const calibration = buildCalibrationReading(frequency);
    microphoneState = { ...microphoneState, frequency, note, cents: note?.cents ?? null, inputLevel, silentFrameCount: 0, trackState: getMicrophoneTrackState(), calibration };
    if (selectedInputMode === 'microphone' && ['running', 'practice'].includes(state.phase)) {
      const match = evaluateVocalMatchFrame({ prompt: state.activeNote, frequency, nowMs, previousCandidate: microphoneState.vocalCandidate, lastAcceptedAtMs: microphoneState.lastAcceptedAtMs });
      microphoneState = { ...microphoneState, vocalCandidate: match.candidate };
      if (match.status === 'pending-stable') microphoneDebugText = `Hold ${match.detected.answer} steady…`;
      if (match.status === 'match') {
        microphoneState = { ...microphoneState, lastAcceptedAtMs: nowMs };
        handleAnswer(match.answer);
      }
    }
  } else {
    microphoneState = {
      ...microphoneState,
      frequency: null,
      note: null,
      cents: null,
      inputLevel,
      silentFrameCount: (microphoneState.silentFrameCount || 0) + 1,
      trackState: getMicrophoneTrackState(),
      calibration: buildCalibrationReading(null),
      vocalCandidate: null,
    };
  }

  render(nowMs);
  if (microphoneState.listening && frequencyOverride === null) microphoneRafId = requestAnimationFrame((timestamp) => processMicrophoneFrame(null, timestamp));
  return microphoneState;
}

function handleAnswer(answer) {
  const now = performance.now();
  const answeredPrompt = state.activeNote;
  state = answerActiveNote(state, answer, now);
  if (!showHints && state.feedback.kind === 'wrong') state.feedback.text = `${answer} is not it. Try again.`;
  if (state.feedback.kind === 'correct') playPromptAudio(answeredPrompt);
  if (state.phase === 'running') state = updateRound(state, now);
  if (state.phase === 'practice' && !state.activeNote) state = spawnNextNote(state, now + 1);
  render(now);
}

function installButtons() {
  buttons.innerHTML = '';
  const answers = getScaffoldedAnswerOptions({ modeId: selectedModeId, difficultyId: selectedDifficultyId, lessonId: selectedLessonId, allOptions: getAnswerOptions(selectedModeId) });
  for (const option of answers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = option.label.length === 1 ? 'note-button' : 'note-button accidental-button';
    button.textContent = option.label;
    button.setAttribute('aria-label', `Answer ${option.label}`);
    button.setAttribute('data-correct-answer', state.activeNote?.answer === option.answer ? 'true' : 'false');
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

function installBeginnerControls() {
  for (const step of buildTutorialSteps()) {
    // Keep tutorial content available through the imported contract.
  }
  for (const lesson of BEGINNER_LESSONS) {
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = lesson.label;
    lessonSelect.append(option);
  }
  tutorialNextButton.addEventListener('click', () => {
    const steps = buildTutorialSteps();
    tutorialStepIndex = (tutorialStepIndex + 1) % steps.length;
    tutorialText.textContent = steps[tutorialStepIndex].body;
  });
  tutorialDismissButton.addEventListener('click', () => {
    tutorialCard.hidden = true;
    localStorage.setItem('clefhanger.tutorialDismissed.v1', 'true');
  });
  if (localStorage.getItem('clefhanger.tutorialDismissed.v1') === 'true') tutorialCard.hidden = true;
  for (const button of playStyleButtons) {
    button.addEventListener('click', () => {
      selectedPlayStyle = button.dataset.playStyle === 'rush' ? 'rush' : 'practice';
      localStorage.setItem('clefhanger.selectedPlayStyle.v1', selectedPlayStyle);
      resetIdleState();
    });
  }
  lessonSelect.addEventListener('change', () => {
    selectedLessonId = getBeginnerLesson(lessonSelect.value).id;
    lessonIntroHidden = false;
    localStorage.setItem('clefhanger.selectedLesson.v1', selectedLessonId);
    localStorage.setItem('clefhanger.lessonIntroHidden.v1', 'false');
    resetIdleState();
  });
  lessonIntroDismissButton.addEventListener('click', () => {
    lessonIntroHidden = true;
    localStorage.setItem('clefhanger.lessonIntroHidden.v1', 'true');
    render();
  });
  hintToggle.addEventListener('change', () => {
    showHints = hintToggle.checked;
    localStorage.setItem('clefhanger.showHints.v1', showHints ? 'true' : 'false');
    render();
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
summaryRestartButton.addEventListener('click', beginRound);
playCalibrationToneButton.addEventListener('click', playCalibrationTone);
startMicrophoneButton.addEventListener('click', startMicrophone);
stopMicrophoneButton.addEventListener('click', stopMicrophone);
recordMicrophoneDiagnosticButton.addEventListener('click', recordMicrophoneDiagnostic);
exportMicReportButton.addEventListener('click', downloadMicReport);
openSettingsButton.addEventListener('click', openSettings);
closeSettingsButton.addEventListener('click', closeSettings);
installInputModes();
installModes();
installSpeedSlider();
installDifficulties();
installBeginnerControls();
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
  startPractice: () => { selectedPlayStyle = 'practice'; beginRound(); },
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
  selectLesson: (lessonId) => {
    selectedLessonId = getBeginnerLesson(lessonId).id;
    lessonIntroHidden = false;
    resetIdleState();
  },
  selectPlayStyle: (playStyle) => {
    selectedPlayStyle = playStyle === 'rush' ? 'rush' : 'practice';
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
  recordMicrophoneDiagnostic,
  buildCurrentMicReport,
  downloadMicReport,
  processMicrophoneFrame,
  clefhangerInjectPitch: (frequency, nowMs = performance.now()) => processMicrophoneFrame(frequency, nowMs),
  getMicrophoneState: () => microphoneState,
  getMicrophoneRecordingDiagnostic: () => microphoneRecordingDiagnostic,
  openSettings,
  closeSettings,
};

window.clefhangerInjectPitch = window.__clefHanger.clefhangerInjectPitch;
