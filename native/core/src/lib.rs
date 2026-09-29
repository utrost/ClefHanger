//! Small, platform-free music core. Android owns the microphone; Flutter owns the UI.
//! Keep the exported C ABI stable while porting the rest of the lesson catalog.

use std::f64::consts::LN_2;

const MIN_HZ: f64 = 80.0;
const MAX_HZ: f64 = 1000.0;
const MIN_RMS: f64 = 0.0005;
const TOLERANCE_CENTS: f64 = 50.0;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Note {
    pub name: &'static str,
    pub octave: u8,
    pub staff_step: i8,
    pub midi: i32,
}

// Same natural-note pool and staff positions as LEVEL_ONE_NOTES in the PWA.
pub const TREBLE_NOTES: [Note; 13] = [
    Note {
        name: "C",
        octave: 4,
        staff_step: -2,
        midi: 60,
    },
    Note {
        name: "D",
        octave: 4,
        staff_step: -1,
        midi: 62,
    },
    Note {
        name: "E",
        octave: 4,
        staff_step: 0,
        midi: 64,
    },
    Note {
        name: "F",
        octave: 4,
        staff_step: 1,
        midi: 65,
    },
    Note {
        name: "G",
        octave: 4,
        staff_step: 2,
        midi: 67,
    },
    Note {
        name: "A",
        octave: 4,
        staff_step: 3,
        midi: 69,
    },
    Note {
        name: "B",
        octave: 4,
        staff_step: 4,
        midi: 71,
    },
    Note {
        name: "C",
        octave: 5,
        staff_step: 5,
        midi: 72,
    },
    Note {
        name: "D",
        octave: 5,
        staff_step: 6,
        midi: 74,
    },
    Note {
        name: "E",
        octave: 5,
        staff_step: 7,
        midi: 76,
    },
    Note {
        name: "F",
        octave: 5,
        staff_step: 8,
        midi: 77,
    },
    Note {
        name: "G",
        octave: 5,
        staff_step: 9,
        midi: 79,
    },
    Note {
        name: "A",
        octave: 5,
        staff_step: 10,
        midi: 81,
    },
];

pub const LESSON_IDS: [&str; 6] = [
    "first-steps",
    "line-notes",
    "space-notes",
    "ledger-notes",
    "interval-jumps",
    "mixed",
];
const FIRST_STEPS: [usize; 3] = [0, 1, 2];
const LINE_NOTES: [usize; 5] = [2, 4, 6, 8, 10];
const SPACE_NOTES: [usize; 4] = [3, 5, 7, 9];
const LEDGER_NOTES: [usize; 2] = [0, 12];
const INTERVAL_NOTES: [usize; 5] = [0, 1, 2, 3, 4];
const MIXED_NOTES: [usize; 13] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

pub fn lesson_indices(lesson: usize) -> &'static [usize] {
    match lesson {
        0 => &FIRST_STEPS,
        1 => &LINE_NOTES,
        2 => &SPACE_NOTES,
        3 => &LEDGER_NOTES,
        4 => &INTERVAL_NOTES,
        _ => &MIXED_NOTES,
    }
}

pub fn next_seed(seed: u32) -> u32 {
    seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223)
}

pub fn prompt_for(lesson: usize, seed: u32) -> (u32, usize) {
    let next = next_seed(seed);
    let pool = lesson_indices(lesson);
    (next, pool[(next as usize) % pool.len()])
}

pub fn frequency_for_midi(midi: i32) -> f64 {
    440.0 * 2.0_f64.powf((midi - 69) as f64 / 12.0)
}

pub fn nearest_midi(hz: f64) -> Option<i32> {
    if !hz.is_finite() || !(MIN_HZ..=MAX_HZ).contains(&hz) {
        return None;
    }
    Some((69.0 + 12.0 * (hz / 440.0).ln() / LN_2).round() as i32)
}

pub fn cents_from_midi(hz: f64, midi: i32) -> Option<f64> {
    if !hz.is_finite() || hz <= 0.0 {
        return None;
    }
    Some(1200.0 * (hz / frequency_for_midi(midi)).log2())
}

#[repr(i32)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MatchStatus {
    Silent = 0,
    WrongNote = 1,
    OutOfTune = 2,
    WrongOctave = 3,
    Match = 4,
}

pub fn classify(hz: f64, target_midi: i32, any_octave: bool) -> MatchStatus {
    let Some(midi) = nearest_midi(hz) else {
        return MatchStatus::Silent;
    };
    if midi.rem_euclid(12) != target_midi.rem_euclid(12) {
        return MatchStatus::WrongNote;
    }
    if !any_octave && midi != target_midi {
        return MatchStatus::WrongOctave;
    }
    if cents_from_midi(hz, midi).is_some_and(|cents| cents.abs() <= TOLERANCE_CENTS) {
        MatchStatus::Match
    } else {
        MatchStatus::OutOfTune
    }
}

pub fn centered_rms(samples: &[i16]) -> f64 {
    if samples.is_empty() {
        return 0.0;
    }
    let mean = samples.iter().map(|&x| x as f64).sum::<f64>() / samples.len() as f64;
    let energy = samples
        .iter()
        .map(|&x| (x as f64 - mean).powi(2))
        .sum::<f64>();
    (energy / samples.len() as f64).sqrt() / i16::MAX as f64
}

/// First strong normalized autocorrelation peak, matching the PWA's detector.
/// Input is a short mono PCM16 window; return None for silence or unclear sound.
pub fn detect_pitch(samples: &[i16], sample_rate: u32) -> Option<f64> {
    if samples.len() < 256 || sample_rate == 0 || centered_rms(samples) < MIN_RMS {
        return None;
    }
    let mean = samples.iter().map(|&s| s as f64).sum::<f64>() / samples.len() as f64;
    let centered: Vec<f64> = samples.iter().map(|&s| s as f64 - mean).collect();
    let min_lag = (sample_rate as f64 / MAX_HZ).floor() as usize;
    let max_lag = ((sample_rate as f64 / MIN_HZ).floor() as usize).min(samples.len() - 1);
    if max_lag <= min_lag + 2 {
        return None;
    }
    let correlations: Vec<f64> = (min_lag..=max_lag)
        .map(|lag| {
            let (mut cross, mut energy_a, mut energy_b) = (0.0, 0.0, 0.0);
            for i in 0..centered.len() - lag {
                let a = centered[i];
                let b = centered[i + lag];
                cross += a * b;
                energy_a += a * a;
                energy_b += b * b;
            }
            let denominator = (energy_a * energy_b).sqrt();
            if denominator > 0.0 {
                cross / denominator
            } else {
                0.0
            }
        })
        .collect();
    for i in 1..correlations.len() - 1 {
        let current = correlations[i];
        if current >= 0.72 && current >= correlations[i - 1] && current > correlations[i + 1] {
            return Some(sample_rate as f64 / (min_lag + i) as f64);
        }
    }
    None
}

#[no_mangle]
pub extern "C" fn clef_core_abi_version() -> i32 {
    1
}
#[no_mangle]
pub extern "C" fn clef_lesson_count() -> i32 {
    LESSON_IDS.len() as i32
}
#[no_mangle]
pub extern "C" fn clef_lesson_len(lesson: i32) -> i32 {
    if !(0..LESSON_IDS.len() as i32).contains(&lesson) {
        return 0;
    }
    lesson_indices(lesson as usize).len() as i32
}
#[no_mangle]
pub extern "C" fn clef_lesson_note(lesson: i32, index: i32) -> i32 {
    if lesson < 0 || index < 0 || lesson >= LESSON_IDS.len() as i32 {
        return -1;
    }
    lesson_indices(lesson as usize)
        .get(index as usize)
        .map_or(-1, |&id| id as i32)
}
#[no_mangle]
pub extern "C" fn clef_next_seed(seed: u32) -> u32 {
    next_seed(seed)
}
#[no_mangle]
pub extern "C" fn clef_prompt_note(lesson: i32, seed: u32) -> i32 {
    if !(0..LESSON_IDS.len() as i32).contains(&lesson) {
        return -1;
    }
    prompt_for(lesson as usize, seed).1 as i32
}
#[no_mangle]
pub extern "C" fn clef_note_midi(note: i32) -> i32 {
    TREBLE_NOTES.get(note as usize).map_or(-1, |n| n.midi)
}
#[no_mangle]
pub extern "C" fn clef_note_step(note: i32) -> i32 {
    TREBLE_NOTES
        .get(note as usize)
        .map_or(-100, |n| n.staff_step as i32)
}
#[no_mangle]
pub extern "C" fn clef_frequency(midi: i32) -> f64 {
    frequency_for_midi(midi)
}
#[no_mangle]
pub extern "C" fn clef_nearest_midi(hz: f64) -> i32 {
    nearest_midi(hz).unwrap_or(-1)
}
#[no_mangle]
pub extern "C" fn clef_cents(hz: f64, midi: i32) -> i32 {
    cents_from_midi(hz, midi).map_or(0, |c| c.round() as i32)
}
#[no_mangle]
pub extern "C" fn clef_classify(hz: f64, midi: i32, any_octave: i32) -> i32 {
    classify(hz, midi, any_octave != 0) as i32
}
/// Null pointers and invalid lengths yield silence.
///
/// # Safety
/// A non-null `samples` pointer must reference at least `len` readable `i16` values.
/// The caller must keep the buffer alive for this call.
#[no_mangle]
pub unsafe extern "C" fn clef_detect_pcm16(samples: *const i16, len: i32, sample_rate: i32) -> f64 {
    if samples.is_null()
        || !(256..=16_384).contains(&len)
        || !(8_000..=192_000).contains(&sample_rate)
    {
        return 0.0;
    }
    detect_pitch(
        std::slice::from_raw_parts(samples, len as usize),
        sample_rate as u32,
    )
    .unwrap_or(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lessons_match_browser_catalog() {
        assert_eq!(lesson_indices(0), &[0, 1, 2]);
        assert_eq!(lesson_indices(1), &[2, 4, 6, 8, 10]);
        assert_eq!(lesson_indices(2), &[3, 5, 7, 9]);
        assert_eq!(lesson_indices(3), &[0, 12]);
        assert_eq!(lesson_indices(4), &[0, 1, 2, 3, 4]);
        assert_eq!(lesson_indices(5).len(), 13);
        assert_eq!((TREBLE_NOTES[0].midi, TREBLE_NOTES[0].staff_step), (60, -2));
        assert_eq!(
            (TREBLE_NOTES[12].midi, TREBLE_NOTES[12].staff_step),
            (81, 10)
        );
    }

    #[test]
    fn prompt_seed_is_reproducible() {
        let (seed, index) = prompt_for(0, 1);
        assert_eq!(seed, 1_015_568_748);
        assert!(FIRST_STEPS.contains(&index));
    }

    #[test]
    fn any_octave_and_tolerance_match_browser_rules() {
        assert_eq!(classify(130.8128, 60, true), MatchStatus::Match);
        assert_eq!(classify(130.8128, 60, false), MatchStatus::WrongOctave);
        assert_eq!(classify(440.0, 60, true), MatchStatus::WrongNote);
        assert_eq!(
            classify(261.6256 * 2.0_f64.powf(0.49 / 12.0), 60, true),
            MatchStatus::Match
        );
        assert_eq!(
            classify(261.6256 * 2.0_f64.powf(0.51 / 12.0), 60, true),
            MatchStatus::WrongNote
        );
        assert_eq!(classify(0.0, 60, true), MatchStatus::Silent);
    }

    #[test]
    fn detector_finds_low_voice_and_rejects_silence() {
        let sr = 16_000;
        let signal: Vec<i16> = (0..4096)
            .map(|i| {
                let t = i as f64 / sr as f64;
                ((2.0 * std::f64::consts::PI * 123.47 * t).sin() * 9_000.0) as i16
            })
            .collect();
        let hz = detect_pitch(&signal, sr).unwrap();
        assert!((hz - 123.47).abs() < 3.0, "{hz}");
        assert_eq!(nearest_midi(hz), Some(47));
        assert_eq!(detect_pitch(&[0; 4096], sr), None);
        assert_eq!(
            unsafe { clef_detect_pcm16(std::ptr::null(), 4096, sr as i32) },
            0.0
        );
    }
}
