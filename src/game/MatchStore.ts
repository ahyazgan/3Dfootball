/**
 * Kariyer istatistiklerini kalıcı saklar (localStorage): oynanan maç,
 * galibiyet/beraberlik/mağlubiyet ve atılan gol. Test için Storage
 * dışarıdan verilebilir; erişilemezse sessizce sıfırlanır.
 */
export interface CareerStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  /** Kariyer puanı (galibiyet 3, beraberlik 1). */
  points: number;
}

const EMPTY: CareerStats = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  points: 0,
};

export class MatchStore {
  private key = 'futbol3d.career';
  private storage: Storage | null;

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage;
  }

  get(): CareerStats {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return { ...EMPTY };
      const p = JSON.parse(raw) as Partial<CareerStats>;
      return {
        played: num(p.played),
        wins: num(p.wins),
        draws: num(p.draws),
        losses: num(p.losses),
        goalsFor: num(p.goalsFor),
        points: num(p.points),
      };
    } catch {
      return { ...EMPTY };
    }
  }

  /** Bir maç sonucunu kaydet ve güncel kariyeri döndür. */
  record(outcome: 'win' | 'draw' | 'loss', goalsFor: number): CareerStats {
    const c = this.get();
    c.played++;
    c.goalsFor += Math.max(0, goalsFor);
    if (outcome === 'win') {
      c.wins++;
      c.points += 3;
    } else if (outcome === 'draw') {
      c.draws++;
      c.points += 1;
    } else {
      c.losses++;
    }
    try {
      this.storage?.setItem(this.key, JSON.stringify(c));
    } catch {
      // sessizce yoksay (özel mod / kota)
    }
    return c;
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
