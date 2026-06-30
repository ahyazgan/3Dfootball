import { injectCareerStyles } from './careerStyles';
import type { PressEvent, PressChoice } from './PressEvents';

/** Basın olayı ekranı: bir durum + seçenekler. */
export class PressEventScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(ev: PressEvent, onChoose: (choice: PressChoice) => void) {
    this.root.className = 'career-screen';
    const buttons = ev.choices
      .map(
        (c, i) =>
          `<button class="cbtn wide ${i === 0 ? '' : 'secondary'}" data-choice="${i}">${c.label}</button>`
      )
      .join('');
    this.root.innerHTML = `
      <h2>${ev.icon} BASIN</h2>
      <div class="c-card">
        <p style="font-size:17px;color:#fff;margin:0">${ev.prompt}</p>
        ${buttons}
      </div>
    `;
    this.root.querySelectorAll('[data-choice]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number((b as HTMLElement).dataset.choice);
        onChoose(ev.choices[i]);
      })
    );
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
