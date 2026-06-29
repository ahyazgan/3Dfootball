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
    this.root.innerHTML = `
      <h2>SONRAKİ MAÇ</h2>
      <h1>${plan.opponent}</h1>
      <div class="c-card">
        <div class="c-row"><span class="c-label">RAKİP GÜCÜ</span>
          <b style="color:#ffd24d;font-size:20px;letter-spacing:2px">${stars}</b></div>
        <div class="c-row"><span class="c-label">KRİTİK AN</span><b>${plan.criticalMoments} şut fırsatı</b></div>
        <div class="c-row"><span class="c-label">KALECİ</span><b>${plan.difficultyLabel}</b></div>
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
