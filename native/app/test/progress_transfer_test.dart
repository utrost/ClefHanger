import 'dart:convert';

import 'package:clefhanger/progress_transfer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'browser transfer maps only known lesson/mode records and Rush scores',
    () {
      final transfer = ProgressTransfer.parse(
        jsonEncode({
          'schema': progressTransferSchema,
          'progress': {
            'line-notes': {
              'attempts': 3,
              'correct': 99,
              'assisted': 1,
              'recent': [true, false, 'invalid'],
            },
            'mode.flats': {
              'attempts': 2,
              'correct': 1,
              'assisted': 0,
              'recent': [true],
            },
            '../unknown': {'attempts': 200},
          },
          'highScores': {
            'rush.highScore.treble.speed5.beginner': 340,
            'rush.highScore.flats.speed8.hard': 410,
            'rush.highScore.bad.speed9.hard': 900,
          },
        }),
      );
      expect(transfer.progress.keys, ['line-notes', 'mode.flats']);
      expect(transfer.progress['line-notes']!.correct, 3);
      expect(transfer.progress['line-notes']!.recent, [true, false]);
      expect(transfer.highScores.length, 2);
      expect(transfer.highScores['rush.highScore.flats.speed8.hard'], 410);
    },
  );

  test('invalid transfers are rejected and empty exports are valid', () {
    expect(() => ProgressTransfer.parse('{}'), throwsFormatException);
    final empty = ProgressTransfer.parse(
      jsonEncode({
        'schema': progressTransferSchema,
        'progress': {},
        'highScores': {},
      }),
    );
    expect(empty.progress, isEmpty);
    expect(empty.highScores, isEmpty);
  });
}
