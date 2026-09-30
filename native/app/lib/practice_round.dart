/// A short round records resolved prompts, not every correction attempt.
class PracticeRound {
  static const warmupLength = 3;
  static const checkLength = 3;
  static const length = warmupLength + checkLength;
  int resolved = 0;
  int matched = 0;
  int skipped = 0;
  int independentChecks = 0;
  int helpedChecks = 0;
  final Set<String> reviewNotes = {};

  bool get finished => resolved >= length;
  bool get checking => resolved >= warmupLength;
  String get status => finished
      ? 'Round complete'
      : checking
      ? 'Try on your own · ${resolved - warmupLength + 1}/$checkLength'
      : 'Listen and match · ${resolved + 1}/$warmupLength';

  void record(
    String note, {
    required bool correct,
    required bool helped,
    required bool mistake,
  }) {
    if (finished) return;
    if (correct) {
      matched++;
    } else {
      skipped++;
    }
    if (checking) {
      if (correct && !helped && !mistake) independentChecks++;
      if (helped) helpedChecks++;
      if (!correct || helped || mistake) reviewNotes.add(note);
    }
    resolved++;
  }

  String get recommendation => independentChecks == checkLength
      ? 'Try another round without listening first. A fresh set checks whether the staff positions feel familiar.'
      : reviewNotes.isEmpty
      ? 'Repeat this lesson. Listen first, then try the last three notes without help.'
      : 'Review ${reviewNotes.join(', ')}. Listen and match, then try those staff positions again without help.';
}
