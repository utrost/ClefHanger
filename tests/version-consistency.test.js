import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVersionConsistency } from '../scripts/check-version-consistency.js';

test('version consistency check accepts the current cache-busted PWA markers', () => {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });

  assert.deepEqual(result.errors, []);
  assert.equal(result.appVersion, 'clefhanger-slice48-storage-adapter-2026-09-01');
  assert.equal(result.sliceMarker, 'Slice 48: storage adapter');
  assert.equal(result.cacheName, 'clefhanger-pwa-v42');
  assert.ok(result.checkedFiles.includes('index.html'));
  assert.ok(result.checkedFiles.includes('src/app.js'));
  assert.ok(result.checkedFiles.includes('sw.js'));
});

test('version consistency check catches stale ES-module query strings', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice48-storage-adapter-2026-09-01">
  <body>
    <p class="microcopy">Slice 48: storage adapter</p>
    <script type="module" src="./src/app.js?v=old-version"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice48-storage-adapter-2026-09-01')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice48-storage-adapter-2026-09-01';
const appVersion = 'clefhanger-slice48-storage-adapter-2026-09-01';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v42';
const APP_SHELL = ['./', './index.html', './src/app.js'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('index.html app script query')));
});

test('version consistency check catches service-worker asset drift', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice48-storage-adapter-2026-09-01">
  <body>
    <p class="microcopy">Slice 48: storage adapter</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice48-storage-adapter-2026-09-01"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice48-storage-adapter-2026-09-01')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice48-storage-adapter-2026-09-01';
const appVersion = 'clefhanger-slice48-storage-adapter-2026-09-01';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v42';
const APP_SHELL = ['./', './index.html'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/app.js')));
});
