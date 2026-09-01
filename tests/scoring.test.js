import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRoundSummary,
  calculateAccuracy,
  calculatePoints,
  getHighScoreKey,
  getSpeedBonus,
  getStreakBonus,
} from '../src/core/scoring.js';
import { getDifficulty, getMode, getSpeed } from '../src/core/content.js';

test('speed and streak bonuses match the existing scoring ladder', () => {
  assert.equal(getSpeedBonus(getSpeed('5')), 0);
  assert.equal(getSpeedBonus(getSpeed('6')), 20);
  assert.equal(getSpeedBonus(getSpeed('8')), 40);

  assert.equal(getStreakBonus(0), 0);
  assert.equal(getStreakBonus(2), 40);
  assert.equal(getStreakBonus(99), 80);
});

test('points scale by mode, speed, difficulty, and prior streak', () => {
  assert.equal(calculatePoints({ mode: getMode('basics'), speed: getSpeed('5'), difficulty: getDifficulty('beginner'), streak: 0 }), 100);
  assert.equal(calculatePoints({ mode: getMode('chords'), speed: getSpeed('5'), difficulty: getDifficulty('beginner'), streak: 2 }), 280);
  assert.equal(calculatePoints({ mode: getMode('bass'), speed: getSpeed('8'), difficulty: getDifficulty('hard'), streak: 1 }), 324);
});

test('accuracy handles zero attempts and mixed result rounds', () => {
  assert.equal(calculateAccuracy({ correct: 0, wrong: 0, missed: 0 }), 0);
  assert.equal(calculateAccuracy({ correct: 3, wrong: 2, missed: 1 }), 50);
  assert.equal(calculateAccuracy({ correct: 2, wrong: 1, missed: 0 }), 67);
});

test('high-score keys keep mode speed and difficulty comparability', () => {
  assert.equal(getHighScoreKey('basics'), 'clefhanger.highScore.basics.speed5.beginner.v5');
  assert.equal(getHighScoreKey('chords', '10', 'hard'), 'clefhanger.highScore.chords.speed10.hard.v5');
  assert.equal(getHighScoreKey('missing', 'fast', 'unknown'), 'clefhanger.highScore.basics.speed5.beginner.v5');
});

test('round summary formatting is stable for empty and completed sprints', () => {
  const empty = buildRoundSummary({ score: 0, correct: 0, wrong: 0, missed: 0, bestStreak: 0, modeId: 'basics', speedId: '5', difficultyId: 'beginner' });
  assert.equal(empty.title, 'Time! Sprint complete');
  assert.equal(empty.headline, '0 points · 0% accuracy');
  assert.equal(empty.detail, '0 correct · 0 wrong · 0 missed · best streak 0');
  assert.equal(empty.primaryAction, 'Play another 60s rush');

  const mixed = buildRoundSummary({ score: 420, correct: 4, wrong: 1, missed: 2, bestStreak: 3, modeId: 'chords', speedId: '10', difficultyId: 'hard' });
  assert.equal(mixed.mode, 'Chords');
  assert.equal(mixed.speed, 'Speed 10');
  assert.equal(mixed.difficulty, 'Hard');
  assert.equal(mixed.accuracy, 57);
  assert.equal(mixed.headline, '420 points · 57% accuracy');
  assert.equal(mixed.detail, '4 correct · 1 wrong · 2 missed · best streak 3');
});
