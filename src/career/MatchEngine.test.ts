import { describe, it, expect } from 'vitest';
import { planMatch } from './MatchEngine';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

const M = GAME_CONFIG.career.match;

function player(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  return { ...PlayerStore.createDefault(), ...overrides };
}

describe('MatchEngine.planMatch', () => {
  it('amatör + nötr rng -> zayıf rakip, çok kritik an, Kolay', () => {
    const plan = planMatch(player(), () => 0.5);
    expect(plan.opponentStrength).toBe(1);
    expect(plan.criticalMoments).toBe(M.maxMoments);
    expect(plan.difficultyLabel).toBe('Kolay');
    expect(M.opponents).toContain(plan.opponent);
  });

  it('efsane + nötr rng -> güçlü rakip, az kritik an, Zor', () => {
    const plan = planMatch(player({ careerTier: 'legend' }), () => 0.5);
    expect(plan.opponentStrength).toBe(5);
    expect(plan.criticalMoments).toBe(M.minMoments);
    expect(plan.difficultyLabel).toBe('Zor');
  });

  it('güçlü rakip = daha az kritik an', () => {
    const weak = planMatch(player({ careerTier: 'amateur' }), () => 0.5);
    const strong = planMatch(player({ careerTier: 'legend' }), () => 0.5);
    expect(strong.criticalMoments).toBeLessThan(weak.criticalMoments);
    expect(strong.opponentStrength).toBeGreaterThan(weak.opponentStrength);
  });

  it('yüksek şut statı kaleciyi kolaylaştırır (daha küçük saveReach)', () => {
    const sharp = planMatch(player({ shot: 90 }), () => 0.5);
    const weak = planMatch(player({ shot: 10 }), () => 0.5);
    expect(sharp.saveReach).toBeLessThan(weak.saveReach);
  });

  it('yüksek hız (pace>=75) +1 kritik an verir', () => {
    const fast = planMatch(player({ careerTier: 'pro', pace: 80 }), () => 0.5);
    const slow = planMatch(player({ careerTier: 'pro', pace: 40 }), () => 0.5);
    expect(fast.criticalMoments).toBe(slow.criticalMoments + 1);
  });

  it('düşük moral kaleciyi zorlaştırır (daha büyük saveReach)', () => {
    const low = planMatch(player({ morale: 20 }), () => 0.5);
    const high = planMatch(player({ morale: 90 }), () => 0.5);
    expect(low.saveReach).toBeGreaterThan(high.saveReach);
  });

  it('kritik an her zaman sınırlar içinde', () => {
    for (const tier of ['amateur', 'semipro', 'pro', 'star', 'legend'] as const) {
      for (const rngV of [0, 0.5, 1]) {
        const plan = planMatch(player({ careerTier: tier }), () => rngV);
        expect(plan.criticalMoments).toBeGreaterThanOrEqual(M.minMoments);
        expect(plan.criticalMoments).toBeLessThanOrEqual(M.maxMoments);
      }
    }
  });
});
