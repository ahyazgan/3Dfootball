import type { PoseLandmarks } from './PoseTracker';
import type { DiveZone } from '../scene/Keeper';
import { GAME_CONFIG } from '../config';
import { OneEuroFilter } from './OneEuroFilter';

// MediaPipe Pose landmark indeksleri
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

export type Foot = 'left' | 'right';

/** Kameraya/oyuncuya göre referans değerler (kişisel vücut kalibrasyonu). */
export interface Calibration {
  /** Nötr duruşta aynalı omuz-orta x. */
  neutralLeanX: number;
  /** Bacak boyu (kalça-ayak mesafesi, normalize) — eşik/açı ölçeklemesi için. */
  bodyScale: number;
  /** Nötr (ayakta) ayak bileği y — şutta gerçek ayak kalkışını ölçmek için. */
  standingAnkleY: number;
  /** Kişisel sol eğilme aralığı (nötr - en sol). Yoksa ölçekten türetilir. */
  leanRangeLeft?: number;
  /** Kişisel sağ eğilme aralığı (en sağ - nötr). Yoksa ölçekten türetilir. */
  leanRangeRight?: number;
}

/** Tek karelik ham örnek (kalibrasyon için). */
export interface GestureSample {
  mirroredX: number;
  bodyScale: number;
  standingAnkleY: number;
}

export interface GestureState {
  /** Yön bölgesi (kaleci için): sol/orta/sağ. */
  zone: DiveZone;
  /** Sürekli nişan: -1 (tam sol) .. +1 (tam sağ). */
  aim: number;
  /** Yumuşatılmış, aynalanmış omuz x değeri (0..1). */
  leanX: number;
  /** Bu karede şut tetiklendi mi? */
  kick: boolean;
  /** Hangi ayakla vuruldu (tetiklendiğinde). */
  kickFoot: Foot | null;
  /** Şut gücü 0..1 (tetiklendiğinde anlamlı). */
  power: number;
  /** Görsel geri bildirim için anlık bacak yukarı hızı 0..1. */
  kickCharge: number;
  /** Vücut kadrajda ve güvenilir mi? (omuzlar + ayaklar) */
  tracked: boolean;
  /** Kadraj dışı/görünmeyen uzuvlar (uyarı için). */
  missing: string[];
}

/**
 * Landmark akışından eğilme (yön) ve bacak şutu (tetikleme) algılar.
 * - One-Euro filtre eğilmedeki titremeyi bastırır.
 * - Şut iki ayak ayrı izlenir; ayak bileği + diz birlikte yükselmeli
 *   (gürültüden gelen yanlış tetikleri eler). Hangi ayakla vurulduğu çıkarılır.
 * - Sürekli nişan: eğilme miktarı açıya çevrilir.
 * - Kalibrasyon kişiye/mesafeye göre eşikleri uyarlar.
 */
export class GestureDetector {
  private kickVelThreshold: number = GAME_CONFIG.gesture.kickVelThreshold;
  private cooldownFrames: number = GAME_CONFIG.gesture.kickCooldownFrames;
  private leanSmoothing: number = GAME_CONFIG.gesture.leanSmoothing;

  private cal: Calibration = {
    neutralLeanX: GAME_CONFIG.gesture.leanNeutral,
    bodyScale: GAME_CONFIG.gesture.referenceBodyScale,
    standingAnkleY: 1,
  };
  private calibrated = false;

  private leanFilter = new OneEuroFilter(
    GAME_CONFIG.gesture.oneEuro.minCutoff,
    GAME_CONFIG.gesture.oneEuro.beta,
    GAME_CONFIG.gesture.oneEuro.dCutoff
  );

  private smoothLeanX: number = GAME_CONFIG.gesture.leanNeutral;
  // Ayak bileği + diz önceki konumları (ayak başına)
  private prevLAnkle: number | null = null;
  private prevRAnkle: number | null = null;
  private prevLKnee = 0;
  private prevRKnee = 0;
  private cooldown = 0;
  private frame = 0;
  // Gözlenen tepe ayak hızı — güç haritalaması kişiye uyarlanır (0 = öğrenilmedi)
  private kickPeakVel = 0;

  /** Eşikleri dışarıdan ayarla (örn. "şut çok hassas"). */
  setKickThreshold(v: number) {
    this.kickVelThreshold = v;
  }

  /** Kişisel vücut kalibrasyonunu ayarla. */
  setCalibration(cal: Calibration) {
    this.cal = cal;
    this.calibrated = true;
    this.kickPeakVel = 0; // yeni kişi: ayak hızını yeniden öğren
    this.smoothLeanX = cal.neutralLeanX;
    this.leanFilter.reset();
  }

  getCalibration(): Calibration {
    return { ...this.cal };
  }

  update(landmarks: PoseLandmarks | null, timestampMs?: number): GestureState {
    if (this.cooldown > 0) this.cooldown--;
    // Zaman: verilmezse 60fps varsay
    const tSec = timestampMs !== undefined ? timestampMs / 1000 : (this.frame += 1) / 60;

    const missing = landmarks ? this.missingParts(landmarks) : ['vücut'];
    const tracked = !!landmarks && landmarks.length >= 33 && this.isVisible(landmarks);

    if (!tracked) {
      // Takip yoksa önceki yönü koru, şut alma
      return {
        zone: this.zoneFromLean(this.smoothLeanX),
        aim: this.aimFromLean(this.smoothLeanX),
        leanX: this.smoothLeanX,
        kick: false,
        kickFoot: null,
        power: 0,
        kickCharge: 0,
        tracked: false,
        missing,
      };
    }

    // --- Yön: omuz orta noktası, aynalı (1 - x), One-Euro + EMA ---
    const shoulderMidX = (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
    const mirroredX = this.leanFilter.filter(1 - shoulderMidX, tSec);
    const s = this.leanSmoothing;
    this.smoothLeanX = this.smoothLeanX * s + mirroredX * (1 - s);
    const zone = this.zoneFromLean(this.smoothLeanX);
    const aim = this.aimFromLean(this.smoothLeanX);

    // --- Şut: SADECE AYAK. İki ayak ayrı, diz desteği + gerçek kalkış ---
    // Eşik kişinin bacak boyuna göre ölçeklenir (kişisel kalibrasyon).
    const scale = this.cal.bodyScale / GAME_CONFIG.gesture.referenceBodyScale;
    const effThreshold = this.kickVelThreshold * scale;
    const kneeMin = effThreshold * GAME_CONFIG.gesture.kickKneeRatio;
    const minLift = GAME_CONFIG.gesture.kickRiseFrac * this.cal.bodyScale;
    const mul = GAME_CONFIG.gesture.powerRangeMul;

    const lAnkle = landmarks[L_ANKLE].y;
    const rAnkle = landmarks[R_ANKLE].y;
    const lKnee = landmarks[L_KNEE].y;
    const rKnee = landmarks[R_KNEE].y;
    // Diz güvenilir değilse (görünmüyorsa) diz kapısını atla
    const kneeReliable =
      this.visible(landmarks, L_KNEE) && this.visible(landmarks, R_KNEE);
    // Kalibreliyken: ayak nötr duruştan yeterince KALKMIŞ olmalı (gerçek şut)
    const lLiftOk = !this.calibrated || this.cal.standingAnkleY - lAnkle > minLift;
    const rLiftOk = !this.calibrated || this.cal.standingAnkleY - rAnkle > minLift;

    let kick = false;
    let kickFoot: Foot | null = null;
    let power = 0;
    let kickCharge = 0;

    // Güç referansı: kişinin gözlenen tepe ayak hızı (yoksa varsayılan).
    // Senin en sert vuruşun tam güç olur; yavaş vurursan orantılı güç.
    const defaultPeak = effThreshold * (1 + mul);
    if (this.kickPeakVel === 0) this.kickPeakVel = defaultPeak;
    const refVel = Math.max(defaultPeak * 0.5, this.kickPeakVel);

    if (this.prevLAnkle !== null && this.prevRAnkle !== null) {
      const lUp = this.prevLAnkle - lAnkle;
      const rUp = this.prevRAnkle - rAnkle;
      const lKneeUp = this.prevLKnee - lKnee;
      const rKneeUp = this.prevRKnee - rKnee;
      kickCharge = Math.max(0, Math.min(1, Math.max(lUp, rUp) / refVel));

      const lValid =
        lUp > effThreshold && (!kneeReliable || lKneeUp > kneeMin) && lLiftOk;
      const rValid =
        rUp > effThreshold && (!kneeReliable || rKneeUp > kneeMin) && rLiftOk;

      if (this.cooldown === 0 && (lValid || rValid)) {
        kick = true;
        const useRight = rValid && (!lValid || rUp >= lUp);
        kickFoot = useRight ? 'right' : 'left';
        const up = useRight ? rUp : lUp;
        const velPower = (up - effThreshold) / Math.max(0.01, refVel - effThreshold);
        // Kalibreliyken: ayağın ne kadar YÜKSEĞE kalktığı da güce katkı verir
        let p = velPower;
        if (this.calibrated) {
          const lift = this.cal.standingAnkleY - (useRight ? rAnkle : lAnkle);
          const liftPower = Math.max(
            0,
            Math.min(1, lift / (this.cal.bodyScale * GAME_CONFIG.gesture.kickLiftFull))
          );
          const w = GAME_CONFIG.gesture.powerLiftWeight;
          p = velPower * (1 - w) + liftPower * w;
        }
        power = Math.max(GAME_CONFIG.gesture.minPower, Math.min(1, p));
        // Tepe hızı öğren: hızlı yüksel, kicks boyunca yavaş düş
        this.kickPeakVel = Math.max(this.kickPeakVel * 0.9, up);
        this.cooldown = this.cooldownFrames;
      }
    }
    this.prevLAnkle = lAnkle;
    this.prevRAnkle = rAnkle;
    this.prevLKnee = lKnee;
    this.prevRKnee = rKnee;

    // --- Otomatik drift düzeltme (düğmesiz yeniden kalibrasyon) ---
    // Oyuncu dururken (nişan ~merkez, ayak yerde, şut yok) nötr referans
    // yavaşça güncel konuma kayar; kamera/duruş kayması kendiliğinden düzelir.
    if (this.calibrated && !kick) {
      const ankleAvg = (lAnkle + rAnkle) / 2;
      const footDown =
        this.cal.standingAnkleY - ankleAvg <
        GAME_CONFIG.gesture.kickRiseFrac * this.cal.bodyScale * 0.5;
      if (Math.abs(aim) < GAME_CONFIG.gesture.adaptIdleAim && footDown) {
        const r = GAME_CONFIG.gesture.adaptRate;
        this.cal.neutralLeanX += (mirroredX - this.cal.neutralLeanX) * r;
        this.cal.standingAnkleY += (ankleAvg - this.cal.standingAnkleY) * r;
      }
    }

    return {
      zone,
      aim,
      leanX: this.smoothLeanX,
      kick,
      kickFoot,
      power,
      kickCharge,
      tracked: true,
      missing,
    };
  }

  /** Köşe bölgesi (kaleci bandı): kişisel nişan açısına göre. */
  private zoneFromLean(x: number): DiveZone {
    const a = this.aimFromLean(x);
    const t = GAME_CONFIG.gesture.zoneAimThreshold;
    if (a < -t) return 'left';
    if (a > t) return 'right';
    return 'center';
  }

  /** Sürekli nişan: sapmayı [-1, 1] aralığına eşle.
   * Kalibreliyken kişisel sol/sağ eğilme aralığı (2. adım) kullanılır;
   * yoksa vücut ölçeğinden türetilir. */
  private aimFromLean(x: number): number {
    const dev = x - this.cal.neutralLeanX;
    const scaled =
      GAME_CONFIG.gesture.leanRange *
      (this.cal.bodyScale / GAME_CONFIG.gesture.referenceBodyScale);
    const fallback = this.calibrated ? scaled : GAME_CONFIG.gesture.leanRange;
    const range =
      dev >= 0
        ? (this.cal.leanRangeRight ?? fallback)
        : (this.cal.leanRangeLeft ?? fallback);
    return Math.max(-1, Math.min(1, dev / Math.max(0.01, range)));
  }

  private visible(landmarks: PoseLandmarks, i: number): boolean {
    const v = landmarks[i]?.visibility;
    return v === undefined || v >= GAME_CONFIG.gesture.minVisibility;
  }

  /** Yön ve şut için gereken anahtar noktalar güvenilir mi? (omuzlar + ayaklar) */
  private isVisible(landmarks: PoseLandmarks): boolean {
    return (
      this.visible(landmarks, L_SHOULDER) &&
      this.visible(landmarks, R_SHOULDER) &&
      this.visible(landmarks, L_ANKLE) &&
      this.visible(landmarks, R_ANKLE)
    );
  }

  /** Hangi uzuv grupları görünmüyor (uyarı metni için). */
  private missingParts(landmarks: PoseLandmarks): string[] {
    if (landmarks.length < 33) return ['vücut'];
    const groups: [string, number[]][] = [
      ['omuzlar', [L_SHOULDER, R_SHOULDER]],
      ['kalça', [L_HIP, R_HIP]],
      ['dizler', [L_KNEE, R_KNEE]],
      ['ayaklar', [L_ANKLE, R_ANKLE]],
    ];
    const out: string[] = [];
    for (const [label, idx] of groups) {
      if (idx.some((i) => !this.visible(landmarks, i))) out.push(label);
    }
    return out;
  }

  reset() {
    this.prevLAnkle = null;
    this.prevRAnkle = null;
    this.cooldown = this.cooldownFrames; // şut sonrası kısa bekleme
  }

  /** Kalibrasyon ekranı için uzuv görünürlük kontrol listesi. */
  static checklist(landmarks: PoseLandmarks | null): { label: string; ok: boolean }[] {
    const groups: [string, number[]][] = [
      ['Omuzlar', [L_SHOULDER, R_SHOULDER]],
      ['Kalça', [L_HIP, R_HIP]],
      ['Dizler', [L_KNEE, R_KNEE]],
      ['Ayaklar', [L_ANKLE, R_ANKLE]],
    ];
    const min = GAME_CONFIG.gesture.minVisibility;
    const ok = (i: number) => {
      if (!landmarks || landmarks.length < 33) return false;
      const v = landmarks[i]?.visibility;
      return v === undefined || v >= min;
    };
    return groups.map(([label, idx]) => ({ label, ok: idx.every(ok) }));
  }

  /**
   * Tek kareden kalibrasyon örneği çıkar (statik, durum tutmaz).
   * Görünürlük yetersizse null döner.
   */
  static sample(landmarks: PoseLandmarks | null): GestureSample | null {
    if (!landmarks || landmarks.length < 33) return null;
    const min = GAME_CONFIG.gesture.minVisibility;
    const key = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_ANKLE, R_ANKLE];
    for (const i of key) {
      const v = landmarks[i]?.visibility;
      if (v !== undefined && v < min) return null;
    }
    const mirroredX = 1 - (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
    const hipY = (landmarks[L_HIP].y + landmarks[R_HIP].y) / 2;
    const ankleY = (landmarks[L_ANKLE].y + landmarks[R_ANKLE].y) / 2;
    const bodyScale = Math.max(0.05, Math.abs(ankleY - hipY));
    return { mirroredX, bodyScale, standingAnkleY: ankleY };
  }
}
