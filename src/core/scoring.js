import { getDifficulty, getMode, getSpeed } from './content.js?v=clefhanger-slice47-version-consistency-2026-09-01';

export function getSpeedBonus(speed = getSpeed('5')) {
  return speed.value >= 8 ? 40 : speed.value >= 6 ? 20 : 0;
}

export function getStreakBonus(streak = 0) {
  return Math.min(80, Math.max(0, streak) * 20);
}

export function calculatePoints({ mode = getMode('basics'), speed = getSpeed('5'), difficulty = getDifficulty('beginner'), streak = 0 } = {}) {
  return Math.round((mode.basePoints + getSpeedBonus(speed) + getStreakBonus(streak)) * difficulty.scoreMultiplier);
}

export function calculateAccuracy({ correct = 0, wrong = 0, missed = 0 } = {}) {
  const attempts = correct + wrong + missed;
  return attempts === 0 ? 0 : Math.round((correct / attempts) * 100);
}

export function getHighScoreKey(modeId = 'basics', speedId = '5', difficultyId = 'beginner') {
  return `clefhanger.highScore.${getMode(modeId).id}.speed${getSpeed(speedId).id}.${getDifficulty(difficultyId).id}.v5`;
}

export function buildRoundSummary(state = {}) {
  const accuracy = calculateAccuracy(state);
  const mode = getMode(state.modeId).label;
  const speed = getSpeed(state.speedId).label;
  const difficulty = getDifficulty(state.difficultyId).label;
  const title = 'Time! Sprint complete';
  const score = state.score || 0;
  const correct = state.correct || 0;
  const wrong = state.wrong || 0;
  const missed = state.missed || 0;
  const bestStreak = state.bestStreak || 0;
  const headline = `${score} points · ${accuracy}% accuracy`;
  const detail = `${correct} correct · ${wrong} wrong · ${missed} missed · best streak ${bestStreak}`;
  return {
    title,
    mode,
    speed,
    difficulty,
    score,
    correct,
    wrong,
    missed,
    bestStreak,
    accuracy,
    headline,
    detail,
    primaryAction: 'Play another 60s rush',
  };
}
