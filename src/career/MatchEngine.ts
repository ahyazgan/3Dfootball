import { GAME_CONFIG } from '../config';
import type { PlayerData, CareerTier } from './types';
import { rollEvents, sumEventEffects, type MatchEvent } from './MatchEvents';
import { traitEffects } from './Traits';

const TIER_ORDER: CareerTier[] = ['amateur', 'semipro', 'pro', 'star', 'legend'];

/** Bir kariyer maçının planı. */
export interface MatchPlan {
  opponent: string;
  /** Rakip gücü 1 (zayıf) .. 5 (çok güçlü). */
  opponentStrength: number;
  /** Bu maçta oynanacak kritik an (şut fırsatı) sayısı. */
  criticalMoments: number;
  difficultyLabel: string;
  // Kaleci ayarları (GameLoop'a verilir)
  skillBase: number;
  skillRamp: number;
  saveReach: number;
  // --- Aşama 6: rakip/kaleci/derbi/olay derinliği (opsiyonel — eski testler korunur) ---
  /** Rakip kalecinin adı. */
  keeperName?: string;
  /** Bu maç ezeli rakibe karşı mı (derbi)? */
  isDerby?: boolean;
  /** Bu maç için seçilen maç içi olaylar. */
  events?: MatchEvent[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Oyuncunun tier'ına göre rakip gücünü; rakip gücüne göre de kritik an
 * sayısını ve kaleci zorluğunu belirler. Oyuncu statları zorluğu hafifletir.
 * rng test için enjekte edilebilir.
 */
export function planMatch(
  player: PlayerData,
  rng: () => number = Math.random
): MatchPlan {
  const m = GAME_CONFIG.career.match;

  // Rakip gücü: tier + ufak değişim (1..5)
  const tierIdx = Math.max(0, TIER_ORDER.indexOf(player.careerTier));
  const variation = Math.round(rng() * 2 - 1); // -1 / 0 / +1
  const opponentStrength = clamp(tierIdx + 1 + variation, 1, 5);

  const morale = player.morale ?? GAME_CONFIG.career.morale.start;

  // Güçlü rakip = az kritik an; yüksek hız (pace>=75) daha iyi pozisyon -> +1 şans
  const t = (opponentStrength - 1) / 4;
  const paceBonus = player.pace >= 75 ? 1 : 0;
  const criticalMoments = clamp(
    Math.round(lerp(m.maxMoments, m.minMoments, t)) + paceBonus,
    m.minMoments,
    m.maxMoments
  );

  // Kaleci zorluğu güce göre; şut/teknik hafifletir, düşük moral zorlaştırır
  const k = m.keeper;
  const shotEase = (player.shot - 50) / 50; // -1..1
  const techEase = (player.technique - 50) / 50;
  const moralePenalty = ((70 - morale) / 100) * 0.1; // düşük moral -> + (zor)
  const skillBase = clamp(
    lerp(k.skillBaseMin, k.skillBaseMax, t) - techEase * 0.08,
    0.1,
    0.7
  );
  const saveReach = clamp(
    lerp(k.saveReachMin, k.saveReachMax, t) - shotEase * 0.15 + moralePenalty,
    1.0,
    1.9
  );

  const opponent =
    m.opponents[Math.floor(rng() * m.opponents.length) % m.opponents.length];
  const keeperName = m.keepers[Math.floor(rng() * m.keepers.length) % m.keepers.length];
  const difficultyLabel =
    opponentStrength <= 2 ? 'Kolay' : opponentStrength === 3 ? 'Orta' : 'Zor';

  // Derbi: rakip, oyuncunun ezeli rakibiyse — daha çetin kaleci.
  const isDerby = opponent === player.rival;

  // Maç içi olaylar: yalnızca kaleci (skillBase/saveReach) ve sonraki ödülleri etkiler.
  const events = rollEvents(rng);
  const eff = sumEventEffects(events);
  const derbyKeeperBoost = isDerby ? 0.06 : 0;

  // Aşama 8: form + yetenekler. Nötr form (50) ve yeteneksizken etki 0 —
  // böylece çekirdek denge ve mevcut planMatch testleri korunur.
  const tr = traitEffects(player);
  const devForm = GAME_CONFIG.career.development.form;
  // Yüksek form kaleciyi kolaylaştırır (saveReach düşer), düşük form zorlaştırır.
  const formDelta = ((player.form - devForm.neutral) / 50) * devForm.keeperEase;

  const finalMoments = clamp(
    criticalMoments + tr.momentsBonus,
    m.minMoments,
    m.maxMoments + 1
  );
  const finalSkillBase = clamp(
    skillBase + eff.skillBaseDelta + derbyKeeperBoost + tr.skillBaseDelta,
    0.1,
    0.85
  );
  const finalSaveReach = clamp(
    saveReach + eff.saveReachDelta + (isDerby ? 0.08 : 0) + tr.saveReachDelta - formDelta,
    1.0,
    1.95
  );

  return {
    opponent,
    opponentStrength,
    criticalMoments: finalMoments,
    difficultyLabel,
    skillBase: finalSkillBase,
    skillRamp: k.skillRamp,
    saveReach: finalSaveReach,
    keeperName,
    isDerby,
    events,
  };
}
