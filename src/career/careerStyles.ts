let injected = false;

/** Kariyer ekranlarının ortak stillerini bir kez enjekte eder. */
export function injectCareerStyles(): void {
  if (injected) return;
  injected = true;
  const css = `
  .career-screen{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;
    font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    background:radial-gradient(ellipse at top,rgba(10,61,31,.86),rgba(3,10,6,.95));
    overflow-y:auto}
  .career-screen.hidden{display:none}
  .career-screen h1{font-size:34px;font-weight:900;color:#fff;text-shadow:0 3px 14px #000;margin:0}
  .career-screen h2{font-size:20px;font-weight:800;color:#9fe0b0;margin:0;letter-spacing:1px}
  .c-card{background:rgba(6,26,14,.7);border:1px solid rgba(255,255,255,.12);
    border-radius:18px;padding:20px;width:min(94vw,440px);display:flex;flex-direction:column;gap:14px}
  .c-row{display:flex;gap:10px;align-items:center;justify-content:space-between}
  .c-label{font-size:12px;letter-spacing:2px;color:#9fe0b0;font-weight:700}
  .c-input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.2);
    background:rgba(0,0,0,.35);color:#fff;font-size:18px;font-weight:700;text-align:center}
  .c-choices{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .c-choice{cursor:pointer;border:2px solid rgba(255,255,255,.25);background:rgba(0,0,0,.3);
    color:#fff;border-radius:12px;padding:10px 16px;font-size:15px;font-weight:700;transition:all .12s}
  .c-choice.active{background:#2bd66a;border-color:#2bd66a;color:#053}
  .c-swatch{width:40px;height:40px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .1s}
  .c-swatch.active{border-color:#fff;transform:scale(1.12)}
  .cbtn{cursor:pointer;border:none;border-radius:999px;padding:15px 34px;font-size:19px;font-weight:800;
    color:#053;background:linear-gradient(180deg,#41e07a,#1fb85a);
    box-shadow:0 8px 24px rgba(0,0,0,.45);transition:transform .1s}
  .cbtn:active{transform:scale(.96)}
  .cbtn.secondary{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);box-shadow:none}
  .cbtn.wide{width:100%}
  .c-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .c-stat{background:rgba(0,0,0,.3);border-radius:12px;padding:10px 12px;text-align:left}
  .c-stat .k{font-size:11px;letter-spacing:1px;color:#9fe0b0;font-weight:700}
  .c-stat .v{font-size:22px;font-weight:800;color:#fff}
  .c-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:5px}
  .c-bar > i{display:block;height:100%;background:linear-gradient(90deg,#3bd,#2bd66a)}
  .c-hint{font-size:13px;color:#8fbf9f}
  .c-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:30;
    background:rgba(6,26,14,.92);border:1px solid #2bd66a;color:#9bf3bf;font-weight:700;
    padding:12px 20px;border-radius:999px;animation:c-fade 2.2s ease forwards;pointer-events:none}
  @keyframes c-fade{0%{opacity:0;transform:translate(-50%,8px)}15%{opacity:1;transform:translate(-50%,0)}
    80%{opacity:1}100%{opacity:0}}
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

/** Kısa bildirim balonu. */
export function toast(message: string): void {
  const el = document.createElement('div');
  el.className = 'c-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
