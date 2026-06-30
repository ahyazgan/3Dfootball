import { GAME_CONFIG } from '../config';
import type { PlayerData } from './types';
import type { PlayerStore } from './PlayerStore';
import { traitEffects } from './Traits';
import type { StatKey } from './Training';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Oyuncu sakat mı (maç oynayamaz)? */
export function isInjured(d: PlayerData): boolean {
  return d.injuryMatches > 0;
}

/**
 * Maç reytinginden formu güncelle. Yetenek (formDamp) kötü maçların form
 * düşüşünü yumuşatır. store mutasyonu.
 */
export function updateFormFromRating(store: PlayerStore, rating: number): void {
  const f = GAME_CONFIG.career.development.form;
  let delta = (rating - 6) * f.matchMul;
  if (delta < 0) {
    const damp = traitEffects(store.data).formDamp;
    delta *= 1 - damp;
  }
  store.addForm(Math.round(delta));
}

/**
 * Maç sonrası sakatlanma olasılığı: taban + yaş + düşük enerji - fizik - yetenek.
 * 0 (sağlam) ya da süreyi (kaç maç/dinlenme) döndürür. rng enjekte edilebilir.
 */
export function rollInjury(d: PlayerData, rng: () => number = Math.random): number {
  const inj = GAME_CONFIG.career.development.injury;
  const ageOver = Math.max(0, d.age - 30);
  const lowEnergy = (1 - d.energy / 100) * inj.lowEnergyBonus;
  const physical = (d.physical / 100) * inj.physicalResist;
  const resist = traitEffects(d).injuryResist;
  let chance =
    inj.baseChance + ageOver * inj.agePenaltyPerYear + lowEnergy - physical;
  chance *= 1 - resist;
  chance = clamp(chance, 0, 0.9);

  if (rng() >= chance) return 0;
  const span = inj.maxMatches - inj.minMatches;
  return inj.minMatches + Math.round(rng() * span);
}

const STATS: StatKey[] = ['shot', 'pace', 'technique', 'physical'];

/**
 * Yaşa bağlı düşüş: zirve yaşından sonra her sezon statlar azalır.
 * endSeason içinde (yaş artıştan sonra) çağrılır. Düşen stat anahtarlarını döndürür.
 */
export function applyAging(store: PlayerStore): StatKey[] {
  const dev = GAME_CONFIG.career.development;
  const d = store.data;
  if (d.age <= dev.peakAge) return [];
  const declined: StatKey[] = [];
  for (const s of STATS) {
    const next = Math.max(1, d[s] - dev.declinePerYear);
    if (next < d[s]) {
      d[s] = next;
      declined.push(s);
    }
  }
  return declined;
}
