import { describe, it, expect } from 'vitest';
import { computeMatchResult, applyOutcome, type MatchStats } from './MatchResult';
import type { MatchPlan } from './MatchEngine';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

function plan(moments: number): MatchPlan {
  return {
    opponent: 'Test FK',
    opponentStrength: 3,
    criticalMoments: moments,
    difficultyLabel: 'Orta',
    skillBase: 0.35,
    skillRamp: 0.4,
    saveReach: 1.35,
  };
}
function stats(s: Partial<MatchStats>): MatchStats {
  return { goals: 0, saves: 0, misses: 0, shots: 0, score: 0, bestStreak: 0, ...s };
}

describe('MatchResult.computeMatchResult', () => {
  it('daha çok gol = daha yüksek reyting', () => {
    const low = computeMatchResult(plan(5), stats({ goals: 1, shots: 5, score: 150 }));
    const high = computeMatchResult(plan(5), stats({ goals: 4, shots: 5, score: 600 }));
    expect(high.rating).toBeGreaterThan(low.rating);
    expect(high.rating).toBeLessThanOrEqual(10);
    expect(low.rating).toBeGreaterThanOrEqual(1);
  });

  it('gol para + şöhret + değer kazandırır', () => {
    const o = computeMatchResult(plan(5), stats({ goals: 3, shots: 5, score: 450 }));
    expect(o.money).toBeGreaterThan(0);
    expect(o.reputation).toBeGreaterThan(0);
    expect(o.value).toBeGreaterThan(0);
    expect(o.goals).toBe(3);
  });

  it('kötü maç (gol yok) negatif şöhret, değer 0', () => {
    const o = computeMatchResult(plan(5), stats({ goals: 0, shots: 5, score: 0 }));
    expect(o.reputation).toBeLessThan(0);
    expect(o.value).toBe(0);
  });

  it('yüksek reyting transfer ilgisi yaratır', () => {
    const o = computeMatchResult(plan(2), stats({ goals: 2, shots: 2, score: 800 }));
    expect(o.rating).toBeGreaterThanOrEqual(GAME_CONFIG.career.match.transferRating);
    expect(o.transferInterest).toBe(true);
  });
});

describe('MatchResult.applyOutcome', () => {
  it('oyuncuya para/şöhret/gol/enerji uygular', () => {
    const store = new PlayerStore();
    const m0 = store.data.money;
    const o = computeMatchResult(plan(5), stats({ goals: 2, shots: 5, score: 300 }));
    applyOutcome(store, o);
    expect(store.data.money).toBe(m0 + o.money);
    expect(store.data.reputation).toBe(Math.max(0, o.reputation));
    expect(store.data.totalGoals).toBe(2);
    expect(store.data.seasonGoals).toBe(2);
    expect(store.data.matchesPlayed).toBe(1);
    expect(store.data.energy).toBe(100 - GAME_CONFIG.career.match.energyCost);
  });

  it('iyi maç morali yükseltir, kötü maç düşürür', () => {
    const good = new PlayerStore();
    const m0 = good.data.morale;
    applyOutcome(
      good,
      computeMatchResult(plan(2), stats({ goals: 2, shots: 2, score: 800 }))
    );
    expect(good.data.morale).toBeGreaterThan(m0); // yüksek reyting

    const bad = new PlayerStore();
    const b0 = bad.data.morale;
    applyOutcome(
      bad,
      computeMatchResult(plan(5), stats({ goals: 0, shots: 5, score: 0 }))
    );
    expect(bad.data.morale).toBeLessThan(b0); // düşük reyting
  });
});
