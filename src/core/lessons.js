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
    intro: {
      title: 'Line notes',
      body: 'Line notes sit on the staff lines. In treble, the lines are E G B D F from bottom to top.',
      examples: ['E', 'G', 'B', 'D', 'F'],
    },
    answers: ['E', 'G', 'B', 'D', 'F'],
    noteNames: ['E', 'G', 'B', 'D', 'F'],
  },
  {
    id: 'space-notes',
    label: 'Space notes',
    title: 'Treble space notes',
    body: 'F, A, C, E spell FACE in the spaces.',
    intro: {
      title: 'Space notes',
      body: 'Space notes sit between the lines. In treble, the spaces spell FACE from bottom to top.',
      examples: ['F', 'A', 'C', 'E'],
    },
    answers: ['F', 'A', 'C', 'E'],
    noteNames: ['F', 'A', 'C', 'E'],
  },
  {
    id: 'ledger-notes',
    label: 'Ledger lines',
    title: 'Above and below the staff',
    body: 'Some notes need short extra lines when they sit just outside the staff.',
    intro: {
      title: 'Ledger lines',
      body: 'Ledger notes sit just outside the staff. The short extra lines are part of the note, not decoration.',
      examples: ['C', 'A'],
    },
    answers: ['C', 'A'],
    noteNames: ['C', 'A'],
    staffSteps: [-2, 10],
  },
  {
    id: 'interval-jumps',
    label: 'Interval jumps',
    title: 'Same, step, or skip',
    body: 'Watch how the next note moves from the last one: repeat, one step, or a skip.',
    intro: {
      title: 'Interval jumps',
      body: 'Do not think chord theory yet. Compare this note to the last one: same note, one step up/down, or a skip over one note.',
      examples: ['same', 'step', 'skip'],
    },
    answers: ['C', 'D', 'E', 'F', 'G'],
    noteNames: ['C', 'D', 'E', 'F', 'G'],
    staffSteps: [-2, -1, 0, 1, 2],
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

export function getLessonIntroCard(lessonId = 'first-steps') {
  const lesson = getBeginnerLesson(lessonId);
  return lesson.intro || { title: lesson.title, body: lesson.body, examples: [...lesson.answers] };
}

export function getLessonPool(pool = [], lessonId = 'mixed') {
  const lesson = getBeginnerLesson(lessonId);
  if (lesson.id === 'mixed') return pool;
  const filtered = pool.filter((note) => {
    const matchesName = lesson.noteNames.includes(note.noteName);
    const matchesStaffStep = !lesson.staffSteps || lesson.staffSteps.includes(note.staffStep);
    return matchesName && matchesStaffStep;
  });
  return filtered.length ? filtered : pool;
}

export function getScaffoldedAnswerOptions({ modeId = 'basics', difficultyId = 'beginner', lessonId = 'mixed', allOptions = [] } = {}) {
  if (modeId !== 'basics' || difficultyId !== 'beginner') return allOptions;
  const answers = new Set(getBeginnerLesson(lessonId).answers);
  const filtered = allOptions.filter((option) => answers.has(option.label));
  return filtered.length ? filtered : allOptions;
}
