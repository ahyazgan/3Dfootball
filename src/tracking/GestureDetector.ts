import type { PoseLandmarks } from './PoseTracker';
import type { DiveZone } from '../scene/Keeper';
import { GAME_CONFIG } from '../config';
import { OneEuroFilter } from './OneEuroFilter';

// MediaPipe Pose landmark indeksleri
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

/** Kameraya/oyuncuya göre referans değerler. */
export interface Calibration {
  /** Nötr duruşta aynalı omuz-orta x. */
  neutralLeanX: number;
  /** Vücut ölçeği (kalça-ayak mesafesi, normalize) — eşik ölçeklemesi için. */
  bodyScale: number;
}

/** Tek karelik ham örnek (kalibrasyon için). */
export interface GestureSample {
  mirroredX: number;
  bodyScale: number;
}

export interface GestureState {
  /** Yön seçimi: omuz konumuna göre. */
  zone: DiveZone;
  /** Yumuşatılmış, aynalanmış omuz x değeri (0..1). */
  leanX: number;
  /** Bu karede şut tetiklendi mi? */
  kick: boolean;
  /** Şut gücü 0..1 (tetiklendiğinde anlamlı). */
  power: number;
  /** Görsel geri bildirim için anlık bacak yukarı hızı 0..1. */
  kickCharge: number;
  /** Vücut kadrajda ve güvenilir mi? */
  tracked: boolean;
}

/**
 * Landmark akışından eğilme (yön) ve bacak şutu (tetikleme) algılar.
 * One-Euro filtre ile titreme bastırılır; kalibrasyon ile kişiye/mesafeye
 * göre eşikler uyarlanır; görünürlükle gürültü reddedilir.
 */
export class GestureDetector {
  private kickVelThreshold: number = GAME_CONFIG.gesture.kickVelThreshold;
  private cooldownFrames: number = GAME_CONFIG.gesture.kickCooldownFrames;
  private leanSmoothing: number = GAME_CONFIG.gesture.leanSmoothing;
  private leanDelta: number = GAME_CONFIG.gesture.leanDelta;

  private cal: Calibration = {
    neutralLeanX: GAME_CONFIG.gesture.leanNeutral,
    bodyScale: GAME_CONFIG.gesture.referenceBodyScale,
  };

  private leanFilter = new OneEuroFilter(
    GAME_CONFIG.gesture.oneEuro.minCutoff,
    GAME_CONFIG.gesture.oneEuro.beta,
    GAME_CONFIG.gesture.oneEuro.dCutoff
  );

  private smoothLeanX: number = GAME_CONFIG.gesture.leanNeutral;
  private prevAnkleY: number | null = null;
  private cooldown = 0;
  private frame = 0;

  /** Eşikleri dışarıdan ayarla (örn. "şut çok hassas"). */
  setKickThreshold(v: number) {
    this.kickVelThreshold = v;
  }

  /** Kalibrasyon değerlerini ayarla. */
  setCalibration(cal: Calibration) {
    this.cal = cal;
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

    if (!landmarks || landmarks.length < 33 || !this.isVisible(landmarks)) {
      return {
        zone: this.zoneFromLean(this.smoothLeanX),
        leanX: this.smoothLeanX,
        kick: false,
        power: 0,
        kickCharge: 0,
        tracked: false,
      };
    }

    // --- Yön: omuz orta noktası, aynalı (1 - x), One-Euro + EMA ---
    const shoulderMidX = (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
    const mirroredX = this.leanFilter.filter(1 - shoulderMidX, tSec);
    const s = this.leanSmoothing;
    this.smoothLeanX = this.smoothLeanX * s + mirroredX * (1 - s);
    const zone = this.zoneFromLean(this.smoothLeanX);

    // --- Şut: ayak bileği yukarı hızı (ham, hızlı tepki için) ---
    // Eşik vücut ölçeğine göre ölçeklenir: uzaktaysan küçük hareketler de sayılır.
    const ankleY = Math.min(landmarks[L_ANKLE].y, landmarks[R_ANKLE].y);
    const scale = this.cal.bodyScale / GAME_CONFIG.gesture.referenceBodyScale;
    const effThreshold = this.kickVelThreshold * scale;

    let kick = false;
    let power = 0;
    let kickCharge = 0;

    if (this.prevAnkleY !== null) {
      const upVel = this.prevAnkleY - ankleY;
      const mul = GAME_CONFIG.gesture.powerRangeMul;
      kickCharge = Math.max(0, Math.min(1, upVel / (effThreshold * mul)));

      if (this.cooldown === 0 && upVel > effThreshold) {
        kick = true;
        const t = (upVel - effThreshold) / (effThreshold * mul);
        power = Math.max(0.25, Math.min(1, t));
        this.cooldown = this.cooldownFrames;
      }
    }
    this.prevAnkleY = ankleY;

    return { zone, leanX: this.smoothLeanX, kick, power, kickCharge, tracked: true };
  }

  /** Köşe: nötr merkezden sapmaya göre (kalibrasyon kişiye uyarlar). */
  private zoneFromLean(x: number): DiveZone {
    const dev = x - this.cal.neutralLeanX;
    if (dev < -this.leanDelta) return 'left';
    if (dev > this.leanDelta) return 'right';
    return 'center';
  }

  /** Yön ve şut için gereken anahtar noktalar güvenilir mi? */
  private isVisible(landmarks: PoseLandmarks): boolean {
    const min = GAME_CONFIG.gesture.minVisibility;
    const key = [L_SHOULDER, R_SHOULDER, L_ANKLE, R_ANKLE];
    for (const i of key) {
      const v = landmarks[i]?.visibility;
      if (v !== undefined && v < min) return false;
    }
    return true;
  }

  reset() {
    this.prevAnkleY = null;
    this.cooldown = this.cooldownFrames; // şut sonrası kısa bekleme
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
    return { mirroredX, bodyScale };
  }
}
