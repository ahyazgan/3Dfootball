/**
 * Web Audio ile prosedürel ses efektleri — harici dosya gerektirmez.
 * Tüm sesler sentezlenir (şut, gol tezahüratı, kurtarış, aut, düdük).
 * AudioContext bir kullanıcı hareketiyle (BAŞLA) başlatılmalıdır.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Kullanıcı hareketinde çağır (autoplay politikası gereği). */
  async init() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  private get t() {
    return this.ctx!.currentTime;
  }

  private out(): AudioNode {
    return this.master!;
  }

  /** Beyaz gürültü tamponu (tekrar kullanılır). */
  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private osc(
    type: OscillatorType,
    freq: number,
    dur: number,
    gain: number,
    opts: { f1?: number; delay?: number; dest?: AudioNode } = {}
  ) {
    if (!this.ctx) return;
    const start = this.t + (opts.delay ?? 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (opts.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(opts.dest ?? this.out());
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private noiseHit(
    dur: number,
    gain: number,
    filter: { type: BiquadFilterType; freq: number; q?: number; sweepTo?: number },
    delay = 0
  ) {
    if (!this.ctx) return;
    const start = this.t + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.1);
    const biq = this.ctx.createBiquadFilter();
    biq.type = filter.type;
    biq.frequency.setValueAtTime(filter.freq, start);
    if (filter.sweepTo) biq.frequency.exponentialRampToValueAtTime(filter.sweepTo, start + dur);
    biq.Q.value = filter.q ?? 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(biq).connect(g).connect(this.out());
    src.start(start);
    src.stop(start + dur + 0.1);
  }

  /** Topa vuruş — güce göre sertleşen tok bir "tak". */
  playKick(power = 0.7) {
    if (!this.ctx || this.muted) return;
    const g = 0.4 + power * 0.5;
    // Alçak gövde (thump)
    this.osc('sine', 200, 0.16, g, { f1: 55 });
    // Vuruş kliği
    this.noiseHit(0.06, g * 0.7, { type: 'bandpass', freq: 1800, q: 0.8 });
  }

  /** Hakem düdüğü — kısa, tiz, hafif trilli. */
  playWhistle() {
    if (!this.ctx || this.muted) return;
    this.osc('square', 2600, 0.18, 0.18, { f1: 2750 });
    this.osc('square', 2600, 0.16, 0.18, { f1: 2750, delay: 0.22 });
  }

  /** GOL — tribün tezahüratı + yükselen arpej. */
  playGoal() {
    if (!this.ctx || this.muted) return;
    // Tezahürat: bant geçiren gürültü yukarı süpürme, uzun zarf
    this.noiseHit(1.3, 0.5, { type: 'bandpass', freq: 500, q: 0.7, sweepTo: 1600 });
    this.noiseHit(1.1, 0.3, { type: 'highpass', freq: 800 }, 0.05);
    // Sevinç arpeji
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((n, i) => this.osc('triangle', n, 0.3, 0.22, { delay: i * 0.1 }));
  }

  /** KURTARIŞ — "oooh" iç çekiş + tok blok sesi. */
  playSave() {
    if (!this.ctx || this.muted) return;
    this.noiseHit(0.8, 0.35, { type: 'bandpass', freq: 700, q: 0.6, sweepTo: 300 });
    this.osc('square', 150, 0.18, 0.3, { f1: 90 }); // eldiven bloğu
  }

  /** AUT — hayal kırıklığı, inen iki ton. */
  playMiss() {
    if (!this.ctx || this.muted) return;
    this.osc('sawtooth', 360, 0.22, 0.18, { f1: 280 });
    this.osc('sawtooth', 280, 0.3, 0.18, { f1: 180, delay: 0.18 });
  }
}
