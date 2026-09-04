# ClefHanger Product Specification

## 1. Executive Summary

ClefHanger is a mobile-first, bite-sized sight-reading game designed for singers, acoustic instrumentalists, and beginners who want to master sheet music on the go without sitting at a keyboard.

## 2. Target Audience & Core Needs

**Target users:** Vocalists, guitarists, choir members, and music enthusiasts with zero-to-minimal sheet music reading experience.

**Problem solved:** Most notation apps require connected USB/MIDI keyboards, desktop layouts, or complex piano theory background. ClefHanger offers a mobile-first, zero-hardware way to learn staff reading during daily commutes or quick breaks.

## 3. Core Mobile Gameplay & UX

### The Cliffhanger Rush

Notes scroll horizontally across the staff toward a cliff edge. Players identify each note before it falls off the staff.

### Portrait-First Layout

Designed for standard phone screen aspect ratios, enabling single-handed phone use.

### Bite-Sized Sprints and Practice

The original rush remains a 60-second game round for quick practice. New users start in untimed Practice mode first, so they can learn one small note group without a cliff timer.

## 4. Mobile Input Modes — No Hardware Required

### Oversized Note Buttons

Seven large touch targets — C, D, E, F, G, A, B — placed at the bottom of the screen for lightning-fast thumb input.

### Touch Piano Strip

A 1-octave mini keyboard docked at the screen's bottom for users wanting to connect visual staff notes to piano key locations.

### Sing/Play Microphone Tracking

Microphone input listens for a steady monophonic pitch from humming, singing, violin, guitar, or another acoustic instrument. The detected pitch appears as a translucent green ghost note on the same staff, while the moving prompt remains the target. With **Match any octave** checked by default, a low or high C counts as C, which keeps Sing/Play usable for deeper and higher voices. If that setting is unchecked, the detected pitch must match the written octave. Wrong or unstable pitches are visible but not spam-scored every animation frame.

## 5. Tech Stack & Architecture

The intended player behavior is described in [User Journey](./user-journey.md). The exact shipped implementation is documented in [Current State Reference](./current-state-reference.md). Player/tester instructions are in [Player and Tester Guide](./player-tester-guide.md); continuation notes are in [Developer Handoff](./developer-handoff.md).

- **Frontend:** dependency-free HTML, CSS, and JavaScript
  - Mobile-responsive design and touch controls.
- **Notation rendering:** inline SVG helpers
  - Lightweight staff, clef, note, chord, ledger-line, correction-label, and Sing/Play ghost-note rendering.
- **Audio engine:** Web Audio API plus dependency-free autocorrelation pitch detection
  - Web-native microphone frequency tracking for voice and simple monophonic acoustic-instrument input.
- **State and storage:** LocalStorage / PWA
  - Offline mobile play and local progression.

## 6. MVP Roadmap & Progression

### Beginner learning ramp

Practice mode starts narrow: C, D, and E only. Later lessons introduce line notes, space notes, the first ledger-line notes just outside the treble staff, and then the full natural-note set. Lesson intro cards give a tiny cue before practice starts. Wrong answers are treated as teaching moments: the app names the correct answer, labels the note on the staff, and highlights the right button.

### Level 1 — Treble Clef Basics

Single notes on standard staff lines, ideal for vocalists and guitarists.

### Level 2 — Bass Clef & Ledger Lines

Introduction of lower registers and notes beyond the staff boundary.

### Level 3 — Accidentals & Intervals

Sharps, flats, and rapid note jumps to build real-world sight-reading speed.
