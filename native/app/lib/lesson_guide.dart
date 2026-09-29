import 'package:flutter/material.dart';

import 'mode_catalog.dart';
import 'native_core.dart';
import 'staff.dart';

class LessonGuide extends StatelessWidget {
  const LessonGuide({
    super.key,
    required this.core,
    required this.mode,
    required this.lesson,
  });
  final PracticeCore core;
  final NotationMode mode;
  final int lesson;

  @override
  Widget build(BuildContext context) {
    final notes = mode == NotationMode.treble
        ? [
            for (var index = 0; index < core.lessonLength(lesson); index++)
              core.lessonNote(lesson, index),
          ]
        : modeNotes(mode);
    return Column(
      children: [
        Text('Swipe through ${notes.length} written examples.'),
        const SizedBox(height: 8),
        SizedBox(
          height: 245,
          child: PageView.builder(
            itemCount: notes.length,
            itemBuilder: (context, index) {
              final note = notes[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Column(
                  children: [
                    PracticeStaff(note: note, revealAnswer: true, height: 190),
                    const SizedBox(height: 7),
                    Text(
                      '${index + 1}/${notes.length} · ${note.displayName}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
