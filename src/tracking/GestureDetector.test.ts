import { describe, it, expect } from 'vitest';
import { GestureDetector } from './GestureDetector';
import type { PoseLandmarks } from './PoseTracker';

// MediaPipe Pose indeksleri (test için)
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ANKLE = 27;
const R_ANKLE = 28;

/** 33 noktalı sahte landmark dizisi; belirtilen indeksler ezilir. */
function makeLandmarks(
  overrides: Record<number, { x?: number; y?: number }> = {}
): PoseLandmarks {
  const arr = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  for (const [i, v] of Object.entries(overrides)) {
    arr[+i] = { ...arr[+i], ...v };
  }
  return arr as unknown as PoseLandmarks;
}

/** Belirli omuz/ayak konumuyla n kare besle, son durumu döndür. */
function feed(
  det: GestureDetector,
  lm: ReturnType<typeof makeLandmarks>,
  frames: number
) {
  let last = det.update(lm);
  for (let i = 1; i < frames; i++) last = det.update(lm);
  return last;
}

describe('GestureDetector — yön (eğilme)', () => {
  it('sola eğilince sol köşe seçer', () => {
    const det = new GestureDetector();
    // Omuzlar sağda (x büyük) -> aynalı x küçük -> sol köşe
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 0.95 }, [R_SHOULDER]: { x: 0.95 } });
    const r = feed(det, lm, 25);
    expect(r.zone).toBe('left');
    expect(r.leanX).toBeLessThan(0.42);
  });

  it('sağa eğilince sağ köşe seçer', () => {
    const det = new GestureDetector();
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 0.05 }, [R_SHOULDER]: { x: 0.05 } });
    const r = feed(det, lm, 25);
    expect(r.zone).toBe('right');
    expect(r.leanX).toBeGreaterThan(0.58);
  });

  it('ortada durunca orta köşe', () => {
    const det = new GestureDetector();
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 0.5 }, [R_SHOULDER]: { x: 0.5 } });
    const r = feed(det, lm, 25);
    expect(r.zone).toBe('center');
  });

  it('yumuşatma uygular: tek karede ani sıçramaz', () => {
    const det = new GestureDetector();
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 1 }, [R_SHOULDER]: { x: 1 } });
    const r = det.update(lm); // tek kare
    // 0.5 -> hedef 0 ama %20 harman: ~0.4, henüz tam uçta değil
    expect(r.leanX).toBeGreaterThan(0.3);
    expect(r.leanX).toBeLessThan(0.5);
  });
});

describe('GestureDetector — şut (bacak savurma)', () => {
  it('ayak bileği yeterince hızlı yukarı çıkınca şut tetiklenir', () => {
    const det = new GestureDetector();
    det.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } })); // prev=0.9
    const r = det.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.83 }, [R_ANKLE]: { y: 0.83 } })
    );
    expect(r.kick).toBe(true);
    expect(r.power).toBeGreaterThan(0);
  });

  it('eşik altı yavaş hareket şut tetiklemez', () => {
    const det = new GestureDetector();
    det.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    const r = det.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.88 }, [R_ANKLE]: { y: 0.88 } })
    );
    expect(r.kick).toBe(false);
  });

  it('cooldown: art arda iki şut tetiklenmez', () => {
    const det = new GestureDetector();
    det.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    const first = det.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.8 }, [R_ANKLE]: { y: 0.8 } })
    );
    const second = det.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.7 }, [R_ANKLE]: { y: 0.7 } })
    );
    expect(first.kick).toBe(true);
    expect(second.kick).toBe(false); // cooldown aktif
  });

  it('güç hıza göre ölçeklenir (sert vuruş daha güçlü)', () => {
    const slow = new GestureDetector();
    slow.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    const slowR = slow.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.83 }, [R_ANKLE]: { y: 0.83 } })
    );

    const fast = new GestureDetector();
    fast.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    const fastR = fast.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.7 }, [R_ANKLE]: { y: 0.7 } })
    );

    expect(fastR.power).toBeGreaterThan(slowR.power);
    expect(slowR.power).toBeGreaterThanOrEqual(0.25); // taban güç
    expect(fastR.power).toBeLessThanOrEqual(1);
  });
});

describe('GestureDetector — kalibrasyon', () => {
  it('nötr merkez kayınca o kişi için orta sayılır', () => {
    const det = new GestureDetector();
    // Bu kişinin nötr duruşu aynalı x ~0.35 (kameraya göre solda durur)
    det.setCalibration({ neutralLeanX: 0.35, bodyScale: 0.45 });
    // Aynı 0.35 civarında dururken (shoulder x = 0.65 -> mirrored 0.35) -> orta
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 0.65 }, [R_SHOULDER]: { x: 0.65 } });
    const r = feed(det, lm, 30);
    expect(r.zone).toBe('center');
  });

  it('kalibre vücut ölçeği şut eşiğini ölçekler (büyük ölçek = zorlaşır)', () => {
    // Yakın oyuncu (büyük ölçek) -> eşik yükselir -> aynı hareket tetiklemez
    const near = new GestureDetector();
    near.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.9 }); // refScale 0.45 -> 2x eşik
    near.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    const r = near.update(
      makeLandmarks({ [L_ANKLE]: { y: 0.83 }, [R_ANKLE]: { y: 0.83 } })
    );
    // upVel 0.07; eşik 0.045*2=0.09 -> tetiklenmez
    expect(r.kick).toBe(false);
  });
});

describe('GestureDetector — sağlamlık', () => {
  it('landmark yokken güvenli varsayılan döndürür', () => {
    const det = new GestureDetector();
    const r = det.update(null);
    expect(r.kick).toBe(false);
    expect(r.tracked).toBe(false);
    expect(['left', 'center', 'right']).toContain(r.zone);
  });

  it('anahtar nokta görünmüyorsa takip edilmedi sayılır, şut yok', () => {
    const det = new GestureDetector();
    det.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 }, [R_ANKLE]: { y: 0.9 } }));
    // Omuz görünürlüğü düşük -> tracked false
    const lm = makeLandmarks({ [L_ANKLE]: { y: 0.6 }, [R_ANKLE]: { y: 0.6 } });
    (lm[11] as { visibility: number }).visibility = 0.1;
    const r = det.update(lm);
    expect(r.tracked).toBe(false);
    expect(r.kick).toBe(false);
  });

  it('eksik landmark dizisi (33 altı) şut tetiklemez', () => {
    const det = new GestureDetector();
    const r = det.update([
      { x: 0.5, y: 0.5, z: 0, visibility: 1 },
    ] as unknown as PoseLandmarks);
    expect(r.kick).toBe(false);
  });

  it('reset sonrası ilk karede şut tetiklenmez', () => {
    const det = new GestureDetector();
    det.update(makeLandmarks({ [L_ANKLE]: { y: 0.9 } }));
    det.reset();
    const r = det.update(makeLandmarks({ [L_ANKLE]: { y: 0.6 } }));
    expect(r.kick).toBe(false); // prevAnkleY sıfırlandı + cooldown
  });
});
