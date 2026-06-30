/** Kariyer modu ortak tipleri. */

export type CareerTier = 'amateur' | 'semipro' | 'pro' | 'star' | 'legend';
export type Position = 'forward' | 'winger' | 'midfielder';

/** Basit görünüm seçimleri (indeks paletlere bakar). */
export interface Appearance {
  skin: number;
  hair: number;
  kit: number;
}

/** Tüm kariyer durumu — serileştirilebilir düz veri. */
export interface PlayerData {
  name: string;
  position: Position;
  appearance: Appearance;

  // Statlar (1-100)
  shot: number;
  pace: number;
  technique: number;
  physical: number;

  energy: number; // 0-100
  morale: number; // 0-100
  money: number;
  value: number;
  reputation: number;

  age: number;
  season: number;
  careerTier: CareerTier;

  seasonGoals: number;
  totalGoals: number;
  matchesPlayed: number;
  currentClub: string;

  /** Bu sezon oynanan maç (0..matchesPerSeason). */
  seasonMatch: number;
  /** Bu sezon lig puanı. */
  clubPoints: number;

  /** Ezeli rakip kulüp (derbi maçları için). */
  rival: string;

  /** Açılan başarım id'leri. */
  achievements: string[];
  /** Milli takım maçı sayısı. */
  nationalCaps: number;
  /** Kazanılan Altın Top sayısı. */
  goldenBalls: number;
  /** Kazanılan gol kralı sayısı. */
  topScorerTitles: number;

  /** Kazanılan uluslararası kupa (Dünya Kupası/Avrupa Şampiyonası) sayısı. */
  internationalTitles: number;
  /** Aktif turnuva durumu (yoksa null). */
  tournament: TournamentState | null;

  // --- Aşama 8: gelişim ---
  /** Form (0-100): son maçların gidişatı; maç zorluğunu etkiler. */
  form: number;
  /** Açılan yetenek (trait) id'leri. */
  traits: string[];
  /** Kalan sakatlık süresi (0 = sağlam; >0 ise maç oynanamaz). */
  injuryMatches: number;
}

/** Eleme usulü milli takım turnuvasının serileştirilebilir durumu. */
export interface TournamentState {
  /** Görünen ad, örn. "Dünya Kupası — 3. sezon". */
  name: string;
  /** Oyuncunun milli takımı. */
  team: string;
  /** Tur etiketleri (Son 16 ... Final). */
  rounds: string[];
  /** Her tura denk gelen rakip ülke. */
  opponents: string[];
  /** Şu anki tur indeksi (0 tabanlı). */
  roundIndex: number;
  /** Elendi mi? */
  eliminated: boolean;
  /** Şampiyon mu? */
  champion: boolean;
}

/** Tier sırası (yükselişten düşüşe ölçek). */
export const TIER_ORDER: CareerTier[] = ['amateur', 'semipro', 'pro', 'star', 'legend'];

export const TIER_LABEL: Record<CareerTier, string> = {
  amateur: 'Amatör',
  semipro: 'Yarı-Pro',
  pro: 'Profesyonel',
  star: 'Yıldız',
  legend: 'Efsane',
};

export const POSITION_LABEL: Record<Position, string> = {
  forward: 'Forvet',
  winger: 'Kanat',
  midfielder: 'Orta Saha',
};

/** Görünüm paletleri (CharacterCreate ve sahne için ortak). */
export const SKIN_PALETTE = ['#f0c8a0', '#e8b48a', '#c68642', '#8d5524'];
export const HAIR_PALETTE = ['#2a1c12', '#0f0f12', '#7a4a1e', '#d9c27a'];
export const KIT_PALETTE = ['#2bd66a', '#ff5a3c', '#3b82f6', '#ffd24d', '#a855f7'];
