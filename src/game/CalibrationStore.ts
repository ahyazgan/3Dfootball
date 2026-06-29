import type { Calibration } from '../tracking/GestureDetector';

/**
 * Kişisel kalibrasyonu kalıcı saklar (localStorage) — sonraki açılışta
 * hatırlanır. Test için Storage dışarıdan verilebilir; erişilemezse sessiz.
 */
export class CalibrationStore {
  private key = 'futbol3d.calibration';
  private storage: Storage | null;

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage;
  }

  /** Kayıtlı kalibrasyon (yoksa/bozuksa null). */
  get(): Calibration | null {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return null;
      const c = JSON.parse(raw) as Partial<Calibration>;
      if (
        typeof c.neutralLeanX === 'number' &&
        typeof c.bodyScale === 'number' &&
        typeof c.standingAnkleY === 'number'
      ) {
        return c as Calibration;
      }
      return null;
    } catch {
      return null;
    }
  }

  set(cal: Calibration): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(cal));
    } catch {
      // sessizce yoksay (özel mod / kota)
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* yoksay */
    }
  }
}
