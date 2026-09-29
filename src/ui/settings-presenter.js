import { getMode, getSpeed, getDifficulty } from '../core/content.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { getBeginnerLesson } from '../core/lessons.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { syncElementText } from './semantic-presenter.js?v=clefhanger-slice73-progress-export-2026-09-30';

export function buildSettingsPresentation({ modeId, speedId, difficultyId, lessonId, inputMode, playStyle, phase }) {
  const mode = getMode(modeId);
  const speed = getSpeed(speedId);
  const difficulty = getDifficulty(difficultyId);
  const lesson = getBeginnerLesson(lessonId);
  const practice = playStyle === 'practice';
  const lessonApplies = mode.id === 'basics';
  const inputLabel = inputMode === 'piano' ? 'Piano' : inputMode === 'microphone' ? 'Sing/Play' : 'Notes';
  const parts = practice
    ? [mode.label, lessonApplies ? `Practice: ${lesson.label}` : 'Practice', inputLabel]
    : [mode.label, difficulty.label, speed.label, inputLabel, lessonApplies ? lesson.label : 'Rush'];
  return {
    modeLabel: mode.label,
    modeHelp: mode.help,
    summary: parts.join(' · '),
    closeLabel: phase === 'paused' ? 'Done — keep paused' : 'Done',
    speedLabel: practice ? 'Practice only' : speed.label,
    speedValue: speed.id,
    speedValueText: practice ? 'Practice ignores speed' : speed.label,
    difficultyLabel: practice ? 'Practice only' : difficulty.label,
    difficultyHelp: practice ? 'Practice ignores speed and difficulty: it is always untimed Beginner at the easiest speed.' : difficulty.help,
    difficultyTitle: practice ? 'Practice ignores difficulty; Rush uses this selection.' : '',
    controlsDisabled: practice,
  };
}

function syncPressedState(button, pressed) {
  const value = pressed ? 'true' : 'false';
  button.dataset.active = value;
  button.setAttribute('aria-pressed', value);
}

function syncDisabled(element, disabled) {
  element.disabled = disabled;
  element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

// Element references are supplied by the composition root; this module owns no events or state.
export function createSettingsPresenter(elements) {
  return function renderSettings(selection) {
    const view = buildSettingsPresentation(selection);
    syncElementText(elements.modeLabel, view.modeLabel);
    syncElementText(elements.modeHelp, view.modeHelp);
    syncElementText(elements.closeButton, view.closeLabel);
    syncElementText(elements.speedLabel, view.speedLabel);
    elements.speedSlider.value = view.speedValue;
    syncDisabled(elements.speedSlider, view.controlsDisabled);
    elements.speedSlider.setAttribute('aria-valuetext', view.speedValueText);
    syncElementText(elements.difficultyLabel, view.difficultyLabel);
    syncElementText(elements.difficultyHelp, view.difficultyHelp);
    syncElementText(elements.settingsLine, view.summary);
    for (const button of elements.modeButtons.querySelectorAll('button')) syncPressedState(button, button.dataset.mode === selection.modeId);
    for (const button of elements.difficultyButtons.querySelectorAll('button')) {
      syncPressedState(button, button.dataset.difficulty === selection.difficultyId);
      syncDisabled(button, view.controlsDisabled);
      button.title = view.difficultyTitle;
    }
    for (const button of elements.inputModeButtons.querySelectorAll('button')) {
      syncPressedState(button, button.dataset.inputMode === selection.inputMode);
      syncDisabled(button, selection.modeId === 'chords' && ['microphone', 'piano'].includes(button.dataset.inputMode));
      button.title = button.disabled ? 'Chord mode needs Notes answers.' : '';
    }
    for (const button of elements.playStyleButtons) syncPressedState(button, button.dataset.playStyle === selection.playStyle);
    elements.lessonSelect.value = selection.lessonId;
    elements.hintToggle.checked = selection.showHints;
    elements.matchAnyOctaveToggle.checked = selection.matchAnyOctave;
  };
}
