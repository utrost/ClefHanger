import {
  ACCIDENTAL_BUTTONS,
  DIFFICULTY_LEVELS,
  GAME_MODES,
  NOTE_BUTTONS,
  PIANO_BLACK_KEYS,
  PIANO_WHITE_KEYS,
  SPEED_SETTINGS,
  getAnswerOptions,
  getDifficulty,
  getMode,
  getSpeed,
} from './core/content.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import {
  STAFF_LAYOUT,
  createInitialState,
  startRound,
  startPractice,
  restartPractice,
  skipPracticeNote,
  spawnNextNote,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
} from './core/game.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { getPromptFrequencies } from './core/music-theory.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { getCalibrationTone, playPianoVoice } from './core/audio.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import {
  buildCalibrationReading,
  buildHeardNoteMessage,
  buildMicrophoneListeningMessage,
  buildMicrophoneReadiness,
  buildMicrophoneScoringFeedback,
  createMicrophoneState,
  detectPitchFromTimeDomain,
  evaluateVocalMatchFrame,
  frequencyToNearestPitch,
  getCenteredRms,
  normalizeMicrophoneInputMode,
} from './core/pitch.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { buildMicDiagnosticReport, buildMicDiagnosticTextFile, formatDiagnosticLevelPercent } from './core/mic-diagnostics.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { BEGINNER_LESSONS, applyLearningFeedback, buildAccidentalLearningHint, buildBeginnerMicMessage, buildIntervalLearningHint, buildLearningRecommendation, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getScaffoldedAnswerOptions } from './core/learning.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { renderStaffSvg, syncNotationAccessibility } from './ui/staff-renderer.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createSemanticPresenter, syncElementText } from './ui/semantic-presenter.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createSummaryFocusManager } from './ui/summary-focus.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { startMicrophoneSession, formatMicrophoneError } from './platform/microphone-session.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createMicrophoneController, startAndPublishMicrophoneSession } from './platform/microphone-controller.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { runMicrophoneRecordingDiagnostic } from './platform/mic-recording-diagnostic.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createStorageAdapter, resolveStartupPreferences } from './platform/storage.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { buildInputCompatibilityMessage, resolvePlayableInputMode } from './core/input-compatibility.js?v=clefhanger-slice69-tester-readiness-2026-09-16';

const appVersion = 'clefhanger-slice69-tester-readiness-2026-09-16';
const appBackground = document.querySelector('#app-background');
const staff = document.querySelector('#staff');
const notationStage = document.querySelector('#notation-stage');
const notationPrompt = document.querySelector('#notation-prompt');
const buttons = document.querySelector('#note-buttons');
const pianoStrip = document.querySelector('#piano-strip');
const calibrationPanel = document.querySelector('#calibration-panel');
const playCalibrationToneButton = document.querySelector('#play-calibration-tone');
const startMicrophoneButton = document.querySelector('#start-microphone');
const startMicrophoneMainButton = document.querySelector('#start-microphone-main');
const stopMicrophoneButton = document.querySelector('#stop-microphone');
const recordMicrophoneDiagnosticButton = document.querySelector('#record-microphone-diagnostic');
const exportMicReportButton = document.querySelector('#export-mic-report');
const micLabLabelEl = document.querySelector('#mic-lab-label');
const micReportPreviewEl = document.querySelector('#mic-report-preview');
const microphonePanel = document.querySelector('#microphone-panel');
const micReadinessEl = document.querySelector('#mic-readiness');
const micReadinessTitleEl = document.querySelector('#mic-readiness-title');
const micReadinessBodyEl = document.querySelector('#mic-readiness-body');
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
const restartPracticeButton = document.querySelector('#restart-practice');
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
const matchAnyOctaveToggle = document.querySelector('#match-any-octave');
const microphoneDebugTextEl = document.querySelector('#microphone-debug-text');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const timerEl = document.querySelector('#timer');
const feedbackEl = document.querySelector('#feedback');
const learningCoachEl = document.querySelector('#learning-coach');
const gameAnnouncerEl = document.querySelector('#game-announcer');
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

const storageAdapter = createStorageAdapter();
const storedPreferences = resolveStartupPreferences(storageAdapter.readPreferences(), window.location.search);
let selectedModeId = storedPreferences.modeId;
let selectedSpeedId = storedPreferences.speedId;
let selectedDifficultyId = storedPreferences.difficultyId;
let selectedInputMode = storedPreferences.inputMode;
let selectedPlayStyle = storedPreferences.playStyle;
let selectedLessonId = storedPreferences.lessonId;
let showHints = storedPreferences.showHints;
let matchAnyOctave = storedPreferences.matchAnyOctave;
let lessonIntroHidden = storedPreferences.lessonIntroHidden;
let tutorialStepIndex = 0;
let state = createInitialState({ roundLengthMs: 60000, nowMs: performance.now(), seed: 1975, modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId, lessonId: selectedLessonId });
let rafId = null;
let audioContext = null;
let microphoneState = createMicrophoneState();
let microphoneSession = null;
let microphoneStream = null;
let microphoneAnalyser = null;
let microphoneBuffer = null;
let microphoneRafId = null;
let microphoneRecordingDiagnostic = 'Recording test: not run yet.';
let microphoneDebugText = 'No recording details yet.';
let inputCompatibilityMessage = null;
let lastMicRecordingEvidence = null;
let lastMicReport = null;
let microphoneSessionNumber = 0;
const semanticPresenter = createSemanticPresenter({ announcementElement: gameAnnouncerEl });
const summaryFocusManager = createSummaryFocusManager({
  backgroundElement: appBackground,
  summaryElement: summaryEl,
  replayButton: summaryRestartButton,
  playfieldElement: notationStage,
});
const microphoneController = createMicrophoneController({
  startSession: (options) => startMicrophoneSession(options),
  onStop: () => {
    if (microphoneRafId !== null) cancelAnimationFrame(microphoneRafId);
    microphoneRafId = null;
    clearMicrophoneSession();
    microphoneState = { ...microphoneState, permission: 'idle', listening: false, trackState: 'none', frequency: null, note: null, cents: null, inputLevel: 0, vocalCandidate: null };
    render();
  },
});

function getBestScore(modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  return storageAdapter.readHighScore(modeId, speedId, difficultyId);
}

function setBestScore(score, modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  storageAdapter.writeHighScore(score, modeId, speedId, difficultyId);
}

function normalizeInputMode(inputMode) {
  return normalizeMicrophoneInputMode(inputMode);
}

function ensurePlayableInputMode(modeId, inputMode, { persist = false, announce = false } = {}) {
  const normalizedInputMode = normalizeInputMode(inputMode);
  const resolvedInputMode = resolvePlayableInputMode({ modeId, inputMode: normalizedInputMode });
  const compatibilityMessage = buildInputCompatibilityMessage({ modeId, requestedInputMode: normalizedInputMode, resolvedInputMode });
  if (compatibilityMessage) inputCompatibilityMessage = compatibilityMessage;
  else if (modeId !== 'chords') inputCompatibilityMessage = null;
  if (resolvedInputMode !== selectedInputMode) {
    selectedInputMode = resolvedInputMode;
    microphoneController.selectInputMode(selectedInputMode);
    if (persist) storageAdapter.writePreference('selectedInputMode', selectedInputMode);
    if (selectedInputMode !== 'microphone') stopMicrophone();
  }
  if (announce && compatibilityMessage) {
    semanticPresenter.announce({ kind: 'input-compatibility', id: `${modeId}:${normalizedInputMode}:${resolvedInputMode}`, message: compatibilityMessage.text });
  }
  return resolvedInputMode;
}

selectedInputMode = ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: false });

function renderStaff(nowMs) {
  staff.innerHTML = renderStaffSvg({ state, selectedInputMode, microphoneState, nowMs });
  syncNotationAccessibility({
    promptElement: notationPrompt,
    stageElement: notationStage,
    state,
    modeLabel: getMode(selectedModeId).label,
    playStyle: selectedPlayStyle,
    nowMs,
  });
}

function calibrationReadingText() {
  if (microphoneState.calibration?.message) return microphoneState.calibration.message;
  if (microphoneState.permission === 'requesting' || microphoneState.permission === 'blocked' || microphoneState.permission === 'granted') {
    return microphoneStatusText();
  }
  return 'Check mic, then sing any steady comfortable note; Play A is only a reference.';
}

function isLessonScopedMode(modeId = selectedModeId) {
  return getMode(modeId).id === 'basics';
}

function isPracticeSelected() {
  return selectedPlayStyle === 'practice';
}

function renderLessonIntro() {
  const lessonApplies = isLessonScopedMode();
  const intro = getLessonIntroCard(selectedLessonId);
  lessonIntro.hidden = !lessonApplies || lessonIntroHidden;
  if (lessonSelect.closest('label')) lessonSelect.closest('label').hidden = !lessonApplies;
  syncElementText(lessonIntroTitle, intro.title);
  syncElementText(lessonIntroBody, intro.body);
  syncElementText(lessonIntroExamples, intro.examples.join(' · '));
}

function currentLearningRecommendation() {
  const accidentalHint = buildAccidentalLearningHint({ modeId: selectedModeId, prompt: state.activeNote });
  if (accidentalHint) return accidentalHint;
  const intervalHint = selectedModeId === 'basics' && selectedLessonId === 'interval-jumps'
    ? buildIntervalLearningHint({ previousPrompt: state.previousPrompt, prompt: state.activeNote })
    : null;
  if (intervalHint) return intervalHint;
  const attempts = state.correct + state.wrong + state.missed;
  const accuracy = attempts > 0 ? Math.round((state.correct / attempts) * 100) : 0;
  const microphoneStable = selectedInputMode !== 'microphone' || Boolean(microphoneState.note && microphoneState.frequency);
  return buildLearningRecommendation({
    modeId: selectedModeId,
    playStyle: selectedPlayStyle === 'rush' || state.phase === 'running' || state.phase === 'ended' ? 'rush' : 'practice',
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
  syncElementText(scoreEl, state.score);
  syncElementText(streakEl, state.streak);
  semanticPresenter.updateTimer(timerEl, getRemainingSeconds(state, nowMs));
  syncElementText(feedbackEl, state.feedback.text);
  feedbackEl.dataset.kind = state.feedback.kind;
  const learningRecommendation = currentLearningRecommendation();
  const coachMessage = inputCompatibilityMessage || learningRecommendation;
  syncElementText(learningCoachEl, coachMessage.text);
  learningCoachEl.dataset.kind = coachMessage.kind;
  syncElementText(bestEl, getBestScore(selectedModeId, selectedSpeedId, selectedDifficultyId));
  syncElementText(modeLabelEl, mode.label);
  syncElementText(modeHelpEl, mode.help);
  const inputLabel = selectedInputMode === 'piano' ? 'Piano' : selectedInputMode === 'microphone' ? 'Sing/Play' : 'Notes';
  const lesson = getBeginnerLesson(selectedLessonId);
  const lessonApplies = isLessonScopedMode();
  const practiceSelected = isPracticeSelected();
  const speedDisplay = practiceSelected ? 'Practice only' : speed.label;
  const difficultyDisplay = practiceSelected ? 'Practice only' : difficulty.label;
  syncElementText(speedLabelEl, speedDisplay);
  speedSlider.value = speed.id;
  speedSlider.disabled = practiceSelected;
  speedSlider.setAttribute('aria-disabled', practiceSelected ? 'true' : 'false');
  syncElementText(difficultyLabelEl, difficultyDisplay);
  syncElementText(difficultyHelpEl, practiceSelected ? 'Practice ignores speed and difficulty: it is always untimed Beginner at the easiest speed.' : difficulty.help);
  const settingsParts = practiceSelected
    ? [mode.label, lessonApplies ? `Practice: ${lesson.label}` : 'Practice', inputLabel]
    : [mode.label, difficulty.label, speed.label, inputLabel, lessonApplies ? lesson.label : 'Rush'];
  syncElementText(settingsLineEl, settingsParts.join(' · '));
  syncElementText(startButton, state.phase === 'running' ? 'Restart sprint' : state.phase === 'ended' ? 'Play another 60s rush' : state.phase === 'practice' ? 'Next practice note' : selectedPlayStyle === 'practice' ? 'Start practice' : 'Start 60s sprint');
  restartPracticeButton.hidden = state.phase !== 'practice';
  for (const button of modeButtons.querySelectorAll('button')) button.dataset.active = button.dataset.mode === selectedModeId ? 'true' : 'false';
  for (const button of difficultyButtons.querySelectorAll('button')) {
    button.dataset.active = button.dataset.difficulty === selectedDifficultyId ? 'true' : 'false';
    button.disabled = practiceSelected;
    button.setAttribute('aria-disabled', practiceSelected ? 'true' : 'false');
    button.title = practiceSelected ? 'Practice ignores difficulty; Rush uses this selection.' : '';
  }
  for (const button of inputModeButtons.querySelectorAll('button')) {
    button.dataset.active = button.dataset.inputMode === selectedInputMode ? 'true' : 'false';
    button.disabled = selectedModeId === 'chords' && ['microphone', 'piano'].includes(button.dataset.inputMode);
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.title = button.disabled ? 'Chord mode needs Notes answers.' : '';
  }
  for (const button of playStyleButtons) button.dataset.active = button.dataset.playStyle === selectedPlayStyle ? 'true' : 'false';
  lessonSelect.value = selectedLessonId;
  hintToggle.checked = showHints;
  matchAnyOctaveToggle.checked = matchAnyOctave;
  const roundEnded = state.phase === 'ended';
  buttons.hidden = roundEnded || selectedInputMode !== 'buttons';
  pianoStrip.hidden = roundEnded || selectedInputMode !== 'piano';
  microphonePanel.hidden = roundEnded || selectedInputMode !== 'microphone';
  const micReadiness = buildMicrophoneReadiness(microphoneState);
  micReadinessEl.dataset.status = micReadiness.status;
  micReadinessEl.dataset.ready = micReadiness.ready ? 'true' : 'false';
  syncElementText(micReadinessTitleEl, micReadiness.title);
  syncElementText(micReadinessBodyEl, micReadiness.body);
  syncElementText(startMicrophoneMainButton, micReadiness.action);
  const microphoneStarting = microphoneState.permission === 'requesting';
  startMicrophoneButton.disabled = microphoneStarting;
  startMicrophoneMainButton.disabled = microphoneStarting;
  stopMicrophoneButton.disabled = !microphoneStarting && getCurrentMicrophoneTrackState() === 'none';
  syncElementText(microphoneStatusEl, microphoneStatusText());
  semanticPresenter.updatePitch(heardNoteEl, { message: buildHeardNoteMessage(microphoneState.note), hasPitch: Boolean(microphoneState.note), nowMs });
  syncElementText(microphoneRecordingDiagnosticEl, microphoneRecordingDiagnostic);
  syncElementText(microphoneDebugTextEl, microphoneDebugText);
  syncElementText(micReportPreviewEl, lastMicReport ? `Last report: ${lastMicReport.capture.label} · ${lastMicReport.interpretation}` : 'No exported report yet.');
  syncElementText(calibrationReadingEl, calibrationReadingText());
  calibrationReadingEl.dataset.status = microphoneState.calibration?.status || microphoneState.permission;

  let roundEndedAnnouncement = null;
  if (state.phase === 'ended') {
    const summary = getRoundSummary(state);
    syncElementText(summaryTitleEl, summary.title);
    syncElementText(summaryContextEl, `${summary.mode} · ${summary.speed} · ${summary.difficulty}`);
    syncElementText(summaryHeadlineEl, summary.headline);
    syncElementText(summaryDetailEl, `${summary.detail} · ${learningRecommendation.text}`);
    syncElementText(summaryRestartButton, summary.primaryAction);
    roundEndedAnnouncement = `Round ended. ${summary.headline}. ${summary.detail}.`;
  }

  const roundId = state.startedAtMs ?? 'idle';
  if (state.correct > 0) semanticPresenter.announce({ kind: 'correct', id: `${roundId}:${state.correct}`, message: `Correct. ${state.lastOutcome?.expectedAnswer || 'Note'} scored.` });
  if (state.wrong > 0) semanticPresenter.announce({ kind: 'wrong', id: `${roundId}:${state.wrong}`, message: `Wrong answer. ${state.lastOutcome?.givenAnswer || 'That note'} did not match; try again.` });
  if (state.missed > 0) semanticPresenter.announce({ kind: 'missed', id: `${roundId}:${state.missed}`, message: `Missed note. ${state.lastOutcome?.expectedAnswer || 'The note'} fell off the staff.` });
  if (microphoneState.permission === 'granted') semanticPresenter.announce({ kind: 'microphone-ready', id: microphoneSessionNumber });
  if (microphoneState.permission === 'blocked') semanticPresenter.announce({ kind: 'microphone-error', id: microphoneSessionNumber, message: `Microphone error. ${microphoneState.error || 'Check browser permission and try again.'}` });
  if (roundEndedAnnouncement) semanticPresenter.announce({ kind: 'round-ended', id: state.startedAtMs, message: roundEndedAnnouncement });
  summaryFocusManager.sync(state.phase === 'ended');
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
  ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: true, announce: true });
  if (rafId !== null) cancelAnimationFrame(rafId);
  const now = performance.now();
  if (selectedPlayStyle === 'practice') {
    if (state.phase === 'practice') {
      state = skipPracticeNote(state, now);
      render(now);
      return;
    }
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

function restartPracticeSession() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  const now = performance.now();
  state = restartPractice(state, now, selectedModeId, selectedLessonId);
  summaryEl.hidden = true;
  render(now);
}

function replayRound() {
  beginRound();
  summaryFocusManager.closeForReplay();
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
  if (microphoneState.permission === 'requesting') return 'Requesting mic… check the browser permission prompt.';
  if (microphoneState.permission === 'blocked') return `Mic blocked: ${microphoneState.error || 'permission denied'}`;
  const listeningMessage = buildMicrophoneListeningMessage(microphoneState);
  if (listeningMessage) return listeningMessage;
  if (microphoneState.permission === 'granted') return 'Mic ready. Sing notes to answer.';
  return 'Mic off. Check mic to calibrate and sing answers.';
}

function getCurrentMicrophoneTrackState() {
  return microphoneSession?.getTrackState?.() || 'none';
}

function clearMicrophoneSession() {
  microphoneSession = null;
  microphoneStream = null;
  microphoneAnalyser = null;
  microphoneBuffer = null;
}

function stopMicrophone() {
  microphoneController.stop();
}

async function startMicrophone() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia unavailable');
    }
    microphoneSessionNumber += 1;
    const context = getAudioContext();
    const sessionRequest = microphoneController.start({ navigatorObject: navigator, audioContext: context });
    microphoneState = { ...microphoneState, permission: 'requesting', listening: false, error: null, frequency: null, note: null, cents: null, inputLevel: 0, silentFrameCount: 0, trackState: 'none', vocalCandidate: null };
    render();
    const session = await startAndPublishMicrophoneSession({
      start: () => sessionRequest,
      publish: (currentSession) => { microphoneSession = currentSession; },
    });
    if (!session) return false;
    microphoneStream = microphoneSession.stream;
    microphoneAnalyser = microphoneSession.analyser;
    microphoneBuffer = microphoneSession.buffer;
    microphoneState = { ...microphoneState, permission: 'granted', listening: true, trackState: getCurrentMicrophoneTrackState(), error: null };
    processMicrophoneFrame();
    render();
    return true;
  } catch (error) {
    microphoneController.stop();
    microphoneState = { ...microphoneState, permission: 'blocked', listening: false, trackState: 'none', error: formatMicrophoneError(error) };
    render();
    return false;
  }
}

async function recordMicrophoneDiagnostic() {
  microphoneRecordingDiagnostic = 'Recording test: recording for 1 second… sing any steady comfortable note now.';
  render();
  const result = await runMicrophoneRecordingDiagnostic({
    stream: microphoneStream,
    audioContext: getAudioContext(),
    MediaRecorderClass: window.MediaRecorder,
    BlobClass: window.Blob,
  });

  if (result.status === 'unavailable' || result.status === 'no-stream' || result.status === 'error') {
    microphoneRecordingDiagnostic = result.message;
    render();
    return result;
  }

  let message = `Recording test: captured ${result.bytes} bytes.`;
  if (result.bytes > 0) {
    if (result.decodeFailed) {
      message += ' Browser recorded data, but Web Audio could not decode it here.';
    } else {
      message += ` Decoded level ${formatDiagnosticLevelPercent(result.decodedRms)}.`;
      if (result.recordedPitch) {
        const pitchLabel = `${result.recordedPitch.answer}${result.recordedPitch.octave}`;
        microphoneDebugText = buildBeginnerMicMessage({ pitchLabel, frequency: result.recordedFrequency, decodedLevel: result.decodedRms, bytes: result.bytes, advanced: true });
        message += ` ${buildBeginnerMicMessage({ pitchLabel, frequency: result.recordedFrequency, decodedLevel: result.decodedRms, bytes: result.bytes })}`;
      } else {
        message += ' No steady recorded pitch found.';
      }
    }
  }
  if (result.bytes === 0) {
    const liveLevel = formatDiagnosticLevelPercent(microphoneState.inputLevel);
    message = `Recording test: MediaRecorder returned 0 bytes. live mic level ${liveLevel}; try live Mic play anyway, or retest in Chrome/Safari if export stays empty.`;
  }
  else if (result.decodedRms === 0) message += ' Decoded audio is silent.';
  lastMicRecordingEvidence = result.evidence;
  microphoneRecordingDiagnostic = message;
  render();
  return { status: 'ok', bytes: result.bytes, decodedRms: result.decodedRms, recordedFrequency: result.recordedFrequency, recordedPitch: result.recordedPitch, message };
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
    microphoneState = { ...microphoneState, frequency, note, cents: note?.cents ?? null, inputLevel, silentFrameCount: 0, trackState: getCurrentMicrophoneTrackState(), calibration };
    if (selectedInputMode === 'microphone' && ['running', 'practice'].includes(state.phase)) {
      const match = evaluateVocalMatchFrame({ prompt: state.activeNote, frequency, nowMs, previousCandidate: microphoneState.vocalCandidate, lastAcceptedAtMs: microphoneState.lastAcceptedAtMs, matchAnyOctave });
      const scoringFeedback = buildMicrophoneScoringFeedback(match, { prompt: state.activeNote });
      microphoneState = { ...microphoneState, vocalCandidate: match.candidate };
      microphoneDebugText = scoringFeedback.text;
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
      trackState: getCurrentMicrophoneTrackState(),
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
  if (state.phase === 'practice') state = applyLearningFeedback(state, now);
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
      const requestedInputMode = normalizeInputMode(button.dataset.inputMode);
      selectedInputMode = requestedInputMode;
      ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: true, announce: true });
      storageAdapter.writePreference('selectedInputMode', selectedInputMode);
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
      storageAdapter.writePreference('selectedMode', selectedModeId);
      ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: true, announce: true });
      resetIdleState();
    });
    modeButtons.append(button);
  }
}

function installSpeedSlider() {
  speedSlider.addEventListener('input', () => {
    selectedSpeedId = getSpeed(speedSlider.value).id;
    storageAdapter.writePreference('selectedSpeed', selectedSpeedId);
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
    storageAdapter.writePreference('tutorialDismissed', true);
  });
  if (storedPreferences.tutorialDismissed) tutorialCard.hidden = true;
  for (const button of playStyleButtons) {
    button.addEventListener('click', () => {
      selectedPlayStyle = button.dataset.playStyle === 'rush' ? 'rush' : 'practice';
      storageAdapter.writePreference('selectedPlayStyle', selectedPlayStyle);
      resetIdleState();
    });
  }
  lessonSelect.addEventListener('change', () => {
    selectedLessonId = getBeginnerLesson(lessonSelect.value).id;
    lessonIntroHidden = false;
    storageAdapter.writePreference('selectedLesson', selectedLessonId);
    storageAdapter.writePreference('lessonIntroHidden', false);
    resetIdleState();
  });
  lessonIntroDismissButton.addEventListener('click', () => {
    lessonIntroHidden = true;
    storageAdapter.writePreference('lessonIntroHidden', true);
    render();
  });
  hintToggle.addEventListener('change', () => {
    showHints = hintToggle.checked;
    storageAdapter.writePreference('showHints', showHints);
    render();
  });
  matchAnyOctaveToggle.addEventListener('change', () => {
    matchAnyOctave = matchAnyOctaveToggle.checked;
    storageAdapter.writePreference('matchAnyOctave', matchAnyOctave);
    microphoneState = { ...microphoneState, vocalCandidate: null };
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
      storageAdapter.writePreference('selectedDifficulty', selectedDifficultyId);
      resetIdleState();
    });
    difficultyButtons.append(button);
  }
}

startButton.addEventListener('click', beginRound);
restartPracticeButton.addEventListener('click', restartPracticeSession);
summaryRestartButton.addEventListener('click', replayRound);
document.addEventListener('keydown', (event) => summaryFocusManager.handleKeydown(event));
playCalibrationToneButton.addEventListener('click', playCalibrationTone);
startMicrophoneButton.addEventListener('click', startMicrophone);
startMicrophoneMainButton.addEventListener('click', startMicrophone);
stopMicrophoneButton.addEventListener('click', stopMicrophone);
recordMicrophoneDiagnosticButton.addEventListener('click', recordMicrophoneDiagnostic);
exportMicReportButton.addEventListener('click', downloadMicReport);
openSettingsButton.addEventListener('click', openSettings);
closeSettingsButton.addEventListener('click', closeSettings);
installInputModes();
microphoneController.installLifecycleHandlers();
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
  restartPractice: restartPracticeSession,
  selectMode: (modeId) => {
    selectedModeId = getMode(modeId).id;
    ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: false, announce: true });
    resetIdleState();
  },
  selectSpeed: (speedId) => {
    selectedSpeedId = getSpeed(speedId).id;
    storageAdapter.writePreference('selectedSpeed', selectedSpeedId);
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
    ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: false, announce: true });
    render();
  },
  setMatchAnyOctave: (enabled) => {
    matchAnyOctave = Boolean(enabled);
    storageAdapter.writePreference('matchAnyOctave', matchAnyOctave);
    render();
  },
  getMatchAnyOctave: () => matchAnyOctave,
  getMicrophoneRecordingDiagnostic: () => microphoneRecordingDiagnostic,
  playPromptAudio,
  playCalibrationTone,
  startMicrophone,
  stopMicrophone,
  recordMicrophoneDiagnostic,
  buildCurrentMicReport,
  downloadMicReport,
  processMicrophoneFrame,
  clefhangerInjectPitch: (frequency, nowMs = performance.now()) => {
    microphoneState = { ...microphoneState, permission: 'granted', listening: true, trackState: 'live', error: null };
    return processMicrophoneFrame(frequency, nowMs);
  },
  getMicrophoneState: () => microphoneState,
  getMicrophoneRecordingDiagnostic: () => microphoneRecordingDiagnostic,
  openSettings,
  closeSettings,
};

window.clefhangerInjectPitch = window.__clefHanger.clefhangerInjectPitch;
