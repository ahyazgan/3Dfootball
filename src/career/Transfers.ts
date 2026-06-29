import { GAME_CONFIG } from '../config';
import { TIER_ORDER, type CareerTier, type PlayerData } from './types';
import type { PlayerStore } from './PlayerStore';

export interface TransferOffer {
  club: string;
  tier: CareerTier;
  signingBonus: number;
}

type ClubTier = keyof typeof GAME_CONFIG.career.transfers.clubsByTier;

/**
 * Sezon sonu transfer teklifleri: oyuncunun tier'ı ve bir üst tier'daki
 * kulüplerden, değerine göre imza bonuslu teklifler. rng enjekte edilebilir.
 */
export function generateOffers(
  player: PlayerData,
  rng: () => number = Math.random
): TransferOffer[] {
  const cfg = GAME_CONFIG.career.transfers;
  if (rng() > cfg.offerChance) return []; // bu sezon teklif yok

  const tierIdx = Math.max(0, TIER_ORDER.indexOf(player.careerTier));
  const candidateTiers = Array.from(
    new Set([player.careerTier, TIER_ORDER[Math.min(tierIdx + 1, TIER_ORDER.length - 1)]])
  );

  const offers: TransferOffer[] = [];
  for (const tier of candidateTiers) {
    const clubs = cfg.clubsByTier[tier as ClubTier] as readonly string[] | undefined;
    if (!clubs || clubs.length === 0) continue;
    const club = clubs[Math.floor(rng() * clubs.length) % clubs.length];
    const signingBonus = Math.round(
      player.value * cfg.signingBonusValueMul * (1 + rng() * 0.5)
    );
    offers.push({ club, tier: tier as CareerTier, signingBonus });
    if (offers.length >= cfg.maxOffers) break;
  }
  return offers;
}

/** Teklifi kabul et: kulüp değiştir, imza bonusu + değer + moral. */
export function acceptOffer(store: PlayerStore, offer: TransferOffer): void {
  store.data.currentClub = offer.club;
  store.addMoney(offer.signingBonus);
  store.addValue(Math.round(offer.signingBonus * 0.5));
  store.addMorale(10);
}
