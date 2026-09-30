import 'package:flutter/material.dart';
import 'native_core.dart';

class PitchGuidance {
  const PitchGuidance(this.cents, this.matched);
  final int cents;
  final bool matched;
  String get message => matched
      ? 'In the green zone. Hold steady for one second…'
      : cents < 0
      ? 'Sing a little higher toward the black note.'
      : 'Sing a little lower toward the black note.';

  static PitchGuidance? from(
    PracticeCore core,
    double hz,
    NativeNote? target, {
    required bool anyOctave,
  }) {
    if (target == null || target.isChord || !hz.isFinite || hz <= 0) {
      return null;
    }
    final heard = core.nearestMidi(hz);
    if (heard < 0) return null;
    final comparison = anyOctave
        ? target.midi + ((heard - target.midi) / 12).round() * 12
        : target.midi;
    return PitchGuidance(
      core.cents(hz, comparison),
      core.classify(hz, target.midi, anyOctave: anyOctave) == 4,
    );
  }
}

class PitchMeter extends StatelessWidget {
  const PitchMeter({super.key, required this.guidance});
  final PitchGuidance guidance;
  @override
  Widget build(BuildContext context) => Semantics(
    label: guidance.matched
        ? 'Pitch is inside the matching zone'
        : guidance.cents < 0
        ? 'Pitch is below the matching zone'
        : 'Pitch is above the matching zone',
    child: SizedBox(
      height: 18,
      child: Row(
        children: [
          const Text('Low', style: TextStyle(fontSize: 10)),
          const SizedBox(width: 8),
          Expanded(
            child: CustomPaint(
              painter: _MeterPainter(guidance.cents),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(width: 8),
          const Text('High', style: TextStyle(fontSize: 10)),
        ],
      ),
    ),
  );
}

class _MeterPainter extends CustomPainter {
  _MeterPainter(this.cents);
  final int cents;
  @override
  void paint(Canvas canvas, Size size) {
    final center = size.height / 2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, center - 3, size.width, 6),
        const Radius.circular(3),
      ),
      Paint()..color = const Color(0xFF74687E),
    );
    // +/- 50 cents is the match zone; the full bar spans +/- 300 cents.
    canvas.drawRect(
      Rect.fromLTWH(size.width * 5 / 12, center - 5, size.width / 6, 10),
      Paint()..color = const Color(0xFF60BFA2),
    );
    final x = (size.width * (0.5 + cents.clamp(-300, 300) / 600))
        .clamp(4.0, size.width - 4)
        .toDouble();
    canvas.drawCircle(Offset(x, center), 4, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _MeterPainter old) => old.cents != cents;
}
