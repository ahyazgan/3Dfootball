import type { DiveZone } from '../scene/Keeper';
import { GAME_CONFIG } from '../config';

const ZONES: DiveZone[] = ['left', 'center', 'right'];

/**
 * Kaleci yapay zekâsı. Üç davranışı harmanlar:
 *  1) Maç ilerledikçe artan beceri (sonlara doğru daha çok kurtarır)
 *  2) Oyuncunun son atış eğilimini okuma (aynı köşeyi tekrarlarsan yakalar)
 *  3) Anlık tahmin / blöf için rastgelelik
 */
export class KeeperAI {
  private history: DiveZone[] = [];

  /** Yeni maç için sıfırla. */
  reset() {
    this.history = [];
  }

  /** Oyuncunun seçtiği köşeyi kaydet (her atıştan sonra). */
  record(aimZone: DiveZone) {
    this.history.push(aimZone);
    if (this.history.length > GAME_CONFIG.keeper.historySize) this.history.shift();
  }

  /**
   * Dalış yönüne karar ver.
   * @param aimZone   oyuncunun bu atıştaki niyeti (eğilme yönü)
   * @param shotIndex kaçıncı atış (0 tabanlı)
   * @param total     toplam atış sayısı
   */
  decide(aimZone: DiveZone, shotIndex: number, total: number): DiveZone {
    // Beceri maç boyunca skillBase -> (skillBase + skillRamp) arası artar
    const progress = total > 1 ? shotIndex / (total - 1) : 0;
    const skill = GAME_CONFIG.keeper.skillBase + GAME_CONFIG.keeper.skillRamp * progress;

    if (Math.random() < skill) {
      // Akıllı karar: çoğunlukla anlık eğilmeyi oku, bazen geçmişe göre tahmin et
      if (Math.random() < GAME_CONFIG.keeper.readAimChance) return aimZone;
      const predicted = this.mostFrequent();
      return predicted ?? aimZone;
    }

    // Blöf: rastgele (yine de tutturabilir)
    return ZONES[Math.floor(Math.random() * ZONES.length)];
  }

  /** Geçmişte en sık seçilen köşe (eğilim okuma). */
  private mostFrequent(): DiveZone | null {
    if (this.history.length < 2) return null;
    const counts: Record<DiveZone, number> = { left: 0, center: 0, right: 0 };
    for (const z of this.history) counts[z]++;
    let best: DiveZone = 'center';
    let bestN = -1;
    for (const z of ZONES) {
      if (counts[z] > bestN) {
        bestN = counts[z];
        best = z;
      }
    }
    // Belirgin bir eğilim yoksa tahmin etme
    return bestN >= GAME_CONFIG.keeper.tendencyMinCount ? best : null;
  }
}
