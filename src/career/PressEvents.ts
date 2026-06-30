import { GAME_CONFIG } from '../config';
import type { PlayerStore } from './PlayerStore';

/** Bir basın olayındaki seçeneğin etkileri. */
export interface PressChoice {
  label: string;
  moraleDelta?: number;
  repDelta?: number;
  followersDelta?: number;
  moneyDelta?: number;
  /** Seçimden sonra gösterilecek kısa sonuç. */
  result: string;
}

/** Maç sonrası karşılaşılan basın/sosyal olay (seçim sunar). */
export interface PressEvent {
  id: string;
  icon: string;
  prompt: string;
  choices: PressChoice[];
}

export const PRESS_EVENTS: readonly PressEvent[] = [
  {
    id: 'interview',
    icon: '🎤',
    prompt: 'Maç sonrası röportajda zorlu bir soru: rakip teknik direktöre laf atar mısın?',
    choices: [
      {
        label: 'Alçakgönüllü ol',
        moraleDelta: 2,
        repDelta: 8,
        followersDelta: 4000,
        result: 'Olgun tavrın takdir topladı.',
      },
      {
        label: 'Rakibe gönderme yap',
        moraleDelta: 6,
        repDelta: -4,
        followersDelta: 25000,
        result: 'Manşetlere çıktın — takipçi patladı ama itibar biraz zedelendi.',
      },
    ],
  },
  {
    id: 'charity',
    icon: '🤝',
    prompt: 'Bir çocuk hastanesi bağış kampanyası için seni çağırdı.',
    choices: [
      {
        label: 'Büyük bağış yap',
        moneyDelta: -50000,
        repDelta: 14,
        followersDelta: 30000,
        moraleDelta: 8,
        result: 'Cömertliğin gönülleri fethetti.',
      },
      {
        label: 'Nazikçe reddet',
        result: 'Sessizce geçtin; kimse fark etmedi.',
      },
    ],
  },
  {
    id: 'nightlife',
    icon: '🌃',
    prompt: 'Maç gecesi ünlü bir kulüpte parti var — gitsen mi?',
    choices: [
      {
        label: 'Eğlenceye katıl',
        moraleDelta: 10,
        followersDelta: 15000,
        repDelta: -6,
        result: 'Eğlendin ama paparazziler boş durmadı.',
      },
      {
        label: 'Dinlenmeyi seç',
        moraleDelta: 3,
        repDelta: 4,
        result: 'Profesyonel tavrın menajerini sevindirdi.',
      },
    ],
  },
  {
    id: 'sponsor_post',
    icon: '📱',
    prompt: 'Bir marka, sosyal medyada ücretli paylaşım teklif ediyor.',
    choices: [
      {
        label: 'Paylaşımı yap',
        moneyDelta: 40000,
        followersDelta: -3000,
        result: 'Para iyi ama takipçiler reklamdan pek hoşlanmadı.',
      },
      {
        label: 'Reddet',
        repDelta: 3,
        result: 'Özgünlüğünü korudun.',
      },
    ],
  },
];

/** Bu maç sonrası bir basın olayı çık (yoksa null). rng enjekte edilebilir. */
export function rollPressEvent(rng: () => number = Math.random): PressEvent | null {
  if (rng() > GAME_CONFIG.career.business.press.chance) return null;
  const idx = Math.floor(rng() * PRESS_EVENTS.length) % PRESS_EVENTS.length;
  return PRESS_EVENTS[idx];
}

/** Bir seçimi oyuncuya uygula (store mutasyonu). */
export function applyPressChoice(store: PlayerStore, choice: PressChoice): void {
  const d = store.data;
  if (choice.moraleDelta) store.addMorale(choice.moraleDelta);
  if (choice.repDelta) store.addReputation(choice.repDelta);
  if (choice.moneyDelta) store.addMoney(choice.moneyDelta);
  if (choice.followersDelta) {
    d.followers = Math.max(0, d.followers + choice.followersDelta);
  }
}
