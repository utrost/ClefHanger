import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMicDiagnosticReport,
  buildMicDiagnosticTextFile,
  formatDiagnosticLevelPercent,
  summarizeAudioSamples,
  summarizePitchWindows,
} from '../src/core/mic-diagnostics.js';

function sineSamples({ frequency, sampleRate = 44100, length = 8192, amplitude = 0.08 }) {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude);
}

test('summarizes decoded audio level and pitch candidates for voice/piano fixtures', () => {
  const voice = sineSamples({ frequency: 110, amplitude: 0.035 });
  const audio = summarizeAudioSamples(voice, 44100, { label: 'voice-a2' });
  const windows = summarizePitchWindows(voice, 44100, { maxWindows: 6 });

  assert.equal(audio.label, 'voice-a2');
  assert.equal(audio.sampleRate, 44100);
  assert.ok(audio.rmsPercent > 1, `expected visible RMS, got ${audio.rmsPercent}%`);
  assert.ok(audio.peakPercent > audio.rmsPercent);
  assert.equal(windows.status, 'pitch-detected');
  assert.equal(windows.best.note, 'A2');
  assert.ok(Math.abs(windows.best.frequency - 110) < 3);
  assert.ok(windows.candidates.length > 0);
});

test('diagnostic level copy keeps sub-one-percent audio visible', () => {
  assert.equal(formatDiagnosticLevelPercent(0), '0%');
  assert.equal(formatDiagnosticLevelPercent(0.00364976030535239), '0.4%');
  assert.equal(formatDiagnosticLevelPercent(0.03120153769850731), '3.1%');
});

test('diagnostic report keeps live analyser separate from MediaRecorder evidence', () => {
  const report = buildMicDiagnosticReport({
    appVersion: 'clefhanger-test',
    label: 'piano-c4',
    userAgent: 'Android Chrome fixture',
    url: 'https://simiono.com/clefhanger/?v=test',
    audioContext: { sampleRate: 48000, state: 'running' },
    live: { inputLevel: 0, frequency: null, trackState: 'live' },
    recording: { bytes: 32000, mimeType: 'audio/webm', samples: sineSamples({ frequency: 261.63, sampleRate: 48000, length: 12000, amplitude: 0.06 }), sampleRate: 48000 },
    track: { readyState: 'live', muted: false, enabled: true, settings: { echoCancellation: true } },
  });

  assert.equal(report.schema, 'clefhanger-mic-report-v1');
  assert.equal(report.capture.label, 'piano-c4');
  assert.equal(report.live.levelPercent, 0);
  assert.equal(report.recording.bytes, 32000);
  assert.equal(report.recording.pitch.best.note, 'C4');
  assert.equal(report.track.readyState, 'live');
  assert.equal(report.interpretation, 'recording-pitch-detected-live-silent');
});

test('mic diagnostic export is a Telegram-friendly text JSON file', () => {
  const report = buildMicDiagnosticReport({ appVersion: 'clefhanger-test', label: 'silence', nowIso: '2026-08-30T12:00:00.000Z' });
  const file = buildMicDiagnosticTextFile(report);

  assert.equal(file.mimeType, 'text/plain');
  assert.equal(file.filename, 'clefhanger-mic-silence-2026-08-30T12-00-00-000Z.txt');
  const parsed = JSON.parse(file.text);
  assert.equal(parsed.schema, 'clefhanger-mic-report-v1');
  assert.equal(parsed.capture.label, 'silence');
});
