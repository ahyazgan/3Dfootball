import { injectCareerStyles } from './careerStyles';
import { ACHIEVEMENTS } from './Achievements';
import { type PlayerData, TIER_LABEL, POSITION_LABEL } from './types';

/** Kariyer özeti: kupalar, başarımlar ve toplam istatistikler. */
export class CareerStatsScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(d: PlayerData, onBack: () => void) {
    this.root.className = 'career-screen';
    const have = new Set(d.achievements);

    const trophy = (icon: string, n: number, label: string) =>
      `<div class="c-stat" style="text-align:center">
        <div class="v" style="font-size:26px">${icon} ${n}</div>
        <div class="k">${label}</div></div>`;

    const badges = ACHIEVEMENTS.map((a) => {
      const on = have.has(a.id);
      return `<div class="c-badge${on ? '' : ' locked'}" title="${a.label}">
        <span class="bi">${on ? a.icon : '🔒'}</span>
        <span class="bl">${a.label}</span></div>`;
    }).join('');

    const unlocked = ACHIEVEMENTS.filter((a) => have.has(a.id)).length;

    this.root.innerHTML = `
      <h2>📖 KARİYERİM</h2>
      <h1>${d.name}</h1>
      <div class="c-card">
        <div class="c-row"><span class="c-label">TIER</span><b style="color:#ffd24d">${TIER_LABEL[d.careerTier]}</b></div>
        <div class="c-row"><span class="c-label">MEVKİ / KULÜP</span><b>${POSITION_LABEL[d.position]} · ${d.currentClub}</b></div>
        <div class="c-row"><span class="c-label">YAŞ / SEZON</span><b>${d.age} · ${d.season}. sezon</b></div>
        <div class="c-row"><span class="c-label">TOPLAM MAÇ</span><b>${d.matchesPlayed}</b></div>
        <div class="c-row"><span class="c-label">TOPLAM GOL</span><b>${d.totalGoals}</b></div>
        <div class="c-row"><span class="c-label">ŞÖHRET</span><b>${d.reputation}</b></div>
      </div>
      <div class="c-card">
        <div class="c-label" style="text-align:left">KUPA DOLABI</div>
        <div class="c-stats" style="grid-template-columns:1fr 1fr">
          ${trophy('🌍', d.internationalTitles, 'DÜNYA KUPASI')}
          ${trophy('🏆', d.goldenBalls, 'ALTIN TOP')}
          ${trophy('🥇', d.topScorerTitles, 'GOL KRALI')}
          ${trophy('🇹🇷', d.nationalCaps, 'MİLLİ MAÇ')}
        </div>
      </div>
      <div class="c-card">
        <div class="c-row"><span class="c-label">BAŞARIMLAR</span><b>${unlocked}/${ACHIEVEMENTS.length}</b></div>
        <div class="c-badges">${badges}</div>
      </div>
      <button class="cbtn secondary" id="cs-back" style="width:min(94vw,440px)">Geri</button>
    `;
    this.root.querySelector('#cs-back')!.addEventListener('click', () => onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
