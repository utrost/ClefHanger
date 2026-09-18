import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateVersionConsistency } from '../scripts/check-version-consistency.js';

test('version consistency check accepts the current cache-busted PWA markers', () => {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });

  assert.deepEqual(result.errors, []);
  assert.equal(result.appVersion, 'clefhanger-slice69-tester-readiness-2026-09-16');
  assert.equal(result.sliceMarker, 'Slice 69: tester readiness');
  assert.equal(result.cacheName, 'clefhanger-pwa-v64');
  assert.ok(result.checkedFiles.includes('index.html'));
  assert.ok(result.checkedFiles.includes('src/app.js'));
  assert.ok(result.checkedFiles.includes('sw.js'));
});

test('slice 69 documentation markers match the runtime release', () => {
  for (const path of [
    'docs/current-state-reference.md',
    'docs/developer-handoff.md',
    'docs/smoke-checklist.md',
    'docs/human-test-handbook.md',
    'docs/player-tester-guide.md',
  ]) {
    const text = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /slice62|Slice 62|pwa-v56/, `${path} has no stale slice 62 release markers`);
  }
});

test('version consistency check catches stale ES-module query strings', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice69-tester-readiness-2026-09-16">
  <body>
    <p class="microcopy">Slice 62: microphone lifecycle</p>
    <script type="module" src="./src/app.js?v=old-version"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice69-tester-readiness-2026-09-16')</script>
  </body>
</html>`,
    'src/app.js': `import { createInitialState } from './core/game.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createMicrophoneController } from './platform/microphone-controller.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
const appVersion = 'clefhanger-slice69-tester-readiness-2026-09-16';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v63';
const APP_SHELL = ['./', './index.html', './src/app.js'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('index.html app script query')));
});

test('version consistency check catches service-worker asset drift', () => {
  const fixtures = {
    'index.html': `<!doctype html>
<html data-app-version="clefhanger-slice69-tester-readiness-2026-09-16">
  <body>
    <p class="microcopy">Slice 62: microphone lifecycle</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice69-tester-readiness-2026-09-16"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice69-tester-readiness-2026-09-16')</script>
  </body>
</html>`,
    'src/app.js': `import { createInitialState } from './core/game.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createMicrophoneController } from './platform/microphone-controller.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
const appVersion = 'clefhanger-slice69-tester-readiness-2026-09-16';`,
    'sw.js': `const CACHE_NAME = 'clefhanger-pwa-v63';
const APP_SHELL = ['./', './index.html'];`,
  };

  const result = validateVersionConsistency({ readText: (path) => fixtures[path] });

  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/app.js')));
  assert.ok(result.errors.some((error) => error.includes('service worker precaches ./src/platform/microphone-controller.js')));
});

test('version consistency check scans transitive ES-module imports', () => {
  const root = mkdtempSync(join(tmpdir(), 'clefhanger-version-check-'));
  try {
    mkdirSync(join(root, 'src', 'core'), { recursive: true });
    writeFileSync(join(root, 'index.html'), `<!doctype html>
<html data-app-version="clefhanger-slice69-tester-readiness-2026-09-16">
  <body>
    <p class="microcopy">Slice 69: tester readiness</p>
    <script type="module" src="./src/app.js?v=clefhanger-slice69-tester-readiness-2026-09-16"></script>
    <script>navigator.serviceWorker.register('./sw.js?v=clefhanger-slice69-tester-readiness-2026-09-16')</script>
  </body>
</html>`);
    writeFileSync(join(root, 'src', 'app.js'), `import './core/scoring.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
const appVersion = 'clefhanger-slice69-tester-readiness-2026-09-16';`);
    writeFileSync(join(root, 'src', 'core', 'scoring.js'), `import './content.js?v=old-version';`);
    writeFileSync(join(root, 'src', 'core', 'content.js'), 'export const ok = true;');
    writeFileSync(join(root, 'sw.js'), `const CACHE_NAME = 'clefhanger-pwa-v64';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './src/app.js', './src/core/scoring.js', './src/core/content.js'];`);

    const result = validateVersionConsistency({ rootDir: root });

    assert.ok(result.errors.some((error) => error.includes('./content.js?v=old-version uses query old-version')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
