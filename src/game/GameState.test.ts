import { describe, it, expect } from 'vitest';
import { GameState, generateMatch, TOTAL_SHOTS } from './GameState';
import { GAME_CONFIG } from '../config';

/** Sabit diziden besleyen basit rng (test determinizmi). */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

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

describe('GameState — atış modu', () => {
  it('penalty modu her atışta penaltıdır', () => {
    const g = new GameState();
    g.start('penalty');
    expect(g.shotTypeFor(0)).toBe('penalty');
    expect(g.shotTypeFor(3)).toBe('penalty');
    expect(g.currentShotType).toBe('penalty');
  });

  it('header modu her atışta kafa vuruşudur', () => {
    const g = new GameState();
    g.start('header');
    expect(g.shotTypeFor(0)).toBe('header');
    expect(g.shotTypeFor(4)).toBe('header');
    expect(g.currentShotType).toBe('header');
  });

  it('mixed modu penaltı/kafa diye dönüşümlüdür', () => {
    const g = new GameState();
    g.start('mixed');
    expect(g.shotTypeFor(0)).toBe('penalty');
    expect(g.shotTypeFor(1)).toBe('header');
    expect(g.shotTypeFor(2)).toBe('penalty');
    expect(g.shotTypeFor(3)).toBe('header');
  });

  it('currentShotType atış sayısını takip eder', () => {
    const g = new GameState();
    g.start('mixed');
    expect(g.currentShotType).toBe('penalty'); // shots=0
    g.recordResult('goal', 'center'); // shots=1
    g.next();
    expect(g.currentShotType).toBe('header'); // shots=1
  });

  it('varsayılan mod penaltıdır', () => {
    const g = new GameState();
    g.start();
    expect(g.mode).toBe('penalty');
    expect(g.currentShotType).toBe('penalty');
  });

  it('volley modu her atışta volédir', () => {
    const g = new GameState();
    g.start('volley');
    expect(g.shotTypeFor(0)).toBe('volley');
    expect(g.shotTypeFor(4)).toBe('volley');
    expect(g.currentShotType).toBe('volley');
  });

  it('freekick modu her atışta serbest vuruştur', () => {
    const g = new GameState();
    g.start('freekick');
    expect(g.currentShotType).toBe('freekick');
    expect(g.shotTypeFor(3)).toBe('freekick');
  });
});

describe('GameState — maç modu', () => {
  it('start(match) TOTAL_SHOTS kadar fırsat üretir', () => {
    const g = new GameState();
    g.start('match', seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(g.matchEvents).toHaveLength(TOTAL_SHOTS);
    expect(g.homeScore).toBe(0);
    expect(g.awayScore).toBe(0);
  });

  it('currentShotType maç fırsatının tipini izler', () => {
    const g = new GameState();
    g.start('match', seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(g.currentShotType).toBe(g.matchEvents[0].type);
  });

  it('maçta gol homeScore artırır, addCpuGoal awayScore artırır', () => {
    const g = new GameState();
    g.start('match', seq([0.1]));
    g.recordResult('goal', 'left');
    expect(g.homeScore).toBe(1);
    g.addCpuGoal();
    g.addCpuGoal();
    expect(g.awayScore).toBe(2);
  });

  it('matchOutcome skora göre doğru sonucu verir', () => {
    const g = new GameState();
    g.start('match', seq([0.1]));
    g.homeScore = 2;
    g.awayScore = 1;
    expect(g.matchOutcome).toBe('win');
    g.awayScore = 2;
    expect(g.matchOutcome).toBe('draw');
    g.awayScore = 3;
    expect(g.matchOutcome).toBe('loss');
  });

  it('fırsat dakikaları artan sıradadır ve geçerli tip taşır', () => {
    const g = new GameState();
    g.start('match', seq([0.05, 0.35, 0.65, 0.95]));
    const valid = new Set(['penalty', 'header', 'volley', 'freekick']);
    let prev = -1;
    for (const ev of g.matchEvents) {
      expect(valid.has(ev.type)).toBe(true);
      expect(ev.minute).toBeGreaterThanOrEqual(prev);
      prev = ev.minute;
    }
  });

  it('generateMatch ilk fırsatta rakip golü üretmez', () => {
    const events = generateMatch(seq([0.0]));
    expect(events[0].cpuGoal).toBe(false);
  });
});
