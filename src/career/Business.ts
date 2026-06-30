import { GAME_CONFIG } from '../config';
import type { PlayerData, SponsorDeal } from './types';
import type { PlayerStore } from './PlayerStore';
import type { MatchOutcome } from './MatchResult';

/** Büyük sayıyı kısalt (1.2M, 45K). */
export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return `${n}`;
}

// --- Takipçiler ---

/** Maç performansından takipçi kazancı (saf). */
export function followerGain(outcome: MatchOutcome): number {
  const f = GAME_CONFIG.career.business.followers;
  const ratingBonus = Math.max(0, outcome.rating - 5) * f.perRatingOver5;
  return Math.round(f.base + outcome.goals * f.perGoal + ratingBonus);
}

/** Maç sonrası takipçiyi güncelle (store mutasyonu). */
export function updateFollowers(store: PlayerStore, outcome: MatchOutcome): number {
  const gain = followerGain(outcome);
  store.data.followers += gain;
  return gain;
}

// --- Sponsorluklar ---

export interface SponsorOffer extends SponsorDeal {
  signingBonus: number;
}

type BrandCfg = (typeof GAME_CONFIG.career.business.sponsors.brands)[number];

/** Oyuncunun hak ettiği, henüz imzalamadığı sponsor teklifleri. */
export function availableSponsors(d: PlayerData): SponsorOffer[] {
  const cfg = GAME_CONFIG.career.business.sponsors;
  const have = new Set(d.sponsors.map((s) => s.id));
  return cfg.brands
    .filter(
      (b: BrandCfg) =>
        !have.has(b.id) &&
        d.reputation >= b.minReputation &&
        d.followers >= b.minFollowers
    )
    .map((b: BrandCfg) => ({
      id: b.id,
      brand: b.brand,
      perMatch: b.perMatch,
      signingBonus: b.signingBonus,
    }));
}

export type SignResult = 'ok' | 'full' | 'owned' | 'unavailable';

/** Bir sponsorluğu imzala: imza bonusu öde, aktif anlaşmalara ekle. */
export function signSponsor(store: PlayerStore, id: string): SignResult {
  const cfg = GAME_CONFIG.career.business.sponsors;
  const d = store.data;
  if (d.sponsors.some((s) => s.id === id)) return 'owned';
  if (d.sponsors.length >= cfg.maxActive) return 'full';
  const offer = availableSponsors(d).find((o) => o.id === id);
  if (!offer) return 'unavailable';
  store.addMoney(offer.signingBonus);
  d.sponsors.push({ id: offer.id, brand: offer.brand, perMatch: offer.perMatch });
  return 'ok';
}

/** Aktif sponsorların maç başına toplam geliri. */
export function sponsorIncome(d: PlayerData): number {
  return d.sponsors.reduce((sum, s) => sum + s.perMatch, 0);
}

/** Maç sonrası sponsor gelirini öde (store mutasyonu); ödenen tutarı döndürür. */
export function paySponsors(store: PlayerStore): number {
  const income = sponsorIncome(store.data);
  if (income > 0) store.addMoney(income);
  return income;
}

// --- Yaşam tarzı ---

type LifestyleCfg = (typeof GAME_CONFIG.career.business.lifestyle)[number];

export function lifestyleItems(): readonly LifestyleCfg[] {
  return GAME_CONFIG.career.business.lifestyle;
}

export type BuyResult = 'ok' | 'owned' | 'broke';

/** Bir yaşam tarzı öğesi satın al: para öder, moral + takipçi kazandırır. */
export function buyLifestyle(store: PlayerStore, id: string): BuyResult {
  const item = GAME_CONFIG.career.business.lifestyle.find((l) => l.id === id);
  const d = store.data;
  if (!item) return 'broke';
  if (d.lifestyle.includes(id)) return 'owned';
  if (d.money < item.cost) return 'broke';
  store.addMoney(-item.cost);
  d.lifestyle.push(id);
  store.addMorale(item.morale);
  d.followers += item.followers;
  return 'ok';
}
