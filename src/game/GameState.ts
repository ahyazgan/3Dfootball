import { GAME_CONFIG } from '../config';
import type { DiveZone } from '../scene/Keeper';

export type Phase = 'idle' | 'ready' | 'shooting' | 'result' | 'over';
export type ShotResult = 'goal' | 'save' | 'miss';

export const TOTAL_SHOTS = GAME_CONFIG.totalShots;

/** Bir golün getirdiği puan dökümü (HUD'da combo göstermek için). */
export interface GoalScore {
  points: number;
  /** Bu golde geçerli olan combo çarpanı (1, 1.5, 2, ...). */
  multiplier: number;
}

/**
 * Oyun durumu: skor, şut sayısı, combo ve faz makinesi.
 */
export class GameState {
  phase: Phase = 'idle';
  shots = 0;
  goals = 0;
  saves = 0;
  misses = 0;
  score = 0;
  /** Bu maçtaki toplam an sayısı (kariyer maçında değişir). */
  totalShots: number = TOTAL_SHOTS;
  /** Ardışık gol sayısı (combo). */
  streak = 0;
  bestStreak = 0;
  lastResult: ShotResult | null = null;
  /** Son golün puan dökümü (sonuç ekranı/flash için). */
  lastGoalScore: GoalScore | null = null;

  start(totalShots: number = TOTAL_SHOTS) {
    this.totalShots = Math.max(1, Math.round(totalShots));
    this.phase = 'ready';
    this.shots = 0;
    this.goals = 0;
    this.saves = 0;
    this.misses = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lastResult = null;
    this.lastGoalScore = null;
  }

  recordResult(result: ShotResult, zone: DiveZone = 'center') {
    this.lastResult = result;
    this.shots++;
    if (result === 'goal') {
      this.goals++;
      this.lastGoalScore = this.computeGoalScore(zone);
      this.score += this.lastGoalScore.points;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.lastGoalScore = null;
      this.streak = 0; // combo bozuldu
      if (result === 'save') this.saves++;
      else this.misses++;
    }
    this.phase = 'result';
  }

  /** Köşe bonusu + combo çarpanıyla gol puanını hesapla. */
  private computeGoalScore(zone: DiveZone): GoalScore {
    const s = GAME_CONFIG.scoring;
    const corner = zone === 'center' ? 0 : s.cornerBonus;
    // streak = bu golden ÖNCEKİ ardışık gol sayısı
    const steps = Math.min(this.streak, s.maxStreakBonusSteps);
    const multiplier = 1 + steps * s.streakStep;
    const points = Math.round((s.goalBase + corner) * multiplier);
    return { points, multiplier };
  }

  /** Sonuç gösterildikten sonra çağrılır. */
  next() {
    if (this.shots >= this.totalShots) {
      this.phase = 'over';
    } else {
      this.phase = 'ready';
      this.lastResult = null;
    }
  }

  get isOver() {
    return this.phase === 'over';
  }

  /** İsabet yüzdesi (gol / atılan şut). */
  get accuracy(): number {
    return this.shots === 0 ? 0 : Math.round((this.goals / this.shots) * 100);
  }
}
