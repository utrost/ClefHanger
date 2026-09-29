import 'package:flutter/material.dart';

import 'mode_catalog.dart';

/// A one-octave touch fallback. Black keys use the mode's written spelling.
class PianoInput extends StatelessWidget {
  const PianoInput({super.key, required this.mode, required this.onAnswer});
  final NotationMode mode;
  final ValueChanged<String> onAnswer;

  @override
  Widget build(BuildContext context) {
    final black = mode == NotationMode.flats
        ? const ['D♭', 'E♭', 'G♭', 'A♭', 'B♭']
        : const ['C♯', 'D♯', 'F♯', 'G♯', 'A♯'];
    final blackActive =
        mode == NotationMode.sharps || mode == NotationMode.flats;
    return Semantics(
      label: 'One-octave piano answers',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final whiteWidth = constraints.maxWidth / 7;
          return SizedBox(
            height: 126,
            child: Stack(
              children: [
                Row(
                  children: [
                    for (final name in const [
                      'C',
                      'D',
                      'E',
                      'F',
                      'G',
                      'A',
                      'B',
                    ])
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2),
                          child: Semantics(
                            button: true,
                            label: 'Piano key $name',
                            child: Material(
                              color: const Color(0xFFF6ECC8),
                              borderRadius: BorderRadius.circular(7),
                              child: InkWell(
                                onTap: () => onAnswer(name),
                                borderRadius: BorderRadius.circular(7),
                                child: Align(
                                  alignment: Alignment.bottomCenter,
                                  child: Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Text(
                                      name,
                                      style: const TextStyle(
                                        color: Color(0xFF241A28),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                for (var i = 0; i < 5; i++)
                  Positioned(
                    left:
                        whiteWidth * const [1, 2, 4, 5, 6][i] -
                        whiteWidth * 0.31,
                    top: 0,
                    width: whiteWidth * 0.62,
                    height: 77,
                    child: Semantics(
                      button: true,
                      enabled: blackActive,
                      label: blackActive
                          ? 'Piano black key ${black[i]}'
                          : 'Black key ${black[i]} unavailable in this mode',
                      child: Material(
                        color: blackActive
                            ? const Color(0xFF241A28)
                            : const Color(0xFF8A7E8E),
                        borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(6),
                        ),
                        child: InkWell(
                          onTap: blackActive ? () => onAnswer(black[i]) : null,
                          child: Align(
                            alignment: Alignment.bottomCenter,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                black[i],
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: whiteWidth < 48 ? 10 : 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
