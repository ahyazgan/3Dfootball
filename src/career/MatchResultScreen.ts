import { injectCareerStyles } from './careerStyles';
import type { MatchOutcome } from './MatchResult';

/** Maç sonucu ekranı: reyting + ödüller. */
export class MatchResultScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(o: MatchOutcome, onContinue: () => void) {
    this.root.className = 'career-screen';
    const ratingColor = o.rating >= 7 ? '#2bd66a' : o.rating >= 5 ? '#ffd24d' : '#ff6a4d';
    const reward = (label: string, value: string, positive = true) =>
      `<div class="c-row"><span class="c-label">${label}</span>
        <b style="color:${positive ? '#2bd66a' : '#ff6a4d'}">${value}</b></div>`;

    this.root.innerHTML = `
      <h2>MAÇ BİTTİ — ${o.opponent}</h2>
      <h1 style="color:${ratingColor};font-size:30px">MAÇ REYTİNGİ</h1>
      <div style="font-size:64px;font-weight:900;color:${ratingColor};text-shadow:0 3px 16px #000">${o.rating.toFixed(1)}</div>
      <div class="c-card">
        <div class="c-row"><span class="c-label">GOL</span><b>${o.goals} / ${o.moments} an</b></div>
        ${reward('PARA', `+${o.money.toLocaleString('tr-TR')} €`)}
        ${reward('ŞÖHRET', `${o.reputation >= 0 ? '+' : ''}${o.reputation}`, o.reputation >= 0)}
        ${reward('DEĞER', `+${o.value.toLocaleString('tr-TR')} €`)}
        ${
          o.transferInterest
            ? `<p class="c-hint" style="color:#ffd24d">📞 Performansın dikkat çekti — transfer ilgisi var! (Aşama 4)</p>`
            : ''
        }
        <button class="cbtn wide" id="mr-go">DEVAM</button>
      </div>
    `;
    this.root.querySelector('#mr-go')!.addEventListener('click', () => onContinue());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
