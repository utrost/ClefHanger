import { createSettingsPresenter } from './ui/settings-presenter.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { buildMicrophonePresentation } from './ui/status-presenter.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { renderLessonGuide } from './ui/lesson-guide.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { createListenSession } from './core/listen-session.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { recordAttempt, summarizeProgress } from './core/progress.js?v=clefhanger-slice73-progress-export-2026-09-30';
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
} from './core/content.js?v=clefhanger-slice73-progress-export-2026-09-30';
import {
  STAFF_LAYOUT,
  createInitialState,
  startRound,
  pauseRound,
  resumeRound,
  startPractice,
  restartPractice,
  skipPracticeNote,
  spawnNextNote,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
} from './core/game.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { getPromptFrequencies } from './core/music-theory.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { getCalibrationTone, playPianoVoice } from './core/audio.js?v=clefhanger-slice73-progress-export-2026-09-30';
import {
  buildCalibrationReading,
  buildHeardNoteMessage,
  buildMicrophoneScoringFeedback,
  createMicrophoneState,
  detectPitchFromTimeDomain,
  evaluateVocalMatchFrame,
  frequencyToNearestPitch,
  getCenteredRms,
  normalizeMicrophoneInputMode,
} from './core/pitch.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { buildMicDiagnosticReport, buildMicDiagnosticTextFile, formatDiagnosticLevelPercent } from './core/mic-diagnostics.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { BEGINNER_LESSONS, applyLearningFeedback, buildAccidentalLearningHint, buildBeginnerMicMessage, buildIntervalLearningHint, buildLearningRecommendation, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getLessonPool, getScaffoldedAnswerOptions } from './core/learning.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { renderStaffSvg, syncNotationAccessibility } from './ui/staff-renderer.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { createSemanticPresenter, syncElementText } from './ui/semantic-presenter.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { createSummaryFocusManager } from './ui/summary-focus.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { startMicrophoneSession, formatMicrophoneError } from './platform/microphone-session.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { createMicrophoneController, startAndPublishMicrophoneSession } from './platform/microphone-controller.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { runMicrophoneRecordingDiagnostic } from './platform/mic-recording-diagnostic.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { createStorageAdapter, resolveStartupPreferences } from './platform/storage.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { buildInputCompatibilityMessage, resolvePlayableInputMode } from './core/input-compatibility.js?v=clefhanger-slice73-progress-export-2026-09-30';

const appVersion = 'clefhanger-slice73-progress-export-2026-09-30';
const listenSession = createListenSession();
let playbackRefreshTimer = null;
const progressCache = new Map();
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
const exportProgressButton = document.querySelector('#export-progress');
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
const noteGuide = document.querySelector('#note-guide');
const noteGuideContent = document.querySelector('#note-guide-content');
let guideLessonId = null;
const hearNoteButton = document.querySelector('#hear-note');
const micGuidanceEl = document.querySelector('#mic-guidance');
const lessonProgressEl = document.querySelector('#lesson-progress');
const nextLessonButton = document.querySelector('#next-lesson');
const pauseRushButton = document.querySelector('#pause-rush');
const stopMicrophoneMainButton = document.querySelector('#stop-microphone-main');
const summaryPracticeButton = document.querySelector('#summary-practice');
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
const reducedMotionQuery = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener: null, addListener: null };
let prefersReducedMotion = Boolean(reducedMotionQuery.matches);
const semanticPresenter = createSemanticPresenter({ announcementElement: gameAnnouncerEl });
const summaryFocusManager = createSummaryFocusManager({
  backgroundElement: appBackground,
  summaryElement: summaryEl,
  replayButton: summaryRestartButton,
  playfieldElement: notationStage,
  onExit: returnToPractice,
});
const microphoneController = createMicrophoneController({
  startSession: (options) => startMicrophoneSession(options),
  onStop: () => {
    if (microphoneRafId !== null) cancelAnimationFrame(microphoneRafId);
    microphoneRafId = null;
    clearMicrophoneSession();
    microphoneState = { ...microphoneState, permission: 'idle', listening: false, scoringMessage: null, trackState: 'none', frequency: null, note: null, cents: null, inputLevel: 0, vocalCandidate: null };
    render();
  },
});

const renderSettings = createSettingsPresenter({
  modeLabel: modeLabelEl, modeHelp: modeHelpEl, closeButton: document.querySelector('#close-settings'),
  speedLabel: speedLabelEl, speedSlider, difficultyLabel: difficultyLabelEl, difficultyHelp: difficultyHelpEl,
  settingsLine: settingsLineEl, modeButtons, difficultyButtons, inputModeButtons, playStyleButtons,
  lessonSelect, hintToggle, matchAnyOctaveToggle,
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
  }
  if (announce && compatibilityMessage) {
    semanticPresenter.announce({ kind: 'input-compatibility', id: `${modeId}:${normalizedInputMode}:${resolvedInputMode}`, message: compatibilityMessage.text });
  }
  return resolvedInputMode;
}

selectedInputMode = ensurePlayableInputMode(selectedModeId, selectedInputMode, { persist: false });

function renderStaff(nowMs) {
  if (state.phase === 'paused') nowMs = state.pausedAtMs;
  staff.innerHTML = renderStaffSvg({ state, selectedInputMode, microphoneState, nowMs, reducedMotion: prefersReducedMotion });
  syncNotationAccessibility({
    promptElement: notationPrompt,
    stageElement: notationStage,
    state,
    modeLabel: getMode(selectedModeId).label,
    playStyle: selectedPlayStyle,
    nowMs,
  });
}

function handleReducedMotionChange(event) {
  prefersReducedMotion = event.matches;
  render(performance.now());
}

if (typeof reducedMotionQuery.addEventListener === 'function') {
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
} else if (typeof reducedMotionQuery.addListener === 'function') {
  reducedMotionQuery.addListener(handleReducedMotionChange);
}

function isLessonScopedMode(modeId = selectedModeId) {
  return getMode(modeId).id === 'basics';
}

function isPracticeSelected() {
  return selectedPlayStyle === 'practice';
}

function renderLessonIntro() {
  noteGuide.hidden = selectedModeId !== 'basics' || selectedPlayStyle !== 'practice';
  if (guideLessonId !== selectedLessonId) {
    noteGuideContent.innerHTML = renderLessonGuide(getLessonPool(getMode('basics').pool, selectedLessonId));
    guideLessonId = selectedLessonId;
  }
  const lessonApplies = isLessonScopedMode();
  const intro = getLessonIntroCard(selectedLessonId);
  lessonIntro.hidden = !lessonApplies || lessonIntroHidden;
  if (lessonSelect.closest('label')) lessonSelect.closest('label').hidden = !lessonApplies;
  syncElementText(lessonIntroTitle, intro.title);
  syncElementText(lessonIntroBody, intro.body);
  syncElementText(lessonIntroExamples, intro.examples.join(' · '));
}

function progressContextKey() {
  return `${selectedModeId}:${selectedModeId === 'basics' ? selectedLessonId : 'all'}`;
}

function currentProgress() {
  const key = progressContextKey();
  if (!progressCache.has(key)) progressCache.set(key, storageAdapter.readProgress(selectedModeId, selectedLessonId));
  return progressCache.get(key);
}

function savePracticeAttempt(outcome) {
  if (!outcome || outcome.phase !== 'practice') return;
  const progress = recordAttempt(currentProgress(), {
    correct: outcome.result === 'correct',
    assisted: listenSession.wasAssisted(outcome.prompt?.id),
  });
  progressCache.set(progressContextKey(), progress);
  storageAdapter.writeProgress(selectedModeId, selectedLessonId, progress);
}

function currentLearningRecommendation() {
  const accidentalHint = buildAccidentalLearningHint({ modeId: selectedModeId, prompt: state.activeNote });
  if (accidentalHint) return accidentalHint;
  const intervalHint = selectedModeId === 'basics' && selectedLessonId === 'interval-jumps'
    ? buildIntervalLearningHint({ previousPrompt: state.previousPrompt, prompt: state.activeNote })
    : null;
  if (intervalHint) return intervalHint;
  if (selectedPlayStyle === 'practice') {
    const progress = summarizeProgress(currentProgress());
    if (progress.ready) return { kind: 'ready', text: 'At least 8 of your last 10 independent answers were correct. Try the next lesson or Rush.' };
    if (progress.recent.length && !progress.recent.at(-1)) return { kind: 'review-mistake', text: 'Read the correction, then try again. You can hear the note for help.' };
    return { kind: 'practice', text: 'Read the note. Hear it if you need help, then sing or play it back.' };
  }
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
  appBackground.dataset.playStyle = selectedPlayStyle;
  syncElementText(document.querySelector('#session-label'), selectedPlayStyle === 'practice' ? 'Your practice' : 'Your Rush');
  const progress = summarizeProgress(currentProgress());
  lessonProgressEl.hidden = selectedPlayStyle !== 'practice';
  syncElementText(lessonProgressEl, progress.attempts
    ? `Recent: ${progress.recentCorrect}/${progress.recent.length} on your own · ${progress.assisted} with help`
    : 'Progress saved on this device · listening help welcome');
  const nextLesson = BEGINNER_LESSONS[BEGINNER_LESSONS.findIndex((lesson) => lesson.id === selectedLessonId) + 1];
  nextLessonButton.hidden = selectedPlayStyle !== 'practice' || selectedModeId !== 'basics' || !progress.ready || !nextLesson;
  if (nextLesson) syncElementText(nextLessonButton, `Next lesson: ${nextLesson.label}`);
  hearNoteButton.hidden = selectedPlayStyle !== 'practice';
  hearNoteButton.disabled = !listenSession.canScore(nowMs);
  syncElementText(hearNoteButton, listenSession.canScore(nowMs) ? 'Hear this note' : 'Listen…');
  pauseRushButton.hidden = !['running', 'paused'].includes(state.phase);
  syncElementText(pauseRushButton, state.phase === 'paused' ? 'Resume Rush' : 'Pause Rush');
  startButton.hidden = state.phase === 'paused';
  const micView = buildMicrophonePresentation({
    microphone: microphoneState, canScore: listenSession.canScore(nowMs), phase: state.phase,
    settingsOpen: settingsDialog.open, trackState: getCurrentMicrophoneTrackState(),
  });
  stopMicrophoneMainButton.hidden = micView.stopHidden;
  syncElementText(micGuidanceEl, micView.guidance);
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
  renderSettings({
    modeId: selectedModeId, speedId: selectedSpeedId, difficultyId: selectedDifficultyId,
    lessonId: selectedLessonId, inputMode: selectedInputMode, playStyle: selectedPlayStyle,
    phase: state.phase, showHints, matchAnyOctave,
  });
  syncElementText(startButton, state.phase === 'running' ? 'Restart sprint' : state.phase === 'ended' ? 'Play another 60s rush' : state.phase === 'practice' ? 'Next practice note' : selectedPlayStyle === 'practice' ? 'Start practice' : 'Start 60s sprint');
  restartPracticeButton.hidden = state.phase !== 'practice';
  const roundEnded = state.phase === 'ended';
  buttons.hidden = roundEnded || selectedInputMode !== 'buttons';
  pianoStrip.hidden = roundEnded || selectedInputMode !== 'piano';
  microphonePanel.hidden = roundEnded || selectedInputMode !== 'microphone';
  const micReadiness = micView.readiness;
  micReadinessEl.dataset.status = micReadiness.status;
  micReadinessEl.dataset.ready = micReadiness.ready ? 'true' : 'false';
  syncElementText(micReadinessTitleEl, micReadiness.title);
  syncElementText(micReadinessBodyEl, micReadiness.body);
  syncElementText(startMicrophoneMainButton, micReadiness.action);
  startMicrophoneButton.disabled = micView.startDisabled;
  startMicrophoneMainButton.disabled = micView.startDisabled;
  stopMicrophoneButton.disabled = micView.stopDisabled;
  syncElementText(microphoneStatusEl, micView.status);
  semanticPresenter.updatePitch(heardNoteEl, { message: buildHeardNoteMessage(microphoneState.note), hasPitch: Boolean(microphoneState.note), nowMs });
  syncElementText(microphoneRecordingDiagnosticEl, microphoneRecordingDiagnostic);
  syncElementText(microphoneDebugTextEl, microphoneDebugText);
  syncElementText(micReportPreviewEl, lastMicReport ? `Last report: ${lastMicReport.capture.label} · ${lastMicReport.interpretation}` : 'No exported report yet.');
  syncElementText(calibrationReadingEl, micView.calibrationText);
  calibrationReadingEl.dataset.status = micView.calibrationStatus;

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
  listenSession.reset();
  microphoneState.scoringMessage = null;
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
      microphoneState.vocalCandidate = null;
      microphoneState.scoringMessage = null;
      render(now);
      return;
    }
    listenSession.reset();
    state = startPractice(state, now, selectedModeId, selectedLessonId);
    summaryEl.hidden = true;
    render(now);
    return;
  }
  listenSession.reset();
  state = startRound(state, now, selectedModeId, selectedSpeedId, selectedDifficultyId);
  summaryEl.hidden = true;
  render(now);
  rafId = requestAnimationFrame(tick);
}

function restartPracticeSession() {
  listenSession.reset();
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

function returnToPractice() {
  selectedPlayStyle = 'practice';
  storageAdapter.writePreference('selectedPlayStyle', selectedPlayStyle);
  resetIdleState();
  beginRound();
  summaryFocusManager.closeForReplay();
  notationStage.focus();
}

function toggleRushPause() {
  if (state.phase === 'paused') {
    state = resumeRound(state, performance.now());
    microphoneState.vocalCandidate = null;
    rafId = requestAnimationFrame(tick);
  } else if (state.phase === 'running') {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    state = pauseRound(state, performance.now());
    if (state.phase === 'ended') setBestScore(state.score, state.modeId, state.speedId, state.difficultyId);
  }
  render();
}

function refreshAfterPlayback(durationMs) {
  clearTimeout(playbackRefreshTimer);
  playbackRefreshTimer = setTimeout(() => render(), durationMs + 320);
}

function hearCurrentNote() {
  if (selectedPlayStyle !== 'practice' || !listenSession.canScore(performance.now())) return;
  if (state.phase !== 'practice') beginRound();
  const prompt = state.activeNote;
  const durationMs = playPromptAudio(prompt);
  if (!durationMs) {
    state.feedback = { kind: 'practice', text: 'Audio is unavailable. Try note buttons or enable browser sound.' };
  } else {
    listenSession.hear(prompt.id, performance.now(), durationMs);
    microphoneState.vocalCandidate = null;
    microphoneState.scoringMessage = null;
    state.feedback = { kind: 'practice', text: `Listen to ${prompt.answer}, then sing or play it back.` };
  }
  render();
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
  if (!prompt) return 0;
  const context = getAudioContext();
  if (!context) return 0;
  const frequencies = getPromptFrequencies(prompt);
  const durationMs = 1100 + Math.max(0, frequencies.length - 1) * 85;
  listenSession.block(performance.now(), durationMs);
  microphoneState.vocalCandidate = null;
  refreshAfterPlayback(durationMs);
  frequencies.forEach((frequency, index) => {
    const startAt = context.currentTime + index * 0.085;
    playPianoVoice(context, frequency, startAt);
  });
  return durationMs;
}

function playCalibrationTone() {
  const context = getAudioContext();
  if (!context) return;
  listenSession.block(performance.now(), 1100);
  microphoneState.vocalCandidate = null;
  refreshAfterPlayback(1100);
  const tone = getCalibrationTone();
  playPianoVoice(context, tone.frequency, context.currentTime);
  feedbackEl.dataset.kind = 'correct';
  feedbackEl.textContent = `${tone.label}: ${tone.help}`;
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

function downloadProgress() {
  const transfer = storageAdapter.exportProgress();
  const blob = new Blob([JSON.stringify(transfer, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clefhanger-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return transfer;
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
    if (selectedInputMode === 'microphone' && ['running', 'practice'].includes(state.phase) && listenSession.canScore(nowMs) && !settingsDialog.open) {
      const match = evaluateVocalMatchFrame({ prompt: state.activeNote, frequency, nowMs, previousCandidate: microphoneState.vocalCandidate, lastAcceptedAtMs: microphoneState.lastAcceptedAtMs, matchAnyOctave });
      const scoringFeedback = buildMicrophoneScoringFeedback(match, { prompt: state.activeNote });
      microphoneState = { ...microphoneState, vocalCandidate: match.candidate };
      microphoneDebugText = scoringFeedback.text;
      microphoneState.scoringMessage = scoringFeedback.text;
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

  if (!frequency || !listenSession.canScore(nowMs) || settingsDialog.open) {
    microphoneState.vocalCandidate = null;
    if (!frequency) microphoneState.scoringMessage = null;
  }
  render(nowMs);
  if (microphoneState.listening && frequencyOverride === null) microphoneRafId = requestAnimationFrame((timestamp) => processMicrophoneFrame(null, timestamp));
  return microphoneState;
}

function handleAnswer(answer) {
  if (!['practice', 'running'].includes(state.phase) || settingsDialog.open) return;
  const now = performance.now();
  const answeredPrompt = state.activeNote;
  if (state.phase === 'practice' && !noteGuide.hidden && noteGuide.open) listenSession.assist(answeredPrompt.id);
  state = answerActiveNote(state, answer, now);
  savePracticeAttempt(state.lastOutcome);
  if (state.phase === 'practice') {
    state = applyLearningFeedback(state, now, { showHints });
    if (state.correction) listenSession.assist(answeredPrompt.id);
  }
  if (state.feedback.kind === 'correct') playPromptAudio(answeredPrompt);
  if (state.phase === 'running') state = updateRound(state, now);
  if (state.phase === 'practice' && !state.activeNote) state = spawnNextNote(state, now + 1);
  render(now);
}

function installButtons() {
  buttons.innerHTML = '';
  const answers = getScaffoldedAnswerOptions({ modeId: selectedModeId, difficultyId: selectedPlayStyle === 'practice' ? 'beginner' : selectedDifficultyId, lessonId: selectedLessonId, allOptions: getAnswerOptions(selectedModeId) });
  buttons.style.setProperty('--answer-columns', String(Math.min(answers.length, 7)));
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
      ensurePlayableInputMode(selectedModeId, requestedInputMode, { persist: true, announce: true });
      storageAdapter.writePreference('selectedInputMode', selectedInputMode);
      render();
    });
  }
}

function openSettings() {
  if (state.phase === 'running') toggleRushPause();
  if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal();
  else settingsDialog.setAttribute('open', '');
}

function closeSettings() {
  if (typeof settingsDialog.close === 'function') settingsDialog.close();
  else settingsDialog.removeAttribute('open');
  microphoneState.vocalCandidate = null;
  render();
}

function installModes() {
  modeButtons.innerHTML = '';
  for (const mode of GAME_MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-button';
    button.dataset.mode = mode.id;
    button.textContent = mode.label;
    button.setAttribute('aria-pressed', 'false');
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
    if (state.phase === 'practice' && state.lastOutcome?.result === 'wrong' && state.activeNote?.id === state.lastOutcome.prompt?.id) {
      state = applyLearningFeedback(state, performance.now(), { showHints });
      if (state.correction) listenSession.assist(state.activeNote.id);
    }
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
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      selectedDifficultyId = difficulty.id;
      storageAdapter.writePreference('selectedDifficulty', selectedDifficultyId);
      resetIdleState();
    });
    difficultyButtons.append(button);
  }
}

noteGuide.addEventListener('toggle', () => {
  if (noteGuide.open && state.phase === 'practice' && !noteGuide.hidden) listenSession.assist(state.activeNote?.id);
});
hearNoteButton.addEventListener('click', hearCurrentNote);
pauseRushButton.addEventListener('click', toggleRushPause);
summaryPracticeButton.addEventListener('click', returnToPractice);
stopMicrophoneMainButton.addEventListener('click', stopMicrophone);
document.querySelector('#use-note-buttons').addEventListener('click', () => {
  ensurePlayableInputMode(selectedModeId, 'buttons', { persist: true });
  render();
});
nextLessonButton.addEventListener('click', () => {
  const next = BEGINNER_LESSONS[BEGINNER_LESSONS.findIndex((lesson) => lesson.id === selectedLessonId) + 1];
  if (!next) return;
  selectedLessonId = next.id;
  storageAdapter.writePreference('selectedLesson', selectedLessonId);
  resetIdleState();
  beginRound();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.phase === 'running') toggleRushPause();
});
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
exportProgressButton.addEventListener('click', downloadProgress);
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
    ensurePlayableInputMode(selectedModeId, normalizeInputMode(inputMode), { persist: false, announce: true });
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
  downloadProgress,
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
