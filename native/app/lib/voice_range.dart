import 'dart:convert';

/// A user-selected reference register, not an inferred vocal-range diagnosis.
enum VoiceRange { lower, middle, higher }

extension VoiceRangeDetails on VoiceRange {
  int get semitones => (index - 1) * 12;
  String get notes =>
      '${['C3', 'C4', 'C5'][index]}–${['E3', 'E4', 'E5'][index]}';
  String get label => '${['Lower', 'Middle', 'Higher'][index]} · $notes';
  String encode() => jsonEncode({'schema': 1, 'range': name});
}

const voiceRangeKey = 'learning.v1.voice.referenceRange';
VoiceRange? voiceRangeFromName(Object? value) {
  for (final range in VoiceRange.values) {
    if (range.name == value) return range;
  }
  return null;
}

VoiceRange decodeVoiceRange(String? raw) {
  try {
    final value = jsonDecode(raw ?? 'null');
    if (value is Map && value['schema'] == 1) {
      return voiceRangeFromName(value['range']) ?? VoiceRange.middle;
    }
  } catch (_) {
    /* Corrupt preferences do not prevent a fresh choice. */
  }
  return VoiceRange.middle;
}

class VoiceSetupSelection {
  const VoiceSetupSelection(this.range, {this.previewRequested = false});
  final VoiceRange range;
  final bool previewRequested;
}
