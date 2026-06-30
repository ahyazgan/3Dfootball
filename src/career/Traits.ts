import { GAME_CONFIG } from '../config';
import type { PlayerData } from './types';
import type { PlayerStore } from './PlayerStore';

/**
 * Yetenek (trait): kalıcı, maliyet karşılığı açılan özel beceri. Maç planını
 * ve/veya gelişim sistemini etkiler. Açma koşulu (req) ve maliyeti vardır.
 */
export interface Trait {
  id: string;
  label: string;
  icon: string;
  desc: string;
  /** Açma maliyeti (€). */
  cost: number;
  /** Açma koşulu. */
  req: (d: PlayerData) => boolean;
  reqLabel: string;
  // Maç etkileri
  saveReachDelta?: number; // kaleci erişimini azalt (- = kolaylaştırır)
  skillBaseDelta?: number; // kaleci becerisini azalt
  momentsBonus?: number; // ek kritik an
  // Gelişim etkileri
  injuryResist?: number; // 0..1 sakatlanma olasılığını azaltır
  formDamp?: number; // 0..1 form düşüşlerini yumuşatır
}

export const TRAITS: readonly Trait[] = [
  {
    id: 'penalty_specialist',
    label: 'Penaltı Uzmanı',
    icon: '🎯',
    desc: 'Soğukkanlı bitiricilik — kaleci köşelere daha zor uzanır.',
    cost: 20000,
    req: (d) => d.shot >= 60,
    reqLabel: 'Şut ≥ 60',
    saveReachDelta: -0.1,
  },
  {
    id: 'curl_master',
    label: 'Falso Ustası',
    icon: '🌀',
    desc: 'Topa müthiş falso — kaleci yönü okusa bile yetişemez.',
    cost: 25000,
    req: (d) => d.technique >= 65,
    reqLabel: 'Teknik ≥ 65',
    skillBaseDelta: -0.08,
  },
  {
    id: 'ice_veins',
    label: 'Buz Gibi Sinir',
    icon: '🧊',
    desc: 'Baskı altında sarsılmazsın — kötü maçlar formunu az düşürür.',
    cost: 18000,
    req: (d) => d.matchesPlayed >= 10,
    reqLabel: '10 maç oyna',
    formDamp: 0.5,
  },
  {
    id: 'iron_man',
    label: 'Demir Adam',
    icon: '🛡️',
    desc: 'Dayanıklı bünye — sakatlanma riskin yarıya iner.',
    cost: 22000,
    req: (d) => d.physical >= 60,
    reqLabel: 'Fizik ≥ 60',
    injuryResist: 0.5,
  },
  {
    id: 'playmaker',
    label: 'Oyun Kurucu',
    icon: '🎩',
    desc: 'Pozisyon yaratma dehası — maç başına +1 kritik an.',
    cost: 30000,
    req: (d) => d.technique >= 70 && d.pace >= 70,
    reqLabel: 'Teknik & Hız ≥ 70',
    momentsBonus: 1,
  },
];

const BY_ID = new Map(TRAITS.map((t) => [t.id, t]));

export function hasTrait(d: PlayerData, id: string): boolean {
  return d.traits.includes(id);
}

export function traitById(id: string): Trait | undefined {
  return BY_ID.get(id);
}

/** Sahip olunan yeteneklerin toplam etkileri. */
export function traitEffects(d: PlayerData) {
  let saveReachDelta = 0;
  let skillBaseDelta = 0;
  let momentsBonus = 0;
  let injuryResist = 0;
  let formDamp = 0;
  for (const id of d.traits) {
    const t = BY_ID.get(id);
    if (!t) continue;
    saveReachDelta += t.saveReachDelta ?? 0;
    skillBaseDelta += t.skillBaseDelta ?? 0;
    momentsBonus += t.momentsBonus ?? 0;
    injuryResist = Math.min(0.9, injuryResist + (t.injuryResist ?? 0));
    formDamp = Math.min(0.9, formDamp + (t.formDamp ?? 0));
  }
  return { saveReachDelta, skillBaseDelta, momentsBonus, injuryResist, formDamp };
}

export type UnlockResult = 'ok' | 'owned' | 'locked' | 'broke';

/** Bir yeteneği açmaya çalış: koşul + para kontrolü, sonra parayı düş ve ekle. */
export function unlockTrait(store: PlayerStore, id: string): UnlockResult {
  const t = BY_ID.get(id);
  const d = store.data;
  if (!t) return 'locked';
  if (d.traits.includes(id)) return 'owned';
  if (!t.req(d)) return 'locked';
  const cost = Math.round(t.cost * GAME_CONFIG.career.development.traits.costMul);
  if (d.money < cost) return 'broke';
  store.addMoney(-cost);
  d.traits.push(id);
  return 'ok';
}
