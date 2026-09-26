import { buildMicrophoneListeningMessage, buildMicrophoneReadiness } from '../core/pitch.js?v=clefhanger-slice72-settings-status-2026-09-26';

function microphoneStatusText(microphone) {
  if (microphone.permission === 'requesting') return 'Requesting mic… check the browser permission prompt.';
  if (microphone.permission === 'blocked') return `Mic blocked: ${microphone.error || 'permission denied'}`;
  const listeningMessage = buildMicrophoneListeningMessage(microphone);
  if (listeningMessage) return listeningMessage;
  if (microphone.permission === 'granted') return 'Mic ready. Sing notes to answer.';
  return 'Mic off. Check mic to calibrate and sing answers.';
}

// Snapshot in, display decisions out. Capture, scoring, and announcements stay with their owners.
export function buildMicrophonePresentation({ microphone, canScore = true, phase, settingsOpen = false, trackState = 'none' }) {
  const status = microphoneStatusText(microphone);
  const starting = microphone.permission === 'requesting';
  let guidance = 'Listen to the note, then sing it back.';
  if (!canScore) guidance = 'Listen… scoring waits until the sound finishes.';
  else if (phase === 'paused') guidance = 'Rush paused. Resume when you are ready.';
  else if (settingsOpen) guidance = 'Close Settings to continue.';
  else if (microphone.scoringMessage) guidance = microphone.scoringMessage;
  return {
    status,
    guidance,
    readiness: buildMicrophoneReadiness(microphone),
    startDisabled: starting,
    stopDisabled: !starting && trackState === 'none',
    stopHidden: !microphone.listening && !starting,
    calibrationText: microphone.calibration?.message || (
      ['requesting', 'blocked', 'granted'].includes(microphone.permission)
        ? status : 'Check mic, then sing any steady comfortable note; Play A is only a reference.'
    ),
    calibrationStatus: microphone.calibration?.status || microphone.permission,
  };
}
