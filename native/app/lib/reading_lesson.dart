import 'dart:convert';
import 'dart:math';

/// Recognition results are deliberately separate from legacy mixed-input totals.
class ReadingResult {
  const ReadingResult(this.independent, this.review);
  final int independent;
  final List<String> review;
  String encode() => jsonEncode({
    'schema': 1,
    'skill': 'read',
    'lesson': 'cde',
    'independent': independent,
    'total': 3,
    'review': review,
  });
  static ReadingResult? decode(String? raw) {
    try {
      final data = jsonDecode(raw ?? 'null');
      if (data is! Map ||
          data['schema'] != 1 ||
          data['skill'] != 'read' ||
          data['lesson'] != 'cde' ||
          data['total'] != 3) {
        return null;
      }
      final score = data['independent'];
      final review = data['review'];
      if (score is! int ||
          score < 0 ||
          score > 3 ||
          review is! List ||
          review.any((n) => !const ['C', 'D', 'E'].contains(n))) {
        return null;
      }
      return ReadingResult(score, review.cast<String>().toSet().toList());
    } catch (_) {
      return null;
    }
  }
}

class ReadingLesson {
  ReadingLesson({Random? random}) {
    checkOrder.shuffle(random);
  }
  static const storageKey = 'learning.v1.read.cde.latest';
  static const names = ['C', 'D', 'E'];
  static const explanations = [
    'C sits on a short extra line below the staff.',
    'D sits in the space just below the bottom staff line.',
    'E sits on the bottom staff line.',
  ];
  final checkOrder = [0, 1, 2];
  int step = 0;
  int independent = 0;
  bool revealed = false;
  bool answered = false;
  bool _mistake = false;
  final Set<String> review = {};
  String feedback = '';
  bool get teaching => step < 3;
  bool get finished => step >= 6;
  int get noteIndex => teaching ? step : checkOrder[min(step - 3, 2)];
  String get name => names[noteIndex];
  ReadingResult get result => ReadingResult(independent, review.toList());

  void reveal() {
    if (teaching || finished || answered) return;
    revealed = true;
    review.add(name);
    feedback = explanations[noteIndex];
  }

  void answer(String choice) {
    if (teaching || finished || answered || !names.contains(choice)) return;
    if (choice != name) {
      _mistake = true;
      review.add(name);
      feedback = 'Not quite. Look at the line or space and try again.';
      return;
    }
    answered = true;
    if (!_mistake && !revealed) independent++;
    feedback = '$name — correct. ${explanations[noteIndex]}';
  }

  void next() {
    if (finished || (!teaching && !answered)) return;
    step++;
    revealed = false;
    answered = false;
    _mistake = false;
    feedback = '';
  }
}
