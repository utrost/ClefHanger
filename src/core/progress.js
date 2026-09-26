const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function normalizeProgress(value) {
  const data = value && typeof value === 'object' ? value : {};
  const attempts = count(data.attempts);
  return {
    attempts,
    correct: Math.min(attempts, count(data.correct)),
    assisted: Math.min(attempts, count(data.assisted)),
    recent: Array.isArray(data.recent) ? data.recent.filter((entry) => typeof entry === 'boolean').slice(-10) : [],
  };
}

export function recordAttempt(progress, { correct = false, assisted = false } = {}) {
  const previous = normalizeProgress(progress);
  return {
    attempts: previous.attempts + 1,
    correct: previous.correct + Number(correct),
    assisted: previous.assisted + Number(assisted),
    recent: assisted ? previous.recent : [...previous.recent, Boolean(correct)].slice(-10),
  };
}

export function summarizeProgress(progress) {
  const data = normalizeProgress(progress);
  const recentCorrect = data.recent.filter(Boolean).length;
  return { ...data, recentCorrect, ready: data.recent.length === 10 && recentCorrect >= 8 };
}
