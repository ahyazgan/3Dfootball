/**
 * En iyi skoru kalıcı saklar (localStorage). Test edilebilmesi için
 * Storage dışarıdan verilebilir; erişilemezse sessizce 0'a düşer.
 */
export class ScoreStore {
  private key = 'futbol3d.bestScore';
  private storage: Storage | null;

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage;
  }

  getBest(): number {
    try {
      const raw = this.storage?.getItem(this.key);
      const n = raw === null || raw === undefined ? 0 : Number(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  /** Skor rekoru kırdıysa kaydet ve true döndür. */
  trySetBest(score: number): boolean {
    if (score <= this.getBest()) return false;
    try {
      this.storage?.setItem(this.key, String(score));
    } catch {
      // sessizce yoksay (özel mod / kota)
    }
    return true;
  }
}
