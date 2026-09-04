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
} from './core/content.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import {
  STAFF_LAYOUT,
  createInitialState,
  startRound,
  startPractice,
  spawnNextNote,
  answerActiveNote,
  updateRound,
  getRemainingSeconds,
  getRoundSummary,
} from './core/game.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { getPromptFrequencies } from './core/music-theory.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { getCalibrationTone, playPianoVoice } from './core/audio.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import {
  buildCalibrationReading,
  buildHeardNoteMessage,
  buildMicrophoneListeningMessage,
  createMicrophoneState,
  detectPitchFromTimeDomain,
  evaluateVocalMatchFrame,
  frequencyToNearestPitch,
  getCenteredRms,
  normalizeMicrophoneInputMode,
} from './core/pitch.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { buildMicDiagnosticReport, buildMicDiagnosticTextFile, formatDiagnosticLevelPercent } from './core/mic-diagnostics.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { BEGINNER_LESSONS, applyLearningFeedback, buildAccidentalLearningHint, buildBeginnerMicMessage, buildIntervalLearningHint, buildLearningRecommendation, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getScaffoldedAnswerOptions } from './core/learning.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { renderStaffSvg } from './ui/staff-renderer.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { startMicrophoneSession, formatMicrophoneError } from './platform/microphone-session.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { runMicrophoneRecordingDiagnostic } from './platform/mic-recording-diagnostic.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
import { createStorageAdapter } from './platform/storage.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';

const appVersion = 'clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
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
const matchAnyOctaveToggle = document.querySelector('#match-any-octave');
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

const storageAdapter = createStorageAdapter();
const storedPreferences = storageAdapter.readPreferences();
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
let lastMicRecordingEvidence = null;
let lastMicReport = null;

function getBestScore(modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  return storageAdapter.readHighScore(modeId, speedId, difficultyId);
}

function setBestScore(score, modeId = selectedModeId, speedId = selectedSpeedId, difficultyId = selectedDifficultyId) {
  storageAdapter.writeHighScore(score, modeId, speedId, difficultyId);
}

function normalizeInputMode(inputMode) {
  return normalizeMicrophoneInputMode(inputMode);
}

function renderStaff(nowMs) {
  staff.innerHTML = renderStaffSvg({ state, selectedInputMode, microphoneState, nowMs });
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
  const intervalHint = selectedLessonId === 'interval-jumps'
    ? buildIntervalLearningHint({ previousPrompt: state.previousPrompt, prompt: state.activeNote })
    : null;
  if (intervalHint) return intervalHint;
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
  matchAnyOctaveToggle.checked = matchAnyOctave;
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

function microphoneStatusText() {
  if (microphoneState.permission === 'requesting') return 'Requesting mic… check the browser permission prompt.';
  if (microphoneState.permission === 'blocked') return `Mic blocked: ${microphoneState.error || 'permission denied'}`;
  const listeningMessage = buildMicrophoneListeningMessage(microphoneState);
  if (listeningMessage) return listeningMessage;
  if (microphoneState.permission === 'granted') return 'Mic ready. Sing notes to answer.';
  return 'Mic off. Grant mic to calibrate and sing answers.';
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
  if (microphoneRafId !== null) cancelAnimationFrame(microphoneRafId);
  microphoneRafId = null;
  microphoneSession?.stop?.();
  clearMicrophoneSession();
  microphoneState = { ...microphoneState, listening: false, trackState: 'none' };
  render();
}

async function startMicrophone() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia unavailable');
    }
    microphoneState = { ...microphoneState, permission: 'requesting', listening: false, error: null, frequency: null, note: null, cents: null, inputLevel: 0, silentFrameCount: 0, trackState: 'none', vocalCandidate: null };
    render();
    const context = getAudioContext();
    microphoneSession = await startMicrophoneSession({ navigatorObject: navigator, audioContext: context });
    microphoneStream = microphoneSession.stream;
    microphoneAnalyser = microphoneSession.analyser;
    microphoneBuffer = microphoneSession.buffer;
    microphoneState = { ...microphoneState, permission: 'granted', listening: true, trackState: getCurrentMicrophoneTrackState(), error: null };
    processMicrophoneFrame();
    render();
    return true;
  } catch (error) {
    microphoneSession?.stop?.();
    clearMicrophoneSession();
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
      microphoneState = { ...microphoneState, vocalCandidate: match.candidate };
      if (match.status === 'pending-stable') microphoneDebugText = `Hold ${match.detected.answer} steady…`;
      if (match.status === 'wrong-octave') microphoneDebugText = `That was ${match.detected.answer}${match.detected.octave}; turn on Match any octave if your voice is lower/higher than the written staff note.`;
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
  clefhangerInjectPitch: (frequency, nowMs = performance.now()) => processMicrophoneFrame(frequency, nowMs),
  getMicrophoneState: () => microphoneState,
  getMicrophoneRecordingDiagnostic: () => microphoneRecordingDiagnostic,
  openSettings,
  closeSettings,
};

window.clefhangerInjectPitch = window.__clefHanger.clefhangerInjectPitch;
