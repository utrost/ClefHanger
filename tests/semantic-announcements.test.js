import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANNOUNCEMENT_KINDS,
  createSemanticPresenter,
  syncElementText,
} from '../src/ui/semantic-presenter.js';

function trackedElement(initial = '') {
  const writes = [];
  return {
    writes,
    get textContent() { return writes.length ? writes.at(-1) : initial; },
    set textContent(value) { writes.push(value); },
  };
}

function liveRegion() {
  const writes = [];
  const children = [];
  return {
    writes,
    children,
    ownerDocument: {
      createElement() {
        return { textContent: '' };
      },
    },
    get textContent() { return children.map((child) => child.textContent).join(' '); },
    set textContent(value) { writes.push(value); },
    appendChild(node) {
      children.push(node);
      writes.push(node.textContent);
      return node;
    },
    removeChild(node) {
      const index = children.indexOf(node);
      if (index >= 0) children.splice(index, 1);
      return node;
    },
  };
}

function queuedPresenter(options = {}) {
  const scheduled = [];
  const scheduler = (callback) => { scheduled.push(callback); };
  return {
    scheduled,
    drain() {
      while (scheduled.length) scheduled.shift()();
    },
    presenter: createSemanticPresenter({ scheduler, announcementGapMs: 1, ...options }),
  };
}

function spoken(writes) {
  return writes.filter((write) => write !== '');
}

test('unchanged semantic values do not trigger DOM text updates', () => {
  const element = trackedElement('Ready');

  assert.equal(syncElementText(element, 'Ready'), false);
  assert.equal(syncElementText(element, 'Listening'), true);
  assert.equal(syncElementText(element, 'Listening'), false);
  assert.deepEqual(element.writes, ['Listening']);
});

test('frame rendering never rewrites live-region content without a new semantic event', () => {
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live });

  for (let frame = 0; frame < 120; frame += 1) {
    presenter.announce({ kind: 'microphone-ready', id: 'mic-session-1' });
  }
  drain();

  assert.equal(live.writes.length, 1);
  assert.match(live.writes[0], /microphone.+ready/i);
});

test('timer changes at most once per displayed second', () => {
  const timer = trackedElement('60');
  const presenter = createSemanticPresenter({ announcementElement: trackedElement() });

  for (const remainingMs of [59999, 59880, 59101, 59001, 58999, 58100, 58001]) {
    presenter.updateTimer(timer, Math.ceil(remainingMs / 1000));
  }

  assert.deepEqual(timer.writes, ['59']);
});

test('raw pitch fluctuations stay visually useful but are not continuously announced', () => {
  const pitch = trackedElement('You played —');
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live, pitchVisualIntervalMs: 150, pitchAnnouncementIntervalMs: 300 });

  presenter.updatePitch(pitch, { message: 'You played A4 · 438 Hz', hasPitch: true, nowMs: 0 });
  presenter.updatePitch(pitch, { message: 'You played A4 · 440 Hz', hasPitch: true, nowMs: 40 });
  presenter.updatePitch(pitch, { message: 'You played A4 · 442 Hz', hasPitch: true, nowMs: 160 });
  presenter.updatePitch(pitch, { message: 'You played —', hasPitch: false, nowMs: 320 });
  drain();

  assert.deepEqual(pitch.writes, [
    'You played A4 · 438 Hz',
    'You played A4 · 442 Hz',
    'You played —',
  ]);
  const announcements = spoken(live.writes);
  assert.equal(announcements.length, 2);
  assert.match(announcements[0], /pitch detected/i);
  assert.match(announcements[1], /pitch lost/i);
  assert.doesNotMatch(live.writes.join(' '), /438|440|442/);
});

test('flapping pitch detection does not announce acquisition and loss on every frame', () => {
  const pitch = trackedElement('You played —');
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live, pitchVisualIntervalMs: 0, pitchAnnouncementIntervalMs: 1000 });

  for (let frame = 0; frame < 20; frame += 1) {
    const hasPitch = frame % 2 === 0;
    presenter.updatePitch(pitch, {
      message: hasPitch ? `You played A4 · ${440 + frame} Hz` : 'You played —',
      hasPitch,
      nowMs: frame * 16,
    });
  }
  drain();

  assert.ok(pitch.writes.length > 5, 'visual pitch readout remains useful during unstable input');
  const announcements = spoken(live.writes);
  assert.ok(announcements.length <= 2, 'pitch announcements are debounced instead of frame-rate live-region spam');
  assert.match(announcements[0], /pitch detected/i);
});

test('game, microphone, and terminal events each produce one understandable announcement', () => {
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live });
  const events = [
    { kind: 'correct', id: 'correct-1', message: 'Correct: C.' },
    { kind: 'wrong', id: 'wrong-1', message: 'Not quite: you played D. Try C again.' },
    { kind: 'missed', id: 'missed-1', message: 'Missed C. Here comes the next note.' },
    { kind: 'microphone-ready', id: 'mic-1' },
    { kind: 'microphone-error', id: 'mic-error-1', message: 'Microphone unavailable. Check browser permission.' },
    { kind: 'input-compatibility', id: 'chords:microphone:buttons', message: 'Chord mode needs Notes. Switched from Sing/Play to Notes so every chord has answer buttons.' },
    { kind: 'round-ended', id: 'round-1', message: 'Round ended. 80 points, 75 percent accuracy.' },
  ];

  for (const event of events) presenter.announce(event);
  drain();

  const announcements = spoken(live.writes);
  assert.equal(announcements.length, events.length);
  assert.match(announcements[0], /correct/i);
  assert.match(announcements[1], /not quite|wrong/i);
  assert.match(announcements[2], /missed/i);
  assert.match(announcements[3], /microphone.+ready/i);
  assert.match(announcements[4], /microphone.+(unavailable|error)/i);
  assert.match(announcements[5], /chord mode needs notes/i);
  assert.match(announcements[6], /round ended/i);
  assert.deepEqual(new Set(ANNOUNCEMENT_KINDS), new Set(events.map(({ kind }) => kind)));
});

test('overlapping game and microphone loops do not duplicate announcements', () => {
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live });
  const correct = { kind: 'correct', id: 'correct-4', message: 'Correct: E.' };
  const ready = { kind: 'microphone-ready', id: 'mic-session-2' };

  for (let frame = 0; frame < 10; frame += 1) {
    presenter.announce(correct);
    presenter.announce(ready);
  }
  drain();

  assert.deepEqual(spoken(live.writes), ['Correct: E.', 'Microphone ready. Sing or play the note.']);
});

test('distinct events with identical speech are announced while the same event id stays deduped', () => {
  const live = liveRegion();
  const { presenter, drain } = queuedPresenter({ announcementElement: live });
  const message = 'Correct. C scored.';

  assert.equal(presenter.announce({ kind: 'correct', id: 'correct-1', message }), true);
  assert.equal(presenter.announce({ kind: 'correct', id: 'correct-1', message }), false);
  assert.equal(presenter.announce({ kind: 'correct', id: 'correct-2', message }), true);
  drain();

  assert.equal(live.writes.filter((write) => write === message).length, 2);
  assert.equal(live.children.length, 2);
  assert.deepEqual(live.children.map((child) => child.textContent), [message, message]);
});

test('back-to-back terminal events are queued as separate live-region updates', () => {
  const live = liveRegion();
  const { presenter, drain, scheduled } = queuedPresenter({ announcementElement: live });

  assert.equal(presenter.announce({ kind: 'missed', id: 'round-1:miss-1', message: 'Missed C. C fell off the staff.' }), true);
  assert.equal(presenter.announce({ kind: 'round-ended', id: 'round-1:end', message: 'Round ended. 80 points. 4 correct, 1 missed.' }), true);
  assert.equal(live.writes.length, 1, 'first event is written immediately');
  assert.equal(scheduled.length, 1, 'second event waits for the live-region gap');

  drain();

  assert.deepEqual(live.writes, [
    'Missed C. C fell off the staff.',
    'Round ended. 80 points. 4 correct, 1 missed.',
  ]);
  assert.equal(live.children.length, 2, 'each terminal event is appended as its own live-region node');
});
