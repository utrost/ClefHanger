#ifndef CLEFHANGER_CORE_H
#define CLEFHANGER_CORE_H
#include <stdint.h>
int32_t clef_core_abi_version(void);
int32_t clef_lesson_count(void);
int32_t clef_lesson_len(int32_t lesson);
int32_t clef_lesson_note(int32_t lesson, int32_t index);
uint32_t clef_next_seed(uint32_t seed);
int32_t clef_prompt_note(int32_t lesson, uint32_t seed);
int32_t clef_note_midi(int32_t note);
int32_t clef_note_step(int32_t note);
double clef_frequency(int32_t midi);
int32_t clef_nearest_midi(double hz);
int32_t clef_cents(double hz, int32_t midi);
int32_t clef_classify(double hz, int32_t midi, int32_t any_octave);
double clef_detect_pcm16(const int16_t *samples, int32_t len, int32_t sample_rate);
#endif
