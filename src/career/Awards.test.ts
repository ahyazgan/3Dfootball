import { describe, it, expect } from 'vitest';
import { processSeasonEnd } from './Awards';
import { PlayerStore } from './PlayerStore';
import type { SeasonSummary } from './Season';
import { GAME_CONFIG } from '../config';

const A = GAME_CONFIG.career.awards;

function summary(over: Partial<SeasonSummary>): SeasonSummary {
  return {
    season: 1,
    position: 5,
    standing: [],
    clubPoints: 0,
    seasonGoals: 0,
    wage: 0,
    retired: false,
    awards: [],
    ...over,
  };
}

describe('Awards', () => {
  it('şöhret yeterliyse milli takıma çağrılır', () => {
    const p = new PlayerStore();
    p.data.reputation = A.nationalRepThreshold;
    const awards = processSeasonEnd(p, summary({}));
    expect(p.data.nationalCaps).toBe(A.capsPerSeason);
    expect(awards.some((a) => a.id === 'national_call')).toBe(true);
  });

  it('düşük şöhrette milli takım yok', () => {
    const p = new PlayerStore();
    p.data.reputation = A.nationalRepThreshold - 1;
    const awards = processSeasonEnd(p, summary({}));
    expect(p.data.nationalCaps).toBe(0);
    expect(awards.some((a) => a.id === 'national_call')).toBe(false);
  });

  it('sezon golü eşiğini geçince gol kralı + şöhret', () => {
    const p = new PlayerStore();
    const rep0 = p.data.reputation;
    const awards = processSeasonEnd(p, summary({ seasonGoals: A.topScorerGoals }));
    expect(p.data.topScorerTitles).toBe(1);
    expect(p.data.reputation).toBe(rep0 + A.topScorerRep);
    expect(awards.some((a) => a.id === 'top_scorer')).toBe(true);
  });

  it('Altın Top: lig şampiyonu + yıldız/efsane + yüksek gol', () => {
    const p = new PlayerStore();
    p.data.careerTier = 'star';
    const awards = processSeasonEnd(
      p,
      summary({ position: 1, seasonGoals: A.goldenBallGoals })
    );
    expect(p.data.goldenBalls).toBe(1);
    expect(awards.some((a) => a.id === 'golden_ball')).toBe(true);
  });

  it('lig şampiyonu ama amatörse Altın Top yok', () => {
    const p = new PlayerStore(); // amateur
    const awards = processSeasonEnd(
      p,
      summary({ position: 1, seasonGoals: A.goldenBallGoals })
    );
    expect(p.data.goldenBalls).toBe(0);
    expect(awards.some((a) => a.id === 'golden_ball')).toBe(false);
  });

  it('hiçbir eşik karşılanmazsa ödül yok', () => {
    const p = new PlayerStore();
    const awards = processSeasonEnd(p, summary({ seasonGoals: 0 }));
    expect(awards).toEqual([]);
  });
});
