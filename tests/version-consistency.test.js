import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVersionConsistency } from '../scripts/check-version-consistency.js';

test('version consistency check accepts the current cache-busted PWA markers', () => {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });

  assert.deepEqual(result.errors, []);
  assert.equal(result.appVersion, 'clefhanger-slice51-mic-octave-match-toggle-2026-09-02');
  assert.equal(result.sliceMarker, 'Slice 51: mic octave match toggle');
  assert.equal(result.cacheName, 'clefhanger-pwa-v45');
  assert.ok(result.checkedFiles.includes('index.html'));
  assert.ok(result.checkedFiles.includes('src/app.js'));
  assert.ok(result.checkedFiles.includes('sw.js'));
});

test('version consistency check catches stale ES-module query strings', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice51-mic-octave-match-toggle-2026-09-02">
  <body>
    <p class="microcopy">Slice 51: mic octave match toggle</p>
    <script type="module" src="./src/app.js?v=old-version"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
const appVersion = 'clefhanger-slice51-mic-octave-match-toggle-2026-09-02';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v45';
const APP_SHELL = ['./', './index.html', './src/app.js'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('index.html app script query')));
});

test('version consistency check catches service-worker asset drift', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice51-mic-octave-match-toggle-2026-09-02">
  <body>
    <p class="microcopy">Slice 51: mic octave match toggle</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02')</script>
  </body>
</html>`,
    'src/app.js': `import './core/game.js?v=clefhanger-slice51-mic-octave-match-toggle-2026-09-02';
const appVersion = 'clefhanger-slice51-mic-octave-match-toggle-2026-09-02';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v45';
const APP_SHELL = ['./', './index.html'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/app.js')));
});
