import assert from 'node:assert/strict';
import test from 'node:test';
import { createSummaryFocusManager } from '../src/ui/summary-focus.js';

function element({ document, nativelyFocusable = false } = {}) {
  const attributes = new Map();
  return {
    hidden: false,
    inert: false,
    focusCount: 0,
    focus() {
      this.focusCount += 1;
      if (document && (nativelyFocusable || attributes.has('tabindex'))) document.activeElement = this;
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
}

function setup() {
  const document = { activeElement: null };
  const backgroundElement = element({ document });
  const summaryElement = element({ document });
  const headingElement = element({ document });
  const replayButton = element({ document, nativelyFocusable: true });
  const playfieldElement = element({ document });
  playfieldElement.setAttribute('tabindex', '-1');
  const manager = createSummaryFocusManager({
    backgroundElement,
    summaryElement,
    headingElement,
    replayButton,
    playfieldElement,
  });
  return { manager, document, backgroundElement, summaryElement, headingElement, replayButton, playfieldElement };
}

test('ending a rush exposes the result and focuses Replay exactly once across repeated renders', () => {
  const { manager, document, summaryElement, headingElement, replayButton } = setup();

  manager.sync(true);
  manager.sync(true);

  assert.equal(summaryElement.hidden, false);
  assert.equal(document.activeElement, replayButton);
  assert.equal(replayButton.focusCount, 1);
  assert.equal(headingElement.focusCount, 0, 'the live announcement is not duplicated by heading focus');
});

test('an active summary removes background controls from keyboard and accessibility navigation', () => {
  const { manager, backgroundElement } = setup();

  manager.sync(true);

  assert.equal(backgroundElement.inert, true);
  assert.equal(backgroundElement.getAttribute('aria-hidden'), 'true');
});

test('replay closes the summary, restores the background, and focuses the focusable live playfield', () => {
  const { manager, document, backgroundElement, summaryElement, playfieldElement } = setup();
  manager.sync(true);

  manager.closeForReplay();

  assert.equal(summaryElement.hidden, true);
  assert.equal(backgroundElement.inert, false);
  assert.equal(backgroundElement.getAttribute('aria-hidden'), null);
  assert.equal(playfieldElement.focusCount, 1);
  assert.equal(document.activeElement, playfieldElement);
});

test('replay focus cannot pass when the playfield lacks a programmatic focus target', () => {
  const { manager, document, playfieldElement } = setup();
  playfieldElement.removeAttribute('tabindex');
  manager.sync(true);

  manager.closeForReplay();

  assert.notEqual(document.activeElement, playfieldElement);
});

test('Escape deliberately keeps the terminal result open and keeps focus on Replay', () => {
  const { manager, document, summaryElement, replayButton } = setup();
  manager.sync(true);
  let prevented = false;

  const handled = manager.handleKeydown({ key: 'Escape', preventDefault() { prevented = true; } });

  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(summaryElement.hidden, false);
  assert.equal(document.activeElement, replayButton);
  assert.equal(replayButton.focusCount, 2);
});

test('Tab and Shift+Tab remain contained on the summary Replay control', () => {
  for (const shiftKey of [false, true]) {
    const { manager, document, replayButton } = setup();
    manager.sync(true);
    let prevented = false;

    const handled = manager.handleKeydown({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } });

    assert.equal(handled, true);
    assert.equal(prevented, true);
    assert.equal(document.activeElement, replayButton);
  }
});

test('mouse, touch, keyboard, and assistive-tech activation share the same replay transition', () => {
  for (const activation of ['mouse', 'touch', 'keyboard', 'screen-reader']) {
    const { manager, summaryElement, playfieldElement } = setup();
    manager.sync(true);

    manager.closeForReplay();

    assert.equal(summaryElement.hidden, true, `${activation} closes the summary`);
    assert.equal(playfieldElement.focusCount, 1, `${activation} reaches the playfield`);
  }
});
