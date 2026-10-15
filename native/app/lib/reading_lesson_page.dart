import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'native_core.dart';
import 'reading_lesson.dart';
import 'staff.dart';

class ReadingLessonPage extends StatefulWidget {
  const ReadingLessonPage({
    super.key,
    this.returnLabel = 'Back to Practice',
    required this.core,
    required this.storage,
  });
  final String returnLabel;
  final PracticeCore core;
  final AudioBridge storage;
  @override
  State<ReadingLessonPage> createState() => _ReadingLessonPageState();
}

class _ReadingLessonPageState extends State<ReadingLessonPage> {
  ReadingLesson lesson = ReadingLesson();
  bool started = false;
  bool loading = true;
  bool saving = false;
  String? error;
  ReadingResult? previous;
  final scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await widget.storage.readProgress(ReadingLesson.storageKey);
      if (mounted) setState(() => previous = ReadingResult.decode(raw));
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Previous result could not be loaded. You can still practise.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await widget.storage.writeProgress(
        ReadingLesson.storageKey,
        lesson.result.encode(),
      );
      if (mounted) setState(() => previous = lesson.result);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Your result has not been saved. Try again before leaving.',
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  void _next() {
    setState(lesson.next);
    if (scroll.hasClients) scroll.jumpTo(0);
    if (lesson.finished) _save();
  }

  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Read music')),
    body: SafeArea(
      child: ListView(
        controller: scroll,
        padding: const EdgeInsets.all(16),
        children: [
          if (!started) ...[
            Text(
              'Recognise C, D and E',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            const Text(
              'Learn three staff positions, then name them without labels. No microphone or singing needed.',
            ),
            const SizedBox(height: 16),
            const Text(
              '1. Learn the positions\n2. Try three notes on your own\n3. See what to review',
            ),
            const SizedBox(height: 16),
            if (previous != null)
              Text(
                'Last reading check: ${previous!.independent}/3 first answers without help. This is recognition practice, not a mastery score.',
              ),
            if (error != null) Text(error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: loading
                  ? null
                  : () => setState(() {
                      started = true;
                      error = null;
                    }),
              child: Text(loading ? 'Loading…' : 'Learn three notes'),
            ),
          ] else if (lesson.finished) ...[
            Semantics(
              liveRegion: true,
              child: Text(
                'Reading check complete',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '${lesson.independent}/3 first answers without help',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            const Text(
              'This checks note-name recognition only. It does not measure singing or lasting mastery.',
            ),
            const SizedBox(height: 12),
            Text(
              lesson.review.isEmpty
                  ? 'Try these positions again tomorrow to see what you remember.'
                  : 'Review ${lesson.review.join(', ')}. Notice whether each note sits on a line or in a space.',
            ),
            const SizedBox(height: 16),
            if (saving)
              const Text('Saving result…')
            else if (error != null) ...[
              Text(error!),
              TextButton(onPressed: _save, child: const Text('Retry saving')),
            ] else
              const Text('Reading result saved on this device.'),
            FilledButton(
              onPressed: saving
                  ? null
                  : () => setState(() {
                      lesson = ReadingLesson();
                      error = null;
                      scroll.jumpTo(0);
                    }),
              child: const Text('Repeat reading lesson'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(widget.returnLabel),
            ),
          ] else ...[
            Text(
              lesson.teaching
                  ? 'Learn · ${lesson.step + 1}/3'
                  : 'Recognise · ${lesson.step - 2}/3',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            PracticeStaff(
              note: widget.core.lessonNote(0, lesson.noteIndex),
              revealAnswer:
                  lesson.teaching || lesson.revealed || lesson.answered,
              height: 185,
            ),
            const SizedBox(height: 16),
            if (lesson.teaching) ...[
              Text(
                ReadingLesson.explanations[lesson.noteIndex],
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _next,
                child: Text(
                  lesson.step == 2 ? 'Try without labels' : 'Next position',
                ),
              ),
            ] else ...[
              const Text('What is this note called?'),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (final name in ReadingLesson.names)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: FilledButton.tonal(
                          onPressed: lesson.answered
                              ? null
                              : () => setState(() => lesson.answer(name)),
                          child: Text(name),
                        ),
                      ),
                    ),
                ],
              ),
              if (lesson.feedback.isNotEmpty)
                Semantics(
                  liveRegion: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(lesson.feedback),
                  ),
                ),
              if (lesson.answered)
                FilledButton(
                  onPressed: _next,
                  child: Text(
                    lesson.step == 5
                        ? 'See reading result'
                        : 'Next reading note',
                  ),
                )
              else
                TextButton(
                  onPressed: () => setState(lesson.reveal),
                  child: const Text('Show the position hint'),
                ),
            ],
          ],
        ],
      ),
    ),
  );
}
