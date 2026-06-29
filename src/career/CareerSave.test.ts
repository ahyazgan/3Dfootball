import { describe, it, expect } from 'vitest';
import { CareerSave } from './CareerSave';
import { PlayerStore } from './PlayerStore';

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

const player = PlayerStore.create('Mert', 'forward', { skin: 1, hair: 1, kit: 2 });

describe('CareerSave', () => {
  it('başlangıçta kayıt yok', () => {
    const s = new CareerSave(fakeStorage());
    expect(s.get()).toBeNull();
    expect(s.exists()).toBe(false);
  });

  it('kaydedip geri yükler (tur)', () => {
    const s = new CareerSave(fakeStorage());
    s.set(player);
    expect(s.exists()).toBe(true);
    expect(s.get()).toEqual(player);
  });

  it('bozuk veri -> null', () => {
    const fs = fakeStorage();
    fs.setItem('futbol3d.career', '{bozuk');
    expect(new CareerSave(fs).get()).toBeNull();
  });

  it('eksik alanlı kayıt -> null', () => {
    const fs = fakeStorage();
    fs.setItem('futbol3d.career', JSON.stringify({ name: 'X' }));
    expect(new CareerSave(fs).get()).toBeNull();
  });

  it('clear kaydı siler', () => {
    const s = new CareerSave(fakeStorage());
    s.set(player);
    s.clear();
    expect(s.get()).toBeNull();
  });

  it('storage yoksa güvenli', () => {
    const s = new CareerSave(null);
    expect(s.get()).toBeNull();
    s.set(player); // çökmemeli
  });
});
