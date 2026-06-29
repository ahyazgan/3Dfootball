/**
 * Merkezi oyun yapılandırması — tüm ayarlanabilir sabitler burada.
 * Kalibrasyon, denge ve zorluk ayarları için tek dokunma noktası.
 * (Fiziksel ölçüler — kale boyutu vb. — kaynağı oldukları yerde kalır: scene/Goal.ts)
 */
export const GAME_CONFIG = {
  /** Bir maçtaki toplam penaltı sayısı. */
  totalShots: 5,

  /** Hareket algılama eşikleri (GestureDetector). */
  gesture: {
    /** Aynalı omuz x'i bunun altındaysa sol köşe. */
    leftThreshold: 0.42,
    /** Aynalı omuz x'i bunun üstündeyse sağ köşe. */
    rightThreshold: 0.58,
    /** Eğilme yumuşatması: önceki değerin ağırlığı (0..1). */
    leanSmoothing: 0.8,
    /** Ayak bileği yukarı hızı bu eşiği geçince şut tetiklenir. */
    kickVelThreshold: 0.045,
    /** Çift tetiklemeyi önleyen kare sayısı. */
    kickCooldownFrames: 30,
    /** Hızı 0..1 güce eşlerken kullanılan eşik çarpanı. */
    powerRangeMul: 2.5,
    /** Bu görünürlüğün altındaki landmark'lar güvenilmez sayılır. */
    minVisibility: 0.5,
  },

  /** Kaleci yapay zekâsı (KeeperAI). */
  keeper: {
    /** Maç başındaki temel beceri (doğru tahmin olasılığı). */
    skillBase: 0.35,
    /** Maç sonuna doğru becerideki artış (skillBase + skillRamp). */
    skillRamp: 0.43,
    /** Akıllı kararda anlık eğilmeyi okuma olasılığı (kalanı geçmiş tahmini). */
    readAimChance: 0.7,
    /** Bir köşenin "eğilim" sayılması için gereken tekrar sayısı. */
    tendencyMinCount: 2,
    /** Tutulan son atış geçmişi uzunluğu. */
    historySize: 6,
  },

  /** Şut fiziği ve hedefleme (GameLoop). */
  shot: {
    speedMin: 15,
    speedMax: 27,
    /** Topa eklenen yukarı yay bileşeni (m/s). */
    arcBoost: 1.6,
    /** Hedef noktanın yüksekliği (m). */
    aimHeight: 1.5,
    /** Köşe seçimine göre hedef x konumu (m). */
    zoneTargetX: { left: -2.6, center: 0, right: 2.6 },
    /** Top kaleye ulaşamazsa kaç saniye sonra "aut" sayılır. */
    timeoutSec: 3.2,
  },

  /** Kurtarış kontrolü (GameLoop). */
  save: {
    /** Kalecinin yatayda ulaşabildiği mesafe (m). */
    horizReach: 1.35,
    /** Kalecinin erişebildiği maksimum yükseklik (m). */
    maxHeight: 2.3,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
