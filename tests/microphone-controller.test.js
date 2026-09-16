import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMicrophoneController,
  startAndPublishMicrophoneSession,
} from '../src/platform/microphone-controller.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeSession(name) {
  return {
    name,
    stopped: false,
    stop() { this.stopped = true; },
  };
}

function fakeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    dispatch(type) { listeners.get(type)?.(); },
  };
}

test('repeated starts stop the current session and ignore an older pending result', async () => {
  const firstRequest = deferred();
  const secondRequest = deferred();
  const existing = fakeSession('existing');
  const requests = [Promise.resolve(existing), firstRequest.promise, secondRequest.promise];
  const controller = createMicrophoneController({
    startSession: () => requests.shift(),
  });
  await controller.start();

  const firstStart = controller.start();
  const secondStart = controller.start();
  const newest = fakeSession('newest');
  secondRequest.resolve(newest);
  assert.equal(await secondStart, newest);

  const stale = fakeSession('stale');
  firstRequest.resolve(stale);
  assert.equal(await firstStart, null);
  assert.equal(existing.stopped, true);
  assert.equal(stale.stopped, true);
  assert.equal(newest.stopped, false);
  assert.equal(controller.getCurrent(), newest);
});

test('a stale null start cannot overwrite the newer published app session', async () => {
  const staleRequest = deferred();
  const currentRequest = deferred();
  let microphoneSession = null;
  const publish = (session) => { microphoneSession = session; };

  const staleStart = startAndPublishMicrophoneSession({ start: () => staleRequest.promise, publish });
  const currentStart = startAndPublishMicrophoneSession({ start: () => currentRequest.promise, publish });
  const current = fakeSession('current');
  currentRequest.resolve(current);
  assert.equal(await currentStart, current);
  assert.equal(microphoneSession, current);

  staleRequest.resolve(null);
  assert.equal(await staleStart, null);
  assert.equal(microphoneSession, current);
});

test('switching away from microphone stops capture', async () => {
  const session = fakeSession('active');
  const controller = createMicrophoneController({ startSession: async () => session });
  await controller.start();

  controller.selectInputMode('piano');

  assert.equal(session.stopped, true);
  assert.equal(controller.getCurrent(), null);
});

test('pagehide and hidden visibility stop capture', async () => {
  const pageTarget = fakeEventTarget();
  const documentTarget = { ...fakeEventTarget(), visibilityState: 'visible' };
  const sessions = [fakeSession('pagehide'), fakeSession('hidden')];
  const controller = createMicrophoneController({
    startSession: async () => sessions.shift(),
    pageTarget,
    documentTarget,
  });
  controller.installLifecycleHandlers();

  const pagehideSession = await controller.start();
  pageTarget.dispatch('pagehide');
  assert.equal(pagehideSession.stopped, true);

  const hiddenSession = await controller.start();
  documentTarget.visibilityState = 'hidden';
  documentTarget.dispatch('visibilitychange');
  assert.equal(hiddenSession.stopped, true);
  assert.equal(controller.getCurrent(), null);
});
