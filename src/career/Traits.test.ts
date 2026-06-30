import { describe, it, expect } from 'vitest';
import { unlockTrait, traitEffects, hasTrait, TRAITS } from './Traits';
import { PlayerStore } from './PlayerStore';

function store(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  const s = new PlayerStore();
  Object.assign(s.data, overrides);
  return s;
}

describe('Traits', () => {
  it("id'ler benzersiz", () => {
    const ids = TRAITS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('koşul sağlanmazsa açılmaz', () => {
    const s = store({ shot: 30, money: 999999 });
    expect(unlockTrait(s, 'penalty_specialist')).toBe('locked');
    expect(hasTrait(s.data, 'penalty_specialist')).toBe(false);
  });

  it('para yetmezse açılmaz', () => {
    const s = store({ shot: 80, money: 0 });
    expect(unlockTrait(s, 'penalty_specialist')).toBe('broke');
  });

  it('koşul + para varsa açılır, parayı düşer', () => {
    const s = store({ shot: 80, money: 50000 });
    const m0 = s.data.money;
    expect(unlockTrait(s, 'penalty_specialist')).toBe('ok');
    expect(hasTrait(s.data, 'penalty_specialist')).toBe(true);
    expect(s.data.money).toBeLessThan(m0);
    // ikinci kez: zaten sahip
    expect(unlockTrait(s, 'penalty_specialist')).toBe('owned');
  });

  it('traitEffects sahip olunan etkileri toplar', () => {
    const s = store({ shot: 80, physical: 80, money: 100000 });
    unlockTrait(s, 'penalty_specialist'); // saveReachDelta -0.1
    unlockTrait(s, 'iron_man'); // injuryResist 0.5
    const eff = traitEffects(s.data);
    expect(eff.saveReachDelta).toBeCloseTo(-0.1);
    expect(eff.injuryResist).toBeCloseTo(0.5);
  });
});
