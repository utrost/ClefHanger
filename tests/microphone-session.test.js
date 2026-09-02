import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatMicrophoneError,
  queryMicrophonePermissionState,
  startMicrophoneSession,
} from '../src/platform/microphone-session.js';

function createFakeTrack(overrides = {}) {
  return {
    readyState: 'live',
    muted: false,
    enabled: true,
    stopped: false,
    settings: { channelCount: 1 },
    stop() { this.stopped = true; this.readyState = 'ended'; },
    getSettings() { return this.settings; },
    ...overrides,
  };
}

function createFakeStream(track = createFakeTrack()) {
  return {
    track,
    getAudioTracks() { return [track]; },
    getTracks() { return [track]; },
  };
}

function createFakeAudioContext() {
  const calls = [];
  const destination = { kind: 'destination' };
  const source = { connect: (target) => calls.push(['source.connect', target.kind]) };
  const analyser = { kind: 'analyser', fftSize: 0, connect: (target) => calls.push(['analyser.connect', target.kind]) };
  const keepAliveGain = { kind: 'gain', gain: { value: 1 }, connect: (target) => calls.push(['gain.connect', target.kind]) };
  return {
    state: 'suspended',
    sampleRate: 48000,
    destination,
    calls,
    resumed: false,
    async resume() { this.resumed = true; this.state = 'running'; },
    createMediaStreamSource(stream) { calls.push(['createMediaStreamSource', stream.track.readyState]); return source; },
    createAnalyser() { calls.push(['createAnalyser']); return analyser; },
    createGain() { calls.push(['createGain']); return keepAliveGain; },
  };
}

test('startMicrophoneSession requests built-in vocal constraints and retains the live analyser graph', async () => {
  const track = createFakeTrack();
  const stream = createFakeStream(track);
  let requestedConstraints = null;
  const navigatorObject = {
    permissions: { async query() { return { state: 'prompt' }; } },
    mediaDevices: {
      async getUserMedia(constraints) {
        requestedConstraints = constraints;
        return stream;
      },
    },
  };
  const audioContext = createFakeAudioContext();

  const session = await startMicrophoneSession({ navigatorObject, audioContext, timeoutMs: 100 });

  assert.deepEqual(requestedConstraints, {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
    },
  });
  assert.equal(audioContext.resumed, true);
  assert.equal(session.stream, stream);
  assert.equal(session.analyser.fftSize, 4096);
  assert.equal(session.keepAliveGain.gain.value, 0);
  assert.ok(session.buffer instanceof Float32Array);
  assert.equal(session.buffer.length, 4096);
  assert.deepEqual(audioContext.calls, [
    ['createMediaStreamSource', 'live'],
    ['createAnalyser'],
    ['createGain'],
    ['source.connect', 'analyser'],
    ['analyser.connect', 'gain'],
    ['gain.connect', 'destination'],
  ]);
  assert.equal(session.getTrackState(), 'live');

  session.stop();
  assert.equal(track.stopped, true);
  assert.equal(session.getTrackState(), 'ended');
});

test('startMicrophoneSession preflights denied permission without calling getUserMedia', async () => {
  let getUserMediaCalled = false;
  const navigatorObject = {
    permissions: { async query() { return { state: 'denied' }; } },
    mediaDevices: {
      async getUserMedia() {
        getUserMediaCalled = true;
        throw new Error('should not be called');
      },
    },
  };

  await assert.rejects(
    () => startMicrophoneSession({ navigatorObject, audioContext: createFakeAudioContext(), timeoutMs: 100 }),
    /Permission denied before request/,
  );
  assert.equal(getUserMediaCalled, false);
});

test('queryMicrophonePermissionState is safe when permissions API is missing or throws', async () => {
  assert.equal(await queryMicrophonePermissionState({}), 'unknown');
  assert.equal(await queryMicrophonePermissionState({ permissions: { async query() { throw new Error('nope'); } } }), 'unknown');
  assert.equal(await queryMicrophonePermissionState({ permissions: { async query() { return { state: 'granted' }; } } }), 'granted');
});

test('formatMicrophoneError keeps Android site-settings guidance for denied permissions', () => {
  const message = formatMicrophoneError(new DOMException('Permission denied', 'NotAllowedError'));

  assert.match(message, /Microphone permission denied/);
  assert.match(message, /tap the lock/);
  assert.match(message, /Android Settings/);
  assert.equal(formatMicrophoneError(new Error('AudioContext unavailable')), 'AudioContext unavailable');
});
