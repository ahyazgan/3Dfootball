import { describe, it, expect } from 'vitest';
import { ScoreStore } from './ScoreStore';

/** Basit bellek tabanlı Storage taklidi. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe('ScoreStore', () => {
  it('başlangıçta en iyi skor 0', () => {
    const s = new ScoreStore(fakeStorage());
    expect(s.getBest()).toBe(0);
  });

  it('rekor kırılınca kaydeder ve true döner', () => {
    const s = new ScoreStore(fakeStorage());
    expect(s.trySetBest(250)).toBe(true);
    expect(s.getBest()).toBe(250);
  });

  it('rekoru geçmeyen skor kaydedilmez', () => {
    const s = new ScoreStore(fakeStorage());
    s.trySetBest(250);
    expect(s.trySetBest(200)).toBe(false);
    expect(s.getBest()).toBe(250);
  });

  it('storage yoksa güvenli (0 döner, hata atmaz)', () => {
    const s = new ScoreStore(null);
    expect(s.getBest()).toBe(0);
    expect(s.trySetBest(100)).toBe(true); // 100 > 0
    expect(s.getBest()).toBe(0); // kalıcı değil ama çökmesin
  });
});
