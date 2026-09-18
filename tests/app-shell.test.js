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
  assert.match(html, /src="\.\/src\/app\.js\?v=clefhanger-slice69-tester-readiness-2026-09-16"/);
  assert.match(html, /navigator\.serviceWorker\s*\.register\('\.\/sw\.js\?v=clefhanger-slice69-tester-readiness-2026-09-16'\)/);
  assert.match(html, /registration\) => registration\.update\(\)/);
  assert.match(html, /@media \(max-width: 720px\)/);
  assert.match(html, /id="staff"/);
  assert.match(html, /<section class="stage" id="notation-stage" tabindex="-1" aria-label="Treble clef · Treble mode · Practice playfield">/);
  assert.match(html, /id="notation-prompt"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
  assert.match(html, /id="game-announcer"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
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
  assert.match(html, /data-app-version="clefhanger-slice69-tester-readiness/);
  assert.match(html, /Slice 69: tester readiness/);
});

test('rush summary is a focus-managed modal isolated from the background game', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.match(html, /<main id="app-background"[^>]*aria-label="ClefHanger sight-reading game">/);
  assert.match(html, /<aside id="summary"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+aria-label="Rush result"[^>]+hidden>/);
  assert.doesNotMatch(html, /<aside id="summary"[^>]+aria-labelledby="summary-title"/);
  assert.match(html, /<h2 id="summary-title">/);
  assert.ok(html.indexOf('id="summary"') > html.indexOf('</main>'), 'summary is outside the inert background');
  assert.match(app, /createSummaryFocusManager/);
  assert.match(app, /summaryFocusManager\.sync\(state\.phase === 'ended'\)/);
  assert.match(app, /summaryFocusManager\.closeForReplay\(\)/);
  assert.match(app, /summaryFocusManager\.handleKeydown\(event\)/);
});

test('the terminal result has one speech path: live announcement plus action focus', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.match(html, /<h2 id="summary-title">/);
  assert.doesNotMatch(html, /<h2 id="summary-title"[^>]+tabindex/);
  assert.doesNotMatch(html, /<aside id="summary"[^>]+aria-labelledby="summary-title"/);
  assert.match(app, /kind: 'round-ended'/, 'issue #3 terminal live announcement remains');
  assert.match(app, /replayButton: summaryRestartButton/);
});

test('live regions have explicit responsibilities and volatile visual readouts are not live', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.doesNotMatch(html, /class="timer-card"[^>]+aria-live/);
  for (const id of ['feedback', 'learning-coach', 'heard-note', 'mic-report-preview', 'microphone-recording-diagnostic', 'calibration-reading']) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"[^>]+aria-live`));
  }
  assert.match(app, /createSemanticPresenter/);
  assert.match(app, /semanticPresenter\.updateTimer/);
  assert.match(app, /semanticPresenter\.updatePitch/);
  assert.match(app, /kind: 'correct'/);
  assert.match(app, /kind: 'wrong'/);
  assert.match(app, /kind: 'missed'/);
  assert.match(app, /kind: 'microphone-ready'/);
  assert.match(app, /kind: 'microphone-error'/);
  assert.match(app, /kind: 'round-ended'/);
});

test('a terminal miss is announced before the round-ended summary in the same render', () => {
  const app = read('src/app.js');
  const renderHud = app.slice(app.indexOf('function renderHud('), app.indexOf('\nfunction render(', app.indexOf('function renderHud(')));
  const missedAnnouncement = renderHud.indexOf("kind: 'missed'");
  const roundEndedAnnouncement = renderHud.indexOf("kind: 'round-ended'");

  assert.ok(missedAnnouncement >= 0, 'renderHud announces missed-note events');
  assert.ok(roundEndedAnnouncement > missedAnnouncement, 'the round summary is the final terminal game announcement');
});

test('first-run shell presents Sing/Play as the default primary answer path', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.match(html, /<p class="tagline">Sing, hum, or play the staff note before it drops\./);
  assert.match(html, /<div id="settings-line">Treble · Beginner · Speed 5 · Sing\/Play/);
  assert.match(html, /data-input-mode="microphone" data-active="true">Sing\/Play/);
  assert.match(html, /<div id="microphone-panel" aria-label="Microphone answer status">/);
  assert.match(html, /id="start-microphone-main"/);
  assert.match(html, /id="mic-readiness"/);
  assert.match(html, /id="mic-readiness-title"/);
  assert.match(html, /id="mic-readiness-body"/);
  assert.match(html, /Check mic/);
  assert.match(html, /Buttons stay available as a quiet fallback/);
  assert.match(app, /startMicrophoneMainButton/);
  assert.match(app, /buildMicrophoneReadiness/);
  assert.match(app, /micReadinessTitleEl/);
  assert.match(app, /startMicrophoneMainButton\.addEventListener\('click', startMicrophone\)/);
  assert.match(app, /clefhangerInjectPitch: \(frequency, nowMs = performance\.now\(\)\) => \{/);
  assert.match(app, /permission: 'granted', listening: true/);
  assert.match(app, /buildMicrophoneScoringFeedback/);
  assert.match(app, /microphoneDebugText = scoringFeedback\.text/);
});

test('answer buttons do not reveal the current correct answer before the player acts', () => {
  const html = read('index.html');
  const app = read('src/app.js');

  assert.doesNotMatch(html, /data-correct-answer/);
  assert.doesNotMatch(app, /data-correct-answer/);
  assert.doesNotMatch(app, /activeNote\?\.answer ===/);
});


test('first screen gives a microphone-first beginner path before extra modes', () => {
  const html = read('index.html');
  assert.match(html, /<p id="tutorial-text">Sing or hum the note you see\./);
  assert.doesNotMatch(html, /Guess if you are unsure/);
  assert.match(html, /<button class="play-style-button" type="button" data-play-style="practice" data-active="true">Practice<\/button>/);
  assert.match(html, /<details id="rush-help"><summary>Rush is later<\/summary>/);
});

test('mobile microphone panel keeps only the primary mic controls expanded', () => {
  const html = read('index.html');
  assert.match(html, /id="mic-help"/);
  assert.match(html, /<summary>How Sing\/Play scoring works<\/summary>/);
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*#microphone-panel \{[\s\S]*gap: 6px/);
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*#mic-readiness \{[\s\S]*padding: 7px/);
});

test('app honors OS reduced-motion preference for Rush presentation', () => {
  const app = read('src/app.js');
  const html = read('index.html');

  assert.match(app, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(app, /typeof window\.matchMedia === 'function'/);
  assert.match(app, /reducedMotionQuery\.addEventListener\('change', handleReducedMotionChange\)/);
  assert.match(app, /reducedMotionQuery\.addListener\(handleReducedMotionChange\)/);
  assert.match(app, /renderStaffSvg\(\{ state, selectedInputMode, microphoneState, nowMs, reducedMotion: prefersReducedMotion/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /\.rush-progress/);
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
  assert.deepEqual(manifest.shortcuts.map(({ name, short_name, description, url }) => ({ name, short_name, description, url })), [
    { name: 'Treble mode', short_name: 'Treble', description: 'Open natural treble notes with your saved Practice or Rush setting.', url: './?mode=basics' },
    { name: 'Bass mode', short_name: 'Bass', description: 'Open natural bass-clef notes with your saved Practice or Rush setting.', url: './?mode=bass' },
    { name: 'Sharps mode', short_name: 'Sharps', description: 'Open treble sharp notes with your saved Practice or Rush setting.', url: './?mode=sharps' },
  ]);
  for (const icon of ['./icons/icon-192.png', './icons/icon-512.png']) {
    assert.ok(statSync(new URL(`../${icon.slice(2)}`, import.meta.url)).size > 1000, `${icon} exists`);
  }

  const sw = read('sw.js');
  assert.match(sw, /clefhanger-pwa-v64/);
  for (const asset of ['./', './index.html', './manifest.webmanifest', './src/app.js', './src/core/audio.js', './src/core/game.js', './src/core/content.js', './src/core/input-compatibility.js', './src/core/scoring.js', './src/core/pitch.js', './src/core/mic-diagnostics.js', './src/core/learning.js', './src/core/lessons.js', './src/core/music-theory.js', './src/ui/staff-renderer.js', './src/platform/storage.js', './icons/icon-192.svg', './icons/icon-512.svg', './icons/icon-192.png', './icons/icon-512.png']) {
    assert.ok(sw.includes(`'${asset}'`), `service worker precaches ${asset}`);
  }
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /fetch\(request\)\.catch\(\(\) => caches\.match\('\.\/index\.html'\)\)/, 'offline navigation keeps the direct shortcut URL and its query in the address bar');
  assert.match(sw, /matchVersionedPrecacheRequest\(request\)/, 'versioned module requests fall back to approved precached app-shell assets offline');
  assert.match(sw, /searchParams\.get\('v'\) !== APP_VERSION/, 'only the current app-version query may be canonicalized');
  assert.match(sw, /\.then\(\(\) => self\.clients\.claim\(\)\)/, 'clients.claim is included in the activation lifetime');
  assert.match(sw, /event\.waitUntil\(cacheWrite\.catch\(\(\) => undefined\)\)/, 'runtime cache writes are bound to the fetch lifetime');
  assert.match(sw, /response\?\.ok/, 'failed HTTP responses are not runtime cached');
  assert.doesNotMatch(sw, /ignoreSearch:\s*true/, 'offline fallback must not collapse unrelated query variants onto cached app-shell assets');
});

test('startup applies the direct launch query after LocalStorage preferences', () => {
  const app = read('src/app.js');
  const docs = read('docs/current-state-reference.md');

  assert.match(app, /resolveStartupPreferences\(storageAdapter\.readPreferences\(\), window\.location\.search\)/);
  assert.match(docs, /A valid `\?mode=` launch query takes precedence over the stored LocalStorage mode/);
  assert.match(docs, /browser, installed shortcut, and offline navigation/);
});

test('Chord mode resolves Sing/Play to a playable answer mode before starting', () => {
  const app = read('src/app.js');
  const serviceWorker = read('sw.js');

  assert.match(app, /resolvePlayableInputMode/);
  assert.match(app, /buildInputCompatibilityMessage/);
  assert.match(app, /ensurePlayableInputMode/);
  assert.match(app, /selectedInputMode = ensurePlayableInputMode\(selectedModeId, selectedInputMode/);
  assert.match(app, /kind: 'input-compatibility'/);
  assert.match(app, /Chord mode needs Notes/);
  assert.doesNotMatch(app, /Sing the front note[\s\S]*selectedModeId === 'chords'/);
  assert.match(serviceWorker, /\.\/src\/core\/input-compatibility\.js/);
});
