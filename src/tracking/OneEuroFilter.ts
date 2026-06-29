/**
 * One-Euro filtresi — düşük gecikmeli, hıza uyarlanan yumuşatma.
 * Durağanken titremeyi güçlü bastırır, hızlı (kasıtlı) harekette
 * gecikmeyi düşürür. Eğilme gibi konum sinyalleri için idealdir.
 *
 * Kaynak: Casiez et al., "1€ Filter" (CHI 2012).
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev = 0;

  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /**
   * @param x değer
   * @param tSec zaman (saniye, monoton artan)
   */
  filter(x: number, tSec: number): number {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = tSec;
      return x;
    }
    const dt = Math.max(1e-3, tSec - this.tPrev);
    this.tPrev = tSec;

    // Türevi yumuşat
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    // Hıza göre kesim frekansını uyarla
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = 0;
  }
}
