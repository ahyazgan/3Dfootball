import { injectCareerStyles } from './careerStyles';
import type { MatchPlan } from './MatchEngine';

/** Maç öncesi ekran: rakip, güç, kritik an sayısı, zorluk. */
export class MatchIntro {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(plan: MatchPlan, onStart: () => void, onBack: () => void) {
    this.root.className = 'career-screen';
    const stars =
      '★'.repeat(plan.opponentStrength) + '☆'.repeat(5 - plan.opponentStrength);
    const derbyBadge = plan.isDerby
      ? `<div style="font-size:15px;font-weight:900;letter-spacing:3px;color:#ff5a3c;
          text-shadow:0 2px 10px #000">🔥 DERBİ — EZELİ RAKİP 🔥</div>`
      : '';
    const keeperRow = plan.keeperName
      ? `<div class="c-row"><span class="c-label">KALECİ</span><b>${plan.keeperName} · ${plan.difficultyLabel}</b></div>`
      : `<div class="c-row"><span class="c-label">KALECİ</span><b>${plan.difficultyLabel}</b></div>`;
    const events = plan.events ?? [];
    const eventsHtml = events.length
      ? `<div class="c-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <span class="c-label">MAÇ KOŞULLARI</span>
          ${events
            .map(
              (e) =>
                `<div style="display:flex;gap:8px;align-items:center;text-align:left;
                  background:rgba(0,0,0,.28);border-radius:10px;padding:8px 10px">
                  <span style="font-size:22px">${e.icon}</span>
                  <span><b style="color:#ffd24d">${e.label}</b><br/>
                  <span class="c-hint">${e.desc}</span></span></div>`
            )
            .join('')}
        </div>`
      : '';
    this.root.innerHTML = `
      <h2>SONRAKİ MAÇ</h2>
      ${derbyBadge}
      <h1>${plan.opponent}</h1>
      <div class="c-card">
        <div class="c-row"><span class="c-label">RAKİP GÜCÜ</span>
          <b style="color:#ffd24d;font-size:20px;letter-spacing:2px">${stars}</b></div>
        <div class="c-row"><span class="c-label">KRİTİK AN</span><b>${plan.criticalMoments} şut fırsatı</b></div>
        ${keeperRow}
        ${eventsHtml}
        <p class="c-hint">Güçlü rakip = daha az şans ama daha zor kaleci.
        Her anı kameralı şut mekaniğinle oyna.</p>
        <button class="cbtn wide" id="mi-go">MAÇA BAŞLA ▶</button>
        <button class="cbtn wide secondary" id="mi-back">Geri</button>
      </div>
    `;
    this.root.querySelector('#mi-go')!.addEventListener('click', () => onStart());
    this.root.querySelector('#mi-back')!.addEventListener('click', () => onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
