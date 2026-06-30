import { injectCareerStyles } from './careerStyles';
import type { PlayerData } from './types';
import {
  availableSponsors,
  sponsorIncome,
  lifestyleItems,
  formatFollowers,
} from './Business';

export interface BusinessCallbacks {
  onSign: (id: string) => void;
  onBuy: (id: string) => void;
  onBack: () => void;
}

/** Menajer ekranı: sponsorluklar + yaşam tarzı. */
export class BusinessScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(d: PlayerData, cb: BusinessCallbacks) {
    this.root.className = 'career-screen';
    const money = d.money.toLocaleString('tr-TR');

    const active = d.sponsors.length
      ? d.sponsors
          .map(
            (s) =>
              `<div class="c-row"><span>${s.brand}</span>
                <b style="color:#2bd66a">+${s.perMatch.toLocaleString('tr-TR')} €/maç</b></div>`
          )
          .join('')
      : `<p class="c-hint" style="margin:0">Henüz sponsorun yok.</p>`;

    const offers = availableSponsors(d);
    const offersHtml = offers.length
      ? offers
          .map(
            (o) =>
              `<div class="c-row">
                <span>${o.brand}<br/><span class="c-hint">+${o.perMatch.toLocaleString('tr-TR')} €/maç · imza ${o.signingBonus.toLocaleString('tr-TR')} €</span></span>
                <button class="cbtn" data-sign="${o.id}" style="padding:9px 16px;font-size:14px">İMZALA</button>
              </div>`
          )
          .join('')
      : `<p class="c-hint" style="margin:0">Şu an uygun teklif yok — itibar ve takipçi kazan.</p>`;

    const lifestyle = lifestyleItems()
      .map((l) => {
        const owned = d.lifestyle.includes(l.id);
        const affordable = d.money >= l.cost;
        const btn = owned
          ? `<b style="color:#2bd66a">✓</b>`
          : `<button class="cbtn ${affordable ? '' : 'secondary'}" data-buy="${l.id}"
              style="padding:9px 14px;font-size:14px"${affordable ? '' : ' disabled'}>
              ${l.cost.toLocaleString('tr-TR')} €</button>`;
        return `<div class="c-row"><span>${l.icon} ${l.label}
          <br/><span class="c-hint">+${l.morale} moral · +${formatFollowers(l.followers)} takipçi</span></span>${btn}</div>`;
      })
      .join('');

    this.root.innerHTML = `
      <h2>💼 MENAJER</h2>
      <h1>${formatFollowers(d.followers)} takipçi</h1>
      <div class="c-card"><div class="c-row"><span class="c-label">PARA</span><b>${money} €</b></div>
        <div class="c-row"><span class="c-label">SPONSOR GELİRİ</span>
          <b style="color:#2bd66a">+${sponsorIncome(d).toLocaleString('tr-TR')} €/maç</b></div></div>
      <div class="c-card"><div class="c-label" style="text-align:left">AKTİF SPONSORLAR</div>${active}</div>
      <div class="c-card"><div class="c-label" style="text-align:left">SPONSOR TEKLİFLERİ</div>${offersHtml}</div>
      <div class="c-card"><div class="c-label" style="text-align:left">YAŞAM TARZI</div>${lifestyle}</div>
      <button class="cbtn secondary" id="b-back" style="width:min(94vw,440px)">Geri</button>
    `;
    this.root.querySelectorAll('[data-sign]').forEach((b) =>
      b.addEventListener('click', () => cb.onSign((b as HTMLElement).dataset.sign!))
    );
    this.root.querySelectorAll('[data-buy]').forEach((b) =>
      b.addEventListener('click', () => cb.onBuy((b as HTMLElement).dataset.buy!))
    );
    this.root.querySelector('#b-back')!.addEventListener('click', () => cb.onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
