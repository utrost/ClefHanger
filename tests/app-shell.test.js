import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('ships a mobile-first PWA shell for ClefHanger', () => {
  const html = read('index.html');
  assert.match(html, /<title>ClefHanger<\/title>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
  assert.match(html, /@media \(max-width: 720px\)/);
  assert.match(html, /id="staff"/);
  assert.match(html, /id="note-buttons"/);
  assert.match(html, /id="mode-buttons"/);
  assert.match(html, /id="answer-entry"/);
  assert.match(html, /id="submit-answer"/);
  assert.match(html, /id="speed-buttons"/);
  assert.match(html, /Bass/);
  assert.match(html, /data-app-version="clefhanger-slice3/);
});

test('manifest and service worker describe an installable subpath-safe app shell', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'ClefHanger');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes).sort(), ['192x192', '512x512']);

  const sw = read('sw.js');
  for (const asset of ['./', './index.html', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg']) {
    assert.ok(sw.includes(`'${asset}'`), `service worker precaches ${asset}`);
  }
  assert.match(sw, /request\.mode === 'navigate'/);
});
