import { GAME_CONFIG } from '../config';
import type { PlayerStore } from './PlayerStore';
import type { SeasonSummary } from './Season';

/** Sezon sonu kazanılan bir ödül (özet ekranında gösterilir). */
export interface Award {
  id: string;
  label: string;
  icon: string;
}

/**
 * Sezon sonu ödüllerini hesapla ve uygula (saf değil — store'u günceller).
 * - Milli takım çağrısı: şöhret eşiğini geçince sonraki sezon maçları eklenir.
 * - Gol kralı: sezon golü eşiği.
 * - Altın Top: lig şampiyonu + yıldız/efsane + yüksek sezon golü.
 *
 * NOT: endSeason() sezon sayaçlarını sıfırlamadan ÖNCE çağrılmalı; summary
 * sıfırlanmamış sezon golünü (seasonGoals) taşır, biz onu kullanırız.
 */
export function processSeasonEnd(store: PlayerStore, summary: SeasonSummary): Award[] {
  const a = GAME_CONFIG.career.awards;
  const d = store.data;
  const awards: Award[] = [];
  // Tier'ı baştan oku: ödül şöhreti refreshTier'ı tetikleyip tier'ı kaydırabilir.
  const eliteTier = d.careerTier === 'star' || d.careerTier === 'legend';

  // Milli takım: şöhret yeterliyse çağrılır (önümüzdeki sezona kaps eklenir).
  if (d.reputation >= a.nationalRepThreshold) {
    d.nationalCaps += a.capsPerSeason;
    awards.push({ id: 'national_call', label: 'Milli Takım Kadrosu', icon: '🇹🇷' });
  }

  // Gol kralı: sezon golü eşiği.
  if (summary.seasonGoals >= a.topScorerGoals) {
    d.topScorerTitles += 1;
    store.addReputation(a.topScorerRep);
    awards.push({ id: 'top_scorer', label: 'Gol Kralı 🥇', icon: '🥇' });
  }

  // Altın Top: lig şampiyonu + üst tier + yüksek gol.
  if (summary.position === 1 && eliteTier && summary.seasonGoals >= a.goldenBallGoals) {
    d.goldenBalls += 1;
    store.addReputation(a.goldenBallRep);
    awards.push({ id: 'golden_ball', label: 'Altın Top 🏆', icon: '🏆' });
  }

  return awards;
}
