import { describe, it, expect } from 'vitest';
import { checkNewAchievements, unlockedAchievements, ACHIEVEMENTS } from './Achievements';
import { PlayerStore } from './PlayerStore';

describe('Achievements', () => {
  it('ilk gol başarımını açar', () => {
    const p = new PlayerStore();
    expect(p.data.achievements).toEqual([]);
    p.data.totalGoals = 1;
    const fresh = checkNewAchievements(p);
    expect(fresh.some((a) => a.id === 'first_goal')).toBe(true);
    expect(p.data.achievements).toContain('first_goal');
  });

  it('aynı başarımı iki kez eklemez (idempotent)', () => {
    const p = new PlayerStore();
    p.data.totalGoals = 10;
    const first = checkNewAchievements(p);
    expect(first.length).toBeGreaterThan(0);
    const second = checkNewAchievements(p);
    expect(second).toEqual([]); // yeni yok
    const ids = p.data.achievements;
    expect(new Set(ids).size).toBe(ids.length); // tekrar yok
  });

  it('tier ve kupa başarımları doğru tetiklenir', () => {
    const p = new PlayerStore();
    p.data.careerTier = 'legend';
    p.data.goldenBalls = 1;
    p.data.nationalCaps = 4;
    const fresh = checkNewAchievements(p);
    const ids = fresh.map((a) => a.id);
    expect(ids).toContain('tier_pro');
    expect(ids).toContain('tier_star');
    expect(ids).toContain('tier_legend');
    expect(ids).toContain('golden_ball');
    expect(ids).toContain('national');
  });

  it('unlockedAchievements yalnızca açılanların tanımını döndürür', () => {
    const p = new PlayerStore();
    p.data.achievements = ['first_goal', 'tier_pro'];
    const list = unlockedAchievements(p.data);
    expect(list.map((a) => a.id).sort()).toEqual(['first_goal', 'tier_pro']);
  });

  it("başarım id'leri benzersiz", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
