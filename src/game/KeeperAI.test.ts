import { describe, it, expect, vi, afterEach } from 'vitest';
import { KeeperAI } from './KeeperAI';
import { GAME_CONFIG } from '../config';

const TOTAL = GAME_CONFIG.totalShots;

/** Math.random'ı sıraya konmuş değerlerle taklit et (son değer tekrarlanır). */
function mockRandom(values: number[]) {
  let i = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    const v = values[Math.min(i, values.length - 1)];
    i++;
    return v;
  });
}

afterEach(() => vi.restoreAllMocks());

describe('KeeperAI — geçerlilik', () => {
  it('her zaman geçerli bir köşe döndürür', () => {
    const ai = new KeeperAI();
    for (let r = 0; r < 50; r++) {
      // rastgele gerçek davranış
      const zone = ai.decide('center', r % TOTAL, TOTAL);
      expect(['left', 'center', 'right']).toContain(zone);
    }
  });
});

describe('KeeperAI — akıllı karar (anlık okuma)', () => {
  it('beceri tutunca ve okuma şansı geçince oyuncunun yönünü seçer', () => {
    // 1. random < skill (akıllı), 2. random < readAimChance (anlık oku)
    mockRandom([0.0, 0.0]);
    const ai = new KeeperAI();
    expect(ai.decide('right', 0, TOTAL)).toBe('right');
  });
});

describe('KeeperAI — eğilim okuma (geçmiş)', () => {
  it('tekrar eden köşeyi geçmişten tahmin eder', () => {
    const ai = new KeeperAI();
    ai.record('right');
    ai.record('right');
    ai.record('right');
    // akıllı (0.0) ama anlık okuma DEĞİL (0.99) -> geçmiş tahmini devreye girer
    mockRandom([0.0, 0.99]);
    // Oyuncu 'left' niyetinde olsa bile geçmiş 'right' eğilimini yakalar
    expect(ai.decide('left', 4, TOTAL)).toBe('right');
  });

  it('belirgin eğilim yoksa anlık yöne düşer', () => {
    const ai = new KeeperAI();
    ai.record('left'); // tek kayıt, eşik altı
    mockRandom([0.0, 0.99]);
    expect(ai.decide('center', 1, TOTAL)).toBe('center');
  });
});

describe('KeeperAI — beceri rampası', () => {
  it('maç sonunda başlangıçtan daha çok tutturur', () => {
    const ai = new KeeperAI();
    const skillEnd = GAME_CONFIG.keeper.skillBase + GAME_CONFIG.keeper.skillRamp; // ~0.78
    const mid = (GAME_CONFIG.keeper.skillBase + skillEnd) / 2; // skillBase ile skillEnd arası

    // İlk atış (progress 0, skill = skillBase): mid > skillBase -> blöf (rastgele)
    mockRandom([mid, 0.0]); // 1.random=mid; blöfte 2.random=0 -> 'left'
    const early = ai.decide('right', 0, TOTAL);
    expect(early).toBe('left'); // anlık yön 'right' değil -> akıllı yol seçilmedi

    vi.restoreAllMocks();

    // Son atış (progress 1, skill = skillEnd): mid < skillEnd -> akıllı + anlık oku
    mockRandom([mid, 0.0]);
    const late = ai.decide('right', TOTAL - 1, TOTAL);
    expect(late).toBe('right'); // okudu
  });
});

describe('KeeperAI — zorluk', () => {
  it('düşük beceride blöf, yüksek beceride okuma', () => {
    const ai = new KeeperAI();
    ai.setSkill(0.1, 0.0); // çok kolay
    mockRandom([0.5, 0.0]); // 0.5 > 0.1 -> blöf -> 'left'
    expect(ai.decide('right', 0, TOTAL)).toBe('left');

    vi.restoreAllMocks();
    ai.setSkill(0.95, 0.0); // çok zor
    mockRandom([0.5, 0.0]); // 0.5 < 0.95 -> akıllı + oku -> 'right'
    expect(ai.decide('right', 0, TOTAL)).toBe('right');
  });
});

describe('KeeperAI — reset', () => {
  it('geçmişi temizler', () => {
    const ai = new KeeperAI();
    ai.record('left');
    ai.record('left');
    ai.reset();
    // Geçmiş silindi: eğilim tahmini yok, anlık yöne düşer
    mockRandom([0.0, 0.99]);
    expect(ai.decide('center', 2, TOTAL)).toBe('center');
  });
});
