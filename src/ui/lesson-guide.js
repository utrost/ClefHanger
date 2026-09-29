import { describeStaffPosition } from '../core/music-theory.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { getLedgerLinesForStaffStep, getClefPresentation } from '../core/game.js?v=clefhanger-slice73-progress-export-2026-09-30';
import { yForStaffStep } from './staff-renderer.js?v=clefhanger-slice73-progress-export-2026-09-30';

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderLessonGuide(notes = []) {
  const validNotes = notes.filter((note) => Number.isFinite(note.staffStep));
  const rows = [];
  for (let offset = 0; offset < validNotes.length; offset += 5) {
    const row = validNotes.slice(offset, offset + 5);
    const description = row.map((note) => `${note.noteName}${note.octave}: ${describeStaffPosition(note.staffStep)}`).join('; ');
    const clef = getClefPresentation(row[0].clef || 'treble');
    const staff = [0, 2, 4, 6, 8].map((step) => `<line class="staff-line" x1="12" x2="342" y1="${yForStaffStep(step)}" y2="${yForStaffStep(step)}" />`).join('');
    const heads = row.map((note, index) => {
      const x = row.length === 1 ? 190 : 80 + index * 235 / (row.length - 1);
      const y = yForStaffStep(note.staffStep);
      const ledgers = getLedgerLinesForStaffStep(note.staffStep).map((line) => `<line class="ledger" x1="${x - 14}" x2="${x + 14}" y1="${line.y}" y2="${line.y}" />`).join('');
      return `<g class="guide-note" data-staff-step="${note.staffStep}">${ledgers}<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#17112b" transform="rotate(-15 ${x} ${y})" /><line x1="${x + 8}" x2="${x + 8}" y1="${y}" y2="${y - 30}" stroke="#17112b" stroke-width="2" /><text x="${x}" y="180" text-anchor="middle" fill="#17112b" font-size="16" font-weight="750">${escape(note.noteName)}${note.octave}</text></g>`;
    }).join('');
    rows.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 354 194" role="img" aria-label="${escape(description)}">${staff}<text class="clef clef-${clef.clef}" x="${clef.x}" y="${clef.y}">${clef.glyph}</text>${heads}</svg>`);
  }
  const key = validNotes.map((note) => `<li><strong>${escape(note.noteName)}${note.octave}</strong> — ${escape(describeStaffPosition(note.staffStep))}</li>`).join('');
  return `${rows.join('')}<ul class="guide-key">${key}</ul>`;
}
