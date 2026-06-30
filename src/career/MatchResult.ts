import { GAME_CONFIG } from '../config';
import type { MatchPlan } from './MatchEngine';
import type { PlayerStore } from './PlayerStore';
import { sumEventEffects } from './MatchEvents';

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
  /** Bu maç derbi miydi? */
  isDerby: boolean;
  /** Maç sonrası uygulanacak ek moral (derbi + olaylar). */
  bonusMorale: number;
  /** Maç içi olayların etiketleri (sonuç ekranı için). */
  eventLabels: string[];
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

  // Aşama 6: derbi + olay ödülleri (plan yoksa 0 -> eski davranış korunur)
  const season = GAME_CONFIG.career.season;
  const rival = GAME_CONFIG.career.rivalry;
  const eff = sumEventEffects(plan.events ?? []);
  const isDerby = plan.isDerby ?? false;
  const won = rating >= season.winRating;
  const lost = rating < season.drawRating;

  const derbyRep = isDerby && won ? rival.winRepBonus : 0;
  const reputation = Math.round(
    stats.goals * r.repPerGoal + (rating - 5) * r.repPerRatingOver5 + eff.repBonus + derbyRep
  );
  const value = Math.round(Math.max(0, reputation) * r.valuePerRepGain);

  const derbyMorale = isDerby ? (won ? rival.winMoraleBonus : lost ? -rival.lossMoralePenalty : 0) : 0;
  const bonusMorale = eff.moraleBonus + derbyMorale;

  return {
    opponent: plan.opponent,
    rating,
    goals: stats.goals,
    moments,
    money,
    reputation,
    value,
    transferInterest: rating >= m.transferRating,
    isDerby,
    bonusMorale,
    eventLabels: (plan.events ?? []).map((e) => `${e.icon} ${e.label}`),
  };
}

/** Sonucu oyuncuya uygula (para/şöhret/değer/gol/enerji/moral). */
export function applyOutcome(store: PlayerStore, outcome: MatchOutcome): void {
  store.addMoney(outcome.money);
  store.addReputation(outcome.reputation);
  store.addValue(outcome.value);
  store.spendEnergy(GAME_CONFIG.career.match.energyCost);
  // Moral: iyi maç morali yükseltir, kötü maç düşürür ((rating-6)*matchMul)
  // + derbi/olay ek morali (Aşama 6)
  store.addMorale(
    Math.round((outcome.rating - 6) * GAME_CONFIG.career.morale.matchMul) +
      (outcome.bonusMorale ?? 0)
  );
  store.data.matchesPlayed += 1;
  store.data.seasonGoals += outcome.goals;
  store.data.totalGoals += outcome.goals;
}
