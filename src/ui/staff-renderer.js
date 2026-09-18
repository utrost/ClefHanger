import {
  STAFF_LAYOUT,
  getClefPresentation,
  getLedgerLinesForStaffStep,
  getMode,
} from '../core/game.js?v=clefhanger-slice69-tester-readiness-2026-09-16';
import { createGhostNoteFromPitch } from '../core/music-theory.js?v=clefhanger-slice69-tester-readiness-2026-09-16';

export function yForStaffStep(step) {
  return STAFF_LAYOUT.bottomLineY - step * STAFF_LAYOUT.halfStep;
}

function accidentalGlyph(note) {
  if (note.accidental === 'sharp') return '♯';
  if (note.accidental === 'flat') return '♭';
  return '';
}

function escapeSvgText(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function ordinal(value) {
  const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'];
  if (words[value]) return words[value];
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function staffPositionDescription(staffStep = 0) {
  if (staffStep === -1) return 'space immediately below staff';
  if (staffStep === 9) return 'space immediately above staff';
  if (staffStep < -1) {
    const ledgerNumber = Math.floor(Math.abs(staffStep) / 2);
    return staffStep % 2 === 0
      ? `${ordinal(ledgerNumber)} ledger line below staff`
      : `space below ${ordinal(ledgerNumber)} ledger line below staff`;
  }
  if (staffStep > 9) {
    const ledgerNumber = Math.floor((staffStep - 8) / 2);
    return staffStep % 2 === 0
      ? `${ordinal(ledgerNumber)} ledger line above staff`
      : `space above ${ordinal(ledgerNumber)} ledger line above staff`;
  }
  if (staffStep % 2 === 0) {
    const line = (staffStep / 2) + 1;
    if (line === 1) return 'bottom line of staff';
    if (line === 3) return 'middle line of staff';
    if (line === 5) return 'top line of staff';
    return `${ordinal(line)} line from bottom`;
  }
  const space = ((staffStep - 1) / 2) + 1;
  if (space === 1) return 'bottom space of staff';
  if (space === 4) return 'top space of staff';
  return `${ordinal(space)} space from bottom`;
}

function accidentalDescription(note) {
  return note.accidental ? `${note.accidental} accidental` : 'natural';
}

function notationDescription(note) {
  const clef = getClefPresentation(note.clef || 'treble').clef;
  if (note.kind === 'chord') {
    const positions = (note.staffSteps || []).map(staffPositionDescription).join(', ');
    return `chord with ${(note.staffSteps || []).length} notes: ${clef} clef; ${positions}; ${accidentalDescription(note)}`;
  }
  return `${clef} clef, ${staffPositionDescription(note.staffStep)}, ${accidentalDescription(note)}`;
}

export function buildNotationPromptDescription(state) {
  const note = state.activeNote || state.noteQueue?.[0];
  if (!note) return '';
  const previews = (state.noteQueue || []).slice(1)
    .map((preview, index) => ` Preview ${index + 1}: ${notationDescription(preview)}.`)
    .join('');
  if (note.kind === 'chord') {
    return `Lead ${notationDescription(note)}.${previews}`;
  }
  return `Lead single note: ${notationDescription(note)}.${previews}`;
}

export function buildStageAccessibleLabel({ clef = 'treble', modeLabel = 'Treble', playStyle = 'practice' } = {}) {
  const styleLabel = playStyle === 'rush' ? 'Rush' : 'Practice';
  return `${clef[0].toUpperCase()}${clef.slice(1)} clef · ${modeLabel} mode · ${styleLabel} playfield`;
}

export function syncLiveRegionText(element, value) {
  if (element.textContent === value) return false;
  element.textContent = value;
  return true;
}

function rushMovementState(note, nowMs) {
  const duration = note.deadlineMs - note.spawnedAtMs;
  const progress = duration > 0 ? Math.min(1, Math.max(0, (nowMs - note.spawnedAtMs) / duration)) : 1;
  if (progress >= 0.8) return { key: 'urgent', description: 'Urgent: near the cliff.', label: 'urgent', progress };
  if (progress >= 0.5) return { key: 'halfway', description: 'Halfway to the cliff.', label: 'halfway', progress };
  return { key: 'moving', description: 'Moving toward the cliff.', label: 'moving', progress };
}

function xForRushProgress(progress, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    if (progress >= 0.8) return 256;
    if (progress >= 0.5) return 174;
    return 92;
  }
  return 72 + progress * 202;
}

function renderReducedMotionRushCue(movement) {
  if (!movement) return '';
  const width = movement.key === 'urgent' ? 188 : movement.key === 'halfway' ? 118 : 48;
  return `
    <g class="rush-reduced-cue" data-urgency="${movement.key}">
      <rect x="72" y="160" width="188" height="8" rx="4" class="rush-progress-track" />
      <rect x="72" y="160" width="${width}" height="8" rx="4" class="rush-progress" />
      <text x="166" y="154" class="rush-urgency-label">Rush urgency: ${movement.label}</text>
    </g>`;
}

export function syncNotationAccessibility({ promptElement, stageElement, state, modeLabel, playStyle, nowMs = 0 }) {
  const note = state.activeNote || state.noteQueue?.[0];
  const clef = getClefPresentation(note?.clef || getMode(state.modeId).clef || 'treble').clef;
  const stageLabel = buildStageAccessibleLabel({ clef, modeLabel, playStyle });
  if (stageElement.getAttribute?.('aria-label') !== stageLabel) stageElement.setAttribute('aria-label', stageLabel);
  const movement = note && playStyle === 'rush' ? rushMovementState(note, nowMs) : null;
  const promptKey = note?.id ? `${note.id}:${note.spawnedAtMs}:${movement?.key || 'static'}` : '';
  if (!promptKey) {
    delete promptElement.dataset.promptKey;
    if (promptElement.textContent) promptElement.textContent = '';
    return;
  }
  if (promptElement.dataset.promptKey === promptKey) return;
  promptElement.dataset.promptKey = promptKey;
  syncLiveRegionText(promptElement, `${buildNotationPromptDescription(state)}${movement ? ` ${movement.description}` : ''}`);
}

function renderLedgerLines(note, x) {
  return getLedgerLinesForStaffStep(note.staffStep ?? 0)
    .map((line) => `<line x1="${(x - STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y1="${line.y}" x2="${(x + STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y2="${line.y}" class="ledger" data-ledger-step="${line.staffStep}" />`)
    .join('');
}

function renderSingleNote(note, x, y, correction = null) {
  const accidental = accidentalGlyph(note);
  const correctionMarkup = correction ? `
      <g class="correction-label">
        <rect x="${(x - 17).toFixed(1)}" y="${(y - 68).toFixed(1)}" width="34" height="30" rx="10" />
        <text x="${x.toFixed(1)}" y="${(y - 52).toFixed(1)}">${escapeSvgText(correction.label)}</text>
      </g>` : '';
  return `
    <g class="active-note">
      ${accidental ? `<text x="${(x - 31).toFixed(1)}" y="${(y + 9).toFixed(1)}" class="accidental">${accidental}</text>` : ''}
      <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="9" transform="rotate(-18 ${x.toFixed(1)} ${y.toFixed(1)})" />
      <line x1="${(x + 12).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 12).toFixed(1)}" y2="${(y - 48).toFixed(1)}" />
      ${renderLedgerLines(note, x)}
      ${correctionMarkup}
    </g>
  `;
}

function renderChord(note, x) {
  return note.staffSteps
    .map((step, index) => {
      const y = yForStaffStep(step);
      const offset = index % 2 === 0 ? -5 : 9;
      return `<ellipse cx="${(x + offset).toFixed(1)}" cy="${y.toFixed(1)}" rx="12" ry="8" transform="rotate(-18 ${(x + offset).toFixed(1)} ${y.toFixed(1)})" />`;
    })
    .join('') + `<line x1="${(x + 21).toFixed(1)}" y1="36" x2="${(x + 21).toFixed(1)}" y2="136" />`;
}

function renderGhostNote({ clef, x = 98, selectedInputMode = 'buttons', microphoneState = {} }) {
  if (selectedInputMode !== 'microphone' || !microphoneState.note) return '';
  const ghost = createGhostNoteFromPitch(microphoneState.note, clef);
  if (!ghost) return '';
  const y = yForStaffStep(ghost.staffStep);
  return `
    <g class="ghost-note">
      ${renderSingleNote(ghost, x, y)}
      <text x="${x.toFixed(1)}" y="166" class="ghost-label">you played ${escapeSvgText(ghost.displayName)}</text>
    </g>
  `;
}

export function renderStaffSvg({ state, selectedInputMode = 'buttons', microphoneState = {}, nowMs = 0, reducedMotion = false }) {
  const note = state.activeNote;
  const mode = getMode(state.modeId);
  const clef = getClefPresentation(note?.clef || mode.clef || 'treble');
  const reducedRush = reducedMotion && state.phase === 'running';
  const reducedRushMovement = reducedRush && note ? rushMovementState(note, nowMs) : null;
  const lines = [52, 72, 92, 112, 132]
    .map((y) => `<line x1="18" y1="${y}" x2="318" y2="${y}" class="staff-line" />`)
    .join('');

  const cliff = `
    <line x1="294" y1="38" x2="294" y2="154" class="cliff-line" />
    <path d="M294 154 l18 16 l-36 0 z" class="cliff-rock" />
    <text x="${clef.x}" y="${clef.y}" class="clef clef-${clef.clef}">${clef.glyph}</text>
  `;

  const queue = state.noteQueue?.length ? state.noteQueue : (note ? [note] : []);
  const active = [
    ...queue.slice(1).map((queuedNote, index) => ({ queuedNote, index: index + 1 })),
    ...queue.slice(0, 1).map((queuedNote) => ({ queuedNote, index: 0 })),
  ]
    .map(({ queuedNote, index }) => {
      const isLeadNote = index === 0;
      const storedCorrection = isLeadNote && state.correction?.answer === queuedNote.answer && (!state.correction.frozenUntilMs || nowMs <= state.correction.frozenUntilMs) ? state.correction : null;
      const correction = storedCorrection;
      const progressNowMs = correction?.shouldFreezeNote && correction.frozenAtMs ? Math.min(nowMs, correction.frozenAtMs) : nowMs;
      const progress = Math.min(1, Math.max(0, (progressNowMs - queuedNote.spawnedAtMs) / (queuedNote.deadlineMs - queuedNote.spawnedAtMs)));
      const x = xForRushProgress(progress, { reducedMotion: reducedRush });
      const noteMarkup = queuedNote.kind === 'chord'
        ? renderChord(queuedNote, x)
        : renderSingleNote(queuedNote, x, yForStaffStep(queuedNote.staffStep ?? 0), correction);
      const previewClass = isLeadNote ? 'lead-note' : 'preview-note';
      return `<g class="queue-note ${previewClass}" data-queue-index="${index}" data-correction-active="${correction ? 'true' : 'false'}">${noteMarkup}</g>`;
    })
    .join('');

  const ghostX = note
    ? Math.max(98, xForRushProgress(Math.min(1, Math.max(0, (nowMs - note.spawnedAtMs) / (note.deadlineMs - note.spawnedAtMs))), { reducedMotion: reducedRush }))
    : 98;

  return `
    <svg viewBox="0 0 330 180" aria-hidden="true" focusable="false"${reducedRush ? ' data-motion="reduced"' : ''}${reducedRushMovement ? ` data-urgency="${reducedRushMovement.key}"` : ''}>
      ${lines}
      ${cliff}
      ${renderReducedMotionRushCue(reducedRushMovement)}
      ${renderGhostNote({ clef: clef.clef, x: ghostX, selectedInputMode, microphoneState })}
      ${active}
    </svg>
  `;
}
