import 'package:clefhanger/rush_page.dart';
import 'package:clefhanger/staff.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;
import 'widget_test.dart' show FakeAudio;

void main() {
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
