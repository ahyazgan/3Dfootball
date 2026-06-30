import { describe, it, expect } from 'vitest';
import {
  isCalledUp,
  createTournament,
  currentRound,
  isTournamentOver,
  recordTournamentMatch,
} from './Tournament';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

const T = GAME_CONFIG.career.tournament;

function store(overrides: Partial<ReturnType<typeof PlayerStore.createDefault>> = {}) {
  const s = new PlayerStore();
  Object.assign(s.data, overrides);
  return s;
}

describe('Tournament.isCalledUp', () => {
  it('şöhret eşiği ya da kap varsa çağrılır', () => {
    expect(isCalledUp(store().data)).toBe(false);
    expect(
      isCalledUp(store({ reputation: GAME_CONFIG.career.awards.nationalRepThreshold }).data)
    ).toBe(true);
    expect(isCalledUp(store({ nationalCaps: 1 }).data)).toBe(true);
  });
});

describe('Tournament.createTournament', () => {
  it('tur sayısı kadar benzersiz rakip kurar', () => {
    const t = createTournament(store().data, () => 0.3);
    expect(t.rounds).toEqual(T.rounds);
    expect(t.opponents).toHaveLength(T.rounds.length);
    expect(new Set(t.opponents).size).toBe(t.opponents.length);
    expect(t.opponents).not.toContain(T.nationalTeam);
    expect(t.roundIndex).toBe(0);
    expect(isTournamentOver(t)).toBe(false);
  });

  it('sezon paritesi turnuva adını belirler', () => {
    const even = createTournament(store({ season: 4 }).data, () => 0);
    const odd = createTournament(store({ season: 3 }).data, () => 0);
    expect(even.name).toContain(T.names.even);
    expect(odd.name).toContain(T.names.odd);
  });
});

describe('Tournament.recordTournamentMatch', () => {
  it('eşik üstü reyting bir üst tura taşır + ödül verir', () => {
    const s = store({ nationalCaps: 0 });
    s.data.tournament = createTournament(s.data, () => 0.2);
    const rep0 = s.data.reputation;
    const res = recordTournamentMatch(s, T.advanceRating + 1);
    expect(res.advanced).toBe(true);
    expect(res.champion).toBe(false);
    expect(s.data.tournament!.roundIndex).toBe(1);
    expect(s.data.reputation).toBe(rep0 + T.rewards.perRoundRep);
    expect(s.data.nationalCaps).toBe(1);
  });

  it('eşik altı reyting eler', () => {
    const s = store();
    s.data.tournament = createTournament(s.data, () => 0.2);
    const res = recordTournamentMatch(s, T.advanceRating - 1);
    expect(res.advanced).toBe(false);
    expect(res.over).toBe(true);
    expect(s.data.tournament!.eliminated).toBe(true);
  });

  it('finali geçmek şampiyonluk + uluslararası kupa verir', () => {
    const s = store();
    s.data.tournament = createTournament(s.data, () => 0.2);
    // Tüm turları kazan
    for (let i = 0; i < T.rounds.length; i++) {
      recordTournamentMatch(s, T.advanceRating + 1);
    }
    expect(s.data.tournament!.champion).toBe(true);
    expect(s.data.internationalTitles).toBe(1);
    expect(currentRound(s.data.tournament!)).toBeNull();
  });

  it('biten turnuvada maç işlenmez', () => {
    const s = store();
    s.data.tournament = createTournament(s.data, () => 0.2);
    s.data.tournament.eliminated = true;
    const res = recordTournamentMatch(s, 10);
    expect(res.over).toBe(true);
    expect(res.advanced).toBe(false);
  });
});
