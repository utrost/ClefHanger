import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'native_core.dart';

class PracticeStaff extends StatelessWidget {
  const PracticeStaff({
    super.key,
    required this.note,
    this.revealAnswer = false,
    this.detectedMidi,
    this.height = 238,
  });
  final NativeNote? note;
  final bool revealAnswer;
  final int? detectedMidi;
  final double height;
  @override
  Widget build(BuildContext context) => Semantics(
    label: note == null
        ? 'Empty treble staff. Start practice to see a note.'
        : revealAnswer
        ? 'Treble staff note ${note!.displayName}, ${_position(note!.staffStep)}.'
        : 'Treble staff note at ${_position(note!.staffStep)}. Sing or name it.',
    child: Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF6ECC8),
        borderRadius: BorderRadius.circular(24),
      ),
      child: CustomPaint(
        painter: _StaffPainter(note: note, detectedMidi: detectedMidi),
        child: const SizedBox.expand(),
      ),
    ),
  );
}

String _position(int step) {
  if (step == -2) return 'the ledger line below the staff';
  if (step == 10) return 'the first ledger line above the staff';
  if (step < 0) return 'below the staff';
  if (step > 8) return 'above the staff';
  return '${step.isEven ? 'line' : 'space'} ${(step ~/ 2) + 1} from the bottom';
}

class _StaffPainter extends CustomPainter {
  _StaffPainter({required this.note, required this.detectedMidi});
  final NativeNote? note;
  final int? detectedMidi;

  @override
  void paint(Canvas canvas, Size size) {
    final ink = Paint()
      ..color = const Color(0xFF241A28)
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    const left = 48.0;
    final right = size.width - 24;
    final bottom = size.height * 0.69;
    const gap = 22.0;
    for (var line = 0; line < 5; line++) {
      final y = bottom - line * gap;
      canvas.drawLine(Offset(left, y), Offset(right, y), ink);
    }
    final clef = TextPainter(
      text: const TextSpan(
        text: '𝄞',
        style: TextStyle(
          fontFamily: 'Noto Music',
          fontSize: 91,
          color: Color(0xFF241A28),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    clef.paint(canvas, Offset(11, bottom - 116));
    if (note == null) {
      final message = TextPainter(
        text: const TextSpan(
          text: 'Tap Start when ready.',
          style: TextStyle(
            color: Color(0xFF241A28),
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      message.paint(
        canvas,
        Offset((size.width - message.width) / 2, bottom + 30),
      );
      return;
    }
    final y = bottom - note!.staffStep * gap / 2;
    final x = math.max(125.0, size.width * 0.58);
    if (note!.staffStep <= -2) {
      for (var step = -2; step >= note!.staffStep; step -= 2) {
        canvas.drawLine(
          Offset(x - 25, bottom - step * gap / 2),
          Offset(x + 25, bottom - step * gap / 2),
          ink,
        );
      }
    } else if (note!.staffStep >= 10) {
      for (var step = 10; step <= note!.staffStep; step += 2) {
        canvas.drawLine(
          Offset(x - 25, bottom - step * gap / 2),
          Offset(x + 25, bottom - step * gap / 2),
          ink,
        );
      }
    }
    canvas.save();
    canvas.translate(x, y);
    canvas.rotate(-0.3);
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: 30, height: 21),
      Paint()..color = const Color(0xFF241A28),
    );
    canvas.restore();
    canvas.drawLine(Offset(x + 14, y), Offset(x + 14, y - 66), ink);
    if (detectedMidi != null) {
      final midiLabel = const [
        'C',
        'C♯',
        'D',
        'D♯',
        'E',
        'F',
        'F♯',
        'G',
        'G♯',
        'A',
        'A♯',
        'B',
      ][detectedMidi! % 12];
      final readout = TextPainter(
        text: TextSpan(
          text: 'Mic: $midiLabel${detectedMidi! ~/ 12 - 1}',
          style: const TextStyle(
            color: Color(0xFF266F60),
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      readout.paint(canvas, Offset(right - readout.width, bottom + 34));
    }
  }

  @override
  bool shouldRepaint(covariant _StaffPainter old) =>
      old.note != note || old.detectedMidi != detectedMidi;
}
