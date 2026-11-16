import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/journey_home.dart';
import 'package:clefhanger/reading_lesson.dart';
import 'package:clefhanger/session_guidance.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'package:clefhanger/learning_page.dart';
import 'package:clefhanger/learning_session.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

class FallibleStorage extends FakeAudio {
  bool fail = false;
  @override
  Future<String?> readProgress(String key) async {
    if (fail) throw StateError('Unavailable');
    return super.readProgress(key);
  }
}

void main() {
  test('reading guidance follows explicit first-answer evidence only', () {
    expect(SessionGuidance.reading(null).soundSkill, isNull);
    expect(
      SessionGuidance.reading(const ReadingResult(2, [])).soundSkill,
      isNull,
    );
    expect(
      SessionGuidance.reading(const ReadingResult(3, ['C'])).soundSkill,
      isNull,
    );
    expect(
      SessionGuidance.reading(const ReadingResult(3, [])).soundSkill,
      SoundSkill.imitate,
    );
  });
  test(
    'sound guidance isolates input and skill and discloses all assistance',
    () {
      const result = SoundEvidence(
        skill: SoundSkill.imitate,
        input: SoundInput.voice,
        withReference: 6,
        withoutReference: 0,
        skipped: 0,
        setupPreviewRequested: true,
        demonstrationRequested: true,
      );
      final next = SessionGuidance.sound(
        SoundSkill.imitate,
        SoundInput.voice,
        result,
      );
      expect(next.soundSkill, SoundSkill.perform);
      expect(next.reason, contains('pitch preview'));
      expect(next.reason, contains('demonstration'));
      expect(next.reason, contains('6 matches with an in-session reference'));
      expect(
        SessionGuidance.sound(
          SoundSkill.imitate,
          SoundInput.instrument,
          result,
        ).reason,
        startsWith('No completed'),
      );
      expect(
        SessionGuidance.sound(
          SoundSkill.perform,
          SoundInput.voice,
          result,
        ).reason,
        startsWith('No completed'),
      );
      const skipped = SoundEvidence(
        skill: SoundSkill.perform,
        input: SoundInput.voice,
        withReference: 1,
        withoutReference: 3,
        skipped: 2,
      );
      final repeat = SessionGuidance.sound(
        SoundSkill.perform,
        SoundInput.voice,
        skipped,
      );
      expect(repeat.title, 'Repeat with voice');
      expect(repeat.reason, contains('2/6 notes were skipped'));
      expect(repeat.reason, contains('do not tell us which pitches'));
      const complete = SoundEvidence(
        skill: SoundSkill.perform,
        input: SoundInput.instrument,
        withReference: 0,
        withoutReference: 6,
        skipped: 0,
      );
      expect(
        SessionGuidance.sound(
          SoundSkill.perform,
          SoundInput.instrument,
          complete,
        ).reason,
        contains('does not establish retained learning'),
      );
    },
  );

  testWidgets(
    'home refreshes reading guidance, opens sound, and clears stale evidence on read failure',
    (tester) async {
      final audio = FallibleStorage();
      SoundSkill? opened;
      await tester.pumpWidget(
        MaterialApp(
          home: JourneyHome(
            storage: audio,
            openReading: () async {
              audio.saved[ReadingLesson.storageKey] = const ReadingResult(
                3,
                [],
              ).encode();
            },
            openSound: (skill) async {
              opened = skill;
              audio.fail = true;
            },
            openPractice: () async {},
            openRush: () async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start reading lesson'));
      await tester.pumpAndSettle();
      expect(find.text('Try listening and matching'), findsOneWidget);
      await tester.tap(find.text('Try listening and matching'));
      await tester.pumpAndSettle();
      expect(opened, SoundSkill.imitate);
      expect(find.text('Start reading lesson'), findsOneWidget);
      expect(
        find.textContaining('Saved reading result unavailable'),
        findsOneWidget,
      );
      expect(find.textContaining('Last reading check:'), findsNothing);
    },
  );

  testWidgets(
    'large-text chooser uses instrument evidence for the next instrument lesson only',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(() {
        tester.binding.setSurfaceSize(null);
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });
      final audio = FakeAudio();
      audio.saved[SoundEvidence.key(
        SoundSkill.imitate,
        SoundInput.instrument,
      )] = const SoundEvidence(
        skill: SoundSkill.imitate,
        input: SoundInput.instrument,
        withReference: 6,
        withoutReference: 0,
        skipped: 0,
      ).encode();
      audio.saved[SoundEvidence.key(SoundSkill.imitate, SoundInput.voice)] =
          'broken';
      await tester.pumpWidget(
        MaterialApp(
          home: SoundSetupPage(
            core: SingingCore(),
            audio: audio,
            skill: SoundSkill.imitate,
          ),
        ),
      );
      await tester.pumpAndSettle();
      final next = find.widgetWithText(
        TextButton,
        'Learn relationships after instrument imitation',
      );
      await tester.scrollUntilVisible(next, 150);
      await tester.ensureVisible(next);
      await tester.pumpAndSettle();
      expect(
        find.text('Learn relationships after voice imitation'),
        findsNothing,
      );
      await tester.tap(next);
      await tester.pumpAndSettle();
      expect(find.byType(LearningHub), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Repeat or move · listening'),
        100,
      );
      expect(find.text('Repeat or move · listening'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'home recommends relationships after imitation and refreshes after a new check',
    (tester) async {
      final audio = FakeAudio();
      audio.saved[ReadingLesson.storageKey] = const ReadingResult(
        3,
        [],
      ).encode();
      audio.saved[SoundEvidence.key(
        SoundSkill.imitate,
        SoundInput.voice,
      )] = const SoundEvidence(
        skill: SoundSkill.imitate,
        input: SoundInput.voice,
        withReference: 6,
        withoutReference: 0,
        skipped: 0,
      ).encode();
      var opened = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: JourneyHome(
            storage: audio,
            openReading: () async {},
            openSound: (_) async {},
            openPractice: () async {},
            openRush: () async {},
            openLearning: () async {
              opened++;
              final session = LearningSession(
                task: LearningTask.direction,
                input: 'listening',
              );
              while (!session.finished) {
                session.skip();
                session.next(DateTime.utc(2026, 11, 16));
              }
              await LearningHistory(audio).save(session);
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.textContaining('matched six references with voice'),
        findsOneWidget,
      );
      await tester.tap(find.text('Choose a relationship lesson'));
      await tester.pumpAndSettle();
      expect(opened, 1);
      expect(
        find.textContaining('Last repeat or move check (listening)'),
        findsOneWidget,
      );
      expect(find.text('Practise reading again'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
