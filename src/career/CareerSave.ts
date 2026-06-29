import type { PlayerData } from './types';

/**
 * Kariyer kaydı (localStorage). Test için Storage dışarıdan verilebilir;
 * erişilemez/bozuksa sessizce null döner. (ScoreStore/CalibrationStore deseni.)
 */
export class CareerSave {
  private key = 'futbol3d.career';
  private storage: Storage | null;

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage;
  }

  /** Kayıtlı oyuncu (yoksa/bozuksa null). */
  get(): PlayerData | null {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return null;
      const d = JSON.parse(raw) as Partial<PlayerData>;
      if (
        typeof d.name === 'string' &&
        typeof d.shot === 'number' &&
        typeof d.money === 'number' &&
        typeof d.reputation === 'number' &&
        typeof d.currentClub === 'string'
      ) {
        return d as PlayerData;
      }
      return null;
    } catch {
      return null;
    }
  }

  set(data: PlayerData): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(data));
    } catch {
      // sessizce yoksay (özel mod / kota)
    }
  }

  exists(): boolean {
    return this.get() !== null;
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* yoksay */
    }
  }
}
