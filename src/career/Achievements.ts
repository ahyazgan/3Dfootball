import type { PlayerStore } from './PlayerStore';
import type { PlayerData } from './types';
import { TIER_ORDER } from './types';

/** Bir başarım tanımı: koşul oyuncu verisinden okunur. */
export interface Achievement {
  id: string;
  label: string;
  icon: string;
  /** Açıldı mı? (saf — yan etkisiz) */
  done: (d: PlayerData) => boolean;
}

const tierReached = (d: PlayerData, tier: PlayerData['careerTier']) =>
  TIER_ORDER.indexOf(d.careerTier) >= TIER_ORDER.indexOf(tier);

/** Tüm başarımlar (kilitli/açık ayrımı done() ile yapılır). */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_goal', label: 'İlk Gol', icon: '⚽', done: (d) => d.totalGoals >= 1 },
  { id: 'scorer_10', label: '10 Gol', icon: '🎯', done: (d) => d.totalGoals >= 10 },
  { id: 'scorer_50', label: '50 Gol', icon: '🔥', done: (d) => d.totalGoals >= 50 },
  { id: 'scorer_100', label: '100 Gol', icon: '💯', done: (d) => d.totalGoals >= 100 },
  {
    id: 'veteran',
    label: 'Veteran (50 maç)',
    icon: '🎽',
    done: (d) => d.matchesPlayed >= 50,
  },
  {
    id: 'tier_pro',
    label: 'Profesyonel',
    icon: '📈',
    done: (d) => tierReached(d, 'pro'),
  },
  { id: 'tier_star', label: 'Yıldız', icon: '⭐', done: (d) => tierReached(d, 'star') },
  {
    id: 'tier_legend',
    label: 'Efsane',
    icon: '👑',
    done: (d) => tierReached(d, 'legend'),
  },
  { id: 'national', label: 'Milli Takım', icon: '🇹🇷', done: (d) => d.nationalCaps > 0 },
  {
    id: 'top_scorer',
    label: 'Gol Kralı',
    icon: '🥇',
    done: (d) => d.topScorerTitles > 0,
  },
  { id: 'golden_ball', label: 'Altın Top', icon: '🏆', done: (d) => d.goldenBalls > 0 },
  {
    id: 'world_champion',
    label: 'Dünya Şampiyonu',
    icon: '🌍',
    done: (d) => d.internationalTitles > 0,
  },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/**
 * Yeni açılan başarımları bul ve player.achievements'a ekle.
 * Açılan başarımların tam tanımlarını döndürür (toast için).
 */
export function checkNewAchievements(store: PlayerStore): Achievement[] {
  const d = store.data;
  const have = new Set(d.achievements);
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.id) && a.done(d)) {
      d.achievements.push(a.id);
      fresh.push(a);
    }
  }
  return fresh;
}

/** Açılan başarımları (tanımlarıyla) listele. */
export function unlockedAchievements(d: PlayerData): Achievement[] {
  return d.achievements.map((id) => BY_ID.get(id)).filter((a): a is Achievement => !!a);
}
