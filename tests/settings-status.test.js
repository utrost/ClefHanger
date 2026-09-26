import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSettingsPresentation } from '../src/ui/settings-presenter.js';
import { buildMicrophonePresentation } from '../src/ui/status-presenter.js';

const selection = { modeId: 'basics', speedId: '10', difficultyId: 'hard', lessonId: 'first-steps', inputMode: 'microphone', playStyle: 'practice', phase: 'idle' };

test('Practice presentation preserves saved Rush selections but describes only effective Practice settings', () => {
  const view = buildSettingsPresentation(Object.freeze({ ...selection }));
  assert.equal(view.summary, 'Treble · Practice: First steps · Sing/Play');
  assert.equal(view.speedValue, '10');
  assert.equal(view.speedLabel, 'Practice only');
  assert.equal(view.difficultyLabel, 'Practice only');
  assert.equal(view.controlsDisabled, true);
  assert.equal(view.speedValueText, 'Practice ignores speed');
  assert.match(view.difficultyHelp, /untimed Beginner/);
});

test('Rush presentation restores difficulty and speed and paused Settings never implies resuming', () => {
  const view = buildSettingsPresentation({ ...selection, playStyle: 'rush', phase: 'paused' });
  assert.equal(view.summary, 'Treble · Hard · Speed 10 · Sing/Play · First steps');
  assert.equal(view.controlsDisabled, false);
  assert.equal(view.speedValueText, 'Speed 10');
  assert.equal(view.closeLabel, 'Done — keep paused');
  assert.equal(view.difficultyTitle, '');
});

test('non-treble settings omit the saved treble lesson and label all input fallbacks', () => {
  for (const [inputMode, label] of [['buttons', 'Notes'], ['piano', 'Piano'], ['microphone', 'Sing/Play']]) {
    assert.equal(buildSettingsPresentation({ ...selection, modeId: 'bass', inputMode }).summary, `Bass · Practice · ${label}`);
    assert.equal(buildSettingsPresentation({ ...selection, modeId: 'bass', inputMode, playStyle: 'rush' }).summary, `Bass · Hard · Speed 10 · ${label} · Rush`);
  }
});

test('microphone guidance prioritizes playback, then pause, then Settings, then pitch feedback', () => {
  const context = { microphone: { permission: 'granted', scoringMessage: 'Hold steady.' }, canScore: false, phase: 'paused', settingsOpen: true, trackState: 'live' };
  assert.equal(buildMicrophonePresentation(context).guidance, 'Listen… scoring waits until the sound finishes.');
  context.canScore = true;
  assert.equal(buildMicrophonePresentation(context).guidance, 'Rush paused. Resume when you are ready.');
  context.phase = 'practice';
  assert.equal(buildMicrophonePresentation(context).guidance, 'Close Settings to continue.');
  context.settingsOpen = false;
  assert.equal(buildMicrophonePresentation(context).guidance, 'Hold steady.');
  context.microphone.scoringMessage = null;
  assert.equal(buildMicrophonePresentation(context).guidance, 'Listen to the note, then sing it back.');
});

test('pending mic permission disables duplicate starts while keeping cancellation available', () => {
  const view = buildMicrophonePresentation({ microphone: { permission: 'requesting', listening: false }, trackState: 'none' });
  assert.equal(view.startDisabled, true);
  assert.equal(view.stopDisabled, false);
  assert.equal(view.stopHidden, false);
  assert.match(view.status, /Requesting mic/);
  assert.equal(view.calibrationText, view.status);
  assert.equal(view.readiness.status, 'requesting');
});

test('blocked and idle mic states retain actionable permission and calibration guidance', () => {
  const blocked = buildMicrophonePresentation({ microphone: { permission: 'blocked', error: 'denied by browser' }, trackState: 'none' });
  assert.equal(blocked.status, 'Mic blocked: denied by browser');
  assert.equal(blocked.calibrationText, blocked.status);
  assert.equal(blocked.readiness.status, 'blocked');
  assert.equal(blocked.startDisabled, false);
  assert.equal(blocked.stopDisabled, true);
  assert.equal(blocked.stopHidden, true);
  const idle = buildMicrophonePresentation({ microphone: { permission: 'idle' }, trackState: 'none' });
  assert.match(idle.status, /Mic off/);
  assert.match(idle.calibrationText, /Play A is only a reference/);
});

test('live mic status preserves quiet-input advice and explicit calibration readings take precedence', () => {
  const microphone = Object.freeze({ permission: 'granted', listening: true, inputLevel: 0, silentFrameCount: 60, calibration: { message: 'A4 is in tune.', status: 'in-tune' } });
  const view = buildMicrophonePresentation({ microphone, trackState: 'live' });
  assert.match(view.status, /no audio is reaching the app/i);
  assert.equal(view.calibrationText, 'A4 is in tune.');
  assert.equal(view.calibrationStatus, 'in-tune');
  assert.equal(view.stopDisabled, false);
  assert.equal(view.stopHidden, false);
});
