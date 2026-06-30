import { injectCareerStyles } from './careerStyles';
import { GAME_CONFIG } from '../config';
import { TRAITS } from './Traits';
import type { PlayerData } from './types';

export interface TraitsCallbacks {
  onUnlock: (id: string) => void;
  onBack: () => void;
}

/** Yetenekler ekranı: özel becerileri parayla aç. */
export class TraitsScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(d: PlayerData, cb: TraitsCallbacks) {
    this.root.className = 'career-screen';
    const mul = GAME_CONFIG.career.development.traits.costMul;

    const cards = TRAITS.map((t) => {
      const owned = d.traits.includes(t.id);
      const meetsReq = t.req(d);
      const cost = Math.round(t.cost * mul);
      const affordable = d.money >= cost;
      let action: string;
      if (owned) {
        action = `<b style="color:#2bd66a">✓ AÇIK</b>`;
      } else if (!meetsReq) {
        action = `<b style="color:#ff8a3c">🔒 ${t.reqLabel}</b>`;
      } else {
        action = `<button class="cbtn ${affordable ? '' : 'secondary'}" data-trait="${t.id}"
          style="padding:10px 18px;font-size:15px"${affordable ? '' : ' disabled'}>
          ${cost.toLocaleString('tr-TR')} € ${affordable ? 'AÇ' : '(yetersiz)'}</button>`;
      }
      return `<div class="c-card" style="gap:8px;${owned ? 'border-color:#2bd66a' : ''}">
        <div class="c-row">
          <span style="font-size:18px;font-weight:800;color:#fff">${t.icon} ${t.label}</span>
          ${action}
        </div>
        <p class="c-hint" style="text-align:left;margin:0">${t.desc}</p>
      </div>`;
    }).join('');

    this.root.innerHTML = `
      <h2>🧬 YETENEKLER</h2>
      <h1>${d.name}</h1>
      <div class="c-card"><div class="c-row">
        <span class="c-label">PARA</span><b>${d.money.toLocaleString('tr-TR')} €</b></div></div>
      ${cards}
      <button class="cbtn secondary" id="tr-back" style="width:min(94vw,440px)">Geri</button>
    `;
    this.root.querySelectorAll('[data-trait]').forEach((btn) =>
      btn.addEventListener('click', () =>
        cb.onUnlock((btn as HTMLElement).dataset.trait!)
      )
    );
    this.root.querySelector('#tr-back')!.addEventListener('click', () => cb.onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
