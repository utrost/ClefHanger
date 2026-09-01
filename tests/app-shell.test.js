import { readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('ships a mobile-first PWA shell for ClefHanger', () => {
  const html = read('index.html');
  assert.match(html, /<title>ClefHanger<\/title>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/icons\/icon-192\.png"/);
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /src="\.\/src\/app\.js\?v=clefhanger-slice47-version-consistency-2026-09-01"/);
  assert.match(html, /navigator\.serviceWorker\s*\.register\('\.\/sw\.js\?v=clefhanger-slice47-version-consistency-2026-09-01'\)/);
  assert.match(html, /registration\) => registration\.update\(\)/);
  assert.match(html, /@media \(max-width: 720px\)/);
  assert.match(html, /id="staff"/);
  assert.match(html, /id="feedback"/);
  assert.match(html, /id="summary"/);
  assert.match(html, /id="summary-title"/);
  assert.match(html, /id="summary-headline"/);
  assert.match(html, /id="summary-detail"/);
  assert.match(html, /id="summary-restart"/);
  assert.match(html, /class="ending-splash"/);
  assert.match(html, /aria-label="Rush result"/);
  assert.match(html, /id="note-buttons"/);
  assert.match(html, /id="open-settings"/);
  assert.match(html, /<dialog id="settings-dialog"/);
  assert.match(html, /id="close-settings"/);
  assert.match(html, /id="input-mode-buttons"/);
  assert.match(html, /id="piano-strip"/);
  assert.match(html, /aria-label="Piano keyboard answers"/);
  assert.match(html, /id="calibration-panel"/);
  assert.match(html, /id="play-calibration-tone"/);
  assert.match(html, /Sing any comfortable note/);
  assert.match(html, /optional reference/);
  assert.doesNotMatch(html, /data-input-mode="calibration"/);
  assert.match(html, /id="mode-buttons"/);
  assert.doesNotMatch(html, /id="answer-entry"/);
  assert.doesNotMatch(html, /id="submit-answer"/);
  assert.doesNotMatch(html, /Typed answer|Optional typed answer/);
  assert.doesNotMatch(html, /id="speed-buttons"/);
  assert.match(html, /<input[^>]+id="speed-slider"[^>]+type="range"/);
  assert.match(html, /min="1"/);
  assert.match(html, /max="10"/);
  assert.match(html, /aria-label="Speed slider"/);
  assert.match(html, /id="difficulty-buttons"/);
  assert.match(html, /id="difficulty-label"/);
  assert.match(html, /Today.s Sprint/);
  assert.match(html, /href="https:\/\/simiono\.com\/"/);
  assert.match(html, />simiono<\/a>/);
  assert.match(html, /Bass/);
  assert.match(html, /data-app-version="clefhanger-slice47-version-consistency/);
  assert.match(html, /Slice 47: version consistency/);
});

test('manifest and service worker describe an installable subpath-safe app shell', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'ClefHanger');
  assert.equal(manifest.id, '/clefhanger/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.deepEqual(manifest.icons.map((icon) => `${icon.sizes}:${icon.type}`).sort(), ['192x192:image/png', '192x192:image/svg+xml', '512x512:image/png', '512x512:image/svg+xml']);
  assert.deepEqual(manifest.categories, ['games', 'education', 'music']);
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), ['./', './?mode=bass', './?mode=sharps']);
  for (const icon of ['./icons/icon-192.png', './icons/icon-512.png']) {
    assert.ok(statSync(new URL(`../${icon.slice(2)}`, import.meta.url)).size > 1000, `${icon} exists`);
  }

  const sw = read('sw.js');
  assert.match(sw, /clefhanger-pwa-v41/);
  for (const asset of ['./', './index.html', './manifest.webmanifest', './src/app.js', './src/core/audio.js', './src/core/game.js', './src/core/content.js', './src/core/scoring.js', './src/core/pitch.js', './src/core/mic-diagnostics.js', './src/core/learning.js', './src/core/lessons.js', './src/core/music-theory.js', './src/ui/staff-renderer.js', './icons/icon-192.svg', './icons/icon-512.svg', './icons/icon-192.png', './icons/icon-512.png']) {
    assert.ok(sw.includes(`'${asset}'`), `service worker precaches ${asset}`);
  }
  assert.match(sw, /request\.mode === 'navigate'/);
});
