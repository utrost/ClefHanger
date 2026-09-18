import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadServiceWorker({ fetchImpl, keysImpl } = {}) {
  const listeners = new Map();
  const putCalls = [];
  const deleteCalls = [];
  const cache = {
    addAll: async () => undefined,
    put: (request, response) => {
      putCalls.push({ request, response });
      return Promise.resolve();
    },
  };
  const self = {
    location: { origin: 'https://example.test', href: 'https://example.test/clefhanger/sw.js' },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    skipWaiting() {},
    clients: {
      claimCalls: 0,
      claim() {
        this.claimCalls += 1;
        return Promise.resolve('claimed');
      },
    },
  };
  const caches = {
    openCalls: [],
    keys: keysImpl || (async () => ['old-cache', 'clefhanger-pwa-v64']),
    delete: async (key) => {
      deleteCalls.push(key);
      return true;
    },
    open: async (name) => {
      caches.openCalls.push(name);
      return cache;
    },
    match: async () => undefined,
  };
  const context = vm.createContext({
    self,
    caches,
    fetch: fetchImpl || (async () => new Response('ok', { status: 200 })),
    URL,
    Promise,
    Response,
    Request,
  });

  vm.runInContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), context, { filename: 'sw.js' });

  async function dispatch(type, eventOverrides = {}) {
    const waitUntilPromises = [];
    let responsePromise;
    const event = {
      waitUntil(promise) {
        waitUntilPromises.push(Promise.resolve(promise));
      },
      respondWith(promise) {
        responsePromise = Promise.resolve(promise);
      },
      ...eventOverrides,
    };
    listeners.get(type)(event);
    return { event, waitUntilPromises, responsePromise };
  }

  return { cache, caches, deleteCalls, dispatch, putCalls, self };
}

test('activation keeps clients.claim inside the activation lifetime', async () => {
  let resolveKeys;
  const worker = loadServiceWorker({
    keysImpl: () => new Promise((resolve) => {
      resolveKeys = () => resolve(['old-cache', 'clefhanger-pwa-v64']);
    }),
  });

  const { waitUntilPromises } = await worker.dispatch('activate');
  assert.equal(waitUntilPromises.length, 1);
  await Promise.resolve();
  assert.equal(worker.self.clients.claimCalls, 0, 'clients.claim should wait for the activation lifetime work');
  resolveKeys();
  await waitUntilPromises[0];

  assert.equal(worker.self.clients.claimCalls, 1);
  assert.deepEqual(worker.deleteCalls, ['old-cache']);
});

test('successful runtime cache writes are attached to the fetch event lifetime', async () => {
  let resolvePut;
  const worker = loadServiceWorker({
    fetchImpl: async () => new Response('runtime module', { status: 200 }),
  });
  worker.cache.put = (request, response) => {
    worker.putCalls.push({ request, response });
    return new Promise((resolve) => {
      resolvePut = resolve;
    });
  };

  const { responsePromise, waitUntilPromises } = await worker.dispatch('fetch', {
    request: new Request('https://example.test/clefhanger/src/runtime-only.js?v=clefhanger-slice69-tester-readiness-2026-09-16'),
  });

  const response = await responsePromise;
  assert.equal(response.ok, true);
  assert.equal(waitUntilPromises.length, 1, 'cache.put promise should be passed to event.waitUntil');
  let settled = false;
  waitUntilPromises[0].then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, 'fetch lifetime should remain open until cache.put resolves');
  resolvePut();
  await waitUntilPromises[0];
  assert.equal(settled, true);
});

test('failed HTTP responses are returned but not written into the runtime cache', async () => {
  const worker = loadServiceWorker({
    fetchImpl: async () => new Response('missing', { status: 404 }),
  });

  const { responsePromise, waitUntilPromises } = await worker.dispatch('fetch', {
    request: new Request('https://example.test/clefhanger/src/runtime-only.js?v=clefhanger-slice69-tester-readiness-2026-09-16'),
  });

  const response = await responsePromise;
  assert.equal(response.status, 404);
  assert.equal(worker.putCalls.length, 0, 'failed HTTP responses must not poison the runtime cache');
  assert.equal(waitUntilPromises.length, 0, 'uncacheable failed responses should not create cache-write lifetime work');
});
