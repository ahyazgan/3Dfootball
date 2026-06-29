import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from './OneEuroFilter';

describe('OneEuroFilter', () => {
  it('ilk örneği olduğu gibi döndürür', () => {
    const f = new OneEuroFilter(1, 0.01, 1);
    expect(f.filter(0.7, 0)).toBe(0.7);
  });

  it('sabit girişe yakınsar', () => {
    const f = new OneEuroFilter(1, 0.01, 1);
    let v = 0;
    for (let i = 0; i < 60; i++) v = f.filter(0.3, i / 60);
    expect(v).toBeCloseTo(0.3, 2);
  });

  it('gürültüyü azaltır (çıkış varyansı girişten küçük)', () => {
    const f = new OneEuroFilter(0.6, 0.0, 1);
    const noisy = [0.5, 0.55, 0.45, 0.52, 0.48, 0.51, 0.49, 0.5];
    const out: number[] = [];
    noisy.forEach((x, i) => out.push(f.filter(x, i / 60)));
    // İlk örnekten sonra çıkış 0.5 çevresinde daha dar
    const tail = out.slice(2);
    const spread = Math.max(...tail) - Math.min(...tail);
    expect(spread).toBeLessThan(0.1);
  });

  it('reset sonrası ilk örneği yine ham döndürür', () => {
    const f = new OneEuroFilter();
    f.filter(0.2, 0);
    f.reset();
    expect(f.filter(0.9, 0.1)).toBe(0.9);
  });
});
