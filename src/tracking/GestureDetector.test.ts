import { describe, it, expect } from 'vitest';
import { GestureDetector } from './GestureDetector';
import type { PoseLandmarks } from './PoseTracker';

// MediaPipe Pose indeksleri (test için)
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_KNEE = 25;
const R_KNEE = 26;
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

/** Bacak (diz + ayak bileği) konumu olan kare. Tek/çift ayak desteği. */
function legs(opts: {
  lAnkle?: number;
  rAnkle?: number;
  lKnee?: number;
  rKnee?: number;
}): PoseLandmarks {
  return makeLandmarks({
    [L_ANKLE]: { y: opts.lAnkle ?? 0.9 },
    [R_ANKLE]: { y: opts.rAnkle ?? 0.9 },
    [L_KNEE]: { y: opts.lKnee ?? 0.7 },
    [R_KNEE]: { y: opts.rKnee ?? 0.7 },
  });
}

function feed(det: GestureDetector, lm: PoseLandmarks, frames: number) {
  let last = det.update(lm);
  for (let i = 1; i < frames; i++) last = det.update(lm);
  return last;
}

describe('GestureDetector — yön (eğilme)', () => {
  it('sola eğilince sol köşe seçer', () => {
    const det = new GestureDetector();
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
});

describe('GestureDetector — sürekli nişan', () => {
  it('tam sol -> -1, orta -> ~0, tam sağ -> +1', () => {
    const left = feed(
      new GestureDetector(),
      makeLandmarks({ [L_SHOULDER]: { x: 0.95 }, [R_SHOULDER]: { x: 0.95 } }),
      30
    );
    const mid = feed(new GestureDetector(), makeLandmarks(), 30);
    const right = feed(
      new GestureDetector(),
      makeLandmarks({ [L_SHOULDER]: { x: 0.05 }, [R_SHOULDER]: { x: 0.05 } }),
      30
    );
    expect(left.aim).toBeCloseTo(-1, 1);
    expect(Math.abs(mid.aim)).toBeLessThan(0.1);
    expect(right.aim).toBeCloseTo(1, 1);
  });

  it('kişisel eğilme aralığı nişanı asimetrik ölçekler (2. adım kalibrasyon)', () => {
    const cal = {
      neutralLeanX: 0.5,
      bodyScale: 0.45,
      standingAnkleY: 0.95,
      leanRangeRight: 0.1,
      leanRangeLeft: 0.2,
    };
    const detR = new GestureDetector();
    detR.setCalibration(cal);
    // shoulder 0.4 -> mirrored 0.6 -> dev +0.1 / sağ aralık 0.1 -> ~+1
    const right = feed(
      detR,
      makeLandmarks({ [L_SHOULDER]: { x: 0.4 }, [R_SHOULDER]: { x: 0.4 } }),
      30
    );
    expect(right.aim).toBeCloseTo(1, 1);

    const detL = new GestureDetector();
    detL.setCalibration(cal);
    // mirrored 0.4 -> dev -0.1 / sol aralık 0.2 -> ~-0.5
    const left = feed(
      detL,
      makeLandmarks({ [L_SHOULDER]: { x: 0.6 }, [R_SHOULDER]: { x: 0.6 } }),
      30
    );
    expect(left.aim).toBeCloseTo(-0.5, 1);
  });

  it('az eğilme küçük açı verir (sürekli)', () => {
    // shoulder x 0.46 -> mirrored 0.54 -> dev +0.04 -> aim ~0.22
    const r = feed(
      new GestureDetector(),
      makeLandmarks({ [L_SHOULDER]: { x: 0.46 }, [R_SHOULDER]: { x: 0.46 } }),
      30
    );
    expect(r.aim).toBeGreaterThan(0);
    expect(r.aim).toBeLessThan(0.5);
  });
});

describe('GestureDetector — şut (bacak savurma)', () => {
  it('ayak bileği + diz birlikte hızla yükselince şut tetiklenir', () => {
    const det = new GestureDetector();
    det.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    const r = det.update(legs({ lAnkle: 0.83, rAnkle: 0.83, lKnee: 0.63, rKnee: 0.63 }));
    expect(r.kick).toBe(true);
    expect(r.power).toBeGreaterThan(0);
  });

  it('diz hareket etmezse (gürültü) şut tetiklenmez', () => {
    const det = new GestureDetector();
    det.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    // ayak bileği zıpladı ama diz sabit -> reddedilir
    const r = det.update(legs({ lAnkle: 0.78, rAnkle: 0.78, lKnee: 0.7, rKnee: 0.7 }));
    expect(r.kick).toBe(false);
  });

  it('hangi ayakla vurulduğunu çıkarır (sağ ayak)', () => {
    const det = new GestureDetector();
    det.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    // sadece sağ bacak savruldu
    const r = det.update(legs({ lAnkle: 0.9, rAnkle: 0.8, lKnee: 0.7, rKnee: 0.6 }));
    expect(r.kick).toBe(true);
    expect(r.kickFoot).toBe('right');
  });

  it('cooldown: art arda iki şut tetiklenmez', () => {
    const det = new GestureDetector();
    det.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    const first = det.update(legs({ lAnkle: 0.8, rAnkle: 0.8, lKnee: 0.6, rKnee: 0.6 }));
    const second = det.update(legs({ lAnkle: 0.7, rAnkle: 0.7, lKnee: 0.5, rKnee: 0.5 }));
    expect(first.kick).toBe(true);
    expect(second.kick).toBe(false);
  });

  it('güç hıza göre ölçeklenir (sert vuruş daha güçlü)', () => {
    const slow = new GestureDetector();
    slow.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    const slowR = slow.update(
      legs({ lAnkle: 0.83, rAnkle: 0.83, lKnee: 0.63, rKnee: 0.63 })
    );

    const fast = new GestureDetector();
    fast.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    const fastR = fast.update(legs({ lAnkle: 0.7, rAnkle: 0.7, lKnee: 0.5, rKnee: 0.5 }));

    expect(fastR.power).toBeGreaterThan(slowR.power);
    expect(slowR.power).toBeGreaterThanOrEqual(0.25);
    expect(fastR.power).toBeLessThanOrEqual(1);
  });

  it('diz görünmüyorsa ayak bileğiyle çalışır (diz kapısı atlanır)', () => {
    const det = new GestureDetector();
    const a = legs({ lAnkle: 0.9, rAnkle: 0.9 });
    (a[L_KNEE] as { visibility: number }).visibility = 0.1;
    (a[R_KNEE] as { visibility: number }).visibility = 0.1;
    det.update(a);
    const b = legs({ lAnkle: 0.82, rAnkle: 0.82 });
    (b[L_KNEE] as { visibility: number }).visibility = 0.1;
    (b[R_KNEE] as { visibility: number }).visibility = 0.1;
    const r = det.update(b);
    expect(r.kick).toBe(true);
  });
});

describe('GestureDetector — otomatik drift düzeltme', () => {
  it('dururken nötr referans güncel konuma kayar (düğmesiz yeniden kalibrasyon)', () => {
    const det = new GestureDetector();
    det.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.45, standingAnkleY: 0.95 });
    // Oyuncu hafifçe kaydı: mirrored ~0.53 (shoulder 0.47), ayakta duruyor
    const lm = makeLandmarks({
      [L_SHOULDER]: { x: 0.47 },
      [R_SHOULDER]: { x: 0.47 },
      [L_ANKLE]: { y: 0.95 },
      [R_ANKLE]: { y: 0.95 },
    });
    for (let i = 0; i < 250; i++) det.update(lm);
    const cal = det.getCalibration();
    expect(cal.neutralLeanX).toBeGreaterThan(0.51); // nötr kaydı izledi
    const r = det.update(lm);
    expect(Math.abs(r.aim)).toBeLessThan(0.15); // yeni nötr = merkez
  });

  it('belirgin (kasıtlı) eğilmede nötr kaymaz', () => {
    const det = new GestureDetector();
    det.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.45, standingAnkleY: 0.95 });
    // shoulder 0.1 -> mirrored 0.9: aim büyük -> kasıtlı eğilme, adapt etme
    const lm = makeLandmarks({
      [L_SHOULDER]: { x: 0.1 },
      [R_SHOULDER]: { x: 0.1 },
      [L_ANKLE]: { y: 0.95 },
      [R_ANKLE]: { y: 0.95 },
    });
    for (let i = 0; i < 120; i++) det.update(lm);
    expect(det.getCalibration().neutralLeanX).toBeCloseTo(0.5, 2);
  });
});

describe('GestureDetector — kalibrasyon kontrol listesi', () => {
  it('tüm vücut görünürse hepsi ✓', () => {
    const list = GestureDetector.checklist(legs({}));
    expect(list.map((c) => c.label)).toEqual(['Omuzlar', 'Kalça', 'Dizler', 'Ayaklar']);
    expect(list.every((c) => c.ok)).toBe(true);
  });

  it('ayaklar görünmüyorsa Ayaklar ✗', () => {
    const lm = legs({});
    (lm[L_ANKLE] as { visibility: number }).visibility = 0.1;
    const list = GestureDetector.checklist(lm);
    expect(list.find((c) => c.label === 'Ayaklar')?.ok).toBe(false);
    expect(list.find((c) => c.label === 'Omuzlar')?.ok).toBe(true);
  });

  it('landmark yoksa hepsi ✗', () => {
    expect(GestureDetector.checklist(null).every((c) => !c.ok)).toBe(true);
  });
});

describe('GestureDetector — kalibrasyon', () => {
  it('nötr merkez kayınca o kişi için orta sayılır', () => {
    const det = new GestureDetector();
    det.setCalibration({ neutralLeanX: 0.35, bodyScale: 0.45, standingAnkleY: 0.95 });
    const lm = makeLandmarks({ [L_SHOULDER]: { x: 0.65 }, [R_SHOULDER]: { x: 0.65 } });
    const r = feed(det, lm, 30);
    expect(r.zone).toBe('center');
  });

  it('kalibre vücut ölçeği şut eşiğini ölçekler (büyük ölçek = zorlaşır)', () => {
    const near = new GestureDetector();
    near.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.9, standingAnkleY: 0.95 });
    near.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    const r = near.update(legs({ lAnkle: 0.83, rAnkle: 0.83, lKnee: 0.63, rKnee: 0.63 }));
    expect(r.kick).toBe(false); // upVel 0.07 < eşik 0.09
  });

  it('kalibreliyken ayak yeterince kalkmazsa şut yok (sadece-ayak şutu)', () => {
    const det = new GestureDetector();
    det.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.4, standingAnkleY: 0.95 });
    // minLift = 0.16*0.4 = 0.064; ayak nötre yakın kalır
    det.update(legs({ lAnkle: 0.95, rAnkle: 0.95, lKnee: 0.75, rKnee: 0.75 }));
    const r = det.update(legs({ lAnkle: 0.9, rAnkle: 0.9, lKnee: 0.7, rKnee: 0.7 }));
    expect(r.kick).toBe(false); // hız var ama gerçek kalkış yok
  });

  it('kalibreliyken ayak gerçekten kalkınca şut tetiklenir', () => {
    const det = new GestureDetector();
    det.setCalibration({ neutralLeanX: 0.5, bodyScale: 0.4, standingAnkleY: 0.95 });
    det.update(legs({ lAnkle: 0.95, rAnkle: 0.95, lKnee: 0.75, rKnee: 0.75 }));
    const r = det.update(legs({ lAnkle: 0.83, rAnkle: 0.83, lKnee: 0.63, rKnee: 0.63 }));
    expect(r.kick).toBe(true); // kalkış 0.12 > 0.064
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

  it('anahtar nokta görünmüyorsa takip edilmedi sayılır + eksik listelenir', () => {
    const det = new GestureDetector();
    const lm = legs({ lAnkle: 0.6, rAnkle: 0.6 });
    (lm[L_SHOULDER] as { visibility: number }).visibility = 0.1;
    const r = det.update(lm);
    expect(r.tracked).toBe(false);
    expect(r.kick).toBe(false);
    expect(r.missing).toContain('omuzlar');
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
    det.update(legs({ lAnkle: 0.9, rAnkle: 0.9 }));
    det.reset();
    const r = det.update(legs({ lAnkle: 0.6, rAnkle: 0.6 }));
    expect(r.kick).toBe(false);
  });
});
