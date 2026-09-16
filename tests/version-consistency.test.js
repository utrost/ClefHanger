import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVersionConsistency } from '../scripts/check-version-consistency.js';

test('version consistency check accepts the current cache-busted PWA markers', () => {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });

  assert.deepEqual(result.errors, []);
  assert.equal(result.appVersion, 'clefhanger-slice62-microphone-lifecycle-2026-09-16');
  assert.equal(result.sliceMarker, 'Slice 62: microphone lifecycle');
  assert.equal(result.cacheName, 'clefhanger-pwa-v56');
  assert.ok(result.checkedFiles.includes('index.html'));
  assert.ok(result.checkedFiles.includes('src/app.js'));
  assert.ok(result.checkedFiles.includes('sw.js'));
});

test('version consistency check catches stale ES-module query strings', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice62-microphone-lifecycle-2026-09-16">
  <body>
    <p class="microcopy">Slice 62: microphone lifecycle</p>
    <script type="module" src="./src/app.js?v=old-version"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16')</script>
  </body>
</html>`,
    'src/app.js': `import { createInitialState } from './core/game.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16';
import { createMicrophoneController } from './platform/microphone-controller.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16';
const appVersion = 'clefhanger-slice62-microphone-lifecycle-2026-09-16';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v56';
const APP_SHELL = ['./', './index.html', './src/app.js'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('index.html app script query')));
});

test('version consistency check catches service-worker asset drift', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice62-microphone-lifecycle-2026-09-16">
  <body>
    <p class="microcopy">Slice 62: microphone lifecycle</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16')</script>
  </body>
</html>`,
    'src/app.js': `import { createInitialState } from './core/game.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16';
import { createMicrophoneController } from './platform/microphone-controller.js?v=clefhanger-slice62-microphone-lifecycle-2026-09-16';
const appVersion = 'clefhanger-slice62-microphone-lifecycle-2026-09-16';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v56';
const APP_SHELL = ['./', './index.html'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/app.js')));
  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/platform/microphone-controller.js')));
});
