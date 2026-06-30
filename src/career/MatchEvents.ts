import { GAME_CONFIG } from '../config';

/**
 * Maç içi olay (Aşama 6). Yalnızca kaleci zorluğunu (skillBase/saveReach) ve
 * maç sonrası ödülleri (şöhret/moral) etkiler — kritik an sayısını DEĞİL,
 * böylece maç planının çekirdek dengesi ve testleri korunur.
 */
export interface MatchEvent {
  id: string;
  icon: string;
  label: string;
  desc: string;
  /** Kaleci taban becerisine eklenir (+zor / -kolay). */
  skillBaseDelta?: number;
  /** Kaleci kurtarış erişimine eklenir (+zor / -kolay). */
  saveReachDelta?: number;
  /** Maç sonrası ek şöhret (koşulsuz). */
  repBonus?: number;
  /** Maç sonrası ek moral (+/-). */
  moraleBonus?: number;
}

/** Olay havuzu — her maç öncesi 0..maxPerMatch tanesi seçilebilir. */
export const MATCH_EVENTS: readonly MatchEvent[] = [
  {
    id: 'rain',
    icon: '🌧️',
    label: 'Yağmurlu Saha',
    desc: 'Islak zemin topu kaydırıyor — kaleci daha zor kurtarıyor.',
    saveReachDelta: -0.12,
  },
  {
    id: 'keeper_injured',
    icon: '🚑',
    label: 'Kaleci Sakat',
    desc: 'Rakip kaleci yarı kondisyonda — köşeler daha açık.',
    skillBaseDelta: -0.12,
    saveReachDelta: -0.1,
  },
  {
    id: 'hostile_crowd',
    icon: '🔥',
    label: 'Düşman Tribün',
    desc: 'Deplasman baskısı altında ek konsantrasyon gerek.',
    skillBaseDelta: 0.08,
    repBonus: 6,
  },
  {
    id: 'scout',
    icon: '🕵️',
    label: 'Gözlemci Tribünde',
    desc: 'Büyük kulübün gözlemcisi seni izliyor — vitrin maçı.',
    repBonus: 10,
  },
  {
    id: 'derby_keeper',
    icon: '🧤',
    label: 'Formda Kaleci',
    desc: 'Rakip kaleci hayatının formunda — uçuyor.',
    skillBaseDelta: 0.1,
    saveReachDelta: 0.1,
  },
  {
    id: 'home_support',
    icon: '🎉',
    label: 'Taraftar Desteği',
    desc: 'Tribünler arkanda — moralin yüksek.',
    moraleBonus: 6,
  },
  {
    id: 'windy',
    icon: '💨',
    label: 'Rüzgârlı Hava',
    desc: 'Sert rüzgâr topu savuruyor — falso kontrolü zor.',
    saveReachDelta: 0.06,
  },
];

const BY_ID = new Map(MATCH_EVENTS.map((e) => [e.id, e]));

/**
 * Bu maç için olayları seç. config.career.events.chance olasılıkla en az bir
 * olay; en çok maxPerMatch. Aynı olay iki kez seçilmez. rng enjekte edilebilir.
 */
export function rollEvents(rng: () => number = Math.random): MatchEvent[] {
  const cfg = GAME_CONFIG.career.events;
  if (rng() > cfg.chance) return [];
  const out: MatchEvent[] = [];
  const pool = [...MATCH_EVENTS];
  const count = Math.min(cfg.maxPerMatch, 1 + Math.floor(rng() * cfg.maxPerMatch));
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** Olay id listesinden tanımları çöz (kayıttan/plandan yeniden kurma için). */
export function eventsByIds(ids: string[]): MatchEvent[] {
  return ids.map((id) => BY_ID.get(id)).filter((e): e is MatchEvent => e !== undefined);
}

/** Olayların kaleci/ödül etkilerini topla. */
export function sumEventEffects(events: readonly MatchEvent[]) {
  let skillBaseDelta = 0;
  let saveReachDelta = 0;
  let repBonus = 0;
  let moraleBonus = 0;
  for (const e of events) {
    skillBaseDelta += e.skillBaseDelta ?? 0;
    saveReachDelta += e.saveReachDelta ?? 0;
    repBonus += e.repBonus ?? 0;
    moraleBonus += e.moraleBonus ?? 0;
  }
  return { skillBaseDelta, saveReachDelta, repBonus, moraleBonus };
}
