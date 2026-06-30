import { describe, it, expect } from 'vitest';
import { rollPressEvent, applyPressChoice, PRESS_EVENTS } from './PressEvents';
import { PlayerStore } from './PlayerStore';

describe('PressEvents', () => {
  it("id'ler benzersiz ve her olayın seçeneği var", () => {
    const ids = PRESS_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of PRESS_EVENTS) expect(e.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('yüksek rng olayı bastırır, düşük rng olay verir', () => {
    expect(rollPressEvent(() => 0.99)).toBeNull();
    expect(rollPressEvent(() => 0)).not.toBeNull();
  });

  it('seçim etkileri uygulanır', () => {
    const s = new PlayerStore();
    s.data.money = 100000;
    s.data.morale = 50;
    s.data.reputation = 50;
    const f0 = s.data.followers;
    applyPressChoice(s, {
      label: 'x',
      result: 'y',
      moraleDelta: 5,
      repDelta: 10,
      moneyDelta: -20000,
      followersDelta: 3000,
    });
    expect(s.data.morale).toBe(55);
    expect(s.data.reputation).toBe(60);
    expect(s.data.money).toBe(80000);
    expect(s.data.followers).toBe(f0 + 3000);
  });

  it('takipçi 0 altına düşmez', () => {
    const s = new PlayerStore();
    s.data.followers = 1000;
    applyPressChoice(s, { label: 'x', result: 'y', followersDelta: -5000 });
    expect(s.data.followers).toBe(0);
  });
});
