import { describe, it, expect } from 'vitest';
import {
  isInjured,
  updateFormFromRating,
  rollInjury,
  applyAging,
} from './Development';
import { planMatch } from './MatchEngine';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

function store(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  const s = new PlayerStore();
  Object.assign(s.data, overrides);
  return s;
}

describe('Development form', () => {
  it('iyi maç formu yükseltir, kötü maç düşürür', () => {
    const good = store({ form: 50 });
    updateFormFromRating(good, 9);
    expect(good.data.form).toBeGreaterThan(50);

    const bad = store({ form: 50 });
    updateFormFromRating(bad, 3);
    expect(bad.data.form).toBeLessThan(50);
  });

  it('Buz Gibi Sinir yeteneği form düşüşünü yumuşatır', () => {
    const normal = store({ form: 50 });
    updateFormFromRating(normal, 3);

    const iced = store({ form: 50, traits: ['ice_veins'] });
    updateFormFromRating(iced, 3);

    expect(iced.data.form).toBeGreaterThan(normal.data.form); // daha az düştü
  });

  it('form maç planında kaleciyi etkiler (yüksek form daha kolay)', () => {
    const hi = planMatch(store({ form: 100 }).data, () => 0.5);
    const lo = planMatch(store({ form: 0 }).data, () => 0.5);
    expect(hi.saveReach).toBeLessThan(lo.saveReach);
  });
});

describe('Development injury', () => {
  it('rng yüksekse sakatlık yok', () => {
    expect(rollInjury(store().data, () => 0.99)).toBe(0);
  });

  it('rng düşükse sakatlık var ve süre sınırlar içinde', () => {
    const w = rollInjury(store({ energy: 10 }).data, () => 0);
    const inj = GAME_CONFIG.career.development.injury;
    expect(w).toBeGreaterThanOrEqual(inj.minMatches);
    expect(w).toBeLessThanOrEqual(inj.maxMatches);
  });

  it('Demir Adam yeteneği riski azaltır', () => {
    // Eşik sınırında bir rng ile: dirençli oyuncu kurtulur, dirençsiz sakatlanır
    const plain = store({ physical: 40, energy: 50 });
    const tough = store({ physical: 40, energy: 50, traits: ['iron_man'] });
    let plainHurt = 0;
    let toughHurt = 0;
    const seq = [0.05, 0.1, 0.15, 0.2];
    for (const v of seq) {
      if (rollInjury(plain.data, () => v) > 0) plainHurt++;
      if (rollInjury(tough.data, () => v) > 0) toughHurt++;
    }
    expect(toughHurt).toBeLessThanOrEqual(plainHurt);
  });

  it('dinlenmek sakatlığı iyileştirir', () => {
    const s = store({ injuryMatches: 2 });
    expect(isInjured(s.data)).toBe(true);
    s.rest();
    expect(s.data.injuryMatches).toBe(1);
    s.rest();
    expect(isInjured(s.data)).toBe(false);
  });
});

describe('Development aging', () => {
  it('zirve yaşının altında düşüş yok', () => {
    const s = store({ age: 22, shot: 70 });
    expect(applyAging(s)).toEqual([]);
    expect(s.data.shot).toBe(70);
  });

  it('zirve yaşının üstünde statlar düşer', () => {
    const s = store({ age: 33, shot: 70, pace: 70, technique: 70, physical: 70 });
    const declined = applyAging(s);
    expect(declined.length).toBeGreaterThan(0);
    expect(s.data.shot).toBeLessThan(70);
  });

  it('statlar 1 altına düşmez', () => {
    const s = store({ age: 33, shot: 1, pace: 1, technique: 1, physical: 1 });
    applyAging(s);
    expect(s.data.shot).toBeGreaterThanOrEqual(1);
  });
});
