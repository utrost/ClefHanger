export const BEGINNER_LESSONS = [
  {
    id: 'first-steps',
    label: 'First steps',
    title: 'Start with C, D, E',
    body: 'Only three answer buttons. Learn the direction before the full alphabet appears.',
    answers: ['C', 'D', 'E'],
    noteNames: ['C', 'D', 'E'],
  },
  {
    id: 'line-notes',
    label: 'Line notes',
    title: 'Treble line notes',
    body: 'E, G, B, D, F sit on the five staff lines.',
    answers: ['E', 'G', 'B', 'D', 'F'],
    noteNames: ['E', 'G', 'B', 'D', 'F'],
  },
  {
    id: 'space-notes',
    label: 'Space notes',
    title: 'Treble space notes',
    body: 'F, A, C, E spell FACE in the spaces.',
    answers: ['F', 'A', 'C', 'E'],
    noteNames: ['F', 'A', 'C', 'E'],
  },
  {
    id: 'mixed',
    label: 'Mixed notes',
    title: 'All natural notes',
    body: 'Now mix all seven note names at gentle speed.',
    answers: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    noteNames: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  },
];

export function buildTutorialSteps() {
  return [
    { title: 'Notes move upward', body: 'Notes climb upward through A B C D E F G, then repeat.' },
    { title: 'Treble staff anchor', body: 'This is a treble staff. The curl wraps the G line; nearby notes step up or down from there.' },
    { title: 'Guess safely', body: 'Tap the note name before the cliff. Guess if you are unsure — ClefHanger shows the right note.' },
  ];
}

export function getBeginnerLesson(lessonId = 'first-steps') {
  return BEGINNER_LESSONS.find((lesson) => lesson.id === lessonId) || BEGINNER_LESSONS[0];
}

export function getLessonPool(pool = [], lessonId = 'mixed') {
  const lesson = getBeginnerLesson(lessonId);
  if (lesson.id === 'mixed') return pool;
  const filtered = pool.filter((note) => lesson.noteNames.includes(note.noteName));
  return filtered.length ? filtered : pool;
}

export function getScaffoldedAnswerOptions({ modeId = 'basics', difficultyId = 'beginner', lessonId = 'mixed', allOptions = [] } = {}) {
  if (modeId !== 'basics' || difficultyId !== 'beginner') return allOptions;
  const answers = new Set(getBeginnerLesson(lessonId).answers);
  const filtered = allOptions.filter((option) => answers.has(option.label));
  return filtered.length ? filtered : allOptions;
}

function explainPrompt(prompt) {
  if (!prompt) return 'Keep going.';
  if (prompt.label) return prompt.label;
  if (prompt.staffStep === 2 && prompt.noteName === 'G') return 'the G line';
  if (prompt.staffStep % 2 === 0) return 'a staff line note';
  return 'a staff space note';
}

export function buildBeginnerFeedback({ prompt, givenAnswer, kind = 'wrong', points = 0 } = {}) {
  const correctAnswer = prompt?.answer || '';
  if (kind === 'correct') {
    return { kind: 'correct', text: `${correctAnswer} — yes. ${explainPrompt(prompt)}. +${points}`, correctAnswer };
  }
  if (kind === 'missed') {
    return { kind: 'missed', text: `${correctAnswer} fell. It was ${explainPrompt(prompt)}.`, correctAnswer };
  }
  return { kind: 'wrong', text: `${givenAnswer || 'That'} is not it. That was ${correctAnswer}: ${explainPrompt(prompt)}.`, correctAnswer };
}

export function buildBeginnerMicMessage({ pitchLabel, frequency, decodedLevel, bytes, advanced = false } = {}) {
  if (!pitchLabel || !frequency) return 'Sing one steady comfortable note.';
  const simple = `I heard ${pitchLabel} · ${Math.round(frequency)} Hz. Nice steady note.`;
  if (!advanced) return simple;
  const parts = [simple];
  if (Number.isFinite(bytes)) parts.push(`captured ${bytes} bytes`);
  if (Number.isFinite(decodedLevel)) parts.push(`decoded level ${Math.round(decodedLevel * 100)}%`);
  return parts.join(' · ');
}
