import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'native_core.dart';

class PracticeStaff extends StatelessWidget {
  const PracticeStaff({
    super.key,
    required this.note,
    this.revealAnswer = false,
    this.detectedMidi,
    this.travelProgress,
    this.previewNotes = const [],
    this.height = 238,
  });
  final NativeNote? note;
  final bool revealAnswer;
  final int? detectedMidi;
  final double? travelProgress;
  final List<NativeNote> previewNotes;
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
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFF6ECC8),
        borderRadius: BorderRadius.circular(24),
      ),
      child: CustomPaint(
        painter: _StaffPainter(
          note: note,
          revealAnswer: revealAnswer,
          detectedMidi: detectedMidi,
          travelProgress: travelProgress,
          previewNotes: previewNotes,
        ),
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
  _StaffPainter({
    required this.note,
    required this.revealAnswer,
    required this.detectedMidi,
    required this.travelProgress,
    required this.previewNotes,
  });
  final NativeNote? note;
  final bool revealAnswer;
  final int? detectedMidi;
  final double? travelProgress;
  final List<NativeNote> previewNotes;

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
    final compact = size.height < 190;
    final clef = TextPainter(
      text: TextSpan(
        text: '𝄞',
        style: TextStyle(
          fontFamily: 'Noto Music',
          fontSize: compact ? 78 : 91,
          color: const Color(0xFF241A28),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    clef.paint(canvas, Offset(11, bottom - (compact ? 105 : 116)));
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
    if (travelProgress != null) {
      canvas.drawLine(
        Offset(116, bottom - 4 * gap - 12),
        Offset(116, bottom + gap + 12),
        Paint()
          ..color = const Color(0xFFB65C40)
          ..strokeWidth = 2,
      );
      for (var index = 0; index < previewNotes.length; index++) {
        _drawNote(
          canvas,
          previewNotes[index].staffStep,
          size.width - 48 - index * 36,
          bottom,
          gap,
          const Color(0x88241A28),
        );
      }
    }
    final x = travelProgress == null
        ? math.max(125.0, size.width * 0.58)
        : 125 +
              math.max(0.0, size.width * 0.66 - 125) *
                  (1 - travelProgress!.clamp(0.0, 1.0));
    _drawNote(canvas, note!.staffStep, x, bottom, gap, const Color(0xFF241A28));
    if (revealAnswer) {
      final label = TextPainter(
        text: TextSpan(
          text: note!.displayName,
          style: const TextStyle(
            color: Color(0xFF241A28),
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      label.paint(canvas, Offset(x - label.width / 2, bottom + 31));
    }
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

  void _drawNote(
    Canvas canvas,
    int staffStep,
    double x,
    double bottom,
    double gap,
    Color color,
  ) {
    final ink = Paint()
      ..color = color
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    final y = bottom - staffStep * gap / 2;
    if (staffStep <= -2) {
      for (var step = -2; step >= staffStep; step -= 2) {
        canvas.drawLine(
          Offset(x - 25, bottom - step * gap / 2),
          Offset(x + 25, bottom - step * gap / 2),
          ink,
        );
      }
    } else if (staffStep >= 10) {
      for (var step = 10; step <= staffStep; step += 2) {
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
      Paint()..color = color,
    );
    canvas.restore();
    canvas.drawLine(Offset(x + 14, y), Offset(x + 14, y - 66), ink);
  }

  @override
  bool shouldRepaint(covariant _StaffPainter old) =>
      old.note != note ||
      old.revealAnswer != revealAnswer ||
      old.detectedMidi != detectedMidi ||
      old.travelProgress != travelProgress ||
      old.previewNotes != previewNotes;
}
