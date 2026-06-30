import { GAME_CONFIG } from '../config';
import type { DiveZone } from '../scene/Keeper';

export type Phase = 'idle' | 'ready' | 'serving' | 'shooting' | 'result' | 'over';
export type ShotResult = 'goal' | 'save' | 'miss';

/** Oyun modu: penaltı, kafa, volé, serbest vuruş, karışık ya da maç. */
export type GameMode =
  | 'penalty'
  | 'header'
  | 'volley'
  | 'freekick'
  | 'mixed'
  | 'match';
/** Tek bir atışın tipi (karışık/maç modunda atış başına değişir). */
export type ShotType = 'penalty' | 'header' | 'volley' | 'freekick';

export const TOTAL_SHOTS = GAME_CONFIG.totalShots;

/** Maç modunda tek bir fırsat (dakika + pozisyon tipi + spiker metni). */
export interface MatchEvent {
  minute: number;
  type: ShotType;
  intro: string;
  /** Bu fırsattan hemen önce rakip gol attı mı? (kontratak simülasyonu) */
  cpuGoal: boolean;
}

const EVENT_INTRO: Record<ShotType, string> = {
  penalty: 'Penaltı kazandık! Köşeyi seç, şutu çek.',
  header: 'Korner! Ortayı bekle, kafayla bitir.',
  volley: 'Açık oyun fırsatı! Gelen topu voleyle vur.',
  freekick: 'Serbest vuruş! Barajı aş, köşeye falso yap.',
};

/**
 * Bir maç için fırsat dizisi üret: artan dakikalar, çeşitli pozisyonlar ve
 * arada rakip golleri (kontratak). rng dışarıdan verilerek test edilebilir.
 */
export function generateMatch(rng: () => number = Math.random): MatchEvent[] {
  const types: ShotType[] = ['penalty', 'header', 'volley', 'freekick'];
  // Çeşitlilik için karıştırılmış tipler (TOTAL_SHOTS kadar)
  const pool: ShotType[] = [];
  while (pool.length < TOTAL_SHOTS) {
    const shuffled = [...types].sort(() => rng() - 0.5);
    pool.push(...shuffled);
  }
  const chosen = pool.slice(0, TOTAL_SHOTS);

  // Artan dakikalar (her bölmede rastgele bir an)
  const slot = 90 / TOTAL_SHOTS;
  return chosen.map((type, i) => {
    const minute = Math.min(90, Math.round(slot * i + 4 + rng() * (slot - 6)));
    // İlk fırsat öncesi rakip gol yok; sonrakilerde %28 ihtimal
    const cpuGoal = i > 0 && rng() < 0.28;
    return { minute, type, intro: EVENT_INTRO[type], cpuGoal };
  });
}

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
  mode: GameMode = 'penalty';
  shots = 0;
  goals = 0;
  saves = 0;
  misses = 0;
  score = 0;
  /** Ardışık gol sayısı (combo). */
  streak = 0;
  bestStreak = 0;
  lastResult: ShotResult | null = null;
  /** Son golün puan dökümü (sonuç ekranı/flash için). */
  lastGoalScore: GoalScore | null = null;

  // --- Maç modu ---
  /** Maç fırsatları (sadece mode === 'match'). */
  matchEvents: MatchEvent[] = [];
  /** Oyuncunun (senin) maçtaki gol sayısı. */
  homeScore = 0;
  /** Rakibin maçtaki gol sayısı (kontratak simülasyonu). */
  awayScore = 0;

  start(mode: GameMode = 'penalty', rng: () => number = Math.random) {
    this.phase = 'ready';
    this.mode = mode;
    this.shots = 0;
    this.goals = 0;
    this.saves = 0;
    this.misses = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lastResult = null;
    this.lastGoalScore = null;
    this.homeScore = 0;
    this.awayScore = 0;
    this.matchEvents = mode === 'match' ? generateMatch(rng) : [];
  }

  /** Verilen atış indeksinin tipi. Karışık/maç modunda sırayla değişir. */
  shotTypeFor(index: number): ShotType {
    if (this.mode === 'penalty') return 'penalty';
    if (this.mode === 'header') return 'header';
    if (this.mode === 'volley') return 'volley';
    if (this.mode === 'freekick') return 'freekick';
    if (this.mode === 'match') return this.matchEvents[index]?.type ?? 'penalty';
    return index % 2 === 0 ? 'penalty' : 'header';
  }

  /** Sıradaki (henüz atılmamış) atışın tipi. */
  get currentShotType(): ShotType {
    return this.shotTypeFor(this.shots);
  }

  /** Sıradaki (henüz atılmamış) maç fırsatı (mode === 'match'). */
  get currentEvent(): MatchEvent | null {
    return this.mode === 'match' ? (this.matchEvents[this.shots] ?? null) : null;
  }

  /** Rakip golü ekle (kontratak simülasyonu). */
  addCpuGoal() {
    this.awayScore++;
  }

  /** Maç sonucu: oyuncu açısından. */
  get matchOutcome(): 'win' | 'draw' | 'loss' {
    if (this.homeScore > this.awayScore) return 'win';
    if (this.homeScore < this.awayScore) return 'loss';
    return 'draw';
  }

  recordResult(result: ShotResult, zone: DiveZone = 'center') {
    this.lastResult = result;
    this.shots++;
    if (result === 'goal') {
      this.goals++;
      if (this.mode === 'match') this.homeScore++;
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
