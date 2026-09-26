import assert from 'node:assert/strict';
import test from 'node:test';
import { createListenSession } from '../src/core/listen-session.js';

test('playback plus its acoustic tail cannot score and assistance belongs to the heard prompt', () => {
  const session = createListenSession();
  session.hear('note-1', 100, 1100);
  assert.equal(session.canScore(1200), false);
  assert.equal(session.canScore(1501), true);
  assert.equal(session.wasAssisted('note-1'), true);
  assert.equal(session.wasAssisted('note-2'), false);
  session.reset();
  assert.equal(session.wasAssisted('note-1'), false);
  assert.equal(session.canScore(1200), false, 'resetting a round does not remove acoustic protection');
});

test('a revealed visual correction counts as help without blocking input or following a new prompt', () => {
  const session = createListenSession();
  session.assist('note-1');
  assert.equal(session.wasAssisted('note-1'), true);
  assert.equal(session.canScore(0), true);
  assert.equal(session.wasAssisted('note-2'), false);
});
