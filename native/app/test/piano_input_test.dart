import 'package:clefhanger/mode_catalog.dart';
import 'package:clefhanger/piano_input.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('piano spells black keys for the selected mode', (tester) async {
    final answers = <String>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PianoInput(mode: NotationMode.flats, onAnswer: answers.add),
        ),
      ),
    );
    await tester.tap(find.text('D♭'));
    await tester.pump();
    expect(answers, ['D♭']);
    await tester.tap(find.text('C'));
    await tester.pump();
    expect(answers, ['D♭', 'C']);
  });

  testWidgets('natural modes leave black keys inactive', (tester) async {
    final answers = <String>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PianoInput(mode: NotationMode.bass, onAnswer: answers.add),
        ),
      ),
    );
    await tester.tap(find.text('C♯'));
    await tester.pump();
    expect(answers, isEmpty);
  });
}
