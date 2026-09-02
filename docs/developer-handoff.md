# ClefHanger Developer Handoff

This document is for the next coding session. It explains where things live, how to change them safely, and which traps have already bitten the project.

## Repository orientation

ClefHanger is intentionally small and dependency-free for now. There is no bundler. The app is plain HTML/CSS plus native ES modules.

Important files:

- `index.html`: markup, embedded CSS, service-worker registration, root module import.
- `src/app.js`: DOM adapter and browser runtime orchestration.
- `src/ui/staff-renderer.js`: pure SVG staff/note/chord/correction/ghost-note renderer.
- `src/core/music-theory.js`: pure accidentals, semitone, frequency, staff-step, and ghost-note helpers.
- `src/core/scoring.js`: pure score, accuracy, high-score-key, and round-summary helpers.
- `src/core/lessons.js`: beginner lesson catalog, intro cards, and lesson-specific answer/prompt filtering.
- `src/core/game.js`: renderer-free game model and round/practice reducer.
- `src/core/learning.js`: beginner teaching copy layer that consumes neutral game outcomes.
- `src/core/pitch.js`: microphone and pitch logic.
- `src/core/mic-diagnostics.js`: Mic Lab reporting.
- `src/core/audio.js`: Web Audio note playback.
- `sw.js`: service-worker app shell cache.
- `tests/*.test.js`: Node test suite using `node:test`.
- `docs/user-journey.md`: product-level player journey and intended user actions.
- `docs/current-state-reference.md`: exact current implementation reference.
- `docs/player-tester-guide.md`: first-time player/tester guide.
- `docs/smoke-checklist.md`: manual local/live smoke checklist.
- `docs/refactoring-plan.md`: architecture cleanup plan for extracting renderers/core catalogs/platform adapters while avoiding god files.

## Commands

Run the full gate before commit:

```bash
npm run check
```

Run tests only:

```bash
npm test
```

Serve locally:

```bash
npm run serve
# then open http://localhost:4173/
```

For strict isolated local smoke, prefer an explicit alternate port if another server might be stale:

```bash
python3 -m http.server 4174
```

## TDD expectations

Use RED-GREEN-REFACTOR for behavior changes.

Good seam order:

1. Write renderer-free tests in `tests/*` against `src/core/*`.
2. Watch them fail.
3. Implement the smallest core behavior.
4. Add/update app-shell structural tests if the DOM surface changes.
5. Wire `src/app.js` last.
6. Run `npm run check`.
7. Browser-smoke the actual local page.
8. Update docs in the same slice.

Do not make microphone, scoring, notation, lesson, or persistence changes only in `src/app.js`. Put the rule in a core module first.

Scoring changes should start in `src/core/scoring.js` with focused coverage in `tests/scoring.test.js`; `src/core/game.js` should call those helpers from reducer flow rather than embedding point arithmetic.

Learning-copy changes should start in `src/core/learning.js`; lesson catalog/filtering changes should start in `src/core/lessons.js`. `src/core/game.js` emits `lastOutcome` metadata for correct/wrong/missed transitions and must not import `learning.js`.

## Native ES-module versioning

This project does not bundle files into content-hashed assets. That means browser and service-worker caches can serve mixed old/new modules unless every marker is bumped together.

When changing JS behavior or import/export contracts, update all of these together:

- `index.html` `data-app-version`.
- Visible microcopy near the controls.
- `index.html` script URL query for `./src/app.js?v=...`.
- Service-worker registration URL query for `./sw.js?v=...`.
- `const appVersion` in `src/app.js`.
- Local module import query strings in `src/app.js`.
- Local module import query strings in core modules that import other local modules.
- `CACHE_NAME` in `sw.js`.
- Tests that assert the current marker/cache name.
- Docs and smoke checklist markers.

`npm run check` now runs `node scripts/check-version-consistency.js`; if a future slice misses one query string or forgets to precache a new app-imported ES module, the gate should fail with an exact message before deploy.

Current marker set:

- App version: `clefhanger-slice48-storage-adapter-2026-09-01`.
- Service-worker cache: `clefhanger-pwa-v42`.
- Visible marker: `Slice 48: storage adapter`.

## State ownership

`src/core/game.js` owns game state transitions. Treat returned state as immutable-ish: helper functions clone state and return a new object.

Main state fields:

- `phase`: `idle`, `practice`, `running`, or `ended`.
- `modeId`, `speedId`, `difficultyId`, `lessonId`.
- `roundLengthMs`, `startedAtMs`, `endsAtMs`.
- `seed`, `noteCounter`.
- `activeNote`, `noteQueue`.
- `correction`.
- `score`, `pointsEarned`, `streak`, `bestStreak`.
- `correct`, `wrong`, `missed`.
- `feedback`.

`src/app.js` owns browser resources:

- animation frame ids;
- `AudioContext`;
- microphone stream/source/analyser/keepalive gain/buffer;
- DOM event listeners and assignments.

`src/platform/storage.js` owns LocalStorage access:

- preference key names and legacy fallback keys;
- safe default preferences when storage is missing, invalid, or throwing;
- high-score reads/writes using the scoring module's comparable key format.

`src/ui/staff-renderer.js` owns SVG staff presentation:

- staff lines, clef glyphs, noteheads/stems, chord stacks, ledger lines, correction labels, and microphone ghost-note markup;
- it returns SVG strings and must not mutate global DOM or app state.

`src/core/pitch.js` owns microphone state shape via `createMicrophoneState`.

## Adding or changing notes/modes

Change `src/core/content.js` first:

- Add or edit the relevant pool (`LEVEL_ONE_NOTES`, `BASS_NOTES`, `SHARP_NOTES`, `FLAT_NOTES`, `CHORDS`).
- Add or edit `GAME_MODES`.
- Update `getAnswerOptions` if the answer shape changes.
- Update `getPromptFrequencies` in `src/core/music-theory.js` if audio playback needs different frequencies.
- Update staff-step or ledger tests if geometry changes.
- Update `docs/current-state-reference.md` and `docs/player-tester-guide.md`.

Watch for:

- `answerLabel` and `normalizeAnswer` behavior for accidentals.
- Flat prompts vs sharp detector names.
- High-score key comparability when a new mode affects scoring.
- `src/core/game.js` re-exports catalog helpers for compatibility, but new catalog edits should land in `content.js`.

## Adding beginner lessons

Change `src/core/lessons.js` first:

- Add a `BEGINNER_LESSONS` entry.
- Define `answers` and `noteNames`.
- Add `staffSteps` if the lesson needs geometry-specific filtering.
- Add `intro` if the default title/body/examples are not enough.
- Add tests in `tests/beginner-ux.test.js` or `tests/game-learning-boundary.test.js` depending on whether the change is lesson catalog data or outcome-to-copy behavior.
- Update README, player guide, current-state reference, and smoke checklist.

Beginner scaffolding currently only narrows answers for Treble + Beginner. If that changes, update `getScaffoldedAnswerOptions` and document the new scope explicitly.

## Changing microphone behavior

Work in `src/core/pitch.js` and `src/core/mic-diagnostics.js` before touching DOM code.

Current mic constants:

- Tolerance: 50 cents.
- Stability window: 150 ms.
- Post-hit debounce: 650 ms.
- Display/scoring frequency range: 80–1000 Hz.
- Minimum centered RMS: 0.0005.
- Autocorrelation threshold: 0.72.
- Analyser `fftSize`: 4096 in `src/app.js`.

Important tests live in:

- `tests/pitch-tracker.test.js`
- `tests/mic-diagnostics.test.js`
- `tests/heard-note-display.test.js`
- `tests/microphone-shell.test.js`

Keep these behaviors unless a real-device report proves otherwise:

- reject flat/DC input;
- reject absurd spikes such as 6569 Hz;
- preserve sub-1% level evidence instead of rounding everything to 0;
- accept comfortable low male notes such as G2/A2/C3/D3;
- distinguish live analyser evidence from MediaRecorder/decode evidence;
- export reports as `.txt`, not `.json`, for Telegram friendliness;
- keep Mic Lab raw details behind an advanced panel;
- accept matching pitch class in any octave for beginner play;
- do not score chord prompts from the mic.

Use this public hook for browser smoke:

```js
window.clefhangerInjectPitch(frequency, nowMs)
```

It must remain wired to the same path as live mic frames.

## Changing audio playback

`src/core/audio.js` contains a pure `buildPianoVoicePlan` and the browser `playPianoVoice` implementation.

If changing the voice:

- update `tests/audio-voice.test.js` first;
- keep playback gesture-triggered through existing user actions;
- avoid sample files unless the PWA/deploy/cache story is updated;
- update current-state docs with exact envelope/partials if the values change.

## LocalStorage and migration

Current keys are documented in [Current State Reference](./current-state-reference.md). When replacing a key:

- keep a fallback read path for at least one slice if useful;
- update the high-score key only when score comparability changes;
- update docs and tests together.

## Manual browser smoke

Use local smoke after any DOM, CSS, audio, mic, or service-worker change.

Minimum local checks:

1. Page loads with no console errors.
2. Slice marker is visible.
3. Settings opens.
4. Start Practice works.
5. Wrong answer shows teaching feedback and correction overlay.
6. Correct answer increments score and plays audio.
7. Input switching hides/shows the right answer panel.
8. If mic behavior changed, run the injected pitch hook.

Injected-pitch smoke example:

```js
const app = window.__clefHanger
app.selectInputMode('microphone')
app.startPractice()
const answer = app.getState().activeNote.answer
const freqs = { C: 130.81, D: 146.83, E: 164.81, F: 174.61, G: 196, A: 220, B: 246.94 }
const freq = freqs[answer.replace(/[♯♭]/g, '')]
window.clefhangerInjectPitch(freq, 1000)
window.clefhangerInjectPitch(freq, 1160)
app.getState().correct
```

The first injection should not score yet. The second should score if the prompt is a matching single note.

## Deploying to simiono

Use the `digital-garden` Hermes skill and its `references/deploy-clefhanger.md` file for the exact deploy workflow.

Short version:

1. Run `npm run check`.
2. Commit and push.
3. Upload only intended files to `/clefhanger/` via FTPS.
4. Include root files, `src/`, `icons/`, and public docs.
5. Do not upload `.git/`, `tests/`, scratch files, or the repository root to the hosting root.
6. Live-check the app marker, JS markers, manifest, service worker, and root Garden page.

Typical live checks:

```bash
curl -fsSL 'https://simiono.com/clefhanger/?verify=<sha>' | grep 'clefhanger-slice48-storage-adapter'
curl -fsSL 'https://simiono.com/clefhanger/src/app.js?verify=<sha>' | grep 'clefhangerInjectPitch'
curl -fsSL 'https://simiono.com/clefhanger/src/core/pitch.js?verify=<sha>' | grep 'evaluateVocalMatchFrame'
curl -fsSL 'https://simiono.com/clefhanger/sw.js?verify=<sha>' | grep 'clefhanger-pwa-v42'
curl -fsSL 'https://simiono.com/' | head -5
```

Browser-smoke after deploy; static curl checks are not enough because stale ES module caches can make the UI visible but dead.

## Documentation rules

Keep these docs aligned:

- README: short project orientation and docs index.
- `docs/product-specification.md`: product intent and implemented capability summary.
- `docs/mvp-roadmap.md`: implemented slices vs future candidates.
- `docs/architecture.md`: module architecture and current behavior summary.
- `docs/user-journey.md`: what a normal player is supposed to do.
- `docs/current-state-reference.md`: exact current facts and constants.
- `docs/player-tester-guide.md`: user/tester operating guide.
- `docs/smoke-checklist.md`: local/live verification steps.
- `docs/developer-handoff.md`: how to safely continue coding.

Do not let planned features read as implemented. For example, Pitchy, VexFlow, MIDI, cloud sync, and chord singing are future possibilities, not current behavior.
