import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCalibrationReading,
  buildMicrophoneListeningMessage,
  centsBetween,
  classifyVocalMatch,
  createMicrophoneState,
  detectPitchFromRecordedAudio,
  detectPitchFromTimeDomain,
  frequencyToNearestPitch,
  getCenteredRms,
  microphoneInputLevelPercent,
  normalizeMicrophoneInputMode,
} from '../src/core/pitch.js';

function sineSamples({ frequency, sampleRate = 44100, length = 2048, amplitude = 0.3 }) {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude);
}

test('maps sung frequencies to nearest note names with cents offset', () => {
  assert.deepEqual(frequencyToNearestPitch(440), {
    frequency: 440,
    midi: 69,
    noteName: 'A',
    octave: 4,
    answer: 'A',
    cents: 0,
  });

  const c4 = frequencyToNearestPitch(261.63);
  assert.equal(c4.noteName, 'C');
  assert.equal(c4.octave, 4);
  assert.equal(c4.answer, 'C');
  assert.ok(Math.abs(c4.cents) <= 1);
});

test('rejects implausible microphone noise outside the playable vocal range', () => {
  assert.equal(frequencyToNearestPitch(6569), null);

  const calibration = buildCalibrationReading(6569);
  assert.equal(calibration.status, 'silent');
  assert.equal(calibration.detected, null);
  assert.match(calibration.message, /steady pitch/i);

  const prompt = { answer: 'G', noteName: 'G', octave: 4 };
  const match = classifyVocalMatch({ prompt, frequency: 6569, nowMs: 1000, lastAcceptedAtMs: 0 });
  assert.equal(match.status, 'silent');
  assert.equal(match.detected, null);
  assert.equal(match.answer, null);
});

test('reports cent distance between detected pitch and target prompt', () => {
  assert.equal(Math.round(centsBetween(440, 440)), 0);
  assert.equal(Math.round(centsBetween(466.16, 440)), 100);
  assert.equal(Math.round(centsBetween(415.3, 440)), -100);
});

test('builds calibration readings around concert A', () => {
  const inTune = buildCalibrationReading(440);
  assert.equal(inTune.status, 'in-tune');
  assert.equal(inTune.detected.answer, 'A');
  assert.equal(inTune.target.frequency, 440);
  assert.equal(inTune.cents, 0);
  assert.match(inTune.message, /A4/);
  assert.match(inTune.message, /in tune/i);

  const sharp = buildCalibrationReading(452);
  assert.equal(sharp.status, 'sharp');
  assert.ok(sharp.cents > 40);
  assert.match(sharp.message, /sharp/i);
});

test('classifies a sung note as an answer only inside tolerance and after debounce', () => {
  const prompt = { answer: 'A', noteName: 'A', octave: 4 };
  const first = classifyVocalMatch({ prompt, frequency: 442, nowMs: 1000, lastAcceptedAtMs: 0 });
  assert.equal(first.answer, 'A');
  assert.equal(first.status, 'match');
  assert.ok(Math.abs(first.cents) < 10);

  const bounced = classifyVocalMatch({ prompt, frequency: 442, nowMs: 1100, lastAcceptedAtMs: 1000 });
  assert.equal(bounced.status, 'debounce');
  assert.equal(bounced.answer, null);

  const wrong = classifyVocalMatch({ prompt, frequency: 392, nowMs: 2000, lastAcceptedAtMs: 1000 });
  assert.equal(wrong.status, 'wrong-note');
  assert.equal(wrong.detected.answer, 'G');
  assert.equal(wrong.answer, null);
});

test('microphone mode is a first-class input option with permission state', () => {
  assert.equal(normalizeMicrophoneInputMode('microphone'), 'microphone');
  assert.equal(normalizeMicrophoneInputMode('calibration'), 'buttons');
  assert.deepEqual(createMicrophoneState(), {
    permission: 'idle',
    listening: false,
    frequency: null,
    note: null,
    cents: null,
    inputLevel: 0,
    silentFrameCount: 0,
    trackState: 'none',
    calibration: null,
    error: null,
    lastAcceptedAtMs: 0,
  });
});

test('time-domain pitch detector ignores flat DC input instead of inventing one note', () => {
  const flatOffset = Float32Array.from({ length: 2048 }, () => 0.05);
  assert.equal(detectPitchFromTimeDomain(flatOffset, 44100), null);
});

test('time-domain pitch detector keeps a real steady sung tone', () => {
  const detected = detectPitchFromTimeDomain(sineSamples({ frequency: 440 }), 44100);
  assert.ok(Math.abs(detected - 440) < 8, `expected about 440 Hz, got ${detected}`);
});

test('time-domain pitch detector keeps quiet Firefox-like sung tones', () => {
  const quietSamples = sineSamples({ frequency: 440, amplitude: 0.005 });
  const detected = detectPitchFromTimeDomain(quietSamples, 44100);

  assert.ok(getCenteredRms(quietSamples) < 0.01, 'fixture must stay below the old silence threshold');
  assert.ok(Math.abs(detected - 440) < 8, `expected about 440 Hz, got ${detected}`);
});

test('recording diagnostic scans decoded audio chunks for a sung pitch', () => {
  const sampleRate = 44100;
  const silence = Float32Array.from({ length: 4096 }, () => 0);
  const sung = sineSamples({ frequency: 440, sampleRate, length: 8192, amplitude: 0.05 });
  const recording = new Float32Array(silence.length + sung.length);
  recording.set(silence, 0);
  recording.set(sung, silence.length);

  const detected = detectPitchFromRecordedAudio(recording, sampleRate);
  assert.ok(Math.abs(detected - 440) < 8, `expected recorded A4, got ${detected}`);
});

test('microphone listening copy shows input level when no sung note is detected', () => {
  assert.equal(microphoneInputLevelPercent(0.024), 2);
  assert.match(
    buildMicrophoneListeningMessage({ listening: true, inputLevel: 0, silentFrameCount: 60 }),
    /no audio is reaching the app/i,
  );
  assert.match(
    buildMicrophoneListeningMessage({ listening: true, inputLevel: 0, silentFrameCount: 9 }),
    /no audio is reaching the app/i,
  );
  assert.match(
    buildMicrophoneListeningMessage({ listening: true, inputLevel: 0.018, silentFrameCount: 60 }),
    /too quiet/i,
  );
  assert.match(
    buildMicrophoneListeningMessage({ listening: true, inputLevel: 0.12, silentFrameCount: 60 }),
    /no steady pitch/i,
  );
  assert.match(
    buildMicrophoneListeningMessage({ listening: true, trackState: 'muted', inputLevel: 0.12, silentFrameCount: 60 }),
    /muted/i,
  );
});
