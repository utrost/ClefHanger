export const BEGINNER_LESSONS = [
  {
    id: 'first-steps',
    label: 'First steps',
    title: 'Start with C, D, E',
    body: 'Sing or hum C, D, or E. The fallback buttons stay small while you learn the direction.',
    answers: ['C', 'D', 'E'],
    noteNames: ['C', 'D', 'E'],
  },
  {
    id: 'line-notes',
    label: 'Line notes',
    title: 'Treble line notes',
    body: 'See the line, name it quietly, then sing it steadily: E G B D F.',
    intro: {
      title: 'Line notes',
      body: 'Line notes sit on the staff lines. In treble, see the line first, then sing it steadily: E G B D F from bottom to top.',
      examples: ['E', 'G', 'B', 'D', 'F'],
    },
    answers: ['E', 'G', 'B', 'D', 'F'],
    noteNames: ['E', 'G', 'B', 'D', 'F'],
  },
  {
    id: 'space-notes',
    label: 'Space notes',
    title: 'Treble space notes',
    body: 'See the space between two lines, then sing the pitch: F A C E.',
    intro: {
      title: 'Space notes',
      body: 'Space notes sit between the lines. In treble, see the space first, then sing the pitch: F A C E from bottom to top.',
      examples: ['F', 'A', 'C', 'E'],
    },
    answers: ['F', 'A', 'C', 'E'],
    noteNames: ['F', 'A', 'C', 'E'],
  },
  {
    id: 'ledger-notes',
    label: 'Ledger lines',
    title: 'Above and below the staff',
    body: 'Find the short extra line just outside the staff, then aim your voice at that note.',
    intro: {
      title: 'Ledger lines',
      body: 'Ledger notes sit just outside the staff. The short extra line belongs to the note; notice it, then aim your voice at C or A.',
      examples: ['C', 'A'],
    },
    answers: ['C', 'A'],
    noteNames: ['C', 'A'],
    staffSteps: [-2, 10],
  },
  {
    id: 'interval-jumps',
    label: 'Interval jumps',
    title: 'Hear the distance',
    body: 'Hear the distance from the last note: repeat it, step gently, or skip over one note.',
    intro: {
      title: 'Interval jumps',
      body: 'Do not think chord theory yet. Hear the distance from the last note: same note, one step up/down, or a skip over one note.',
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
    body: 'Now sing all seven natural notes in gentle Sing/Play practice before trying Rush.',
    answers: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    noteNames: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  },
];

export function buildTutorialSteps() {
  return [
    { title: 'Notes move upward', body: 'Sing or hum the note you see. Notes climb upward through A B C D E F G, then repeat.' },
    { title: 'Treble staff anchor', body: 'This is a treble staff. The curl wraps the G line; nearby notes step up or down from there.' },
    { title: 'Sing safely', body: 'Sing, hum, or play one steady note before the cliff. If you are unsure, try it — ClefHanger shows the right note.' },
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
