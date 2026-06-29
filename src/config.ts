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
    /** Şutun geçerli sayılması için dizin de yükselme oranı (yanlış tetik önler). */
    kickKneeRatio: 0.3,
    /** Kalibreliyken: ayak, bacak boyunun bu oranı kadar gerçekten kalkmalı
     * (sadece-ayak şutu; yerde titreme tetiklemesin). */
    kickRiseFrac: 0.16,
    /** Sürekli nişan: bu sapmada açı ±1'e doyar (tam eğilme, kalibrasyonsuz). */
    leanRange: 0.18,
    /** Nişan açısı |bu| değeri aşınca kaleci bandı sol/sağ olur. */
    zoneAimThreshold: 0.45,
    /** Kişisel eğilme aralığının anlamlı sayılması için minimum sapma. */
    minLeanRange: 0.05,
    /** Otomatik drift düzeltme: dururken nötr referansın kayma hızı (0..1). */
    adaptRate: 0.03,
    /** Drift düzeltme yalnızca nişan |bu| değerinin altındayken (dinlenme) olur. */
    adaptIdleAim: 0.25,
    /** Oyuncu bu kadar ms kadrajdan çıkıp dönerse 2 adımlı kalibrasyon yeniden başlar. */
    autoRecalMs: 4000,
    /** Çift tetiklemeyi önleyen kare sayısı. */
    kickCooldownFrames: 30,
    /** Hızı 0..1 güce eşlerken kullanılan eşik çarpanı (varsayılan tepe hız). */
    powerRangeMul: 2.5,
    /** En düşük şut gücü (çok hafif vuruşta bile). */
    minPower: 0.25,
    /** Gücün ayak kalkış yüksekliğine bağlı ağırlığı (kalanı hıza bağlı). */
    powerLiftWeight: 0.35,
    /** Tam kalkış gücü için ayağın bacak boyunun bu oranı kadar kalkması (max). */
    kickLiftFull: 0.6,
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
    /** Köşe seçimine göre hedef x konumu (m) — klavye/yedek için. */
    zoneTargetX: { left: -2.6, center: 0, right: 2.6 },
    /** Sürekli nişanın ulaşabildiği en geniş x (m). */
    maxAimX: 3.0,
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

  /** Kariyer modu dengesi (sonraki aşamalarda genişler). */
  career: {
    /** Yeni oyuncunun başlangıç değerleri (16 yaş amatör). */
    start: {
      money: 500,
      value: 50000,
      reputation: 0,
      energy: 100,
      age: 16,
      season: 1,
      club: 'Yıldızspor Amatör',
      stats: { shot: 30, pace: 35, technique: 30, physical: 35 },
    },
    /** Tier'a yükselmek için gereken şöhret (reputation) eşikleri. */
    tierThresholds: {
      amateur: 0,
      semipro: 100,
      pro: 350,
      star: 800,
      legend: 1800,
    },
    /** Dinlenmede kazanılan enerji. */
    restEnergy: 40,

    /** Maç dengesi (rakip gücü -> kritik an + zorluk + ödüller). */
    match: {
      /** Kritik an sayısı sınırları (güçlü rakip = az an). */
      minMoments: 2,
      maxMoments: 5,
      /** Maç başına harcanan enerji. */
      energyCost: 25,
      /** Rakip kulüp isimleri (rastgele seçilir). */
      opponents: [
        'Demirkent SK',
        'Karadağ FK',
        'Akdeniz United',
        'Boğaziçi SK',
        'Yıldıztepe',
        'Kuzey FK',
        'Ege Spor',
        'Anadolu United',
      ],
      /** Kaleci zorluğu: rakip gücü 1..5 -> skillBase/saveReach aralığı. */
      keeper: {
        skillBaseMin: 0.18,
        skillBaseMax: 0.55,
        skillRamp: 0.4,
        saveReachMin: 1.15,
        saveReachMax: 1.7,
      },
      /** Maç reytingi hesabı (1-10). */
      rating: {
        base: 3.5,
        perGoalRatio: 5, // (gol/an) * bu
        scoreBonusDiv: 1500, // skor / bu -> ek puan
      },
      /** Ödül katsayıları. */
      rewards: {
        moneyPerGoal: 200,
        moneyPerRating: 40, // (rating) * bu
        repPerGoal: 8,
        repPerRatingOver5: 6, // (rating - 5) * bu
        valuePerRepGain: 600, // kazanılan şöhret * bu
      },
      /** Transfer ilgisi eşiği (Aşama 4 için reyting eşiği). */
      transferRating: 7.5,
    },
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
