import type { PoseLandmarks } from '../tracking/PoseTracker';

// İskelet bağlantıları (MediaPipe Pose indeksleri)
const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], // gövde
  [11, 13], [13, 15], // sol kol
  [12, 14], [14, 16], // sağ kol
  [23, 25], [25, 27], [27, 31], // sol bacak
  [24, 26], [26, 28], [28, 32], // sağ bacak
];

/**
 * Landmark'ları aynalı skeleton canvas'ına yeşil çizgilerle çizer.
 * (Canvas CSS ile zaten aynalandığı için landmark x'i olduğu gibi kullanılır.)
 */
export class SkeletonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(landmarks: PoseLandmarks | null) {
    this.clear();
    if (!landmarks) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(60,255,120,0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * W, pa.y * H);
      ctx.lineTo(pb.x * W, pb.y * H);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(220,255,230,0.95)';
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
