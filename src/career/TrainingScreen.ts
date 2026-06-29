import { injectCareerStyles } from './careerStyles';
import { GAME_CONFIG } from '../config';
import { STAT_LABEL, type StatKey } from './Training';
import type { PlayerData } from './types';

export interface TrainingCallbacks {
  onTrain: (stat: StatKey) => void;
  onBack: () => void;
}

/** Antrenman ekranı: enerji harcayıp stat seç ve yükselt. */
export class TrainingScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(d: PlayerData, cb: TrainingCallbacks) {
    this.root.className = 'career-screen';
    const cost = GAME_CONFIG.career.training.energyCost;
    const enough = d.energy >= cost;
    const stats: StatKey[] = ['shot', 'pace', 'technique', 'physical'];

    const row = (s: StatKey) => `
      <div class="c-row" style="gap:14px">
        <div style="flex:1;text-align:left">
          <div class="c-row"><span class="c-label">${STAT_LABEL[s]}</span><b>${d[s]}</b></div>
          <div class="c-bar"><i style="width:${d[s]}%"></i></div>
        </div>
        <button class="cbtn ${enough ? '' : 'secondary'}" data-stat="${s}"
          ${enough ? '' : 'disabled'} style="padding:10px 18px;font-size:15px">+ Antren</button>
      </div>`;

    this.root.innerHTML = `
      <h1>Antrenman</h1>
      <div class="c-card">
        <div>
          <div class="c-row"><span class="c-label">ENERJİ (her antren −${cost})</span><b>${Math.round(d.energy)}%</b></div>
          <div class="c-bar"><i style="width:${d.energy}%;background:linear-gradient(90deg,#ffd24d,#2bd66a)"></i></div>
        </div>
        <div>
          <div class="c-row"><span class="c-label">MORAL (gelişimi etkiler)</span><b>${Math.round(d.morale)}%</b></div>
          <div class="c-bar"><i style="width:${d.morale}%;background:linear-gradient(90deg,#6fb6ff,#2bd66a)"></i></div>
        </div>
        ${stats.map(row).join('')}
        ${enough ? '' : `<p class="c-hint" style="color:#ffd24d">Enerjin yetersiz — önce dinlen.</p>`}
        <button class="cbtn wide secondary" id="tr-back">Geri</button>
      </div>
    `;

    this.root.querySelectorAll<HTMLElement>('button[data-stat]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (!btn.hasAttribute('disabled')) cb.onTrain(btn.dataset.stat as StatKey);
      })
    );
    this.root.querySelector('#tr-back')!.addEventListener('click', () => cb.onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
