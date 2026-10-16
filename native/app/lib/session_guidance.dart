import 'reading_lesson.dart';
import 'sound_evidence.dart';

/// Suggestions from one recorded session, never a mastery or retention model.
class SessionGuidance {
  const SessionGuidance(
    this.title,
    this.reason,
    this.action, {
    this.soundSkill,
  });
  final String title, reason, action;
  final SoundSkill? soundSkill;

  static SessionGuidance reading(ReadingResult? result) {
    if (result == null) {
      return const SessionGuidance(
        'Start with reading',
        'Learn to recognise C, D and E on the staff. No microphone needed.',
        'Start reading lesson',
      );
    }
    if (result.independent == 3 && result.review.isEmpty) {
      return const SessionGuidance(
        'Connect the notes with sound',
        'Your last reading check had 3/3 first answers without help. Try matching a reference next; this is a new skill, not proof of lasting learning.',
        'Try listening and matching',
        soundSkill: SoundSkill.imitate,
      );
    }
    return SessionGuidance(
      'Your next reading session',
      result.review.isNotEmpty
          ? 'Revisit ${result.review.join(', ')} and check the three positions again.'
          : 'Your last check had ${result.independent}/3 first answers without help. Revisit the three positions before another check.',
      'Practise reading again',
    );
  }

  static SessionGuidance sound(
    SoundSkill skill,
    SoundInput input,
    SoundEvidence? result, {
    bool includeContext = true,
  }) {
    // Callers cannot borrow evidence from another skill or input.
    if (result == null || result.skill != skill || result.input != input) {
      return SessionGuidance(
        'Try a short ${input.label.toLowerCase()} session',
        'No completed ${skill.label.toLowerCase()} result is available for this input. Start with the C → D → E demonstration.',
        'Start ${skill.label.toLowerCase()}',
        soundSkill: skill,
      );
    }
    final context = !includeContext
        ? ''
        : [
            '${result.withReference} matches with an in-session reference request; ${result.withoutReference} without one.',
            if (result.setupPreviewRequested)
              'A pitch preview was requested before the session.',
            if (result.demonstrationRequested)
              'A C → D → E demonstration was requested before the session.',
          ].join(' ');
    if (result.skipped > 0) {
      return SessionGuidance(
        'Repeat with ${input.label.toLowerCase()}',
        '${result.skipped}/6 notes were skipped in this ${input.label.toLowerCase()} session. Skips do not tell us which pitches were difficult. Use Hear note and aim for one steady match at a time. $context',
        'Repeat ${skill.label.toLowerCase()}',
        soundSkill: skill,
      );
    }
    if (skill == SoundSkill.imitate) {
      return SessionGuidance(
        'Try reading and performing with ${input.label.toLowerCase()}',
        'You matched all six references with this input. Try finding the written notes next, using Hear note whenever needed. $context This does not establish retained learning.',
        'Try read and perform',
        soundSkill: SoundSkill.perform,
      );
    }
    return SessionGuidance(
      'Revisit C, D and E with ${input.label.toLowerCase()}',
      'You matched all six written targets with this input. Repeat on another occasion and use a reference whenever needed. $context One session does not establish retained learning.',
      'Repeat read and perform',
      soundSkill: SoundSkill.perform,
    );
  }
}
