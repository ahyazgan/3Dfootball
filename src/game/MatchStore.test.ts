import { describe, it, expect, beforeEach } from 'vitest';
import { MatchStore } from './MatchStore';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('MatchStore — kariyer', () => {
  let store: MatchStore;
  beforeEach(() => {
    store = new MatchStore(new MemStorage());
  });

  it('boş kariyer sıfırdan başlar', () => {
    const c = store.get();
    expect(c).toEqual({ played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, points: 0 });
  });

  it('galibiyet 3 puan ekler', () => {
    const c = store.record('win', 3);
    expect(c.played).toBe(1);
    expect(c.wins).toBe(1);
    expect(c.goalsFor).toBe(3);
    expect(c.points).toBe(3);
  });

  it('beraberlik 1 puan, mağlubiyet 0 puan', () => {
    store.record('draw', 1);
    const c = store.record('loss', 0);
    expect(c.played).toBe(2);
    expect(c.draws).toBe(1);
    expect(c.losses).toBe(1);
    expect(c.points).toBe(1);
  });

  it('kayıt kalıcıdır (aynı storage)', () => {
    store.record('win', 2);
    const c = store.get();
    expect(c.wins).toBe(1);
    expect(c.goalsFor).toBe(2);
  });

  it('bozuk veri sessizce sıfırlanır', () => {
    const s = new MemStorage();
    s.setItem('futbol3d.career', '{bozuk');
    const c = new MatchStore(s).get();
    expect(c.played).toBe(0);
  });
});
