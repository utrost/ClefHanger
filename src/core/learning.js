import { BEGINNER_LESSONS, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getLessonPool, getScaffoldedAnswerOptions } from './lessons.js?v=clefhanger-slice48-storage-adapter-2026-09-01';
export { BEGINNER_LESSONS, buildTutorialSteps, getBeginnerLesson, getLessonIntroCard, getLessonPool, getScaffoldedAnswerOptions } from './lessons.js?v=clefhanger-slice48-storage-adapter-2026-09-01';
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

export function buildTeachingFeedback(outcome = {}) {
  const kind = outcome.result || outcome.kind;
  const feedback = buildBeginnerFeedback({
    prompt: outcome.prompt,
    givenAnswer: outcome.givenAnswer,
    kind,
    points: outcome.pointsEarned || 0,
  });
  return {
    feedback,
    correction: buildCorrectionOverlay({ prompt: outcome.prompt, feedback }),
  };
}

export function applyLearningFeedback(state = {}, nowMs = 0) {
  if (!state.lastOutcome) return state;
  const teaching = buildTeachingFeedback(state.lastOutcome);
  return {
    ...state,
    feedback: teaching.feedback,
    correction: teaching.correction
      ? { ...teaching.correction, frozenUntilMs: nowMs + 1400, frozenAtMs: nowMs }
      : null,
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

export function buildAccidentalLearningHint({ modeId = 'basics', prompt } = {}) {
  if (!['sharps', 'flats'].includes(modeId) || !prompt?.answer) return null;
  const base = prompt.noteName || prompt.answer[0];
  if (modeId === 'sharps') {
    return {
      kind: 'accidental-sharp',
      text: `${prompt.answer} uses the same staff spot as ${base}; ♯ raises it by one small step.`,
    };
  }
  return {
    kind: 'accidental-flat',
    text: `${prompt.answer} uses the same staff spot as ${base}; ♭ lowers it by one small step.`,
  };
}

export function buildIntervalLearningHint({ previousPrompt, prompt } = {}) {
  if (!previousPrompt || !prompt || !Number.isFinite(previousPrompt.staffStep) || !Number.isFinite(prompt.staffStep)) return null;
  const delta = prompt.staffStep - previousPrompt.staffStep;
  const direction = delta > 0 ? 'up' : 'down';
  const previous = previousPrompt.noteName || previousPrompt.answer;
  const current = prompt.noteName || prompt.answer;

  if (delta === 0) {
    return { kind: 'same-note', text: `${current} is the same note again — same staff spot.` };
  }
  if (Math.abs(delta) === 1) {
    return { kind: `step-${direction}`, text: `${current} is one step ${direction} from ${previous}. Adjacent line/space notes are steps.` };
  }
  if (Math.abs(delta) === 2) {
    const skipped = noteNameBetween(previous, current, direction);
    const skipText = skipped ? ` It skips over ${skipped}.` : '';
    return { kind: `skip-${direction}`, text: `${current} is a skip ${direction} from ${previous}.${skipText}` };
  }
  return { kind: `jump-${direction}`, text: `${current} jumps ${direction} from ${previous}. Read the landing note before tapping.` };
}

function noteNameBetween(previous, current, direction) {
  const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const from = names.indexOf(previous?.[0]);
  const to = names.indexOf(current?.[0]);
  if (from === -1 || to === -1) return null;
  const expected = direction === 'up' ? (from + 2) % names.length : (from + names.length - 2) % names.length;
  if (to !== expected) return null;
  return names[direction === 'up' ? (from + 1) % names.length : (from + names.length - 1) % names.length];
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
