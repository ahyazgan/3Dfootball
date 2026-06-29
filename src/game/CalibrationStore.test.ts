import { describe, it, expect } from 'vitest';
import { CalibrationStore } from './CalibrationStore';
import type { Calibration } from '../tracking/GestureDetector';

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

const cal: Calibration = {
  neutralLeanX: 0.48,
  bodyScale: 0.42,
  standingAnkleY: 0.94,
  leanRangeRight: 0.12,
  leanRangeLeft: 0.15,
};

describe('CalibrationStore', () => {
  it('başlangıçta kayıt yok -> null', () => {
    expect(new CalibrationStore(fakeStorage()).get()).toBeNull();
  });

  it('kaydedip geri yükler (tur)', () => {
    const s = new CalibrationStore(fakeStorage());
    s.set(cal);
    expect(s.get()).toEqual(cal);
  });

  it('bozuk veri -> null (çökmez)', () => {
    const fs = fakeStorage();
    fs.setItem('futbol3d.calibration', '{bozuk');
    expect(new CalibrationStore(fs).get()).toBeNull();
  });

  it('eksik alanlı kayıt -> null', () => {
    const fs = fakeStorage();
    fs.setItem('futbol3d.calibration', JSON.stringify({ neutralLeanX: 0.5 }));
    expect(new CalibrationStore(fs).get()).toBeNull();
  });

  it('clear kaydı siler', () => {
    const s = new CalibrationStore(fakeStorage());
    s.set(cal);
    s.clear();
    expect(s.get()).toBeNull();
  });

  it('storage yoksa güvenli', () => {
    const s = new CalibrationStore(null);
    expect(s.get()).toBeNull();
    s.set(cal); // çökmemeli
  });
});
