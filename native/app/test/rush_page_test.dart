import 'package:clefhanger/rush_page.dart';
import 'package:clefhanger/mode_catalog.dart';
import 'package:clefhanger/staff.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;
import 'widget_test.dart' show FakeAudio;

void main() {
  testWidgets(
    'Rush keeps timing but shows static notation when motion is disabled',
    (tester) async {
      final audio = FakeAudio();
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: RushPage(
              core: FakeCore(),
              audio: audio,
              lesson: 0,
              nowMs: () => 0,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start 60-second Rush'));
      await tester.pump();
      expect(
        tester.widget<PracticeStaff>(find.byType(PracticeStaff)).travelProgress,
        isNull,
      );
      expect(find.text('Time 60s'), findsOneWidget);
    },
  );

  testWidgets('chord Rush presents chord buttons and never offers mic', (
    tester,
  ) async {
    var nowMs = 0;
    final audio = FakeAudio();
    await tester.pumpWidget(
      MaterialApp(
        home: RushPage(
          core: FakeCore(),
          audio: audio,
          lesson: 0,
          mode: NotationMode.chords,
          nowMs: () => nowMs,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Chords Rush'), findsOneWidget);
    await tester.tap(find.text('Start 60-second Rush'));
    await tester.pump();
    expect(find.text('Check mic'), findsNothing);
    expect(find.text('Dm'), findsOneWidget);
    final note = tester.widget<PracticeStaff>(find.byType(PracticeStaff)).note!;
    final answer = modeAnswers(
      NotationMode.chords,
    ).firstWhere((option) => option.answer == note.name);
    await tester.tap(find.text(answer.label));
    await tester.pump();
    nowMs = 60000;
    await tester.pump(const Duration(milliseconds: 100));
    expect(audio.saved['rush.highScore.chords.speed5.beginner'], isNotNull);
  });

  testWidgets(
    'Rush restores settings and saves a score for its speed and difficulty',
    (tester) async {
      var nowMs = 0;
      final audio = FakeAudio()
        ..saved['rush.settings'] = '{"speed":8,"difficulty":"hard"}';
      await tester.pumpWidget(
        MaterialApp(
          home: RushPage(
            core: FakeCore(),
            audio: audio,
            lesson: 0,
            nowMs: () => nowMs,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Speed 8'), findsOneWidget);
      expect(find.text('Hard'), findsOneWidget);
      await tester.tap(find.text('Start 60-second Rush'));
      await tester.pump();
      await tester.ensureVisible(find.text('Use note buttons'));
      await tester.pump();
      await tester.tap(find.text('Use note buttons'));
      await tester.pump();
      final note = tester
          .widget<PracticeStaff>(find.byType(PracticeStaff))
          .note!;
      await tester.tap(find.text(note.name));
      await tester.pump();
      nowMs = 60000;
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Time! Sprint complete'), findsOneWidget);
      expect(audio.saved['rush.highScore.treble.speed8.hard'], isNotNull);
      expect(
        int.parse(audio.saved['rush.highScore.treble.speed8.hard']!),
        greaterThan(0),
      );
    },
  );
}
