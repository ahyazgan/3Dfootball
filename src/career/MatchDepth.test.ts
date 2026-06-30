import { describe, it, expect } from 'vitest';
import { rollEvents, sumEventEffects, eventsByIds, MATCH_EVENTS } from './MatchEvents';
import { planMatch } from './MatchEngine';
import { computeMatchResult, type MatchStats } from './MatchResult';
import type { MatchPlan } from './MatchEngine';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

function player(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  return { ...PlayerStore.createDefault(), ...overrides };
}
function stats(s: Partial<MatchStats>): MatchStats {
  return { goals: 0, saves: 0, misses: 0, shots: 0, score: 0, bestStreak: 0, ...s };
}

describe('MatchEvents.rollEvents', () => {
  it('yüksek rng olasılığı geçince olay çıkmaz', () => {
    expect(rollEvents(() => 1)).toEqual([]);
  });

  it('olay çıkınca maxPerMatch sınırını aşmaz ve benzersizdir', () => {
    for (const v of [0, 0.2, 0.5]) {
      const evs = rollEvents(() => v);
      expect(evs.length).toBeLessThanOrEqual(GAME_CONFIG.career.events.maxPerMatch);
      const ids = evs.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('sumEventEffects etkileri toplar', () => {
    const eff = sumEventEffects([
      { id: 'a', icon: '', label: '', desc: '', skillBaseDelta: 0.1, repBonus: 5 },
      { id: 'b', icon: '', label: '', desc: '', saveReachDelta: -0.1, moraleBonus: 4 },
    ]);
    expect(eff.skillBaseDelta).toBeCloseTo(0.1);
    expect(eff.saveReachDelta).toBeCloseTo(-0.1);
    expect(eff.repBonus).toBe(5);
    expect(eff.moraleBonus).toBe(4);
  });

  it('eventsByIds tanımları çözer, bilinmeyeni atar', () => {
    const got = eventsByIds([MATCH_EVENTS[0].id, 'yok']);
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe(MATCH_EVENTS[0].id);
  });
});

describe('planMatch derbi', () => {
  it('rakip ezeli rakipse derbi olur', () => {
    // rng=0 -> opponents[0] = varsayılan rakip (Demirkent SK)
    const plan = planMatch(player(), () => 0);
    expect(plan.opponent).toBe(GAME_CONFIG.career.rivalry.defaultRival);
    expect(plan.isDerby).toBe(true);
    expect(plan.keeperName).toBeTruthy();
  });

  it('farklı rakip derbi değildir', () => {
    const plan = planMatch(player(), () => 0.5);
    expect(plan.opponent).not.toBe(GAME_CONFIG.career.rivalry.defaultRival);
    expect(plan.isDerby).toBe(false);
  });
});

describe('computeMatchResult derbi/olay', () => {
  function basePlan(extra: Partial<MatchPlan> = {}): MatchPlan {
    return {
      opponent: 'Demirkent SK',
      opponentStrength: 3,
      criticalMoments: 5,
      difficultyLabel: 'Orta',
      skillBase: 0.35,
      skillRamp: 0.4,
      saveReach: 1.35,
      ...extra,
    };
  }

  it('derbi galibiyeti ek şöhret + moral verir', () => {
    const normal = computeMatchResult(basePlan(), stats({ goals: 4, shots: 5, score: 700 }));
    const derby = computeMatchResult(
      basePlan({ isDerby: true }),
      stats({ goals: 4, shots: 5, score: 700 })
    );
    expect(derby.rating).toBeGreaterThanOrEqual(GAME_CONFIG.career.season.winRating);
    expect(derby.reputation).toBe(normal.reputation + GAME_CONFIG.career.rivalry.winRepBonus);
    expect(derby.bonusMorale).toBe(GAME_CONFIG.career.rivalry.winMoraleBonus);
    expect(derby.isDerby).toBe(true);
  });

  it('olay repBonus şöhrete eklenir, etiketler taşınır', () => {
    const ev = { id: 'scout', icon: '🕵️', label: 'Gözlemci', desc: '', repBonus: 10 };
    const withEvent = computeMatchResult(
      basePlan({ events: [ev] }),
      stats({ goals: 2, shots: 5, score: 300 })
    );
    const without = computeMatchResult(basePlan(), stats({ goals: 2, shots: 5, score: 300 }));
    expect(withEvent.reputation).toBe(without.reputation + 10);
    expect(withEvent.eventLabels).toEqual(['🕵️ Gözlemci']);
  });

  it('olaysız/derbisiz sonuç eski davranışı korur', () => {
    const o = computeMatchResult(basePlan(), stats({ goals: 0, shots: 5, score: 0 }));
    expect(o.isDerby).toBe(false);
    expect(o.bonusMorale).toBe(0);
    expect(o.eventLabels).toEqual([]);
  });
});
