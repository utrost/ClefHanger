import {
  detectPitchFromTimeDomain,
  frequencyToNearestPitch,
  getCenteredRms,
  microphoneInputLevelPercent,
} from './pitch.js?v=clefhanger-slice50-mic-recording-diagnostic-adapter-2026-09-02';

export function summarizeAudioSamples(samples, sampleRate, { label = 'capture' } = {}) {
  const safeSamples = samples || new Float32Array();
  let peak = 0;
  for (const sample of safeSamples) peak = Math.max(peak, Math.abs(sample));
  const rms = getCenteredRms(safeSamples);
  return {
    label,
    sampleRate: sampleRate || null,
    sampleCount: safeSamples.length,
    durationMs: sampleRate ? Math.round((safeSamples.length / sampleRate) * 1000) : 0,
    rms,
    rmsPercent: microphoneInputLevelPercent(rms),
    peak,
    peakPercent: microphoneInputLevelPercent(peak),
  };
}

export function formatDiagnosticLevelPercent(level) {
  if (!Number.isFinite(level) || level <= 0) return '0%';
  const percent = level * 100;
  if (percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

export function summarizePitchWindows(samples, sampleRate, { windowSize = 4096, hopSize = 2048, maxWindows = 32 } = {}) {
  if (!samples || !samples.length || !sampleRate) return { status: 'no-audio', candidates: [], best: null };
  const candidates = [];
  const effectiveWindowSize = Math.min(windowSize, samples.length);
  let checked = 0;
  for (let start = 0; start + effectiveWindowSize <= samples.length && checked < maxWindows; start += Math.max(1, hopSize), checked += 1) {
    const window = samples.subarray(start, start + effectiveWindowSize);
    const inputLevel = getCenteredRms(window);
    const frequency = detectPitchFromTimeDomain(window, sampleRate);
    const pitch = frequencyToNearestPitch(frequency);
    if (frequency && pitch) {
      candidates.push({
        startMs: Math.round((start / sampleRate) * 1000),
        frequency,
        roundedFrequency: Math.round(frequency),
        note: `${pitch.answer}${pitch.octave}`,
        answer: pitch.answer,
        cents: pitch.cents,
        inputLevel,
        levelPercent: microphoneInputLevelPercent(inputLevel),
      });
    }
    if (samples.length <= effectiveWindowSize) break;
  }
  const best = candidates.reduce((winner, candidate) => {
    if (!winner) return candidate;
    if (candidate.inputLevel > winner.inputLevel) return candidate;
    return winner;
  }, null);
  return { status: best ? 'pitch-detected' : 'no-steady-pitch', candidates, best };
}

function summarizeLive(live = {}) {
  const pitch = frequencyToNearestPitch(live.frequency);
  return {
    levelPercent: microphoneInputLevelPercent(live.inputLevel || 0),
    inputLevel: live.inputLevel || 0,
    frequency: live.frequency || null,
    pitch: pitch ? { note: `${pitch.answer}${pitch.octave}`, answer: pitch.answer, cents: pitch.cents } : null,
    trackState: live.trackState || 'none',
  };
}

function interpret({ liveSummary, recordingSummary }) {
  const liveHasPitch = Boolean(liveSummary.pitch);
  const liveHasLevel = liveSummary.levelPercent > 0;
  const recordingHasPitch = Boolean(recordingSummary?.pitch?.best);
  const recordingHasBytes = (recordingSummary?.bytes || 0) > 0;
  const recordingHasLevel = (recordingSummary?.audio?.rmsPercent || 0) > 0;
  if (!liveHasLevel && recordingHasPitch) return 'recording-pitch-detected-live-silent';
  if (liveHasPitch) return 'live-pitch-detected';
  if (recordingHasPitch) return 'recording-pitch-detected';
  if (!recordingHasBytes) return 'no-recording-bytes';
  if (!recordingHasLevel) return 'recording-silent';
  if (liveHasLevel || recordingHasLevel) return 'audio-level-no-steady-pitch';
  return 'no-audio-evidence';
}

export function buildMicDiagnosticReport({
  appVersion = 'unknown',
  label = 'capture',
  nowIso = new Date().toISOString(),
  userAgent = '',
  url = '',
  audioContext = {},
  live = {},
  recording = null,
  track = {},
} = {}) {
  const liveSummary = summarizeLive(live);
  const recordingSummary = recording ? {
    bytes: recording.bytes || 0,
    mimeType: recording.mimeType || null,
    audio: summarizeAudioSamples(recording.samples || new Float32Array(), recording.sampleRate, { label }),
    pitch: summarizePitchWindows(recording.samples || new Float32Array(), recording.sampleRate),
  } : { bytes: 0, mimeType: null, audio: null, pitch: { status: 'no-audio', candidates: [], best: null } };

  return {
    schema: 'clefhanger-mic-report-v1',
    appVersion,
    capturedAt: nowIso,
    capture: { label },
    environment: { userAgent, url },
    audioContext: {
      sampleRate: audioContext.sampleRate || null,
      state: audioContext.state || null,
    },
    track: {
      readyState: track.readyState || null,
      muted: Boolean(track.muted),
      enabled: track.enabled !== undefined ? Boolean(track.enabled) : null,
      settings: track.settings || {},
    },
    live: liveSummary,
    recording: recordingSummary,
    interpretation: interpret({ liveSummary, recordingSummary }),
  };
}

export function buildMicDiagnosticTextFile(report) {
  const safeLabel = String(report?.capture?.label || 'capture').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'capture';
  const safeStamp = String(report?.capturedAt || new Date().toISOString()).replace(/[:.]/g, '-');
  return {
    filename: `clefhanger-mic-${safeLabel}-${safeStamp}.txt`,
    mimeType: 'text/plain',
    text: JSON.stringify(report, null, 2),
  };
}
