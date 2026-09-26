import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { launchBrowser } from './helpers/browser.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const currentVersion = html.match(/data-app-version="([^"]+)"/)[1];
const currentCache = worker.match(/const CACHE_NAME = '([^']+)'/)[1];
const priorVersion = 'clefhanger-upgrade-fixture';
const priorCache = 'clefhanger-pwa-upgrade-fixture';

test('updating a cached installation preserves progress and unrelated caches and then reloads offline', { timeout: 60000 }, async (t) => {
  let servePriorRelease = true;
  const browser = await launchBrowser(t, { transformResponse(path, data) {
    if (!servePriorRelease || !/\.(js|html)$/.test(path)) return data;
    return data.toString().replaceAll(currentVersion, priorVersion).replaceAll(currentCache, priorCache);
  } });
  await browser.command('Network.enable');
  await browser.command('Network.setCacheDisabled', { cacheDisabled: true });
  async function waitForState(label, expression) {
    try { await browser.waitFor(() => browser.evaluate(expression)); }
    catch (error) {
      const snapshot = await browser.evaluate(`(async () => ({
        version: window.__clefHanger?.appVersion,
        controller: navigator.serviceWorker.controller?.scriptURL,
        caches: await caches.keys(),
        workers: await navigator.serviceWorker.getRegistrations().then((registrations) => registrations.map((r) => ({ active: r.active?.scriptURL, waiting: r.waiting?.scriptURL, installing: r.installing?.scriptURL }))),
      }))()`);
      throw new Error(`${label}: ${error.message}; ${JSON.stringify(snapshot)}`);
    }
  }
  await waitForState('prior worker controls page', `navigator.serviceWorker.ready.then(() => Boolean(navigator.serviceWorker.controller?.scriptURL.includes('${priorVersion}')))`);
  await browser.tap('#use-note-buttons');
  await browser.tap('#start-round');
  const selector = await browser.evaluate(`'#note-buttons button[aria-label="Answer ' + window.__clefHanger.getState().activeNote.answer + '"]'`);
  await browser.tap(selector);
  await browser.evaluate(`(async () => {
    const other = await caches.open('other-app-cache');
    await other.put('/other-app/data', new Response('keep me'));
  })()`);
  servePriorRelease = false;
  await browser.command('Page.reload');
  // Automatic update() may install current bytes at the prior registration URL.
  // Verify release/cache behavior rather than treating that URL as a version API.
  await waitForState('updated app under worker control', `window.__clefHanger?.appVersion === '${currentVersion}' && Boolean(navigator.serviceWorker.controller)`);
  await waitForState('old cache removed', `caches.keys().then((keys) => keys.includes('${currentCache}') && !keys.includes('${priorCache}'))`);
  assert.equal(await browser.evaluate("caches.open('other-app-cache').then((cache) => cache.match('/other-app/data')).then((response) => response.text())"), 'keep me');
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /1\/1 on your own/);
  await browser.goOffline();
  await browser.command('Page.reload');
  await waitForState('offline startup', `window.__clefHanger?.appVersion === '${currentVersion}' && Boolean(document.querySelector('#note-guide-content svg'))`);
  assert.match(await browser.evaluate("document.querySelector('#lesson-progress').textContent"), /1\/1 on your own/);
  await browser.tap('#start-round');
  assert.equal(await browser.evaluate('window.__clefHanger.getState().phase'), 'practice');
});
