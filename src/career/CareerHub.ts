import { injectCareerStyles } from './careerStyles';
import { GAME_CONFIG } from '../config';
import { type PlayerData, TIER_LABEL, POSITION_LABEL, KIT_PALETTE } from './types';

export interface HubCallbacks {
  onMatch: () => void;
  onTrain: () => void;
  onRest: () => void;
  onMenu: () => void;
}

/** Ana kariyer ekranı: durum + aksiyonlar. */
export class CareerHub {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(d: PlayerData, cb: HubCallbacks) {
    this.root.className = 'career-screen';
    const money = d.money.toLocaleString('tr-TR');
    const value = d.value >= 1000 ? `${Math.round(d.value / 1000)}K €` : `${d.value} €`;
    const kit = KIT_PALETTE[d.appearance.kit];

    const stat = (k: string, v: number) =>
      `<div class="c-stat"><div class="k">${k}</div><div class="v">${v}</div>
       <div class="c-bar"><i style="width:${v}%"></i></div></div>`;

    this.root.innerHTML = `
      <h1 style="color:${kit}">${d.name}</h1>
      <h2>${POSITION_LABEL[d.position]} · ${d.currentClub}</h2>
      <div class="c-card">
        <div class="c-row">
          <span class="c-label">TIER</span><b style="color:#ffd24d">${TIER_LABEL[d.careerTier]}</b>
        </div>
        <div class="c-row"><span class="c-label">YAŞ / SEZON</span><b>${d.age} · ${d.season}. sezon</b></div>
        <div class="c-row"><span class="c-label">SEZON MAÇI</span><b>${d.seasonMatch}/${GAME_CONFIG.career.season.matchesPerSeason} · ${d.clubPoints} p</b></div>
        <div class="c-row"><span class="c-label">PARA</span><b>${money} €</b></div>
        <div class="c-row"><span class="c-label">DEĞER</span><b>${value}</b></div>
        <div class="c-row"><span class="c-label">ŞÖHRET</span><b>${d.reputation}</b></div>
        <div>
          <div class="c-row"><span class="c-label">ENERJİ</span><b>${Math.round(d.energy)}%</b></div>
          <div class="c-bar"><i style="width:${d.energy}%;background:linear-gradient(90deg,#ffd24d,#2bd66a)"></i></div>
        </div>
        <div>
          <div class="c-row"><span class="c-label">MORAL</span><b>${Math.round(d.morale)}%</b></div>
          <div class="c-bar"><i style="width:${d.morale}%;background:linear-gradient(90deg,#6fb6ff,#2bd66a)"></i></div>
        </div>
        <div class="c-stats">
          ${stat('ŞUT', d.shot)}${stat('HIZ', d.pace)}
          ${stat('TEKNİK', d.technique)}${stat('FİZİK', d.physical)}
        </div>
        <div class="c-row"><span class="c-label">GOL (sezon / toplam)</span><b>${d.seasonGoals} / ${d.totalGoals}</b></div>
      </div>
      <div class="c-card">
        <button class="cbtn wide" id="h-match">SONRAKİ MAÇ ▶</button>
        <button class="cbtn wide secondary" id="h-train">ANTRENMAN</button>
        <button class="cbtn wide secondary" id="h-rest">DİNLEN</button>
        <button class="cbtn wide secondary" id="h-menu">Ana Menü</button>
      </div>
    `;
    this.root.querySelector('#h-match')!.addEventListener('click', () => cb.onMatch());
    this.root.querySelector('#h-train')!.addEventListener('click', () => cb.onTrain());
    this.root.querySelector('#h-rest')!.addEventListener('click', () => cb.onRest());
    this.root.querySelector('#h-menu')!.addEventListener('click', () => cb.onMenu());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
