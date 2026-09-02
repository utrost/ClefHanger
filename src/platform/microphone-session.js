import { getBuiltInVocalMicrophoneConstraints } from '../core/pitch.js';

export function formatMicrophoneError(error) {
  const message = error?.message || String(error || 'permission denied');
  const name = error?.name || '';
  const lower = `${name} ${message}`.toLowerCase();
  if (lower.includes('denied') || lower.includes('notallowed') || lower.includes('permission')) {
    return 'Microphone permission denied. In Chrome, tap the lock/site icon in the address bar → Permissions → Microphone → Allow, then reload. If Allow still returns denied, Android Settings may be blocking Chrome itself: Android Settings → Apps → Chrome → Permissions → Microphone → Allow.';
  }
  return message;
}

export async function queryMicrophonePermissionState(navigatorObject = globalThis.navigator) {
  if (!navigatorObject?.permissions?.query) return 'unknown';
  try {
    const status = await navigatorObject.permissions.query({ name: 'microphone' });
    return status.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getMicrophoneTrackState(stream) {
  const track = stream?.getAudioTracks?.()[0];
  if (!track) return 'none';
  if (track.readyState === 'ended') return 'ended';
  if (track.muted) return 'muted';
  return track.enabled === false ? 'disabled' : 'live';
}

export function withMicrophoneRequestTimeout(requestPromise, timeoutMs = 8000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Microphone request timed out. In Chrome, check Site settings → Microphone for simiono.com.')), timeoutMs);
  });
  return Promise.race([requestPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export async function startMicrophoneSession({
  navigatorObject = globalThis.navigator,
  audioContext,
  analyserOptions = {},
  timeoutMs = 8000,
} = {}) {
  if (!navigatorObject?.mediaDevices?.getUserMedia) throw new Error('getUserMedia unavailable');
  if (!audioContext) throw new Error('AudioContext unavailable');

  const permissionState = await queryMicrophonePermissionState(navigatorObject);
  if (permissionState === 'denied') {
    throw new DOMException('Permission denied before request', 'NotAllowedError');
  }

  const stream = await withMicrophoneRequestTimeout(
    navigatorObject.mediaDevices.getUserMedia(getBuiltInVocalMicrophoneConstraints()),
    timeoutMs,
  );

  try {
    if (audioContext.state === 'suspended') await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = analyserOptions.fftSize || 4096;
    const keepAliveGain = audioContext.createGain();
    keepAliveGain.gain.value = 0;
    const buffer = new Float32Array(analyser.fftSize);

    source.connect(analyser);
    analyser.connect(keepAliveGain);
    keepAliveGain.connect(audioContext.destination);

    return {
      stream,
      source,
      analyser,
      keepAliveGain,
      buffer,
      getTrackState: () => getMicrophoneTrackState(stream),
      stop: () => stopMicrophoneSession({ stream }),
    };
  } catch (error) {
    stopMicrophoneSession({ stream });
    throw error;
  }
}

export function stopMicrophoneSession(sessionOrStream) {
  const stream = sessionOrStream?.stream || sessionOrStream;
  if (stream?.getTracks) {
    for (const track of stream.getTracks()) track.stop();
  }
}
