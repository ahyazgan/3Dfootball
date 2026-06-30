import {
  TOTAL_SHOTS,
  type GameMode,
  type GameState,
  type ShotResult,
  type GoalScore,
} from '../game/GameState';
import type { DiveZone } from '../scene/Keeper';
import { GAME_CONFIG, type DifficultyName } from '../config';

/**
 * DOM tabanlı HUD: skor göstergeleri, güç çubuğu, yön göstergesi,
 * durum metni ve başlat/bitir ekranları. Tüm metinler Türkçe.
 */
export class HUD {
  private root: HTMLElement;
  private goalsEl!: HTMLElement;
  private shotsEl!: HTMLElement;
  private scoreEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private powerFill!: HTMLElement;
  private zoneEls: Record<DiveZone, HTMLElement> = {} as never;
  private overlay!: HTMLElement;

  private muteBtn!: HTMLElement;
  private warnEl!: HTMLElement;
  private calEl!: HTMLElement;
  private muted = false;
  private difficulty: DifficultyName = GAME_CONFIG.difficulty.default;

  onStart: (mode: GameMode) => void = () => {};
  onToggleMute: (muted: boolean) => void = () => {};

  getDifficulty(): DifficultyName {
    return this.difficulty;
  }

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
    .score-pop{position:absolute;top:54%;left:0;right:0;text-align:center;
      font-size:30px;font-weight:800;color:#ffd24d;pointer-events:none;
      text-shadow:0 2px 10px #000;animation:rise .9s ease-out forwards}
    .score-pop b{color:#2bd66a}
    @keyframes rise{0%{transform:translateY(10px);opacity:0}
      30%{opacity:1}100%{transform:translateY(-28px);opacity:0}}
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
    .diff-label{font-size:11px;letter-spacing:2px;color:#9fe0b0;font-weight:700}
    .diff-row{display:flex;gap:10px}
    .diff{pointer-events:auto;cursor:pointer;border:2px solid rgba(255,255,255,.25);
      background:rgba(0,0,0,.3);color:#fff;border-radius:10px;padding:10px 18px;
      font-size:15px;font-weight:700;transition:all .12s}
    .diff.active{background:#2bd66a;border-color:#2bd66a;color:#053}
    .diff:active{transform:scale(.96)}
    .mode-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:4px}
    .mode-btn{pointer-events:auto;cursor:pointer;border:2px solid rgba(255,255,255,.18);
      border-radius:16px;padding:14px 20px;min-width:120px;color:#eafff0;
      background:rgba(6,26,14,.55);text-align:center;transition:all .12s}
    .mode-btn:hover{border-color:#2bd66a;transform:translateY(-2px)}
    .mode-btn .ico{font-size:30px;line-height:1.1}
    .mode-btn .name{font-size:16px;font-weight:800;margin-top:2px}
    .mode-btn .desc{font-size:11px;color:#9fc;margin-top:2px}
    .mute-btn{position:absolute;top:14px;right:14px;pointer-events:auto;cursor:pointer;
      width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.18);
      background:rgba(6,26,14,.62);backdrop-filter:blur(6px);color:#fff;font-size:20px;
      display:flex;align-items:center;justify-content:center}
    .mute-btn:active{transform:scale(.94)}
    .warn{position:absolute;top:140px;left:0;right:0;text-align:center;
      font-size:16px;font-weight:700;color:#ffd24d;text-shadow:0 2px 8px #000;
      pointer-events:none}
    .cal{position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:flex-start;gap:12px;text-align:center;
      background:linear-gradient(180deg,rgba(3,10,6,.78),rgba(3,10,6,.32) 40%,rgba(3,10,6,.1));
      pointer-events:none;padding:60px 24px 0}
    .cal .title{font-size:22px;font-weight:800;color:#fff;text-shadow:0 2px 8px #000}
    .cal .count{font-size:64px;font-weight:900;color:#2bd66a;line-height:1;text-shadow:0 2px 12px #000}
    .cal .sub{font-size:14px;color:#dff;max-width:360px;line-height:1.5;text-shadow:0 1px 4px #000}
    .cal-list{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px}
    .cal-list .chip{font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18)}
    .cal-list .chip.ok{background:rgba(43,214,106,.22);color:#9bf3bf;border-color:#2bd66a}
    .cal-list .chip.no{background:rgba(255,106,77,.18);color:#ffb3a3;border-color:#ff6a4d}
    .cal-bar{position:relative;width:min(78%,360px);height:34px;margin-top:6px}
    .cal-bar-track{position:absolute;top:14px;left:0;right:0;height:6px;border-radius:6px;
      background:rgba(255,255,255,.18)}
    .cal-range{position:absolute;top:13px;height:8px;border-radius:6px;
      background:linear-gradient(90deg,#3bd,#2bd66a)}
    .cal-dot{position:absolute;top:8px;width:18px;height:18px;border-radius:50%;
      background:#fff;box-shadow:0 0 12px #2bd66a;transform:translateX(-9px)}
    .cal-end{position:absolute;top:24px;font-size:11px;font-weight:700;color:#9fe0b0}
    .cal-end.l{left:0}.cal-end.r{right:0}
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
        <div class="stat"><div class="label">SKOR</div><div class="value" id="s-score">0</div></div>
      </div>
      <div class="hud-status" id="hud-status"></div>
      <div class="zone-row">
        <div class="zone" id="z-left">SOL</div>
        <div class="zone" id="z-center">ORTA</div>
        <div class="zone" id="z-right">SAĞ</div>
      </div>
      <div class="power-label">GÜÇ</div>
      <div class="power-wrap"><div class="power-fill" id="power-fill"></div></div>
      <button class="mute-btn" id="mute-btn" title="Ses aç/kapat">🔊</button>
      <div class="warn hidden" id="warn">⚠️ Vücudun kadrajda değil — geri çekil</div>
      <div class="cal hidden" id="cal"></div>
      <div id="overlay"></div>
    `;
    this.goalsEl = q('#s-goals');
    this.shotsEl = q('#s-shots');
    this.scoreEl = q('#s-score');
    this.statusEl = q('#hud-status');
    this.powerFill = q('#power-fill');
    this.zoneEls = {
      left: q('#z-left'),
      center: q('#z-center'),
      right: q('#z-right'),
    };
    this.overlay = q('#overlay');
    this.warnEl = q('#warn');
    this.calEl = q('#cal');
    this.muteBtn = q('#mute-btn');
    this.muteBtn.addEventListener('click', () => {
      this.muted = !this.muted;
      this.muteBtn.textContent = this.muted ? '🔇' : '🔊';
      this.onToggleMute(this.muted);
    });
  }

  showStartScreen(trackingError?: string, best = 0) {
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <h1>⚽ Hareketle Futbol</h1>
      <p>Kameranın karşısına geç. <b>Vücudunu sağa/sola eğerek</b> köşe seç.
      Penaltıda <b>bacağını savur</b>, kafa vuruşunda <b>tam zamanında zıpla</b>.</p>
      ${best > 0 ? `<p class="big" style="font-size:22px">🏆 En iyi: ${best}</p>` : ''}
      <div class="diff-label">ZORLUK</div>
      <div class="diff-row">
        <button class="diff" data-d="kolay">Kolay</button>
        <button class="diff" data-d="orta">Orta</button>
        <button class="diff" data-d="zor">Zor</button>
      </div>
      <div class="diff-label">MOD SEÇ — başlamak için dokun</div>
      <div class="mode-row">
        <div class="mode-btn" data-mode="penalty">
          <div class="ico">🥅</div><div class="name">Penaltı</div>
          <div class="desc">Bacakla şut</div>
        </div>
        <div class="mode-btn" data-mode="header">
          <div class="ico">🧑‍🦱</div><div class="name">Kafa Vuruşu</div>
          <div class="desc">Korner + zamanlama</div>
        </div>
        <div class="mode-btn" data-mode="mixed">
          <div class="ico">🔀</div><div class="name">Karışık</div>
          <div class="desc">İkisi dönüşümlü</div>
        </div>
      </div>
      ${trackingError ? `<p class="hint">⚠️ ${trackingError}<br/>Klavye ile oyna: ← → yön, BOŞLUK aksiyon.</p>` : ''}
      <p class="hint">Kamera izni gerekir. Test klavyesi: ← → yön, BOŞLUK şut/kafa.</p>
    `;
    // Zorluk seçimi (geçiş): tıkla, aktif olanı boya
    const diffBtns = Array.from(
      this.overlay.querySelectorAll<HTMLButtonElement>('.diff')
    );
    const paint = () =>
      diffBtns.forEach((b) =>
        b.classList.toggle('active', b.dataset.d === this.difficulty)
      );
    diffBtns.forEach((b) =>
      b.addEventListener('click', () => {
        this.difficulty = b.dataset.d as DifficultyName;
        paint();
      })
    );
    paint();
    // Mod butonu seçilen zorlukla oyunu başlatır
    this.overlay.querySelectorAll<HTMLElement>('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () =>
        this.onStart((btn.dataset.mode as GameMode) ?? 'penalty')
      );
    });
  }

  hideOverlay() {
    this.overlay.className = 'overlay hidden';
    this.overlay.innerHTML = '';
  }

  /** "Kadrajda değilsin" uyarısını göster/gizle (eksik uzuvları söyler). */
  setWarning(show: boolean, missing: string[] = []) {
    this.warnEl.classList.toggle('hidden', !show);
    if (show) {
      this.warnEl.textContent =
        missing.length > 0
          ? `⚠️ ${missing.join(', ')} görünmüyor — geri çekil`
          : '⚠️ Vücudun kadrajda değil — geri çekil';
    }
  }

  /** Kalibrasyon ekranı: geri sayım + canlı uzuv kontrol listesi (poz aynası). */
  setCalibration(secondsLeft: number, checklist: { label: string; ok: boolean }[]) {
    this.calEl.classList.remove('hidden');
    const rows = checklist
      .map(
        (c) =>
          `<span class="chip ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${c.label}</span>`
      )
      .join('');
    this.calEl.innerHTML = `
      <div class="title">Kalibrasyon</div>
      <div class="count">${secondsLeft}</div>
      <div class="sub">Kameranın karşısında <b>düz dur</b> — vücut ölçülerin alınıyor
      (ayağınla şut atacaksın, bu yüzden <b>ayakların görünmeli</b>).</div>
      <div class="cal-list">${rows}</div>
    `;
  }

  /** Kalibrasyon 2. adım: eğilme aralığı (sola-sağa yatır). */
  setCalibrationRange(
    secondsLeft: number,
    leanX: number | null,
    minX: number,
    maxX: number
  ) {
    this.calEl.classList.remove('hidden');
    const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
    const dot =
      leanX === null ? '' : `<div class="cal-dot" style="left:${pct(leanX)}"></div>`;
    const range =
      maxX > minX
        ? `<div class="cal-range" style="left:${pct(minX)};width:${pct(maxX - minX)}"></div>`
        : '';
    this.calEl.innerHTML = `
      <div class="title">Kalibrasyon · 2/2</div>
      <div class="count">${secondsLeft}</div>
      <div class="sub">Şimdi vücudunu <b>sola ve sağa yatır</b> —
      nişan aralığın ölçülüyor.</div>
      <div class="cal-bar">
        <div class="cal-bar-track"></div>${range}${dot}
        <span class="cal-end l">SOL</span><span class="cal-end r">SAĞ</span>
      </div>
    `;
  }

  hideCalibration() {
    this.calEl.classList.add('hidden');
    this.calEl.innerHTML = '';
  }

  showEndScreen(state: GameState, best: number, isRecord: boolean) {
    let msg = 'İyi denemeydi!';
    if (state.goals >= 4) msg = 'Müthiş! Gerçek bir golcüsün! 🏆';
    else if (state.goals >= 2) msg = 'Fena değil, devam et! 💪';
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <h1>Maç Bitti</h1>
      <div class="big">${state.score} PUAN</div>
      ${
        isRecord
          ? `<p class="ok" style="color:#2bd66a;font-weight:800">🎉 Yeni rekor!</p>`
          : `<p class="hint">En iyi: ${best}</p>`
      }
      <p>${state.goals}/${TOTAL_SHOTS} gol · İsabet <b>%${state.accuracy}</b> ·
      En uzun seri <b>${state.bestStreak}</b></p>
      <p>${msg}</p>
      <button class="btn" id="restart-btn">TEKRAR OYNA</button>
      <p class="hint">Menüye dön: sayfayı yenile · Mod: ${modeLabel(state.mode)}</p>
    `;
    q('#restart-btn').addEventListener('click', () => this.onStart(state.mode));
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
    this.scoreEl.textContent = String(state.score);
  }

  /** Gol puanını ve combo çarpanını ekrana yansıt. */
  flashGoalScore(gs: GoalScore) {
    const el = document.createElement('div');
    el.className = 'score-pop';
    const combo = gs.multiplier > 1 ? ` <b>x${gs.multiplier}</b>` : '';
    el.innerHTML = `+${gs.points}${combo}`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
}

function q(sel: string): HTMLElement {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`HUD elemanı yok: ${sel}`);
  return el as HTMLElement;
}

function modeLabel(mode: GameMode): string {
  return mode === 'penalty' ? 'Penaltı' : mode === 'header' ? 'Kafa Vuruşu' : 'Karışık';
}
