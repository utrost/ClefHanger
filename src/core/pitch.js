import { answerLabel, getPitchFrequency } from './game.js';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const DEFAULT_TOLERANCE_CENTS = 35;
const DEFAULT_DEBOUNCE_MS = 650;

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
    calibration: null,
    error: null,
    lastAcceptedAtMs: 0,
  };
}

export function frequencyToNearestPitch(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
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
  let rms = 0;
  for (const sample of samples) rms += sample * sample;
  rms = Math.sqrt(rms / samples.length);
  if (rms < 0.01) return null;

  const minFrequency = 80;
  const maxFrequency = 1000;
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), samples.length - 1);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let i = 0; i < samples.length - lag; i += 1) {
      correlation += samples[i] * samples[i + lag];
    }
    correlation /= samples.length - lag;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorrelation < 0.002) return null;
  return sampleRate / bestLag;
}
