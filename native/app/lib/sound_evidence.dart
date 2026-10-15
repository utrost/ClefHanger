import 'dart:convert';

enum SoundSkill { imitate, perform }

enum SoundInput { voice, instrument }

extension SoundSkillLabel on SoundSkill {
  String get label =>
      this == SoundSkill.imitate ? 'Listen and match' : 'Read and perform';
}

extension SoundInputLabel on SoundInput {
  String get label => this == SoundInput.voice ? 'Voice' : 'Instrument';
}

/// Latest completed six-note session, never migrated from mixed-input totals.
class SoundEvidence {
  const SoundEvidence({
    required this.skill,
    required this.input,
    required this.withReference,
    required this.withoutReference,
    required this.skipped,
  });
  final SoundSkill skill;
  final SoundInput input;
  final int withReference, withoutReference, skipped;
  int get matched => withReference + withoutReference;
  static String key(SoundSkill skill, SoundInput input) =>
      'learning.v1.sound.${skill.name}.${input.name}.cde.latest';
  String encode() => jsonEncode({
    'schema': 1,
    'skill': skill.name,
    'input': input.name,
    'lesson': 'cde',
    'total': 6,
    'withReference': withReference,
    'withoutReference': withoutReference,
    'skipped': skipped,
  });
  static SoundEvidence? decode(
    String? raw,
    SoundSkill skill,
    SoundInput input,
  ) {
    try {
      final value = jsonDecode(raw ?? 'null');
      if (value is! Map ||
          value['schema'] != 1 ||
          value['skill'] != skill.name ||
          value['input'] != input.name ||
          value['lesson'] != 'cde' ||
          value['total'] != 6) {
        return null;
      }
      final withRef = value['withReference'];
      final withoutRef = value['withoutReference'];
      final skipped = value['skipped'];
      if (withRef is! int ||
          withoutRef is! int ||
          skipped is! int ||
          withRef < 0 ||
          withoutRef < 0 ||
          skipped < 0 ||
          withRef + withoutRef + skipped != 6 ||
          (skill == SoundSkill.imitate && withoutRef != 0)) {
        return null;
      }
      return SoundEvidence(
        skill: skill,
        input: input,
        withReference: withRef,
        withoutReference: withoutRef,
        skipped: skipped,
      );
    } catch (_) {
      return null;
    }
  }
}
