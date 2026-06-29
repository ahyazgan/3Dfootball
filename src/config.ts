export type DifficultyName = 'kolay' | 'orta' | 'zor';

/**
 * Merkezi oyun yapılandırması — tüm ayarlanabilir sabitler burada.
 * Kalibrasyon, denge ve zorluk ayarları için tek dokunma noktası.
 * (Fiziksel ölçüler — kale boyutu vb. — kaynağı oldukları yerde kalır: scene/Goal.ts)
 */
export const GAME_CONFIG = {
  /** Bir maçtaki toplam penaltı sayısı. */
  totalShots: 5,

  /** Puanlama. */
  scoring: {
    /** Bir golün taban puanı. */
    goalBase: 100,
    /** Köşeye (sol/sağ) atılan golün ek puanı (orta = 0). */
    cornerBonus: 50,
    /** Her ardışık gol için çarpan artışı (combo). */
    streakStep: 0.5,
    /** Combo çarpanının doyduğu ardışık gol sayısı. */
    maxStreakBonusSteps: 4,
  },

  /** Hareket algılama eşikleri (GestureDetector). */
  gesture: {
    /** Eğilme merkezi (aynalı omuz x). Kalibrasyon bunu kişiye göre ezer. */
    leanNeutral: 0.5,
    /** Köşe seçimi için merkezden gereken sapma (±). 0.5±0.08 = 0.42/0.58. */
    leanDelta: 0.08,
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
    /** Şut eşiğini ölçekleyen referans vücut boyu (kalça-ayak, normalize). */
    referenceBodyScale: 0.45,
    /** One-Euro filtre parametreleri (eğilme sinyali). */
    oneEuro: { minCutoff: 1.2, beta: 0.03, dCutoff: 1.0 },
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
    /** Magnus (falso) katsayısı — fırıllı top yanal eğri çizer (ince ayar). */
    magnus: 0.0005,
  },

  /** Zorluk seviyeleri (kaleci becerisi + kurtarış toleransı). */
  difficulty: {
    default: 'orta' as DifficultyName,
    presets: {
      kolay: { skillBase: 0.2, skillRamp: 0.3, saveReach: 1.15 },
      orta: { skillBase: 0.35, skillRamp: 0.43, saveReach: 1.35 },
      zor: { skillBase: 0.5, skillRamp: 0.45, saveReach: 1.65 },
    },
  },

  /** Grafik / post-processing. */
  graphics: {
    /** Bloom (ışıma) efekti açık mı? (kapatmak için false) */
    bloom: true,
    bloomStrength: 0.5,
    bloomRadius: 0.5,
    bloomThreshold: 0.8,
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
