# First-unit lesson and evidence contracts

2026-11-16. Implements the design decisions for [#18](https://github.com/utrost/ClefHanger/issues/18), under [epic #17](https://github.com/utrost/ClefHanger/issues/17). The roadmap owns sequencing; the learning concept owns teaching intent.

## Existing lessons

Recognition v1 teaches C4/D4/E4, then checks all three in shuffled order. Its first name choice is independent only without a prior wrong choice or hint. Imitation v1 presents six C/D/E targets with successful target playback required before matching. Existing Read and perform v1 remains target-matching practice, not relationship evidence. Existing records and keys remain unchanged; no historical attempts or dates are manufactured from aggregates.

## New lessons (version 1)

All use treble C4/D4/E4 notation. Voice playback transposes anchor and target by the chosen whole octave; matching remains pitch-class based. Instrument playback stays in the written octave. These lessons do not assess exact register, rhythm, speed or mastery.

| Task | Worked examples and supported stage | Check pool and response | Completion copy |
| --- | --- | --- | --- |
| direction | C→C repeat, C→D up, D→C down; labelled examples can be replayed | All seven pairs C→C, D→D, E→E, C→D, D→C, D→E, E→D, shuffled. Listening choice only, with no staff/label identifying the answer. Hear the pair successfully before answering. | First direction choices correct, eventual corrections, help and skips |
| neighbour | C→D, D→C; hear the anchor and see the target, target reveal optional | Four directed adjacent pairs C→D, D→C, D→E, E→D, shuffled. One held pitch per prompt. | Found target from anchor, or matched after target request |
| pattern | C–D–E and E–D–C, one note at a time | C–D–C, E–D–E, D–C–D, D–E–D, shuffled. A starting reference plus two sequential produced targets per pattern. | Completed pitch steps and target assistance; never rhythm/fluency |

A session starts with a short explanation and supported examples; learners can instead begin a return check without replaying teaching. All attempts remain manually advanceable. A check never introduces an untaught note or pitch distance. Skips resolve one prompt/step; skipping a pattern step does not falsely establish an anchor for the next step (a fresh reference is available and required).

## Assistance and commitment

- `supportedPractice` records use of the two guided prompts before the check; it does not claim that audio played.
- `teachingRequested` records pre-check example requests, including failed/interrupted ones. A voice setup preview is recorded separately.
- `anchorRequested` is permitted support, not a target reveal. A produced-pitch prompt requires a successfully played anchor. Direction discrimination requires the full pair instead.
- `targetRequested` is set before attempting target output. Failure/interruption still makes a later match assisted. It never resets on retry.
- `hintRequested` reveals the direction in a listening check; that attempt cannot count as an independent first answer.
- A direction's first committed response is its first chosen repeat/up/down answer. A wrong first answer followed by a correct choice records both first response and completion, not multiple wrong attempts.
- A sound prompt has no explicit wrong commitment: noisy/off-target detector frames are adjustments. Its sole committed response is a successful held target; otherwise it can be skipped. No reliable pitch means no musical error record.
- Stop/background cancels output and capture, resets hold, and requires an explicit new microphone start. Late callbacks cannot unlock a replacement prompt. Completed attempts cannot be scored twice. Partial sessions are not saved; leaving offers no invented result.

Examples: matching D after hearing only C has `anchorRequested=true,targetRequested=false`. Requesting D and then interrupting its output sets `targetRequested=true` even if C alone is replayed later. A direction choice “up” for D→C followed by “down” is completed with first response “up”. A skip has no fabricated first response. A preview before the check is retained even if every attempt uses only anchors.

## Local history v1

Key: `learning.v2.sessions`. One envelope `{schema:1,sessions:[...]}` stores at most 60 completed sessions, oldest insertion first; evict oldest insertions, never sort on an untrusted device clock. Session IDs are random 128-bit values allocated once at session start and reused for failed-save retries. Upsert by ID makes retries idempotent. A serialized repository write queue prevents local concurrent read-modify-write loss.

Each new session stores ID, task/version, input (`listening`, `voice`, `instrument`), clef/pool (fixed treble CDE in v1), chosen voice octave where applicable, manual pacing, supported-practice, teaching and setup-preview context, review-check flag, UTC completion time if usable, and ordered attempts. Each attempt stores anchor/target MIDI, first direction response or a held-match outcome as appropriate, completion/skip, and support requests. No raw audio, waveform, detector frames, personal identifiers or screen-reader speech is stored. Manual pacing describes interaction conditions, not a disability diagnosis.

Validate exact pools, counts, input compatibility, types, duplicate IDs, outcomes and bounded strings before accepting a record. Unknown fields can be ignored within schema 1; unknown versions or malformed envelopes must not be overwritten silently. Show an error and retain practice access. A bad session record makes the envelope unavailable rather than quietly deleting evidence. A failed write leaves results visible with Retry; a retry retains the same ID and completion timestamp. Old `learning.v1.*` and mixed progress keys remain untouched, readable by their existing owners. No automatic migration into attempt history.

## Return checks and dates

Only compare completed sessions with the same task version, input, voice octave, and support context. Keep first-response and target-help counts visible, never average unlike skills. Unknown/future completion times and clock rollback produce no “due” assertion. Use elapsed UTC time (24-hour days), not local calendar labels; changing time zone does not change the interval. An initial invitation is after 24 hours, then 3 days, then 7 days after successive compatible completed review checks with all first outcomes correct, no target hints/reveals, and no teaching, supported practice or setup preview before the check. This is a provisional schedule, not a proven learning model. Same-day retries do not advance the interval. No notifications, streaks or locks.

A return check is offered before teaching, but teaching and help remain available. A later completed comparable check is evidence of that performance only, not proof of retention caused by the app. Sparse history gives a generic repeat invitation. Specific direction review requires a recorded wrong first direction choice; a skip alone never identifies a difficult pitch. Device/learner validation (#19/#26) stays open until observed.
