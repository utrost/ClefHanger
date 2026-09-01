import {
  STAFF_LAYOUT,
  getClefPresentation,
  getLedgerLinesForStaffStep,
  getMode,
} from '../core/game.js?v=clefhanger-slice47-version-consistency-2026-09-01';
import { createGhostNoteFromPitch } from '../core/music-theory.js?v=clefhanger-slice47-version-consistency-2026-09-01';

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

function renderLedgerLines(note, x) {
  return getLedgerLinesForStaffStep(note.staffStep ?? 0)
    .map((line) => `<line x1="${(x - STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y1="${line.y}" x2="${(x + STAFF_LAYOUT.ledgerXOffset).toFixed(1)}" y2="${line.y}" class="ledger" data-ledger-step="${line.staffStep}" />`)
    .join('');
}

function renderSingleNote(note, x, y, correction = null) {
  const accidental = accidentalGlyph(note);
  const correctionMarkup = correction ? `
      <g class="correction-label" role="img" aria-label="${escapeSvgText(correction.ariaLabel)}">
        <rect x="${(x - 17).toFixed(1)}" y="${(y - 68).toFixed(1)}" width="34" height="30" rx="10" />
        <text x="${x.toFixed(1)}" y="${(y - 52).toFixed(1)}">${escapeSvgText(correction.label)}</text>
      </g>` : '';
  return `
    <g class="active-note" aria-label="Current note">
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
    <g class="ghost-note" aria-label="Ghost note you played: ${escapeSvgText(ghost.displayName)}">
      ${renderSingleNote(ghost, x, y)}
      <text x="${x.toFixed(1)}" y="166" class="ghost-label">you played ${escapeSvgText(ghost.displayName)}</text>
    </g>
  `;
}

export function renderStaffSvg({ state, selectedInputMode = 'buttons', microphoneState = {}, nowMs = 0 }) {
  const note = state.activeNote;
  const mode = getMode(state.modeId);
  const clef = getClefPresentation(note?.clef || mode.clef || 'treble');
  const lines = [52, 72, 92, 112, 132]
    .map((y) => `<line x1="18" y1="${y}" x2="318" y2="${y}" class="staff-line" />`)
    .join('');

  const cliff = `
    <line x1="294" y1="38" x2="294" y2="154" class="cliff-line" />
    <path d="M294 154 l18 16 l-36 0 z" class="cliff-rock" />
    <text x="${clef.x}" y="${clef.y}" class="clef clef-${clef.clef}" aria-label="${clef.clef} clef">${clef.glyph}</text>
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
      const x = 72 + progress * 202;
      const noteMarkup = queuedNote.kind === 'chord'
        ? renderChord(queuedNote, x)
        : renderSingleNote(queuedNote, x, yForStaffStep(queuedNote.staffStep ?? 0), correction);
      const previewClass = isLeadNote ? 'lead-note' : 'preview-note';
      return `<g class="queue-note ${previewClass}" data-queue-index="${index}" data-correction-active="${correction ? 'true' : 'false'}">${noteMarkup}</g>`;
    })
    .join('');

  const ghostX = note
    ? Math.max(98, 72 + Math.min(1, Math.max(0, (nowMs - note.spawnedAtMs) / (note.deadlineMs - note.spawnedAtMs))) * 202)
    : 98;

  return `
    <svg viewBox="0 0 330 180" role="img" aria-label="${clef.clef} staff with cliff edge">
      ${lines}
      ${cliff}
      ${renderGhostNote({ clef: clef.clef, x: ghostX, selectedInputMode, microphoneState })}
      ${active}
    </svg>
  `;
}
