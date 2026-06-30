import { GAME_CONFIG } from '../config';
import type { PlayerData, TournamentState } from './types';
import type { PlayerStore } from './PlayerStore';
import type { MatchPlan } from './MatchEngine';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Oyuncu milli takıma çağrıldı mı? (şöhret eşiği ya da daha önce kap aldıysa) */
export function isCalledUp(d: PlayerData): boolean {
  return (
    d.reputation >= GAME_CONFIG.career.awards.nationalRepThreshold || d.nationalCaps > 0
  );
}

/** Yeni bir eleme turnuvası oluştur (rakipler rng ile dağıtılır). */
export function createTournament(
  d: PlayerData,
  rng: () => number = Math.random
): TournamentState {
  const t = GAME_CONFIG.career.tournament;
  const baseName = d.season % 2 === 0 ? t.names.even : t.names.odd;

  // Ülke havuzundan (milli takım hariç) turlar kadar benzersiz rakip seç
  const team: string = t.nationalTeam;
  const pool: string[] = t.countries.filter((c) => c !== team);
  const opponents: string[] = [];
  for (let i = 0; i < t.rounds.length && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    opponents.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return {
    name: `${baseName} — ${d.season}. sezon`,
    team: t.nationalTeam,
    rounds: [...t.rounds],
    opponents,
    roundIndex: 0,
    eliminated: false,
    champion: false,
  };
}

/** Turnuva bitti mi (elendi ya da şampiyon)? */
export function isTournamentOver(s: TournamentState): boolean {
  return s.eliminated || s.champion;
}

/** Şu anki turun etiketi ve rakibi (bitti ise null). */
export function currentRound(s: TournamentState): { label: string; opponent: string } | null {
  if (isTournamentOver(s) || s.roundIndex >= s.rounds.length) return null;
  return {
    label: s.rounds[s.roundIndex],
    opponent: s.opponents[s.roundIndex] ?? 'Rakip',
  };
}

/** Şu anki tur için maç planı (tur ilerledikçe kaleci zorlaşır). */
export function tournamentMatchPlan(s: TournamentState, d: PlayerData): MatchPlan {
  const t = GAME_CONFIG.career.tournament;
  const round = currentRound(s);
  const i = s.roundIndex;
  const k = t.keeper;

  // Statlar zorluğu hafifletir (maç motoruyla aynı ruh)
  const shotEase = (d.shot - 50) / 50;
  const techEase = (d.technique - 50) / 50;

  const skillBase = clamp(k.skillBaseStart + k.skillBaseStep * i - techEase * 0.06, 0.2, 0.85);
  const saveReach = clamp(k.saveReachStart + k.saveReachStep * i - shotEase * 0.12, 1.1, 1.95);

  return {
    opponent: round?.opponent ?? s.team,
    opponentStrength: clamp(3 + i, 1, 5),
    criticalMoments: t.matchShots,
    difficultyLabel: round?.label ?? 'Final',
    skillBase,
    skillRamp: k.skillRamp,
    saveReach,
    keeperName: `${round?.opponent ?? ''} Kalecisi`,
    isDerby: false,
    events: [],
  };
}

export interface TournamentMatchResult {
  advanced: boolean;
  over: boolean;
  champion: boolean;
  roundLabel: string;
}

/**
 * Bir turnuva maçının sonucunu işle: reyting eşiğin üstündeyse bir üst tura,
 * değilse elenir. State ve store (ödüller) güncellenir. Saf değildir.
 */
export function recordTournamentMatch(
  store: PlayerStore,
  rating: number
): TournamentMatchResult {
  const t = GAME_CONFIG.career.tournament;
  const s = store.data.tournament;
  if (!s || isTournamentOver(s)) {
    return { advanced: false, over: true, champion: false, roundLabel: '' };
  }

  const roundLabel = s.rounds[s.roundIndex] ?? '';
  store.data.nationalCaps += 1; // her milli maç bir kap

  if (rating >= t.advanceRating) {
    // Tur geçildi
    store.addReputation(t.rewards.perRoundRep);
    store.addMoney(t.rewards.perRoundMoney);
    const wasFinal = s.roundIndex >= s.rounds.length - 1;
    s.roundIndex += 1;
    if (wasFinal) {
      s.champion = true;
      store.data.internationalTitles += 1;
      store.addReputation(t.rewards.championRep);
      store.addMoney(t.rewards.championMoney);
    }
    return {
      advanced: true,
      over: isTournamentOver(s) || s.roundIndex >= s.rounds.length,
      champion: s.champion,
      roundLabel,
    };
  }

  // Elendi
  s.eliminated = true;
  return { advanced: false, over: true, champion: false, roundLabel };
}
