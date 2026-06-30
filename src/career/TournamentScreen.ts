import { injectCareerStyles } from './careerStyles';
import type { TournamentState } from './types';
import { currentRound, isTournamentOver } from './Tournament';

export interface TournamentCallbacks {
  /** Sıradaki turnuva maçını oyna. */
  onPlay: () => void;
  /** Turnuvadan çık (durum korunur). */
  onBack: () => void;
  /** Turnuva bitti — kapat ve hub'a dön. */
  onFinish: () => void;
}

/** Milli takım turnuvası ekranı: eleme ağacı + oyna/sonuç. */
export class TournamentScreen {
  private root: HTMLElement;

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(s: TournamentState, cb: TournamentCallbacks) {
    this.root.className = 'career-screen';
    const over = isTournamentOver(s);
    const round = currentRound(s);

    const bracket = s.rounds
      .map((label, i) => {
        const opp = s.opponents[i] ?? '—';
        let state: 'done' | 'current' | 'lost' | 'todo';
        if (s.champion && i <= s.rounds.length - 1 && i < s.roundIndex) state = 'done';
        else if (i < s.roundIndex) state = 'done';
        else if (s.eliminated && i === s.roundIndex) state = 'lost';
        else if (i === s.roundIndex && !over) state = 'current';
        else state = 'todo';
        const color =
          state === 'done'
            ? '#2bd66a'
            : state === 'current'
              ? '#ffd24d'
              : state === 'lost'
                ? '#ff6a4d'
                : 'rgba(255,255,255,.4)';
        const mark =
          state === 'done' ? '✓' : state === 'lost' ? '✗' : state === 'current' ? '▶' : '·';
        return `<div class="c-row" style="border-left:3px solid ${color};padding-left:10px">
          <span class="c-label">${label}</span>
          <b style="color:${color}">${mark} ${s.team} — ${opp}</b></div>`;
      })
      .join('');

    let footer: string;
    if (s.champion) {
      footer = `<div style="font-size:22px;font-weight:900;color:#ffd24d;text-shadow:0 2px 12px #000">
          🏆 ŞAMPİYON! ${s.team} kupayı kaldırdı!</div>
        <button class="cbtn wide" id="t-finish">DEVAM</button>`;
    } else if (s.eliminated) {
      footer = `<div style="font-size:18px;font-weight:800;color:#ff8a3c">
          Elendin — ${round ? round.label : 'turnuva'} sonu. Sezona devam.</div>
        <button class="cbtn wide" id="t-finish">DEVAM</button>`;
    } else {
      footer = `<button class="cbtn wide" id="t-play">${round?.label} OYNA — ${s.team} vs ${round?.opponent} ▶</button>
        <button class="cbtn wide secondary" id="t-back">Sonra Devam Et</button>`;
    }

    this.root.innerHTML = `
      <h2>MİLLİ TAKIM</h2>
      <h1>${s.name}</h1>
      <div class="c-card">${bracket}</div>
      <div class="c-card">${footer}</div>
    `;

    const play = this.root.querySelector('#t-play');
    if (play) play.addEventListener('click', () => cb.onPlay());
    const back = this.root.querySelector('#t-back');
    if (back) back.addEventListener('click', () => cb.onBack());
    const finish = this.root.querySelector('#t-finish');
    if (finish) finish.addEventListener('click', () => cb.onFinish());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
