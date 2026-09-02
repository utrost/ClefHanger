import {
  detectPitchFromRecordedAudio,
  frequencyToNearestPitch,
  getCenteredRms,
} from '../core/pitch.js';

function defaultWait(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export async function runMicrophoneRecordingDiagnostic({
  stream,
  audioContext,
  MediaRecorderClass = globalThis.MediaRecorder,
  BlobClass = globalThis.Blob,
  wait = defaultWait,
  durationMs = 1000,
  timesliceMs = 250,
} = {}) {
  if (!MediaRecorderClass) {
    return { status: 'unavailable', message: 'Recording test: MediaRecorder is not available in this browser.' };
  }
  if (!stream) {
    return { status: 'no-stream', message: 'Recording test: tap Grant mic first, then Record 1s test.' };
  }

  try {
    const chunks = [];
    const recorder = new MediaRecorderClass(stream);
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', () => reject(recorder.error || new Error('MediaRecorder failed')), { once: true });
    });

    recorder.start(timesliceMs);
    await wait(durationMs);
    recorder.requestData?.();
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;

    const blob = new BlobClass(chunks, { type: recorder.mimeType || 'audio/webm' });
    const result = {
      status: 'ok',
      bytes: blob.size,
      mimeType: blob.type,
      decodedRms: null,
      recordedFrequency: null,
      recordedPitch: null,
      decodedSamples: null,
      decodedSampleRate: null,
      decodeFailed: false,
      decodeError: null,
      evidence: { bytes: blob.size, mimeType: blob.type, samples: null, sampleRate: null },
    };

    if (blob.size <= 0) return result;

    try {
      if (!audioContext?.decodeAudioData) throw new Error('AudioContext decodeAudioData unavailable');
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      result.decodedSamples = decoded.getChannelData(0);
      result.decodedSampleRate = decoded.sampleRate;
      result.decodedRms = getCenteredRms(result.decodedSamples);
      result.recordedFrequency = detectPitchFromRecordedAudio(result.decodedSamples, decoded.sampleRate);
      result.recordedPitch = frequencyToNearestPitch(result.recordedFrequency);
      result.evidence = {
        bytes: blob.size,
        mimeType: blob.type,
        samples: result.decodedSamples,
        sampleRate: result.decodedSampleRate,
      };
    } catch (error) {
      result.decodeFailed = true;
      result.decodeError = error?.message || String(error);
    }

    return result;
  } catch (error) {
    return { status: 'error', message: `Recording test failed: ${error?.message || String(error)}` };
  }
}
