import { describe, it, expect } from 'vitest';
import { generateOffers, acceptOffer } from './Transfers';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

const T = GAME_CONFIG.career.transfers;

describe('Transfers', () => {
  it('düşük rng -> teklif gelir, sınırı aşmaz', () => {
    const p = new PlayerStore();
    p.data.value = 100000;
    const offers = generateOffers(p.data, () => 0.1);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.length).toBeLessThanOrEqual(T.maxOffers);
    expect(offers[0].signingBonus).toBeGreaterThan(0);
  });

  it('yüksek rng -> bazen teklif yok', () => {
    const p = new PlayerStore();
    expect(generateOffers(p.data, () => 0.99)).toEqual([]);
  });

  it('amatör oyuncuya yarı-pro kulüplerden teklif gelir', () => {
    const p = new PlayerStore(); // amateur
    const offers = generateOffers(p.data, () => 0.2);
    expect(offers.some((o) => o.tier === 'semipro')).toBe(true);
  });

  it('teklif kabul kulübü değiştirir + para/değer ekler', () => {
    const p = new PlayerStore();
    p.data.value = 100000;
    const money0 = p.data.money;
    const offers = generateOffers(p.data, () => 0.2);
    const offer = offers[0];
    acceptOffer(p, offer);
    expect(p.data.currentClub).toBe(offer.club);
    expect(p.data.money).toBe(money0 + offer.signingBonus);
    expect(p.data.value).toBeGreaterThan(100000);
  });
});
