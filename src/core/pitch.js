import { answerLabel, getPitchFrequency } from './game.js';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const DEFAULT_TOLERANCE_CENTS = 35;
const DEFAULT_DEBOUNCE_MS = 650;
const MIN_PLAYABLE_MIC_FREQUENCY = 80;
const MAX_PLAYABLE_MIC_FREQUENCY = 1000;

export function normalizeMicrophoneInputMode(inputMode) {
  if (inputMode === 'microphone') return 'microphone';
  if (inputMode === 'piano') return 'piano';
  return 'buttons';
}

export function createMicrophoneState() {
  return {
    permission: 'idle',
    listening: false,
    frequency: null,
    note: null,
    cents: null,
    inputLevel: 0,
    silentFrameCount: 0,
    calibration: null,
    error: null,
    lastAcceptedAtMs: 0,
  };
}

export function frequencyToNearestPitch(frequency) {
  if (!Number.isFinite(frequency) || frequency < MIN_PLAYABLE_MIC_FREQUENCY || frequency > MAX_PLAYABLE_MIC_FREQUENCY) return null;
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const normalizedIndex = ((midi % 12) + 12) % 12;
  const noteName = NOTE_NAMES[normalizedIndex];
  const octave = Math.floor(midi / 12) - 1;
  const targetFrequency = 440 * (2 ** ((midi - 69) / 12));
  const pitch = {
    frequency,
    midi,
    noteName: noteName[0],
    octave,
    answer: noteName,
    cents: Math.round(centsBetween(frequency, targetFrequency)),
  };
  if (noteName.length > 1) pitch.accidental = 'sharp';
  return pitch;
}

export function centsBetween(frequency, targetFrequency) {
  if (!Number.isFinite(frequency) || !Number.isFinite(targetFrequency) || frequency <= 0 || targetFrequency <= 0) return null;
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function buildCalibrationReading(frequency) {
  const target = { noteName: 'A', octave: 4, frequency: 440, answer: 'A' };
  const detected = frequencyToNearestPitch(frequency);
  if (!detected) {
    return { target, detected: null, cents: null, status: 'silent', message: 'No steady pitch yet. Sing A after the tone.' };
  }
  const cents = Math.round(centsBetween(frequency, target.frequency));
  const abs = Math.abs(cents);
  const status = abs <= 15 ? 'in-tune' : cents > 0 ? 'sharp' : 'flat';
  const direction = status === 'in-tune' ? 'in tune' : `${abs} cents ${status}`;
  return {
    target,
    detected,
    cents,
    status,
    message: `A4 calibration: ${detected.answer}${detected.octave} at ${Math.round(frequency)} Hz — ${direction}.`,
  };
}

export function buildHeardNoteMessage(pitch) {
  if (!pitch) return 'You played —';
  const cents = pitch.cents || 0;
  const tuning = cents === 0 ? 'in tune' : `${Math.abs(cents)}¢ ${cents > 0 ? 'sharp' : 'flat'}`;
  return `You played ${pitch.answer}${pitch.octave} · ${Math.round(pitch.frequency)} Hz · ${tuning}`;
}

export function microphoneInputLevelPercent(inputLevel) {
  if (!Number.isFinite(inputLevel) || inputLevel <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(inputLevel * 100)));
}

export function buildMicrophoneListeningMessage({ listening, note, frequency, cents, inputLevel = 0, silentFrameCount = 0 } = {}) {
  const levelPercent = microphoneInputLevelPercent(inputLevel);
  if (listening && note) {
    const centsText = cents === null ? '' : ` (${cents > 0 ? '+' : ''}${cents}¢)`;
    return `Listening: ${note.answer}${note.octave} ${Math.round(frequency)} Hz${centsText} · level ${levelPercent}%`;
  }
  if (listening && silentFrameCount > 8) {
    if (levelPercent < 1) return 'Listening: mic level 0% — Firefox granted access, but no audio is reaching the app.';
    if (levelPercent < 3) return `Listening: mic level ${levelPercent}% — too quiet for pitch detection. Sing closer/louder.`;
    return `Listening: mic level ${levelPercent}% — no steady pitch yet. Hold one clear note.`;
  }
  if (listening) return `Listening: checking mic input… level ${levelPercent}%`;
  return null;
}

export function classifyVocalMatch({ prompt, frequency, nowMs, lastAcceptedAtMs = 0, toleranceCents = DEFAULT_TOLERANCE_CENTS, debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  const detected = frequencyToNearestPitch(frequency);
  if (!prompt || !detected) return { status: 'silent', answer: null, detected, cents: null };
  if (nowMs - lastAcceptedAtMs < debounceMs) return { status: 'debounce', answer: null, detected, cents: null };
  if (prompt.kind === 'chord') return { status: 'unsupported-chord', answer: null, detected, cents: null };

  const targetFrequency = getPitchFrequency(prompt.noteName, prompt.octave, prompt.accidental);
  const cents = targetFrequency ? Math.round(centsBetween(frequency, targetFrequency)) : null;
  const targetAnswer = answerLabel(prompt.noteName, prompt.accidental);
  const sameAnswer = detected.answer === targetAnswer;
  if (sameAnswer && Math.abs(cents) <= toleranceCents) {
    return { status: 'match', answer: targetAnswer, detected, cents };
  }
  return { status: sameAnswer ? 'out-of-tune' : 'wrong-note', answer: null, detected, cents };
}

export function detectPitchFromTimeDomain(samples, sampleRate) {
  if (!samples || !samples.length || !sampleRate) return null;

  const rms = getCenteredRms(samples);
  if (rms < 0.002) return null;

  const centered = centerSamples(samples);
  const minLag = Math.floor(sampleRate / MAX_PLAYABLE_MIC_FREQUENCY);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_PLAYABLE_MIC_FREQUENCY), centered.length - 1);
  const correlations = [];

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let cross = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < centered.length - lag; i += 1) {
      const a = centered[i];
      const b = centered[i + lag];
      cross += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denominator = Math.sqrt(energyA * energyB);
    correlations[lag] = denominator > 0 ? cross / denominator : 0;
  }

  const minCorrelation = 0.72;
  for (let lag = minLag + 1; lag < maxLag - 1; lag += 1) {
    const current = correlations[lag] || 0;
    if (current >= minCorrelation && current >= (correlations[lag - 1] || 0) && current > (correlations[lag + 1] || 0)) {
      return sampleRate / lag;
    }
  }

  return null;
}

export function getCenteredRms(samples) {
  if (!samples || !samples.length) return 0;
  const centered = centerSamples(samples);
  let rms = 0;
  for (const sample of centered) rms += sample * sample;
  return Math.sqrt(rms / centered.length);
}

function centerSamples(samples) {
  let mean = 0;
  for (const sample of samples) mean += sample;
  mean /= samples.length;

  const centered = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    centered[i] = samples[i] - mean;
  }
  return centered;
}
