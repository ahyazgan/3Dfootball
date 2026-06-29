import { injectCareerStyles } from './careerStyles';

export interface MainMenuCallbacks {
  onCareer: () => void;
  onQuick: () => void;
}

/** Ana menü: Kariyer veya Hızlı Maç (mevcut penaltı). */
export class MainMenu {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(cb: MainMenuCallbacks, hasCareer: boolean) {
    this.root.className = 'career-screen';
    this.root.innerHTML = `
      <h1>⚽ Futbol 3D</h1>
      <h2>KARİYER</h2>
      <div class="c-card">
        <button class="cbtn wide" id="m-career">${hasCareer ? 'KARİYERE DEVAM ET' : 'KARİYERE BAŞLA'}</button>
        <button class="cbtn wide secondary" id="m-quick">HIZLI MAÇ (Penaltı)</button>
        <p class="c-hint">Kariyerde maçlar mevcut kameralı şut mekaniğiyle oynanır.</p>
      </div>
    `;
    this.root.querySelector('#m-career')!.addEventListener('click', () => cb.onCareer());
    this.root.querySelector('#m-quick')!.addEventListener('click', () => cb.onQuick());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
