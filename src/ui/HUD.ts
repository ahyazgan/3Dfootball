import { TOTAL_SHOTS, type GameState, type ShotResult } from '../game/GameState';
import type { DiveZone } from '../scene/Keeper';

/**
 * DOM tabanlı HUD: skor göstergeleri, güç çubuğu, yön göstergesi,
 * durum metni ve başlat/bitir ekranları. Tüm metinler Türkçe.
 */
export class HUD {
  private root: HTMLElement;
  private goalsEl!: HTMLElement;
  private shotsEl!: HTMLElement;
  private accEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private powerFill!: HTMLElement;
  private zoneEls: Record<DiveZone, HTMLElement> = {} as never;
  private overlay!: HTMLElement;

  onStart: () => void = () => {};

  constructor(root: HTMLElement) {
    this.root = root;
    this.injectStyles();
    this.build();
  }

  private injectStyles() {
    const css = `
    .hud-top{position:absolute;top:0;left:0;right:0;display:flex;
      justify-content:center;gap:12px;padding:14px;pointer-events:none}
    .stat{background:rgba(6,26,14,.62);backdrop-filter:blur(6px);
      border:1px solid rgba(255,255,255,.12);border-radius:14px;
      padding:8px 16px;text-align:center;min-width:74px}
    .stat .label{font-size:11px;letter-spacing:2px;color:#9fe0b0;font-weight:700}
    .stat .value{font-size:26px;font-weight:800;color:#fff;line-height:1.1}
    .hud-status{position:absolute;top:96px;left:0;right:0;text-align:center;
      font-size:20px;font-weight:700;color:#fff;text-shadow:0 2px 8px #000;
      pointer-events:none}
    .zone-row{position:absolute;bottom:118px;left:0;right:0;display:flex;
      justify-content:center;gap:10px;pointer-events:none}
    .zone{width:64px;height:40px;border-radius:10px;border:2px solid rgba(255,255,255,.35);
      display:flex;align-items:center;justify-content:center;color:#fff;
      font-size:12px;font-weight:700;background:rgba(0,0,0,.25);transition:all .12s}
    .zone.active{background:#2bd66a;border-color:#2bd66a;color:#063;transform:scale(1.12)}
    .power-wrap{position:absolute;bottom:74px;left:50%;transform:translateX(-50%);
      width:min(70%,320px);height:16px;background:rgba(0,0,0,.4);border-radius:10px;
      overflow:hidden;border:1px solid rgba(255,255,255,.2);pointer-events:none}
    .power-fill{height:100%;width:0%;background:linear-gradient(90deg,#3bd,#2bd66a,#ffd24d,#ff5a3c);
      transition:width .05s}
    .power-label{position:absolute;bottom:94px;left:0;right:0;text-align:center;
      font-size:11px;letter-spacing:2px;color:#cfe;font-weight:700;pointer-events:none}
    .flash{position:absolute;top:42%;left:0;right:0;text-align:center;
      font-size:64px;font-weight:900;pointer-events:none;
      text-shadow:0 4px 24px #000;animation:pop .4s ease-out}
    @keyframes pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
    .overlay{position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;text-align:center;gap:18px;
      background:radial-gradient(ellipse at center,rgba(6,26,14,.7),rgba(3,10,6,.92));
      pointer-events:auto;padding:24px}
    .overlay h1{font-size:40px;color:#fff;font-weight:900;text-shadow:0 3px 14px #000}
    .overlay p{font-size:16px;color:#bfe;max-width:420px;line-height:1.5}
    .overlay .big{font-size:30px;color:#ffd24d;font-weight:800}
    .btn{pointer-events:auto;cursor:pointer;border:none;border-radius:999px;
      padding:16px 40px;font-size:20px;font-weight:800;color:#053;
      background:linear-gradient(180deg,#41e07a,#1fb85a);
      box-shadow:0 8px 24px rgba(0,0,0,.45);transition:transform .1s}
    .btn:active{transform:scale(.96)}
    .hint{font-size:13px;color:#8fbf9f}
    .hidden{display:none!important}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  private build() {
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="stat"><div class="label">GOL</div><div class="value" id="s-goals">0</div></div>
        <div class="stat"><div class="label">ŞUT</div><div class="value" id="s-shots">0/${TOTAL_SHOTS}</div></div>
        <div class="stat"><div class="label">İSABET</div><div class="value" id="s-acc">0%</div></div>
      </div>
      <div class="hud-status" id="hud-status"></div>
      <div class="zone-row">
        <div class="zone" id="z-left">SOL</div>
        <div class="zone" id="z-center">ORTA</div>
        <div class="zone" id="z-right">SAĞ</div>
      </div>
      <div class="power-label">GÜÇ</div>
      <div class="power-wrap"><div class="power-fill" id="power-fill"></div></div>
      <div id="overlay"></div>
    `;
    this.goalsEl = q('#s-goals');
    this.shotsEl = q('#s-shots');
    this.accEl = q('#s-acc');
    this.statusEl = q('#hud-status');
    this.powerFill = q('#power-fill');
    this.zoneEls = {
      left: q('#z-left'),
      center: q('#z-center'),
      right: q('#z-right'),
    };
    this.overlay = q('#overlay');
  }

  showStartScreen(trackingError?: string) {
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <h1>⚽ Hareketle Penaltı</h1>
      <p>Kameranın karşısına geç. <b>Vücudunu sağa/sola eğerek</b> köşe seç,
      <b>bacağını hızla savurarak</b> şut çek. 5 atışta kaç gol?</p>
      ${trackingError ? `<p class="hint">⚠️ ${trackingError}<br/>Klavye ile oyna: ← → yön, BOŞLUK şut.</p>` : ''}
      <button class="btn" id="start-btn">BAŞLA</button>
      <p class="hint">Kamera izni gerekir. Test: ← → yön, BOŞLUK şut.</p>
    `;
    q('#start-btn').addEventListener('click', () => this.onStart());
  }

  hideOverlay() {
    this.overlay.className = 'overlay hidden';
    this.overlay.innerHTML = '';
  }

  showEndScreen(state: GameState) {
    let msg = 'İyi denemeydi!';
    if (state.goals >= 4) msg = 'Müthiş! Gerçek bir golcüsün! 🏆';
    else if (state.goals >= 2) msg = 'Fena değil, devam et! 💪';
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <h1>Maç Bitti</h1>
      <div class="big">${state.goals} / ${TOTAL_SHOTS} GOL</div>
      <p>İsabet: <b>%${state.accuracy}</b> · Kurtarılan: <b>${state.saves}</b> · Kaçan: <b>${state.misses}</b></p>
      <p>${msg}</p>
      <button class="btn" id="restart-btn">TEKRAR OYNA</button>
    `;
    q('#restart-btn').addEventListener('click', () => this.onStart());
  }

  /** Sonuç yazısını ekrana parlat. */
  flashResult(result: ShotResult) {
    const map: Record<ShotResult, { t: string; c: string }> = {
      goal: { t: 'GOL! ⚽', c: '#2bd66a' },
      save: { t: 'KURTARDI! 🧤', c: '#ffd24d' },
      miss: { t: 'AUT! 😖', c: '#ff6a4d' },
    };
    const { t, c } = map[result];
    const el = document.createElement('div');
    el.className = 'flash';
    el.style.color = c;
    el.textContent = t;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  setStatus(text: string) {
    this.statusEl.textContent = text;
  }

  setPower(p: number) {
    this.powerFill.style.width = `${Math.round(p * 100)}%`;
  }

  setActiveZone(zone: DiveZone) {
    (Object.keys(this.zoneEls) as DiveZone[]).forEach((z) => {
      this.zoneEls[z].classList.toggle('active', z === zone);
    });
  }

  updateStats(state: GameState) {
    this.goalsEl.textContent = String(state.goals);
    this.shotsEl.textContent = `${state.shots}/${TOTAL_SHOTS}`;
    this.accEl.textContent = `${state.accuracy}%`;
  }
}

function q(sel: string): HTMLElement {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`HUD elemanı yok: ${sel}`);
  return el as HTMLElement;
}
