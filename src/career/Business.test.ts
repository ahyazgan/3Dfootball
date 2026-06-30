import { describe, it, expect } from 'vitest';
import {
  formatFollowers,
  followerGain,
  updateFollowers,
  availableSponsors,
  signSponsor,
  sponsorIncome,
  paySponsors,
  buyLifestyle,
} from './Business';
import type { MatchOutcome } from './MatchResult';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

function store(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  const s = new PlayerStore();
  Object.assign(s.data, overrides);
  return s;
}
function outcome(o: Partial<MatchOutcome> = {}): MatchOutcome {
  return {
    opponent: 'X',
    rating: 7,
    goals: 2,
    moments: 5,
    money: 0,
    reputation: 0,
    value: 0,
    transferInterest: false,
    isDerby: false,
    bonusMorale: 0,
    eventLabels: [],
    ...o,
  };
}

const B = GAME_CONFIG.career.business;

describe('Business followers', () => {
  it('formatFollowers kısaltır', () => {
    expect(formatFollowers(900)).toBe('900');
    expect(formatFollowers(2500)).toBe('2.5K');
    expect(formatFollowers(2_000_000)).toBe('2.0M');
  });

  it('gol ve reyting takipçi kazandırır', () => {
    const g = followerGain(outcome({ goals: 3, rating: 8 }));
    expect(g).toBe(B.followers.base + 3 * B.followers.perGoal + 3 * B.followers.perRatingOver5);
  });

  it('updateFollowers store takipçisini artırır', () => {
    const s = store();
    const f0 = s.data.followers;
    const gain = updateFollowers(s, outcome({ goals: 1, rating: 6 }));
    expect(s.data.followers).toBe(f0 + gain);
  });
});

describe('Business sponsors', () => {
  it('itibar/takipçi yetersizse teklif gelmez', () => {
    const offers = availableSponsors(store({ reputation: 0, followers: 0 }).data);
    // En düşük marka (minReputation 0, minFollowers 0) gelir
    expect(offers.some((o) => o.id === 'localshoe')).toBe(true);
    expect(offers.some((o) => o.id === 'megabrand')).toBe(false);
  });

  it('imzalama geliri ekler, kota dolunca reddeder', () => {
    const s = store({ reputation: 900, followers: 1_000_000 });
    expect(signSponsor(s, 'localshoe')).toBe('ok');
    expect(signSponsor(s, 'localshoe')).toBe('owned');
    expect(sponsorIncome(s.data)).toBeGreaterThan(0);
    // kotaya kadar doldur
    const ids = ['energydrink', 'watch', 'sportswear', 'megabrand'];
    let signed = 1;
    for (const id of ids) {
      const r = signSponsor(s, id);
      if (r === 'ok') signed++;
      if (r === 'full') break;
    }
    expect(s.data.sponsors.length).toBe(B.sponsors.maxActive);
    expect(signed).toBe(B.sponsors.maxActive);
  });

  it('paySponsors maç başına geliri öder', () => {
    const s = store({ reputation: 900, followers: 1_000_000 });
    signSponsor(s, 'localshoe');
    const m0 = s.data.money;
    const paid = paySponsors(s);
    expect(paid).toBe(sponsorIncome(s.data));
    expect(s.data.money).toBe(m0 + paid);
  });
});

describe('Business lifestyle', () => {
  it('para varsa satın alınır: moral + takipçi + sahiplik', () => {
    const s = store({ money: 100000, morale: 50 });
    const f0 = s.data.followers;
    expect(buyLifestyle(s, 'apartment')).toBe('ok');
    expect(s.data.lifestyle).toContain('apartment');
    expect(s.data.morale).toBeGreaterThan(50);
    expect(s.data.followers).toBeGreaterThan(f0);
    expect(buyLifestyle(s, 'apartment')).toBe('owned');
  });

  it('para yetmezse alınmaz', () => {
    expect(buyLifestyle(store({ money: 0 }), 'jet')).toBe('broke');
  });
});
