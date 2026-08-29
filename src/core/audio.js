export function buildPianoVoicePlan(frequency, startAt = 0) {
  return {
    frequency,
    startAt,
    durationSeconds: 1.1,
    envelope: {
      initialGain: 0.0001,
      attackGain: 0.24,
      attackSeconds: 0.008,
      decayGain: 0.13,
      decaySeconds: 0.12,
      releaseGain: 0.0001,
      releaseSeconds: 1.05,
    },
    partials: [
      { type: 'triangle', frequencyMultiplier: 1, gain: 1 },
      { type: 'sine', frequencyMultiplier: 2, gain: 0.22 },
      { type: 'sine', frequencyMultiplier: 3, gain: 0.09 },
      { type: 'sine', frequencyMultiplier: 4, gain: 0.035 },
      { type: 'sine', frequencyMultiplier: 5, gain: 0.014 },
    ],
    detuneCents: [0, -4, 3, -7, 5],
  };
}

export function getCalibrationTone() {
  return {
    noteName: 'A',
    octave: 4,
    frequency: 440,
    label: 'Sing A',
    help: 'Listen, then sing it back.',
  };
}

export function playPianoVoice(context, frequency, startAt = context.currentTime, destination = context.destination) {
  const plan = buildPianoVoicePlan(frequency, startAt);
  const masterGain = context.createGain();
  const { envelope } = plan;

  masterGain.gain.setValueAtTime(envelope.initialGain, startAt);
  masterGain.gain.exponentialRampToValueAtTime(envelope.attackGain, startAt + envelope.attackSeconds);
  masterGain.gain.exponentialRampToValueAtTime(envelope.decayGain, startAt + envelope.decaySeconds);
  masterGain.gain.exponentialRampToValueAtTime(envelope.releaseGain, startAt + envelope.releaseSeconds);
  masterGain.connect(destination);

  plan.partials.forEach((partial, index) => {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(frequency * partial.frequencyMultiplier, startAt);
    if (oscillator.detune && typeof oscillator.detune.setValueAtTime === 'function') {
      oscillator.detune.setValueAtTime(plan.detuneCents[index] || 0, startAt);
    }
    partialGain.gain.setValueAtTime(partial.gain, startAt);
    oscillator.connect(partialGain).connect(masterGain);
    oscillator.start(startAt);
    oscillator.stop(startAt + plan.durationSeconds);
  });

  return plan;
}
