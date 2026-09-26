# ClefHanger roadmap

Last reviewed: **2026-09-26**, against implementation commit `3a061b1` (Slice 71).

This is the single planning document for product direction, delivery priorities, and architecture work. It replaces the separate MVP roadmap, product specification, and refactoring plan. Historical implementation details remain in Git; completed work below is a baseline, not an open backlog.

**Next coding slice: extract the settings/status presentation from `src/app.js` without changing behavior (P2). Highest product priority: validate the mobile learning loop on physical phones (P1).** P2 can proceed while devices and testers are unavailable. Do not expand microphone-dependent lessons before P1 establishes a reliable baseline.

## Product direction

ClefHanger helps singers, choir members, music-reading beginners, and monophonic instrumentalists connect written notes with sound through short, approachable sessions. The primary experience is portrait mobile Practice: see a note, listen if needed, sing or play it, receive useful guidance, and try the next note. Absolute pitch and keyboard hardware are not prerequisites.

Primary answer path: microphone. Sing/Play is the default input. Notes and piano remain accessible fallbacks for quiet environments, microphone problems, and players who prefer touch. Rush adds an optional 60-second challenge after comfortable practice; speed is not the beginner success criterion.

Keep the first screen focused on the staff and the next useful action. Explanations, advanced settings, diagnostics, and competition must not crowd out learning. Recommendations should invite progression rather than lock users out of a lesson.

The app remains a static, dependency-free PWA using native JavaScript modules, SVG notation, Web Audio, and local storage. No backend, accounts, cloud sync, MIDI, polyphonic detection, or chord singing is implemented. A framework, bundler, VexFlow, or replacement pitch library requires a demonstrated problem and measured benefit, not a speculative rewrite.

## Verified implemented baseline

“Implemented” means present in code and covered by the recorded checks. It does **not** mean validated across physical phones or deployed to the public site.

| Area | Implemented behavior |
| --- | --- |
| Beginner entry | Treble → First steps → Sing/Play → untimed Practice. One static prompt; effective Beginner difficulty and speed 1. Secondary teaching content is collapsed or in Settings. |
| Lesson content | First steps (C4/D4/E4), Line notes (E4/G4/B4/D5/F5), Space notes (F4/A4/C5/E5), Ledger lines (C4/A5), Interval jumps (C4–G4), and Mixed notes. Mic-first lesson cards and interval hints are implemented. |
| Notation help | Optional “Learn these notes” guide with small SVG rows and text keys. Shared staff-position descriptions support accessible labels and correction copy; disabling hints also hides the answer overlay. |
| Listen and imitate | “Hear this note” plays the current Practice target and can start an idle Practice session. App-generated audio blocks microphone scoring through playback plus a 300 ms acoustic tail. Listening and visible teaching help mark the prompt assisted. |
| Mic readiness | Visible Check mic, Stop mic, note-button fallback, and pitch guidance. Any octave by default, optional written-octave matching. Chords use Notes only. |
| Practice progress | Local totals for attempts, correct answers, and assistance, plus the last ten independent scored outcomes per treble lesson or other mode. A recommendation becomes available after at least 8 correct in that ten-outcome window. Assisted outcomes do not enter that window; skipping is neutral. Restarting a session keeps saved progress. |
| Rush and exits | Timed modes, speed/difficulty controls, front-prompt scoring, pause on Settings/background, explicit Resume, replay, and Back to Practice. Results contain keyboard focus; Escape returns to Practice. |
| Offline and upgrades | Service-worker app shell and subpath support. Upgrade regression preserves progress and unrelated applications’ caches, then verifies offline startup with the server stopped and HTTP cache disabled. |
| Diagnostics | Mic Lab exports `.txt` JSON reports; recorded Android Firefox B2/C3 input is a regression fixture. This is limited device evidence, not a browser compatibility guarantee. |
| Architecture | Staff renderer, music theory, content, scoring, learning, lessons, progress, storage, microphone session/controller, diagnostics, semantic presentation, and summary focus already have dedicated modules. |
| Test gate | Automatic unit/browser test discovery, browser concurrency limit, bounded browser-command diagnostics, syntax/manifest/version checks, and GitHub CI. The Slice 71 baseline passed 202 unit and 15 browser tests. |

Recent milestones: Slice 70 simplified mobile Practice, added listen-and-imitate assistance and persisted lesson progress, and repaired Rush flow. Slice 71 clarified lesson notation, aligned accessible descriptions, and strengthened PWA upgrade coverage. These are completed features; follow-up work below addresses remaining evidence and limitations.

Exact behavior and constants belong in [Current state reference](current-state-reference.md), module ownership in [Architecture](architecture.md), and interaction expectations in [User journey](user-journey.md). The recorded baseline CI run is [Slice 71 checks](https://github.com/utrost/ClefHanger/actions/runs/36230469202). Repository publication and production deployment are separate; confirm the live version using the [developer handoff](developer-handoff.md) before claiming a release is deployed.

## Prioritized delivery plan

Statuses describe evidence and readiness, not dates or promises. Each item should ship as a small reviewable slice. Product priority is UI/UX first, followed by learning content, maintainability, and supporting documentation/testing.

### P1 — Validate the mobile Practice loop

**Status: needs physical devices and human evidence. Highest product priority.**

The layout and synthetic browser paths are tested; microphone usability across ordinary rooms and phones is still uncertain. Existing Android Firefox recordings do not cover Android Chrome or iOS Safari.

- Run the [human test handbook](human-test-handbook.md) and [smoke checklist](smoke-checklist.md) on Android Chrome, Android Firefox, and iOS Safari; include installed PWA behavior where supported.
- Exercise first visit, permission allow/deny/retry, Check mic, fallback buttons, listening then singing, quiet/noisy rooms, background/resume, rotation, Rush results/exit, and an offline relaunch after an update.
- Observe a beginner reaching the first correct note without coaching. Record confusing wording, hidden controls, staff legibility, touch reach, and whether mic guidance explains the next action. Distinguish a detector failure from a permission or teaching problem.
- Record device, OS, browser, app version, scenario, expected/actual result, and useful Mic Lab reports. Log unsupported or untested combinations explicitly.

**Done when:** the matrix has recorded results for those three browsers; every blocking failure has a reproducible case and fix or documented supported limitation; the first-note flow and no-self-scoring playback behavior have physical-device evidence. Browser automation supplements this evidence and cannot substitute for it.

**Likely touchpoints:** `index.html`, `src/app.js`, microphone platform modules, pitch core, and human testing guides. Prioritize observed blockers before new settings or detector tuning.

### P2 — Reduce app composition complexity

**Status: ready. Next coding slice; independent of P1 device availability.**

`src/app.js` is still 1,073 lines at the reviewed baseline. Earlier plans to extract the renderer, catalogs, scoring, storage, and microphone adapters are already complete. The remaining first target is settings/status presentation, not another broad rewrite.

1. Identify the settings and status decisions currently mixed with DOM updates. Capture their observable behavior with focused tests.
2. Move the coherent view-model/presentation decisions into a small UI module with explicit inputs and outputs. Reuse the existing semantic presenter; avoid a competing rendering abstraction.
3. Leave event wiring, state ownership, and sequencing in the composition root. Measure the reduction and remove replaced logic.
4. Reassess before another extraction. Audio orchestration or staff geometry still in `game.js` may merit separate work only if the dependency boundary becomes clearer.

**Done when:** the extracted decisions have direct tests, `app.js` is smaller, the module has one responsibility, and the full gate plus relevant mobile/keyboard browser scenarios passes with unchanged product behavior. Preserve smoke hooks, microphone state transitions, diagnostic schema, storage fallbacks, and service-worker asset coverage.

**Guardrails:** do not mix UI redesign, scoring changes, or new lessons into this refactor. Game rules should not depend on teaching copy or browser APIs; platform modules own browser I/O. Some current code, including browser audio playback in `core/audio.js`, does not yet meet a fully pure-core ideal. Treat that as a boundary to evaluate, not a claim that the architecture is already pure.

### P3 — Make progress useful without overstating mastery

**Status: proposed next product slice, after P1 feedback.**

Current persistence records scored outcomes and assistance; it has no per-note mistake history, adaptive review, or mastery dashboard. Live tuning frames are not incorrect attempts. A saved 8/10 window is an invitation to try another lesson, not proof of durable learning.

- First evaluate whether players understand session results versus saved lesson progress and why listening/help does not count as independent success. Improve labels and next-action copy where evidence shows confusion.
- Design a compact progress view only if it helps players choose what to practise. Keep the main Practice screen uncluttered.
- If mistake-focused review is justified, define a bounded, versioned per-note data model before implementing it. Specify how assisted answers, repeated corrections, skips, mode switches, and storage failure behave; avoid silently reinterpreting existing totals.

**Done when:** players can identify what the displayed progress means and choose a sensible next action; tests cover independent versus assisted outcomes, reload, restart, mode/lesson isolation, malformed data, and any migration. Existing saved progress remains readable. Any per-note review feature has its own explicit acceptance criteria before coding.

**Touchpoints:** `src/core/progress.js`, `src/platform/storage.js`, lesson recommendations in `src/app.js`, and the player/current-state guides.

### P4 — Extend teaching content one concept at a time

**Status: proposed; follow P1 and validate a small lesson before broad expansion.**

Bass and accidental modes exist, but they do not yet have the same scaffolded beginner lesson sequence as treble. Avoid presenting mode availability as a complete curriculum.

- Choose the next small lesson from observed beginner needs: a bass-clef introduction or explicit sharp/flat examples.
- Define its exact note pool, learning objective, staff-position wording, reference sounds, accessible descriptions, and quiet-input fallback before implementation.
- Reuse the existing lesson/guide infrastructure. Introduce one unfamiliar concept at a time and keep advanced content out of the first-run path.

**Done when:** the note pool and examples agree, visual and spoken descriptions are accurate, the guide fits a narrow portrait viewport, and a learner can demonstrate the intended distinction. Add focused content/notation tests and update operating documentation in the same slice.

**Touchpoints:** `src/core/lessons.js`, `src/core/content.js`, `src/core/learning.js`, `src/ui/lesson-guide.js`, and staff rendering/music theory where needed.

### P5 — Keep regression coverage maintainable

**Status: ready incrementally alongside P2–P4. The test gate is repaired, not pending repair.**

Some tests inspect source text or exact documentation phrases. These can freeze an implementation or an obsolete roadmap instead of protecting player behavior.

- When extracting a module, replace related source-regex assertions with direct behavior tests or browser assertions where they provide stronger protection. Do not delete coverage wholesale or add tests that merely restate implementation.
- Keep coverage for callback timestamps not being treated as frequencies, Firefox microphone source lifetime, shared real/injected pitch handling, `.txt` diagnostics, chord input restrictions, playback suppression, and progress/upgrade preservation.
- If duplicated release markers cause drift, evaluate a single-source generation/check approach as a separate small change. Preserve the no-build deployment contract and readable version diagnostics.

**Done when for each slice:** changed behavior has a meaningful regression check, removed assertions have equivalent or better coverage, and `npm run check` passes locally and in CI without hidden exclusions. New browser tests use the shared bounded harness and remain discoverable automatically.

### P6 — Keep planning and release documentation aligned

**Status: ongoing maintenance; consolidation completed by this document.**

Use this roadmap for priorities and completion criteria, not another parallel plan. Update it when a slice completes or new evidence changes the next action. Keep user instructions, exact constants, architecture, and deployment procedures in their dedicated linked documents.

**Done for each release:** implemented versus proposed wording is accurate; new limitations and manual evidence are recorded; links work; and any deployment claim includes verification of the actual live version. A documentation-only edit does not require a runtime/cache version bump.

## Deferred ideas and decision triggers

- **Adaptive curriculum and long-term mastery:** revisit after basic progress is understandable and repeated-session evidence establishes a need. Do not label current rolling accuracy as mastery.
- **Chord singing/polyphonic detection, advanced drills, MIDI:** defer until the natural-note microphone path is reliable and user demand justifies a separate design and validation effort.
- **Cloud sync/accounts:** local-first remains the default; revisit only for demonstrated cross-device needs, with explicit privacy and migration decisions.
- **Notation/pitch library or tooling migration:** consider only against measured correctness, performance, or maintenance problems. Current SVG/Web Audio functionality is not an unfinished library migration.

These are options, not committed delivery work. No target dates are assigned without scope and evidence.

## Completion and maintenance checklist

For a coding slice:

1. Select one item and state the user-visible outcome or behavior-preserving boundary.
2. Add or adjust focused tests where behavior warrants them; preserve established public contracts.
3. Run `npm run check` once changes are ready. It includes unit/browser tests and repository consistency checks; repeating the same unit suite separately is unnecessary.
4. Evaluate relevant portrait layout, keyboard/focus, and offline behavior. Microphone I/O changes require physical-device evidence or an explicitly recorded validation gap.
5. For runtime changes, follow the version/cache/deployment rules in [Developer handoff](developer-handoff.md). Validate the deployed app separately if deployment is part of the slice.
6. Update this roadmap's status, review date, and evidence, plus affected reference/user docs. Move completed outcomes into the compact baseline; use Git for detailed history.

Test counts above are a dated baseline, not a fixed target. Passing automation does not close an unmet human acceptance criterion. Do not mark a priority complete merely because its implementation exists.
