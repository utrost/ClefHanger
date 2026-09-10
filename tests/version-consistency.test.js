import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVersionConsistency } from '../scripts/check-version-consistency.js';

test('version consistency check accepts the current cache-busted PWA markers', () => {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });

  assert.deepEqual(result.errors, []);
  assert.equal(result.appVersion, 'clefhanger-slice53-microphone-first-2026-09-10');
  assert.equal(result.sliceMarker, 'Slice 53: microphone first');
  assert.equal(result.cacheName, 'clefhanger-pwa-v47');
  assert.ok(result.checkedFiles.includes('index.html'));
  assert.ok(result.checkedFiles.includes('src/app.js'));
  assert.ok(result.checkedFiles.includes('sw.js'));
});

test('version consistency check catches stale ES-module query strings', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice53-microphone-first-2026-09-10">
  <body>
    <p class="microcopy">Slice 53: microphone first</p>
    <script type="module" src="./src/app.js?v=old-version"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice53-microphone-first-2026-09-10')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice53-microphone-first-2026-09-10';
const appVersion = 'clefhanger-slice53-microphone-first-2026-09-10';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v47';
const APP_SHELL = ['./', './index.html', './src/app.js'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('index.html app script query')));
});

test('version consistency check catches service-worker asset drift', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice53-microphone-first-2026-09-10">
  <body>
    <p class="microcopy">Slice 53: microphone first</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice53-microphone-first-2026-09-10"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice53-microphone-first-2026-09-10')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice53-microphone-first-2026-09-10';
const appVersion = 'clefhanger-slice53-microphone-first-2026-09-10';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v47';
const APP_SHELL = ['./', './index.html'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/app.js')));
});
