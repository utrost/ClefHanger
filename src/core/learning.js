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

export function buildCorrectionOverlay({ prompt, feedback } = {}) {
  if (!prompt || feedback?.kind !== 'wrong') return null;
  const answer = feedback.correctAnswer || prompt.answer;
  const location = explainPrompt(prompt);
  return {
    answer,
    label: answer,
    location,
    shouldFreezeNote: true,
    ariaLabel: `Correction: ${answer}, ${location}`,
  };
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

export function getNextBeginnerLesson(lessonId = 'first-steps') {
  const index = BEGINNER_LESSONS.findIndex((lesson) => lesson.id === getBeginnerLesson(lessonId).id);
  return BEGINNER_LESSONS[index + 1] || null;
}

export function buildLearningRecommendation({
  playStyle = 'practice',
  lessonId = 'first-steps',
  correct = 0,
  wrong = 0,
  missed = 0,
  bestStreak = 0,
  accuracy,
  speedId = '5',
  inputMode = 'buttons',
  microphoneStable = true,
} = {}) {
  const lesson = getBeginnerLesson(lessonId);
  const nextLesson = getNextBeginnerLesson(lesson.id);
  const attempts = correct + wrong + missed;
  const computedAccuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
  const scoreAccuracy = Number.isFinite(accuracy) ? accuracy : computedAccuracy;
  const speed = Number.parseInt(speedId, 10) || 5;

  if (inputMode === 'microphone' && !microphoneStable) {
    return {
      kind: 'mic-fallback',
      text: 'Mic is not steady yet. Use Notes first, then troubleshoot Sing/Play separately.',
      action: 'switch-to-notes',
    };
  }

  if (playStyle === 'practice') {
    if (correct >= 8 && wrong === 0 && missed === 0 && bestStreak >= 8) {
      return {
        kind: 'try-rush',
        text: `${lesson.label} looks comfortable. Try Rush on the same lesson.`,
        action: 'try-rush',
      };
    }
    if (wrong > 0) {
      return {
        kind: 'review-mistake',
        text: 'Pause on the correction, name line/space/ledger, then answer again.',
        action: 'repeat-practice',
      };
    }
    return {
      kind: 'keep-practicing',
      text: `Practice ${lesson.label} until about 8 out of 10 feel easy.`,
      action: 'continue',
    };
  }

  if (missed >= Math.max(3, correct + wrong) && speed >= 6) {
    return {
      kind: 'lower-speed',
      text: 'Most misses are timing misses. Try the same lesson again at lower speed.',
      action: 'lower-speed',
    };
  }

  if (scoreAccuracy < 70) {
    return {
      kind: 'repeat-practice',
      text: `${scoreAccuracy}% accuracy: repeat ${lesson.label} in Practice before another Rush.`,
      action: 'repeat-practice',
    };
  }

  if (scoreAccuracy >= 80 && nextLesson) {
    return {
      kind: 'next-lesson',
      text: `${scoreAccuracy}% accuracy. Try ${nextLesson.label} next.`,
      action: 'next-lesson',
      nextLessonId: nextLesson.id,
    };
  }

  if (scoreAccuracy >= 80) {
    return {
      kind: 'widen-challenge',
      text: `${scoreAccuracy}% accuracy. Keep the lesson, then change one setting if you want more challenge.`,
      action: 'increase-one-knob',
    };
  }

  return {
    kind: 'repeat-rush',
    text: `${scoreAccuracy}% accuracy. Repeat the same Rush once before changing settings.`,
    action: 'repeat-rush',
  };
}
