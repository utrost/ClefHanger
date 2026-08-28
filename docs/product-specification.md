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

### Bite-Sized Sprints

60-second game rounds engineered for quick practice sessions on the go.

## 4. Mobile Input Modes — No Hardware Required

### Oversized Note Buttons

Seven large touch targets — C, D, E, F, G, A, B — placed at the bottom of the screen for lightning-fast thumb input.

### Touch Piano Strip

A 1-octave mini keyboard docked at the screen's bottom for users wanting to connect visual staff notes to piano key locations.

### Mobile Vocal Tracking

Microphone mode using low-latency pitch detection so vocalists can sing the correct pitch directly into their phone.

## 5. Tech Stack & Architecture

- **Frontend:** HTML5, Tailwind CSS, JavaScript
  - Mobile-responsive design and touch controls.
- **Notation rendering:** VexFlow using SVG or Canvas
  - Dynamic, lightweight mobile sheet music display.
- **Audio engine:** Web Audio API plus Pitchy library
  - Web-native microphone frequency tracking for voice input.
- **State and storage:** LocalStorage / PWA
  - Offline mobile play and local progression.

## 6. MVP Roadmap & Progression

### Level 1 — Treble Clef Basics

Single notes on standard staff lines, ideal for vocalists and guitarists.

### Level 2 — Bass Clef & Ledger Lines

Introduction of lower registers and notes beyond the staff boundary.

### Level 3 — Accidentals & Intervals

Sharps, flats, and rapid note jumps to build real-world sight-reading speed.
