# Learning epic: device and learner evaluation

Prepared 2026-11-16 for [epic #17](https://github.com/utrost/ClefHanger/issues/17). **No new physical-phone or participant results have been collected.** Emulator and synthetic tests belong in native/docs/validation.md. This protocol is not evidence of learning efficacy.

## Physical-device gate — issue #19

Use the same signed prerelease on at least two phone models where available. Record build, Android version, input, comfortable reference register, speaker/earphones and room condition. Include low and high comfortable voice cases. Do not record raw audio or personal identifiers.

| Scenario | Expected observation | Device/build and actual observation | Status |
| --- | --- | --- | --- |
| C/E references in lower/middle/higher voice levels | Audible, comfortable option; written and sounding octaves understood | Not run | Pending |
| Direction pair, example replay and Stop | Both pitches heard; stopping cancels the remaining tone | Not run | Pending |
| Anchor-only neighbour | Starting pitch does not self-score; user can find target and hold it | Not run | Pending |
| Target help then retry | Match described as helped, even after a cancelled target request | Not run | Pending |
| Noise, silence, quiet input | No usable pitch is a setup/detection state, not a musical wrong answer | Not run | Pending |
| Deny microphone, retry via Settings | No dead end; same prompt preserved and capture starts explicitly | Not run | Pending |
| Background/Back during output or hold | Output/capture stops; resume does not silently record or complete a hold | Not run | Pending |
| TalkBack + 150% text + earphones | Readable focus order, no hidden answer names in checks, explicit next/re-enable controls reachable | Not run | Pending |
| TalkBack on speaker | Observe speech/capture interference; document limits rather than assuming isolation | Not run | Pending |
| Offline signed update with prior progress | Old totals survive; new checks save/reload; no network needed | Not run | Pending |

File a reproducible linked issue for each blocker. Record exact input and output conditions; emulator A3 or synthetic waveforms do not establish real-singer accuracy. Re-run the failed scenario after its fix. Close #19 only with observations and explicit remaining support limits.

## Beginner and later-check gate — issue #26

Use [the current beginner protocol](beginner-study.md) for recognition/imitation. Add the following tasks for the new relationships prototype. Five initial sessions are a usability investigation, not a representative efficacy trial. Plan follow-up coverage for voice, instrument, quiet listening, screen-reader users and comfortable registers; report actual subgroup counts.

1. Before teaching, invite one direction choice and one neighbour task with an anchor, using the same reference/input conditions as the later checks. Record help and inability to proceed; avoid coaching before the observation.
2. Ask the learner to choose Repeat or move and explain its objective. Observe example → supported prompts → check, without explaining the answer controls.
3. Ask them to try Find the neighbour. Ask “What does Hear starting note do? What would Hear target change?” Record their answer before explaining. Let them use either without penalty.
4. Observe C↔D and D↔E in mixed order. Record incorrect direction choices separately from no-signal/capture/permission failures. A skipped pitch does not identify a difficult note.
5. Invite an untimed pattern. Observe whether the user understands that each starting reference is permitted and that completion says nothing about rhythm or fluency.
6. Ask the learner to explain the result, its help context, the ghost octave, and the recommended next action. If they call one result “mastery,” investigate the copy.
7. Offer an optional later visit. Before replaying teaching, offer a comparable return check with a new ordering and the same task/version, input, register and support conditions. Let them choose teaching instead and record that choice. A changed condition is not a like-for-like retention comparison.

| Participant alias | Build / input / register / modality | Task understood? | Help / task outcome | Device obstacle | Result and next-step interpretation | Later check date and comparable conditions | Product decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Not run | | | | | | |
| P2 | Not run | | | | | | |
| P3 | Not run | | | | | | |
| P4 | Not run | | | | | | |
| P5 | Not run | | | | | | |

Obtain consent for observation; do not contact or recruit participants automatically. No telemetry, audio recording or identifying data is required. Fix recurring task misunderstandings or audio/accessibility blockers before adding notes. A small uncontrolled before/after comparison cannot establish causality. Close #26 only after reporting actual observations, limitations and linked follow-up decisions.
