import { describe, it, expect } from 'vitest';
import {
  pointsFromRating,
  recordMatchInSeason,
  isSeasonOver,
  endSeason,
  computeStanding,
} from './Season';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

const S = GAME_CONFIG.career.season;

describe('Season', () => {
  it('reyting -> lig puanı (kazanma/beraberlik/kayıp)', () => {
    expect(pointsFromRating(8)).toBe(S.pointsWin);
    expect(pointsFromRating(6)).toBe(S.pointsDraw);
    expect(pointsFromRating(3)).toBe(0);
  });

  it('maç sezona işlenir (sayaç + puan)', () => {
    const p = new PlayerStore();
    recordMatchInSeason(p, 8); // win
    recordMatchInSeason(p, 6); // draw
    expect(p.data.seasonMatch).toBe(2);
    expect(p.data.clubPoints).toBe(S.pointsWin + S.pointsDraw);
  });

  it('sezon dolunca biter', () => {
    const p = new PlayerStore();
    expect(isSeasonOver(p.data)).toBe(false);
    p.data.seasonMatch = S.matchesPerSeason;
    expect(isSeasonOver(p.data)).toBe(true);
  });

  it('endSeason maaş öder, yaşlandırır, sezonu sıfırlar', () => {
    const p = new PlayerStore();
    const money0 = p.data.money;
    const age0 = p.data.age;
    p.data.clubPoints = 12;
    p.data.seasonGoals = 5;
    p.data.seasonMatch = S.matchesPerSeason;
    const sum = endSeason(p, () => 0.3);
    expect(sum.clubPoints).toBe(12);
    expect(sum.seasonGoals).toBe(5);
    expect(sum.wage).toBe(S.wageByTier.amateur);
    expect(p.data.money).toBe(money0 + sum.wage);
    expect(p.data.age).toBe(age0 + 1);
    expect(p.data.seasonMatch).toBe(0);
    expect(p.data.clubPoints).toBe(0);
    expect(p.data.season).toBe(2);
  });

  it('emeklilik yaşında retired=true', () => {
    const p = new PlayerStore();
    p.data.age = S.retireAge - 1;
    const sum = endSeason(p, () => 0.3);
    expect(sum.retired).toBe(true);
  });

  it('lig sıralaması oyuncunun kulübünü içerir', () => {
    const p = new PlayerStore();
    p.data.clubPoints = 99;
    const standing = computeStanding(p.data, () => 0.1);
    expect(standing[0].isPlayer).toBe(true); // en yüksek puan
    expect(standing.length).toBe(S.rivals.length + 1);
  });
});
