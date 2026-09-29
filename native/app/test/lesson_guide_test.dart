import 'package:clefhanger/lesson_guide.dart';
import 'package:clefhanger/mode_catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;

void main() {
  testWidgets('illustrated guide pages through the selected lesson notes', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LessonGuide(
            core: FakeCore(),
            mode: NotationMode.treble,
            lesson: 0,
          ),
        ),
      ),
    );
    expect(find.text('1/3 · C4'), findsOneWidget);
    await tester.drag(find.byType(PageView), const Offset(-600, 0));
    await tester.pumpAndSettle();
    expect(find.text('2/3 · D4'), findsOneWidget);
  });
}
