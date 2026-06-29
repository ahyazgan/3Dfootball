import { injectCareerStyles } from './careerStyles';
import { TIER_LABEL } from './types';
import type { TransferOffer } from './Transfers';

/** Transfer teklifleri ekranı: imzala veya kal. */
export class TransferScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(
    offers: TransferOffer[],
    onAccept: (o: TransferOffer) => void,
    onReject: () => void
  ) {
    this.root.className = 'career-screen';
    const cards = offers
      .map(
        (o, i) => `
        <div class="c-card" style="gap:8px">
          <div class="c-row"><b style="font-size:18px">${o.club}</b>
            <span class="c-label">${TIER_LABEL[o.tier]}</span></div>
          <div class="c-row"><span class="c-label">İMZA BONUSU</span>
            <b style="color:#2bd66a">+${o.signingBonus.toLocaleString('tr-TR')} €</b></div>
          <button class="cbtn wide" data-i="${i}">İMZALA ✍️</button>
        </div>`
      )
      .join('');

    this.root.innerHTML = `
      <h2>📞 TRANSFER TEKLİFLERİ</h2>
      <h1>${offers.length} kulüp seni istiyor</h1>
      ${cards}
      <button class="cbtn secondary" id="tf-stay" style="width:min(94vw,440px)">Kulübümde Kalayım</button>
    `;
    this.root
      .querySelectorAll<HTMLElement>('button[data-i]')
      .forEach((btn) =>
        btn.addEventListener('click', () => onAccept(offers[Number(btn.dataset.i)]))
      );
    this.root.querySelector('#tf-stay')!.addEventListener('click', () => onReject());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
