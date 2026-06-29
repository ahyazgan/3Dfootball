import { injectCareerStyles } from './careerStyles';
import type { SeasonSummary } from './Season';

/** Sezon sonu özeti: lig sıralaması + sezon istatistikleri (+ emeklilik). */
export class SeasonSummaryScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(s: SeasonSummary, onContinue: () => void) {
    this.root.className = 'career-screen';
    const rows = s.standing
      .slice(0, 6)
      .map(
        (r, i) =>
          `<div class="c-row" style="${r.isPlayer ? 'color:#2bd66a;font-weight:800' : ''}">
            <span>${i + 1}. ${r.name}${r.isPlayer ? ' ⚽' : ''}</span><b>${r.points} p</b></div>`
      )
      .join('');

    this.root.innerHTML = `
      <h2>${s.retired ? '🏁 KARİYER BİTTİ' : `${s.season}. SEZON BİTTİ`}</h2>
      <h1>${s.position}. sıra</h1>
      <div class="c-card">
        <div class="c-label" style="text-align:left">LİG SIRALAMASI</div>
        ${rows}
      </div>
      <div class="c-card">
        <div class="c-row"><span class="c-label">SEZON GOLÜ</span><b>${s.seasonGoals}</b></div>
        <div class="c-row"><span class="c-label">LİG PUANI</span><b>${s.clubPoints}</b></div>
        <div class="c-row"><span class="c-label">SEZON MAAŞI</span><b style="color:#2bd66a">+${s.wage.toLocaleString('tr-TR')} €</b></div>
        <button class="cbtn wide" id="ss-go">${s.retired ? 'ANA MENÜ' : 'DEVAM'}</button>
      </div>
    `;
    this.root.querySelector('#ss-go')!.addEventListener('click', () => onContinue());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
