import 'package:clefhanger/mode_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;

void main() {
  test(
    'mode pools mirror the PWA catalog and every prompt has a touch answer',
    () {
      expect(modeNotes(NotationMode.bass).length, 11);
      expect(modeNotes(NotationMode.sharps).length, 7);
      expect(modeNotes(NotationMode.flats).length, 7);
      expect(modeNotes(NotationMode.chords).length, 6);
      for (final mode in NotationMode.values.skip(1)) {
        final answers = modeAnswers(
          mode,
        ).map((option) => option.answer).toSet();
        for (final note in modeNotes(mode)) {
          expect(
            answers,
            contains(note.name),
            reason: '$mode ${note.name} needs a button',
          );
        }
      }
      expect(modeNotes(NotationMode.bass).first.staffStep, -2);
      expect(modeNotes(NotationMode.bass).first.midi, 40);
      expect(modeNotes(NotationMode.bass).last.midi, 57);
    },
  );

  test('flats keep written positions while matching enharmonic pitch', () {
    final sharp = modeNotes(NotationMode.sharps).first;
    final flat = modeNotes(NotationMode.flats).first;
    expect(sharp.name, 'C♯');
    expect(flat.name, 'D♭');
    expect(sharp.midi, flat.midi);
    expect(sharp.staffStep, -2);
    expect(flat.staffStep, -1);
    expect(FakeCore().classify(277.18, flat.midi), 4);
  });

  test('chords have three visible staff positions and sounded notes', () {
    final chords = modeNotes(NotationMode.chords);
    expect(chords.map((note) => note.name), [
      'C major',
      'D minor',
      'E minor',
      'F major',
      'G major',
      'A minor',
    ]);
    expect(chords.first.chordStaffSteps, [-2, 0, 2]);
    expect(chords.first.chordMidis, [60, 64, 67]);
    expect(
      chords.every((note) => note.isChord && note.chordMidis.length == 3),
      isTrue,
    );
    expect(NotationMode.chords.supportsMic, isFalse);
  });
}
