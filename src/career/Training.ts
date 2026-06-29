import { GAME_CONFIG } from '../config';
import type { PlayerStore } from './PlayerStore';
import type { PlayerData } from './types';

export type StatKey = 'shot' | 'pace' | 'technique' | 'physical';

export const STAT_LABEL: Record<StatKey, string> = {
  shot: 'ŞUT',
  pace: 'HIZ',
  technique: 'TEKNİK',
  physical: 'FİZİK',
};

export interface TrainResult {
  stat: StatKey;
  gain: number;
  newValue: number;
}

/** Antrenman için yeterli enerji var mı? */
export function canTrain(d: PlayerData): boolean {
  return d.energy >= GAME_CONFIG.career.training.energyCost;
}

/**
 * Bir statı antren et: enerji harca, statı yükselt. Azalan verim (stat 100'e
 * yaklaştıkça az artar) + moral etkisi. Yeterli enerji yoksa null.
 * rng test için enjekte edilebilir.
 */
export function trainStat(
  store: PlayerStore,
  stat: StatKey,
  rng: () => number = Math.random
): TrainResult | null {
  const t = GAME_CONFIG.career.training;
  const d = store.data;
  if (d.energy < t.energyCost) return null;

  const cur = d[stat];
  store.spendEnergy(t.energyCost);

  if (cur >= t.maxStat) return { stat, gain: 0, newValue: cur };

  // Azalan verim + moral (yüksek moral daha iyi gelişim) + ufak değişim
  const moraleFactor = 0.7 + (d.morale / 100) * 0.6;
  const raw = t.baseGain * (1 - cur / 100) * moraleFactor * (0.8 + rng() * 0.4);
  const gain = Math.max(t.minGain, Math.round(raw));
  const newValue = Math.min(t.maxStat, cur + gain);
  d[stat] = newValue;

  return { stat, gain: newValue - cur, newValue };
}
