import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function parseHexColor(value) {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected a 6-digit hex color, got ${value}`);
  const hex = match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
}

function relativeLuminance(color) {
  const channel = color.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channel[0] * 0.2126 + channel[1] * 0.7152 + channel[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function rootVariable(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `missing ${name}`);
  return match[1];
}

function feedbackColor(css, kind) {
  const rule = css.match(new RegExp(`#feedback\\[data-kind="${kind}"\\][^{]*\\{[^}]*color:\\s*var\\((--feedback-[^)]+)\\)`));
  assert.ok(rule, `missing feedback color rule for ${kind}`);
  return rootVariable(css, rule[1]);
}

test('feedback colors keep WCAG AA text contrast on the light notation stage', () => {
  const html = read('index.html');
  const stageBackgrounds = ['#fff7d2', '#ffeca4'].map(parseHexColor);
  const feedbackStates = ['idle', 'correct', 'wrong', 'missed', 'ended'];
  const colorForState = (state) => (state === 'idle' ? '#221500' : feedbackColor(html, state));

  for (const state of feedbackStates) {
    for (const background of stageBackgrounds) {
      const ratio = contrastRatio(parseHexColor(colorForState(state)), background);
      assert.ok(ratio >= 4.5, `${state} feedback contrast ${ratio.toFixed(2)} is below 4.5:1`);
    }
  }
});

test('feedback states include non-color visual indicators', () => {
  const html = read('index.html');
  assert.match(html, /#feedback\[data-kind="correct"\][^{]*\{[^}]*border-left-style:\s*solid/s);
  assert.match(html, /#feedback\[data-kind="wrong"\][^{]*,[\s\S]*#feedback\[data-kind="missed"\][^{]*\{[^}]*border-left-style:\s*double/s);
  assert.match(html, /#feedback\[data-kind="ended"\][^{]*\{[^}]*border-left-style:\s*dashed/s);
});

test('correction overlay and microphone ghost indicators meet non-text contrast on the stage', () => {
  const html = read('index.html');
  const stageBackgrounds = ['#fff7d2', '#ffeca4'].map(parseHexColor);
  for (const color of ['#0a6f3c', '#17112b']) {
    for (const background of stageBackgrounds) {
      const ratio = contrastRatio(parseHexColor(color), background);
      assert.ok(ratio >= 3, `${color} non-text contrast ${ratio.toFixed(2)} is below 3:1`);
    }
  }
  assert.match(html, /\.ghost-note \.active-note \{[^}]*stroke:\s*var\(--feedback-good\)/s);
  assert.match(html, /\.correction-label rect \{[^}]*stroke:\s*var\(--feedback-good\)/s);
  assert.match(html, /@media \(forced-colors: active\)[\s\S]*#feedback\[data-kind\][\s\S]*color:\s*CanvasText/s);
});
