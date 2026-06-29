import { describe, it, expect } from 'vitest';
import { GameState } from './GameState';
import { GAME_CONFIG } from '../config';

const S = GAME_CONFIG.scoring;

function fresh() {
  const g = new GameState();
  g.start();
  return g;
}

describe('GameState — puanlama', () => {
  it('ilk orta gol taban puanı verir', () => {
    const g = fresh();
    g.recordResult('goal', 'center');
    expect(g.score).toBe(S.goalBase);
    expect(g.streak).toBe(1);
    expect(g.lastGoalScore?.multiplier).toBe(1);
  });

  it('köşe golü bonus ekler', () => {
    const g = fresh();
    g.recordResult('goal', 'left');
    expect(g.score).toBe(S.goalBase + S.cornerBonus);
  });

  it('combo: ardışık goller çarpanı artırır', () => {
    const g = fresh();
    g.recordResult('goal', 'center'); // mult 1 -> 100
    g.recordResult('goal', 'center'); // mult 1.5 -> 150
    expect(g.streak).toBe(2);
    expect(g.lastGoalScore?.multiplier).toBe(1 + S.streakStep);
    expect(g.score).toBe(S.goalBase + Math.round(S.goalBase * (1 + S.streakStep)));
  });

  it('kurtarış/aut comboyu sıfırlar', () => {
    const g = fresh();
    g.recordResult('goal', 'center');
    g.recordResult('goal', 'center');
    g.recordResult('save', 'center');
    expect(g.streak).toBe(0);
    g.recordResult('goal', 'center'); // çarpan tekrar 1
    expect(g.lastGoalScore?.multiplier).toBe(1);
  });

  it('en iyi comboyu (bestStreak) saklar', () => {
    const g = fresh();
    g.recordResult('goal', 'center');
    g.recordResult('goal', 'center');
    g.recordResult('goal', 'center');
    g.recordResult('miss', 'center');
    expect(g.bestStreak).toBe(3);
    expect(g.streak).toBe(0);
  });

  it('çarpan maxStreakBonusSteps ile doyar', () => {
    const g = fresh();
    for (let i = 0; i < S.maxStreakBonusSteps + 3; i++) g.recordResult('goal', 'center');
    const maxMult = 1 + S.maxStreakBonusSteps * S.streakStep;
    expect(g.lastGoalScore?.multiplier).toBe(maxMult);
  });

  it('start() skoru ve comboyu sıfırlar', () => {
    const g = fresh();
    g.recordResult('goal', 'left');
    g.start();
    expect(g.score).toBe(0);
    expect(g.streak).toBe(0);
    expect(g.goals).toBe(0);
  });
});
