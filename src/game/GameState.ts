export type Phase = 'idle' | 'ready' | 'shooting' | 'result' | 'over';
export type ShotResult = 'goal' | 'save' | 'miss';

export const TOTAL_SHOTS = 5;

/**
 * Oyun durumu: skor, şut sayısı ve faz makinesi.
 */
export class GameState {
  phase: Phase = 'idle';
  shots = 0;
  goals = 0;
  saves = 0;
  misses = 0;
  lastResult: ShotResult | null = null;

  start() {
    this.phase = 'ready';
    this.shots = 0;
    this.goals = 0;
    this.saves = 0;
    this.misses = 0;
    this.lastResult = null;
  }

  recordResult(result: ShotResult) {
    this.lastResult = result;
    this.shots++;
    if (result === 'goal') this.goals++;
    else if (result === 'save') this.saves++;
    else this.misses++;
    this.phase = 'result';
  }

  /** Sonuç gösterildikten sonra çağrılır. */
  next() {
    if (this.shots >= TOTAL_SHOTS) {
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
