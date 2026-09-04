# ClefHanger Refactoring Plan

**Goal:** keep ClefHanger maintainable while the first teaching version grows, with no god files and no accidental coupling between notation, game state, learning copy, browser APIs, and microphone diagnostics.

**Current baseline:** the app is a dependency-free static PWA using native ES modules. Local checks are green at the time this plan was refreshed (`npm run check`: 119 tests passing). The main architecture risk is not missing tests; it is continued feature work accumulating in `src/app.js` and broadening `src/core/game.js`.

**Refactoring style:** small TDD slices, no rewrite, no bundler migration yet. Each slice should preserve behavior, update docs only where boundaries change, and finish with `npm run check` plus browser smoke if DOM/audio/mic code moved.

---

## Architectural target

### Desired dependency direction

```text
src/core/music-theory.js
src/core/content.js
        ↓
src/core/game.js          src/core/pitch.js          src/core/learning.js
        ↓                         ↓                         ↓
src/ui/* renderers        src/platform/* adapters     src/app.js composition
```

Rules:

- `src/app.js` composes modules and owns browser resources, but should not contain large rendering, theory, scoring, or microphone algorithms.
- `src/core/game.js` owns reducer/state transitions, not browser APIs and not beginner copy generation.
- `src/core/pitch.js` depends on small music-theory helpers, not on the whole game reducer module.
- `src/core/learning.js` owns teaching copy and beginner recommendations, but should consume neutral game outcome data rather than being imported by the reducer.
- UI renderers may return strings/DOM fragments, but should not mutate global app state.
- Platform adapters may touch `navigator`, `AudioContext`, `MediaRecorder`, `localStorage`, and service-worker APIs; pure core modules may not.

### Anti-god-file guardrails

These are soft limits, not hard dogma:

- Keep `src/app.js` trending downward from its current size, not upward.
- Prefer a new focused module when a section in `src/app.js` exceeds roughly 80-120 lines and has its own vocabulary.
- Do not add new music-theory rules, scoring rules, lesson rules, or mic-detection rules directly in `src/app.js`.
- Do not make `src/core/game.js` import UI, platform, or browser-specific code.
- Before adding a new feature, ask: “Which small module should own this behavior after the refactor?”

---

## Current findings to address

### Finding 1: `src/app.js` is the immediate god-file risk

Current responsibilities include:

- DOM element lookup and event wiring.
- Main render loop and animation-frame scheduling.
- SVG staff/note/chord rendering.
- Settings dialog and summary copy.
- LocalStorage preference/high-score adapter.
- Web Audio note playback orchestration.
- Microphone permission/session lifecycle.
- MediaRecorder diagnostic flow.
- Mic-frame to game-scoring bridge.
- Browser smoke/test hooks on `window.__clefHanger`.

Planned response: extract low-risk renderers first, then platform adapters.

### Finding 2: `src/core/game.js` is broader than a reducer

Current responsibilities include:

- Note pools and chord catalogs.
- Mode/speed/difficulty definitions.
- Music-theory helpers.
- Staff layout anchors.
- Scoring and reducer lifecycle.
- Beginner feedback/correction calls via `learning.js` imports.

Planned response: split music theory/content out first, then decouple learning copy from reducer outcomes.

### Finding 3: shell tests protect important regressions but freeze implementation details

The microphone/app shell tests intentionally guard bugs that already happened. Keep their protection, but when extracting modules, convert regex-on-source expectations into behavior-oriented contracts where possible.

Planned response: convert one cluster at a time during the relevant extraction. Do not delete mic regression coverage without an equivalent test.

### Finding 4: native ES-module cache/version strings are duplicated

The buildless PWA needs explicit cache busting. Current duplication is useful but noisy.

Planned response: add a version consistency check before bigger file moves so future refactors do not miss a marker.

---

## Phase 1 — Low-risk UI extraction

### Slice 1.1 — Extract staff SVG renderer — implemented

**Objective:** move staff, note, chord, ledger-line, and ghost-note SVG construction out of `src/app.js` without changing player behavior.

**Implementation note:** landed in Slice 42 as `src/ui/staff-renderer.js` with `tests/staff-renderer.test.js`. `src/app.js` now delegates staff markup to `renderStaffSvg(...)` and keeps only the DOM assignment.

**Create:**

- `src/ui/staff-renderer.js`
- `tests/staff-renderer.test.js`

**Modify:**

- `src/app.js`
- `package.json` `check` script, if the new module should be syntax-checked explicitly

**Move from `src/app.js`:**

- `yForStaffStep`
- `accidentalGlyph`
- `escapeSvgText`
- `renderLedgerLines`
- `renderSingleNote`
- `renderChord`
- `renderGhostNote`
- most of `renderStaff`

**Target API:**

```js
export function renderStaffSvg({
  state,
  selectedInputMode,
  microphoneState,
  nowMs,
}) {
  return '<svg ...>...</svg>';
}
```

If this argument object feels too broad during implementation, split it into presentation fields before exporting:

```js
export function buildStaffViewModel({ state, selectedInputMode, microphoneState, nowMs }) {
  return { clef, activeNote, noteQueue, correction, ghostNote, nowMs };
}
```

**Tests first:**

- Renders staff lines and the expected clef glyph for treble/bass prompts.
- Renders ledger lines only for true ledger-line steps.
- Renders chord noteheads for chord prompts.
- Escapes dynamic label text.
- Renders correction label and ghost note when supplied.

**Verification:**

```bash
npm test
npm run check
```

Manual smoke required because SVG/DOM output moved:

1. Open local page.
2. Start Practice.
3. Verify note appears and moves.
4. Answer wrong; verify correction overlay label and highlighted button.
5. Switch to Chords; verify stacked notes render.
6. Switch to Mic; verify ghost note can appear via `window.clefhangerInjectPitch(440)`.

**Exit criteria:**

- Behavior is unchanged.
- New renderer tests pass.
- `src/app.js` loses the large SVG rendering block.

### Slice 1.2 — Extract settings/status presentation helpers

**Objective:** move small UI copy/view-model decisions out of `src/app.js` after staff rendering is isolated.

**Create:**

- `src/ui/status-presenter.js`
- `tests/status-presenter.test.js`

**Move or wrap:**

- compact settings summary text
- score/streak/timer presentation data
- selected input panel visibility decisions
- learning recommendation display data, if it is currently mixed with DOM mutation

**Target API:**

```js
export function buildStatusViewModel({ state, selectedMode, selectedSpeed, selectedDifficulty, selectedInputMode }) {
  return { summaryText, scoreText, timerText, showButtons, showPiano, showMic };
}
```

**Exit criteria:**

- `src/app.js` keeps DOM assignment and class toggles, but not decision-heavy string construction.
- Tests cover beginner/rush/practice display variants.

---

## Phase 2 — Core boundary cleanup

### Slice 2.1 — Extract music theory helpers — implemented

**Objective:** make pitch/game/renderer modules depend on a small theory module instead of using `game.js` as the shared bucket.

**Implementation note:** landed in Slice 43 as `src/core/music-theory.js` with `tests/music-theory.test.js`. `src/core/pitch.js` and `src/ui/staff-renderer.js` now import theory helpers directly; `src/core/game.js` re-exports the moved helpers for compatibility while using the theory module internally.

**Create:**

- `src/core/music-theory.js`
- `tests/music-theory.test.js`

**Move from `src/core/game.js`:**

- `SEMITONES_FROM_C`
- `accidentalSymbol`
- `answerLabel`
- `getPitchFrequency`
- `getPromptFrequencies`
- `getStaffStepForPitch`
- any tiny enharmonic/normalization helpers that are not reducer-specific

**Modify:**

- `src/core/game.js`
- `src/core/pitch.js`
- `src/ui/staff-renderer.js`, if Slice 1.1 has landed
- existing tests importing these helpers

**Dependency target:**

```text
pitch.js ──→ music-theory.js
 game.js ──→ music-theory.js
```

Not:

```text
pitch.js ──→ game.js
```

**Tests first:**

- Frequency mapping for natural notes, sharps/flats, and chord tones.
- Enharmonic answer labels still match existing behavior.
- Staff-step mapping for treble/bass and ledger-line notes.
- Pitch detector still names notes correctly after import change.

**Verification:**

```bash
npm test
npm run check
```

**Exit criteria:**

- `src/core/pitch.js` no longer imports `src/core/game.js`.
- Existing scoring/audio behavior is unchanged.

### Slice 2.2 — Extract content and mode catalog — implemented

**Objective:** separate static drill/catalog definitions from game state transitions.

**Implementation note:** landed in Slice 44 as `src/core/content.js` with `tests/content.test.js`. `src/app.js` imports selectable UI/catalog data directly from `content.js`; `src/core/game.js` imports the catalogs it needs for prompt creation and re-exports the public content helpers for compatibility.

**Create:**

- `src/core/content.js`
- `tests/content.test.js`

**Move from `src/core/game.js`:**

- `LEVEL_ONE_NOTES`
- `BASS_NOTES`
- `SHARP_NOTES`
- `FLAT_NOTES`
- `CHORDS`
- `GAME_MODES`
- speed and difficulty definitions if they are just catalogs
- button/piano key definitions if they are shared content rather than reducer behavior

**Keep in `game.js`:**

- state creation
- note queue lifecycle
- round/practice transitions
- scoring reducer
- missed-note handling
- summary construction, until scoring gets its own slice

**Tests first:**

- Every mode has a non-empty prompt pool.
- Beginner lessons reference valid note names/pools.
- Chord prompts have playable frequencies.
- Answer options remain identical for each mode/difficulty/lesson.

**Verification:**

```bash
npm test
npm run check
```

**Exit criteria:**

- Adding a future mode mostly touches `content.js` plus tests/docs, not reducer internals.
- `game.js` reads catalogs but does not define large prompt arrays inline.

### Slice 2.3 — Extract scoring helpers — implemented

**Objective:** isolate scoring arithmetic and high-score comparability rules from reducer flow.

**Implementation note:** landed in Slice 45 as `src/core/scoring.js` with `tests/scoring.test.js`. `src/core/game.js` now delegates correct-answer point calculation and round-summary construction to scoring helpers, while re-exporting scoring helpers for existing imports.

**Create:**

- `src/core/scoring.js`
- `tests/scoring.test.js`

**Move or expose:**

- points formula
- speed bonus
- difficulty multiplier
- streak bonus
- summary accuracy calculation if currently embedded in game state lifecycle
- high-score key construction only if it is pure and not tied to `localStorage`

**Tests first:**

- Existing point values by mode/speed/difficulty/streak.
- Accuracy and summary values for zero-attempt and mixed-result rounds.
- High-score keys remain comparable by mode, speed, and difficulty.

**Verification:**

```bash
npm test
npm run check
```

**Exit criteria:**

- Scoring changes can be reviewed without reading note generation and reducer queue logic.

### Slice 2.4 — Decouple game reducer from learning copy — implemented

**Objective:** reverse the current dependency where `game.js` imports `learning.js`.

**Implementation note:** landed in Slice 46 with `tests/game-learning-boundary.test.js` and `src/core/lessons.js`. `game.js` now imports lesson filtering from `lessons.js`, emits neutral `lastOutcome` metadata, and no longer imports `learning.js`. `learning.js` owns `buildTeachingFeedback(...)` and `applyLearningFeedback(...)`; `src/app.js` applies that layer after practice answers so player-facing beginner feedback and correction freeze behavior remain unchanged.

**Create or modify:**

- `src/core/game.js`
- `src/core/learning.js`
- possibly `src/ui/feedback-presenter.js`
- tests for game reducer outcomes and learning feedback

**Target:**

`game.js` returns neutral outcome metadata:

```js
{
  result: 'correct' | 'wrong' | 'missed',
  prompt,
  expectedAnswer,
  givenAnswer,
  pointsEarned,
  streak,
  modeId,
  lessonId,
}
```

`learning.js` converts that into teaching copy/correction data:

```js
export function buildTeachingFeedback(outcome) {
  return { message, correction };
}
```

**Important compatibility rule:** practice mode should still keep the current note active after a wrong answer and still show the same correction overlay.

**Tests first:**

- Reducer returns neutral wrong/correct/missed outcome data.
- Beginner feedback text is identical, or intentionally updated and documented.
- Correction overlay data is identical for representative line/space/ledger/interval mistakes.
- Non-beginner/rush modes are not forced through beginner teaching copy.

**Verification:**

```bash
npm test
npm run check
```

Manual smoke:

1. Practice wrong answer still teaches and keeps note active.
2. Practice correct answer advances.
3. Rush wrong/missed behavior remains fast and game-like.
4. Next-step coach still appears after the same evidence.

**Exit criteria:**

- `src/core/game.js` no longer imports `src/core/learning.js`.
- The reducer is usable without the beginner learning layer.

---

## Phase 3 — Platform adapter extraction

### Slice 3.1 — Extract LocalStorage adapter — implemented

**Objective:** keep persistence out of the composition root and make key behavior testable.

**Implementation note:** landed in Slice 48 as `src/platform/storage.js` with `tests/storage.test.js`. `src/app.js` now reads startup preferences and high scores through `createStorageAdapter()` and writes UI selections through `writePreference(...)`; direct `localStorage.getItem/setItem` calls are no longer scattered through the composition root.

**Create:**

- `src/platform/storage.js`
- `tests/storage.test.js`

**Move from `src/app.js`:**

- preference key names
- high-score read/write helpers
- default/fallback reads for mode, speed, difficulty, lesson, and input mode

**Target API:**

```js
export function createStorageAdapter(storage = globalThis.localStorage) {
  return {
    readPreferences,
    writePreference,
    readHighScore,
    writeHighScore,
  };
}
```

**Tests first:**

- Missing storage uses defaults.
- Invalid stored mode/speed/difficulty falls back safely.
- High-score key includes mode, speed, and difficulty.
- Storage unavailable/throwing does not break app startup.

**Exit criteria:**

- `src/app.js` calls an adapter rather than directly scattering `localStorage` reads/writes.

### Slice 3.2 — Extract microphone session adapter — implemented

**Objective:** isolate browser microphone setup and analyser lifecycle from UI/rendering/scoring orchestration.

**Implementation note:** landed in Slice 49 as `src/platform/microphone-session.js` with `tests/microphone-session.test.js`. `src/app.js` now delegates permission preflight, timeout-wrapped `getUserMedia`, built-in vocal constraints, source/analyser/zero-gain keepalive graph construction, track-state snapshots, and track cleanup to `startMicrophoneSession(...)`; the app shell keeps mic-frame processing, UI messages, scoring orchestration, and diagnostic report assembly.

**Create:**

- `src/platform/microphone-session.js`
- `tests/microphone-session.test.js`

**Move from `src/app.js`:**

- permission query helper
- microphone error formatting, if not already pure elsewhere
- `getUserMedia` constraint construction
- stream/source/analyser/keepalive-gain setup
- track state snapshot helper
- cleanup/stop logic

**Target API:**

```js
export async function startMicrophoneSession({ navigator, audioContext, analyserOptions }) {
  return {
    stream,
    source,
    analyser,
    keepAliveGain,
    getTrackState,
    stop,
  };
}
```

**Tests first:**

- Built-in-vocal constraints request echo/noise off, auto-gain on, mono.
- Permission denied maps to the existing Android/Chrome/Firefox friendly copy.
- Source/analyser/keepalive graph is constructed and retained.
- Stop disables/stops tracks.

**Manual smoke required:** real microphone path changed.

1. Browser requests permission once.
2. Mic panel shows listening/input level.
3. Android Firefox/Chrome should still produce Mic Lab report shape.
4. Injected pitch hook still uses same scoring path.

**Exit criteria:**

- `src/app.js` does not directly build the media graph.
- Existing mic regression tests are converted, not weakened.

### Slice 3.3 — Extract MediaRecorder diagnostic adapter — implemented

**Objective:** isolate the 1-second Mic Lab recording flow from UI controls.

**Implementation note:** landed in Slice 50 as `src/platform/mic-recording-diagnostic.js` with `tests/mic-recording-diagnostic.test.js`. `src/app.js` now delegates MediaRecorder construction/start/stop, chunk collection, blob creation, Web Audio decode handoff, decoded RMS, recorded-pitch extraction, and report evidence construction to `runMicrophoneRecordingDiagnostic(...)`; the app shell keeps only UI status copy, beginner-friendly message formatting, and report/export wiring.

**Create:**

- `src/platform/mic-recording-diagnostic.js`
- tests, or extend `tests/mic-diagnostics.test.js` with adapter-level fakes

**Move from `src/app.js`:**

- MediaRecorder construction/start/stop flow
- blob/bytes collection
- decodeAudioData handoff
- recording label plumbing

**Keep in `src/core/mic-diagnostics.js`:**

- report shape
- level/peak calculation
- pitch candidate scanning
- interpretation strings

**Exit criteria:**

- UI button triggers a small adapter call and displays the returned report.
- Exported `.txt` JSON report remains schema-compatible.

### Slice 3.4 — Extract audio playback orchestration if needed

**Objective:** keep user-gesture-triggered playback safe while reducing app orchestration noise.

**Current note:** `src/core/audio.js` is small and already has a pure voice plan. Do this only if app-level playback code continues to grow.

**Possible create:**

- `src/platform/audio-output.js`

**Exit criteria:**

- No samples or new dependencies are introduced.
- Gesture-triggered playback still works on mobile.

---

## Phase 4 — Refactor support tooling

### Slice 4.1 — Add version consistency check — implemented

**Objective:** reduce cache-busting mistakes in the buildless native-module PWA.

**Implementation note:** landed in Slice 47 as `scripts/check-version-consistency.js` with `tests/version-consistency.test.js`. `npm run check` now syntax-checks and runs the version consistency script after the test suite.

**Create:**

- `scripts/check-version-consistency.js`
- `tests/version-consistency.test.js`, or wire the script directly into `npm run check`

**Validate:**

- `index.html` `data-app-version`
- `index.html` `./src/app.js?v=...`
- service-worker registration `./sw.js?v=...`
- `const appVersion` in `src/app.js`
- local module import query strings
- `CACHE_NAME` in `sw.js`
- service-worker precache coverage for app-imported ES modules

**Exit criteria:**

- Future slices can update one expected marker and get exact failures for missing cache/version updates.

### Slice 4.2 — Convert shell regex tests during extraction

**Objective:** preserve regression protection while making refactors easier.

**Approach:**

- When a source regex fails because code moved, add a behavior or module contract test first.
- Keep at least one lightweight shell test for critical public hooks and app-shell wiring.
- Do not remove tests that guard historical bugs until their replacement fails on the old broken shape.

**High-priority historical bugs to preserve:**

- animation-frame timestamp is not treated as a pitch frequency
- Firefox keeps Web Audio graph alive by retaining source and keepalive gain
- Mic Lab exports Telegram-friendly `.txt` reports
- injected pitch hook goes through the same scoring path as live mic frames
- chord singing remains explicitly out of scope

### Slice 4.3 — Add minimal CI — implemented

**Objective:** give refactors an external green/red signal.

**Implementation note:** landed as `.github/workflows/check.yml`. The workflow runs on `push` and `pull_request`, checks out the repository, sets up Node.js 24 to match local verification, prints Node/npm/Python versions, then runs `npm test` and `npm run check` as separate readable Actions steps.

**Create:**

- `.github/workflows/check.yml`

**Workflow:**

```yaml
name: check
on:
  push:
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - run: npm test
      - run: npm run check
```

**Exit criteria:**

- `gh run list` shows check runs after push.
- CI runs the same quality gate as local development.

---

## Recommended implementation order

1. Slice 1.1 — staff renderer extraction.
2. Slice 2.1 — music theory extraction.
3. Slice 2.2 — content/mode catalog extraction.
4. Slice 2.4 — decouple game reducer from learning copy.
5. Slice 4.1 — version consistency check.
6. Slice 3.1 — LocalStorage adapter.
7. Slice 3.2 — microphone session adapter — implemented.
8. Slice 3.3 — MediaRecorder diagnostic adapter — implemented.
9. Slice 4.2 — shell test conversion as needed.
10. Slice 4.3 — minimal CI — implemented.

Reasoning:

- Rendering and theory extractions reduce the biggest god-file pressure with low product risk.
- Learning decoupling is the most important domain cleanup, but safer after the theory/content split.
- Mic extraction should happen only after the simpler extractions prove the pattern, because real-device mic behavior is fragile and already has valuable regression evidence.
- CI can land before or after the first extractions; it becomes more valuable once refactors start crossing module boundaries.

---

## Per-slice done definition

Every refactoring slice is done only when:

- A focused test fails before implementation or an existing test proves the preserved behavior.
- The smallest extraction is implemented.
- `npm test` passes.
- `npm run check` passes.
- Docs are updated if ownership/boundaries changed.
- Browser smoke is done when DOM/SVG/audio/mic behavior changed.
- `git diff --check` passes through `npm run check`.
- The diff shows behavior-preserving movement, not unrelated feature changes.

Suggested commit style:

```bash
git add <changed files>
git commit -m "refactor: extract staff renderer"
```

---

## Stop conditions

Pause and reassess if any slice causes one of these:

- Real-device mic behavior regresses.
- Service-worker or module cache behavior becomes confusing.
- Refactor introduces a bundler or dependency only to move code around.
- Tests need broad weakening to pass.
- `src/app.js` gets larger after a supposedly extracting slice.
- New modules have vague names such as `utils.js`, `helpers.js`, or `manager.js`.

---

## Non-goals for this refactoring round

- Migrating to Vite/TypeScript.
- Replacing SVG rendering with VexFlow.
- Replacing the pitch detector with Pitchy.
- Adding chord singing.
- Adding new lessons or note ranges.
- Redesigning the visual UI.
- Changing scoring balance.

Those can happen later. This plan is about protecting the current teaching prototype from becoming hard to change.
