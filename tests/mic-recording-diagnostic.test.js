import assert from 'node:assert/strict';
import test from 'node:test';

import { runMicrophoneRecordingDiagnostic } from '../src/platform/mic-recording-diagnostic.js';

function sineSamples({ frequency, sampleRate = 48000, length = 48000, amplitude = 0.08 }) {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude);
}

class FakeBlob {
  constructor(chunks = [], { type = '' } = {}) {
    this.chunks = chunks;
    this.type = type;
    this.size = chunks.reduce((sum, chunk) => sum + (chunk?.size || chunk?.byteLength || chunk?.length || 0), 0);
  }

  async arrayBuffer() {
    return new ArrayBuffer(this.size || 1);
  }
}

function createFakeAudioContext(samples = sineSamples({ frequency: 110 })) {
  return {
    decodedBuffers: [],
    async decodeAudioData(arrayBuffer) {
      this.decodedBuffers.push(arrayBuffer.byteLength);
      return {
        sampleRate: 48000,
        getChannelData: () => samples,
      };
    },
  };
}

function createFakeMediaRecorderClass({ chunkSize = 24000, mimeType = 'audio/webm' } = {}) {
  return class FakeMediaRecorder extends EventTarget {
    constructor(stream) {
      super();
      this.stream = stream;
      this.mimeType = mimeType;
      this.state = 'inactive';
      this.startedWith = null;
      this.requestedData = false;
      this.stopped = false;
    }

    start(timeslice) {
      this.state = 'recording';
      this.startedWith = timeslice;
      this.dispatchEvent(new MessageEvent('dataavailable', { data: { size: chunkSize } }));
    }

    requestData() {
      this.requestedData = true;
      this.dispatchEvent(new MessageEvent('dataavailable', { data: { size: Math.round(chunkSize / 2) } }));
    }

    stop() {
      this.stopped = true;
      this.state = 'inactive';
      this.dispatchEvent(new Event('stop'));
    }
  };
}

test('runMicrophoneRecordingDiagnostic records, requests final data, decodes, and detects pitch', async () => {
  const stream = { id: 'mic-stream' };
  const audioContext = createFakeAudioContext(sineSamples({ frequency: 110 }));
  const result = await runMicrophoneRecordingDiagnostic({
    stream,
    audioContext,
    MediaRecorderClass: createFakeMediaRecorderClass(),
    BlobClass: FakeBlob,
    wait: async () => {},
    durationMs: 1000,
    timesliceMs: 250,
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.bytes, 36000);
  assert.equal(result.mimeType, 'audio/webm');
  assert.equal(result.recordedPitch.answer, 'A');
  assert.equal(result.recordedPitch.octave, 2);
  assert.ok(Math.abs(result.recordedFrequency - 110) < 3);
  assert.ok(result.decodedRms > 0);
  assert.equal(result.evidence.bytes, 36000);
  assert.equal(result.evidence.mimeType, 'audio/webm');
  assert.equal(result.evidence.sampleRate, 48000);
  assert.equal(result.evidence.samples.length, 48000);
});

test('runMicrophoneRecordingDiagnostic reports unavailable and no-stream without constructing MediaRecorder', async () => {
  assert.deepEqual(
    await runMicrophoneRecordingDiagnostic({ MediaRecorderClass: null }),
    { status: 'unavailable', message: 'Recording test: MediaRecorder is not available in this browser.' },
  );

  let constructed = false;
  class Recorder {
    constructor() { constructed = true; }
  }
  assert.deepEqual(
    await runMicrophoneRecordingDiagnostic({ MediaRecorderClass: Recorder, stream: null }),
    { status: 'no-stream', message: 'Recording test: tap Grant mic first, then Record 1s test.' },
  );
  assert.equal(constructed, false);
});

test('runMicrophoneRecordingDiagnostic preserves zero-byte evidence without decoding', async () => {
  const audioContext = createFakeAudioContext();
  const result = await runMicrophoneRecordingDiagnostic({
    stream: {},
    audioContext,
    MediaRecorderClass: createFakeMediaRecorderClass({ chunkSize: 0 }),
    BlobClass: FakeBlob,
    wait: async () => {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.bytes, 0);
  assert.equal(result.decodedRms, null);
  assert.equal(result.recordedPitch, null);
  assert.deepEqual(audioContext.decodedBuffers, []);
  assert.equal(result.evidence.samples, null);
});

test('runMicrophoneRecordingDiagnostic keeps byte evidence when decode fails', async () => {
  const result = await runMicrophoneRecordingDiagnostic({
    stream: {},
    audioContext: { async decodeAudioData() { throw new Error('cannot decode'); } },
    MediaRecorderClass: createFakeMediaRecorderClass(),
    BlobClass: FakeBlob,
    wait: async () => {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.bytes, 36000);
  assert.equal(result.decodeFailed, true);
  assert.match(result.decodeError, /cannot decode/);
  assert.equal(result.evidence.samples, null);
});
