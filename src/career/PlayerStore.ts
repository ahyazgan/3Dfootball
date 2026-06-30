import { GAME_CONFIG } from '../config';
import {
  type PlayerData,
  type Position,
  type Appearance,
  type CareerTier,
  TIER_LABEL,
  POSITION_LABEL,
} from './types';

const TIERS: CareerTier[] = ['amateur', 'semipro', 'pro', 'star', 'legend'];

/**
 * Canlı kariyer durumu + güvenli mutasyon yardımcıları.
 * Veri serileştirilebilir (CareerSave ile kaydedilir).
 */
export class PlayerStore {
  data: PlayerData;

  constructor(data?: PlayerData) {
    this.data = data ?? PlayerStore.createDefault();
    // Eski kayıt göçü: eksik alanları doldur
    if (typeof this.data.morale !== 'number') {
      this.data.morale = GAME_CONFIG.career.morale.start;
    }
    if (typeof this.data.seasonMatch !== 'number') this.data.seasonMatch = 0;
    if (typeof this.data.clubPoints !== 'number') this.data.clubPoints = 0;
    if (typeof this.data.rival !== 'string' || this.data.rival.length === 0) {
      this.data.rival = GAME_CONFIG.career.rivalry.defaultRival;
    }
    if (!Array.isArray(this.data.achievements)) this.data.achievements = [];
    if (typeof this.data.nationalCaps !== 'number') this.data.nationalCaps = 0;
    if (typeof this.data.goldenBalls !== 'number') this.data.goldenBalls = 0;
    if (typeof this.data.topScorerTitles !== 'number') this.data.topScorerTitles = 0;
  }

  /** Boş varsayılan oyuncu (config.career.start'tan). */
  static createDefault(): PlayerData {
    const s = GAME_CONFIG.career.start;
    return {
      name: '',
      position: 'forward',
      appearance: { skin: 0, hair: 0, kit: 0 },
      shot: s.stats.shot,
      pace: s.stats.pace,
      technique: s.stats.technique,
      physical: s.stats.physical,
      energy: s.energy,
      morale: GAME_CONFIG.career.morale.start,
      money: s.money,
      value: s.value,
      reputation: s.reputation,
      age: s.age,
      season: s.season,
      careerTier: 'amateur',
      seasonGoals: 0,
      totalGoals: 0,
      matchesPlayed: 0,
      currentClub: s.club,
      seasonMatch: 0,
      clubPoints: 0,
      rival: GAME_CONFIG.career.rivalry.defaultRival,
      achievements: [],
      nationalCaps: 0,
      goldenBalls: 0,
      topScorerTitles: 0,
    };
  }

  /** İsim/mevki/görünümle yeni oyuncu. */
  static create(name: string, position: Position, appearance: Appearance): PlayerData {
    const d = PlayerStore.createDefault();
    d.name = name.trim() || 'İsimsiz';
    d.position = position;
    d.appearance = appearance;
    return d;
  }

  // --- Mutasyonlar ---
  addMoney(n: number) {
    this.data.money = Math.max(0, Math.round(this.data.money + n));
  }
  addValue(n: number) {
    this.data.value = Math.max(0, Math.round(this.data.value + n));
  }
  addReputation(n: number) {
    this.data.reputation = Math.max(0, Math.round(this.data.reputation + n));
    this.refreshTier();
  }
  spendEnergy(n: number) {
    this.data.energy = clamp(this.data.energy - n, 0, 100);
  }
  rest() {
    this.data.energy = clamp(this.data.energy + GAME_CONFIG.career.restEnergy, 0, 100);
    this.data.morale = clamp(
      this.data.morale + GAME_CONFIG.career.morale.restGain,
      0,
      100
    );
  }
  addMorale(n: number) {
    this.data.morale = clamp(this.data.morale + n, 0, 100);
  }

  /** Şöhrete göre tier'ı güncelle (yalnızca yükselir). */
  refreshTier(): CareerTier {
    const th = GAME_CONFIG.career.tierThresholds;
    let tier: CareerTier = 'amateur';
    for (const t of TIERS) {
      if (this.data.reputation >= th[t]) tier = t;
    }
    this.data.careerTier = tier;
    return tier;
  }

  get tierLabel(): string {
    return TIER_LABEL[this.data.careerTier];
  }
  get positionLabel(): string {
    return POSITION_LABEL[this.data.position];
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
