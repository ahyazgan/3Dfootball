import { GAME_CONFIG } from '../config';
import type { PlayerStore } from './PlayerStore';
import type { PlayerData } from './types';
import { processSeasonEnd, type Award } from './Awards';

export interface StandingRow {
  name: string;
  points: number;
  isPlayer: boolean;
}

export interface SeasonSummary {
  season: number;
  position: number;
  standing: StandingRow[];
  clubPoints: number;
  seasonGoals: number;
  wage: number;
  retired: boolean;
  /** Bu sezon kazanılan ödüller (gol kralı, Altın Top, milli takım). */
  awards: Award[];
}

/** Maç reytinginden lig puanı (kazanma/beraberlik/kayıp). */
export function pointsFromRating(rating: number): number {
  const s = GAME_CONFIG.career.season;
  if (rating >= s.winRating) return s.pointsWin;
  if (rating >= s.drawRating) return s.pointsDraw;
  return 0;
}

/** Bir maçı sezona işle (maç sayacı + lig puanı). */
export function recordMatchInSeason(store: PlayerStore, rating: number): void {
  store.data.seasonMatch += 1;
  store.data.clubPoints += pointsFromRating(rating);
}

export function isSeasonOver(d: PlayerData): boolean {
  return d.seasonMatch >= GAME_CONFIG.career.season.matchesPerSeason;
}

/** Oyuncunun kulübü + rakiplerle lig sıralaması (rng test için enjekte edilir). */
export function computeStanding(
  d: PlayerData,
  rng: () => number = Math.random
): StandingRow[] {
  const s = GAME_CONFIG.career.season;
  const maxPts = s.matchesPerSeason * s.pointsWin;
  const rivals: StandingRow[] = s.rivals.map((name) => ({
    name,
    points: Math.round(rng() * maxPts * 0.7 + maxPts * 0.1),
    isPlayer: false,
  }));
  const me: StandingRow = { name: d.currentClub, points: d.clubPoints, isPlayer: true };
  return [...rivals, me].sort((a, b) => b.points - a.points);
}

/**
 * Sezonu bitir: özet hesapla, sonra maaş öde + yaşlan + sezonu sıfırla.
 * Yaş emeklilik sınırına ulaşırsa retired=true.
 */
export function endSeason(
  store: PlayerStore,
  rng: () => number = Math.random
): SeasonSummary {
  const s = GAME_CONFIG.career.season;
  const d = store.data;

  const standing = computeStanding(d, rng);
  const position = standing.findIndex((r) => r.isPlayer) + 1;
  const wage = s.wageByTier[d.careerTier];

  const summary: SeasonSummary = {
    season: d.season,
    position,
    standing,
    clubPoints: d.clubPoints,
    seasonGoals: d.seasonGoals,
    wage,
    retired: false,
    awards: [],
  };

  // Ödüller: sezon sayaçları sıfırlanmadan önce (summary golü taşır).
  summary.awards = processSeasonEnd(store, summary);

  // Uygula: maaş + yaşlanma + yeni sezon
  store.addMoney(wage);
  d.age += 1;
  d.season += 1;
  d.seasonMatch = 0;
  d.seasonGoals = 0;
  d.clubPoints = 0;
  summary.retired = d.age >= s.retireAge;

  return summary;
}
