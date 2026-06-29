import type { PoseLandmarks } from './PoseTracker';
import type { DiveZone } from '../scene/Keeper';
import { GAME_CONFIG } from '../config';

// MediaPipe Pose landmark indeksleri
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ANKLE = 27;
const R_ANKLE = 28;

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
}

/**
 * Landmark akışından eğilme (yön) ve bacak şutu (tetikleme) algılar.
 */
export class GestureDetector {
  // Eşikler — config'ten gelir, kalibrasyonla ayarlanabilir
  private leftThreshold: number = GAME_CONFIG.gesture.leftThreshold;
  private rightThreshold: number = GAME_CONFIG.gesture.rightThreshold;
  private kickVelThreshold: number = GAME_CONFIG.gesture.kickVelThreshold;
  private cooldownFrames: number = GAME_CONFIG.gesture.kickCooldownFrames;
  private leanSmoothing: number = GAME_CONFIG.gesture.leanSmoothing;

  private smoothLeanX = 0.5;
  private prevAnkleY: number | null = null;
  private cooldown = 0;

  /** Eşikleri dışarıdan ayarla (örn. "şut çok hassas"). */
  setKickThreshold(v: number) {
    this.kickVelThreshold = v;
  }

  update(landmarks: PoseLandmarks | null): GestureState {
    if (this.cooldown > 0) this.cooldown--;

    if (!landmarks || landmarks.length < 33) {
      return {
        zone: this.zoneFromLean(this.smoothLeanX),
        leanX: this.smoothLeanX,
        kick: false,
        power: 0,
        kickCharge: 0,
      };
    }

    // --- Yön: omuz orta noktası, aynalı (1 - x), yumuşatılmış ---
    const shoulderMidX = (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
    const mirroredX = 1 - shoulderMidX;
    const s = this.leanSmoothing;
    this.smoothLeanX = this.smoothLeanX * s + mirroredX * (1 - s);
    const zone = this.zoneFromLean(this.smoothLeanX);

    // --- Şut: ayak bileği yukarı hızı ---
    const ankleY = Math.min(landmarks[L_ANKLE].y, landmarks[R_ANKLE].y);
    let kick = false;
    let power = 0;
    let kickCharge = 0;

    if (this.prevAnkleY !== null) {
      // y aşağı doğru artar; yukarı hareket => prev - current > 0
      const upVel = this.prevAnkleY - ankleY;
      const mul = GAME_CONFIG.gesture.powerRangeMul;
      kickCharge = Math.max(0, Math.min(1, upVel / (this.kickVelThreshold * mul)));

      if (this.cooldown === 0 && upVel > this.kickVelThreshold) {
        kick = true;
        // Hızı güce çevir (eşik..(1+mul)x eşik aralığı -> 0..1)
        const t = (upVel - this.kickVelThreshold) / (this.kickVelThreshold * mul);
        power = Math.max(0.25, Math.min(1, t));
        this.cooldown = this.cooldownFrames;
      }
    }
    this.prevAnkleY = ankleY;

    return { zone, leanX: this.smoothLeanX, kick, power, kickCharge };
  }

  private zoneFromLean(x: number): DiveZone {
    if (x < this.leftThreshold) return 'left';
    if (x > this.rightThreshold) return 'right';
    return 'center';
  }

  reset() {
    this.prevAnkleY = null;
    this.cooldown = this.cooldownFrames; // şut sonrası kısa bekleme
  }
}
