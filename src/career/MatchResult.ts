import { GAME_CONFIG } from '../config';
import type { MatchPlan } from './MatchEngine';
import type { PlayerStore } from './PlayerStore';

/** Bir maçtaki anların toplamı (GameState'ten). */
export interface MatchStats {
  goals: number;
  saves: number;
  misses: number;
  shots: number;
  score: number;
  bestStreak: number;
}

/** Maç sonucu: reyting + ödüller. */
export interface MatchOutcome {
  opponent: string;
  rating: number; // 1..10
  goals: number;
  moments: number;
  money: number;
  reputation: number;
  value: number;
  transferInterest: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Anların toplamından maç reytingi ve ödülleri hesapla (saf fonksiyon). */
export function computeMatchResult(plan: MatchPlan, stats: MatchStats): MatchOutcome {
  const m = GAME_CONFIG.career.match;
  const moments = Math.max(1, plan.criticalMoments);

  const rating = round1(
    clamp(
      m.rating.base +
        (stats.goals / moments) * m.rating.perGoalRatio +
        stats.score / m.rating.scoreBonusDiv,
      1,
      10
    )
  );

  const r = m.rewards;
  const money = Math.round(stats.goals * r.moneyPerGoal + rating * r.moneyPerRating);
  const reputation = Math.round(
    stats.goals * r.repPerGoal + (rating - 5) * r.repPerRatingOver5
  );
  const value = Math.round(Math.max(0, reputation) * r.valuePerRepGain);

  return {
    opponent: plan.opponent,
    rating,
    goals: stats.goals,
    moments,
    money,
    reputation,
    value,
    transferInterest: rating >= m.transferRating,
  };
}

/** Sonucu oyuncuya uygula (para/şöhret/değer/gol/enerji). */
export function applyOutcome(store: PlayerStore, outcome: MatchOutcome): void {
  store.addMoney(outcome.money);
  store.addReputation(outcome.reputation);
  store.addValue(outcome.value);
  store.spendEnergy(GAME_CONFIG.career.match.energyCost);
  store.data.matchesPlayed += 1;
  store.data.seasonGoals += outcome.goals;
  store.data.totalGoals += outcome.goals;
}
