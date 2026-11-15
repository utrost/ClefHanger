# ClefHanger learning concept

Design proposal, 2026-11-15. This document defines learning objectives, lesson design and evidence. Delivery priorities and implementation status remain in [the roadmap](roadmap.md); it is not a second project plan. The approach below is a product hypothesis to evaluate with learners, not a validated learning intervention.

## Promise and audience

**Learn to connect a written note with an imagined and produced sound, using a comfortable voice or a monophonic instrument.**

The initial audience is adult beginners, returning music learners and choir singers who can benefit from a few minutes of practice. No keyboard, absolute pitch, account or music-theory vocabulary is required. Quiet reading is a complete useful activity in its own right. Sound work is optional when the setting, device or learner makes it unsuitable.

The first meaningful outcome is small: recognise C, D and E on a treble staff, match their reference sounds, then use a starting note to find a neighbouring written note. The longer-term direction is reading short melodic patterns. Pitch matching alone is not sight-singing; full sight-singing also involves rhythm, musical context and continuity, which are outside the first learning unit.

## Four skills, four kinds of evidence

| Skill | Learner task | What success demonstrates | What it does not demonstrate |
| --- | --- | --- | --- |
| Recognise | See a staff position and choose its note name | Recognition in that clef and register, under the recorded hint conditions | Singing, instrument technique or pitch memory |
| Imitate | Hear a target, then reproduce its pitch | Matching a heard pitch using the chosen input | Reading notation or finding a pitch without a target sound |
| Relate | Hear an anchor; identify or reproduce a repeat, step up or step down | Using a reference and a relationship between notes | Absolute pitch or general interval fluency |
| Read and perform | See a target; use a starting reference and the taught relationships to produce it | Connecting notation and relative pitch in this small note pool | Fluent sight-singing, rhythm or durable learning from one result |

Retention is a later observation of one of these skills, not a fifth combined score. Voice and instrument evidence stay separate. Changing clef or written register also changes the learning context.

**Current implementation:** guided recognition and imitation exist. The current Read and perform exercise permits playing the target itself and counts held matches; it does not yet establish the Relate objective. A match without an in-session reference request must not be labelled relative-pitch success or independence: the learner may have heard a setup preview, a demonstration, or a recent target.

## The lesson loop

Use a short, repeatable structure. A nominal session takes 3–5 minutes, but this is a design target to test, not a timer or completion requirement.

1. **Choose one objective.** “Find D between C and E,” rather than “Improve your music skills.” Keep voice, instrument and quiet reading choices clear.
2. **Show one example.** Synchronise notation and sound; explain one useful relationship. Offer replay, accessible descriptions and a way to continue without audio.
3. **Try with support.** Use 2–3 examples with labels or references available. Explain the next action immediately. Supported practice is useful work, not a failed test.
4. **Try a short check.** Use 3–6 prompts in a different order with teaching labels hidden. Make help available and record its use. Do not add a new note or concept during the check.
5. **Choose the next step.** Show one concrete observation and one recommendation. Offer repeat, another activity and finish; do not require a perfect round to leave or explore.

Reading checks can withhold names while describing staff positions. Sound checks may still provide a starting reference: needing one is normal. Do not hide basic controls or impose a speed requirement to manufacture difficulty.

## First unit: C, D and E

| Lesson | Teaching example | Supported attempt | Short check |
| --- | --- | --- | --- |
| 1. Three positions | C on the short line below the staff; D in the space just below; E on the bottom line | Match each labelled position to its name | Name the three positions in shuffled order without name labels |
| 2. Make the same sound | Hear a comfortable C; see the black target and green detected note | Hum/play C, then D and E; hold a match for about one second | Six imitation prompts with a target reference for each |
| 3. Repeat or move | Hear C→C, C→D, D→C while the staff shows repeat/up/down | Choose repeat/up/down; then reproduce a demonstrated pair | Identify direction from new orderings of the taught pairs; record listening choices separately from produced pitches |
| 4. Find the neighbour | Hear C as the anchor; show D without playing D | Move up one staff position and produce D; demonstrate the answer if needed | Given C, find D; given D, find C or E. Keep the anchor available and record target reveals separately |
| 5. Read a tiny pattern | Start with a reference and show C–D–E, then E–D–C | Produce one note at a time, with optional target help | Try a new ordering of the same notes. No rhythm score or fluency claim |
| 6. Return and retrieve | Before replaying the teaching, invite a brief check of familiar positions and relationships | Offer the lesson again when wanted | Record first responses on a later visit, with the same reference/help conditions stated explicitly |

Lessons 3–6 are proposed. The existing C→D→E demonstration supports Lesson 2 but is not a substitute for teaching descending motion, repeated notes or finding an unplayed neighbour.

C→D and D→E are whole-tone steps in this example. Teach “next note name” and “next staff position” first; do not imply that every adjacent pair has the same pitch distance. Introduce E→F explicitly before extending the sequence upward. Letter names stay the initial naming system; fixed-do/movable-do solfège would require a separate, consistent design.

### Worked example: find D from C

- Show C4 on the short line, play C in the learner's chosen octave, and say “This is our starting note.”
- Show D4 in the neighbouring space: “Move up one step to D.” Keep the starting reference available.
- Let the learner hum or play. The green note and directional feedback support adjustment; tuning frames are not repeated wrong answers.
- If the learner requests “Hear the target,” play D and record target assistance. The task has become supported matching for this attempt; it must not produce an unassisted relationship result.
- After a valid held match, say “You found D from C” only if the target was not revealed. Otherwise say “You matched D after hearing it.”
- Stop or advance according to the learner's pacing needs. On a later prompt, use D as the anchor and ask for C, so memorising one upward gesture is insufficient.

## Feedback and audio behavior

The screen should answer: What am I aiming for? What is the app hearing? What should I do next?

- Keep the target visually dominant. Explain the ghost note once, then let the visual do the work. Support colour with position, text and a hold indicator.
- Separate “no usable signal,” permission failure, unstable detection and a usable off-target pitch. Do not say “wrong note” when the microphone cannot supply reliable evidence.
- Use short directional prompts such as “A little higher” and acknowledge a completed match. Avoid a stream of numbers or repeated spoken updates during capture.
- Keep references audible and replayable. App-generated sound and its tail must not score. Stop audio when leaving or backgrounding; resuming must not silently restart recording.
- A one-second hold is an interaction rule, not a measure of musical ability. Keep it configurable in the future if device or accessibility testing justifies a change.
- Offer a skip without penalty language. A skip is incomplete evidence, not proof that a specific note was difficult. Repeated skips should suggest setup help or a smaller task, not automatically harder material.

**Octave policy:** beginner matching accepts the same pitch class in another octave. The written staff stays fixed while the reference can move into a comfortable register; the detected-pitch readout retains the actual octave. Explain this plainly. Exact-register reading and octave-leap exercises require a later explicit mode and separate evidence. They cannot be assessed using octave-folded scoring.

**Accessibility:** preserve descriptive staff semantics without exposing a hidden answer name. In quiet reading, a correct response to a spoken position description demonstrates the accessible version of the task, not necessarily visual recognition. Screen-reader users control advancement after matches; spoken feedback must not compete with reference playback/capture. Test focus order, large text, earphones and speech/capture interaction with users. The current manual pitch-level chooser is not automatic vocal-range measurement.

## Progress that supports decisions

Use observations, not a single ability percentage. Suggested wording:

- “You named 3 of 3 positions without a hint in this check.”
- “You matched 5 of 6 reference sounds with your voice; one was skipped.”
- “You found D from C twice without hearing D first.” Only after that task and evidence exist.
- “Try the downward step again.” Only when per-task history supports that recommendation.

Keep three assistance categories distinct: teaching/preview before the check, a permitted starting reference, and revealing the target during an attempt. An anchor is part of a relative-pitch task, not a failure of independence. Reference-free performance is not the goal.

For a future bounded history, record the task/version, skill, clef/note pool, input, relevant target/anchor, first committed response, eventual completion, skip, assistance events and accessibility/pacing conditions needed to interpret the task. Store summaries locally, not raw microphone audio or every detector frame. Use timestamps for scheduling only; handle clock changes and unknown dates without inventing elapsed learning time. Preserve old aggregates as legacy evidence rather than fabricating attempts. Define retention limits and migration in the roadmap before implementation.

Suggested recommendation rules, to evaluate rather than present as validated thresholds:

| Observation | Next invitation |
| --- | --- |
| No result or unfamiliar staff positions | A short recognition lesson |
| Mixed recognition answers | One explanation of a recorded confusion, then a fresh-order check |
| Successful recognition | Try imitation; reading remains available |
| Usable sound but incomplete matching | Repeat a small sound task with references |
| Repeated unusable signal/permission trouble | Audio setup or quiet reading; do not downgrade musical progress |
| Successful imitation | Learn repeat/up/down before claiming relative-pitch performance |
| Successful reference-based relationship task | Try a small new ordering of the same note pool |
| Returning learner | Offer a brief retrieval check before reteaching; let them opt into support |

The current 3/3 reading and 6/6 imitation recommendations are invitations, not unlock gates. The proposed relationship lesson should eventually sit between imitation and performance. A first exploratory schedule might invite review on the next day, then after several days and about a week, adjusting from observed results. These intervals are product hypotheses; misses reset neither achievements nor a punitive streak. Do not claim retention until a later comparable check actually occurs.

## Curriculum beyond the first unit

Expand one dimension at a time after the first unit is understandable and device audio works reliably.

1. Repeat, ascend and descend within C/D/E; then contrast a step with a skip such as C→E.
2. Add one note and its staff relationship at a time. Explain semitone steps explicitly when introducing E→F or B→C.
3. Mix familiar positions and short patterns; introduce rhythm as its own taught and measured objective before timing melodic performance.
4. Add bass clef or accidentals as dedicated introductions, not simply harder random pools. Instrument transposition and exact register require explicit scope decisions.
5. Offer Rush as optional fluency practice with familiar material. Speed should not govern beginner progress or accessibility success.

Existing Bass, Sharps, Flats, Chords and Rush modes can remain in exploration. Their availability does not imply a complete beginner curriculum or permission to merge their scores into the guided path. Polyphonic chord singing, automatic range diagnosis and broad adaptive mastery estimates are outside this concept's first delivery scope.

## Evaluation and product decisions

Use the updated [beginner study](beginner-study.md) for the current implemented path. Evaluate the proposed anchor/target interaction with a separate small prototype before treating its results as skill evidence.

Observe whether people can explain the task, start without coaching, distinguish target from detected pitch, understand the chosen octave, use help without confusion, and choose a sensible next action. Record device failures separately from learning errors. Include quiet-reading users, low and high comfortable registers, instrument users and screen-reader users in follow-up testing; a five-person initial study cannot cover all of them.

To examine learning, compare like-for-like tasks before teaching, immediately afterward and on a later visit. Keep reference conditions, input and accessibility modality explicit. Test new orderings of familiar material so repetition of a sequence does not masquerade as transfer. An immediate improvement is not retained learning, and a small uncontrolled study cannot establish that the app caused an improvement.

Before expanding curriculum, resolve recurring task misunderstandings, inaccessible controls and audio blockers. Before adding adaptive recommendations, establish that the stored observations are interpretable. Before making learning-effectiveness claims, design an evaluation capable of supporting them.

## Boundaries for implementation

Keep the lesson objective, allowed references, support transitions and evidence rules in lesson state. Flutter presents the task and accessible controls; Android owns capture/output; Rust supplies pitch/music calculations. Do not make detector frame counts into educational scores.

Each new lesson needs an explicit objective, exact note/anchor pool, worked example, supported/check behavior, correct notation and accessible descriptions, help semantics, interruption/skip behavior, saved evidence contract and a human evaluation question. Link delivery work from the roadmap. This concept changes no runtime behavior by itself.
