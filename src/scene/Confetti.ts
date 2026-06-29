import * as THREE from 'three';

const COLORS = [0x2bd66a, 0xffd24d, 0x6fb6ff, 0xff5a3c, 0xffffff, 0xff7a18];

/**
 * Gol kutlaması için renkli parçacık patlaması (Points).
 * burst(pos) ile tetiklenir; update(dt) ile yerçekimiyle düşüp söner.
 */
export class Confetti {
  readonly points: THREE.Points;
  private readonly count: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private life: Float32Array; // kalan ömür (sn)
  private maxLife = 1.6;
  private geo: THREE.BufferGeometry;
  private mat: THREE.PointsMaterial;

  constructor(count = 220) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);

    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      c.setHex(COLORS[i % COLORS.length]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.points);
  }

  /** Verilen noktada patlat. */
  burst(origin: THREE.Vector3) {
    this.points.visible = true;
    this.mat.opacity = 1;
    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] = origin.x + (Math.random() - 0.5) * 1.2;
      this.positions[i * 3 + 1] = origin.y + Math.random() * 0.6;
      this.positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.6;
      // Yukarı ve dışa doğru saçıl
      this.velocities[i * 3] = (Math.random() - 0.5) * 6;
      this.velocities[i * 3 + 1] = 3 + Math.random() * 5;
      this.velocities[i * 3 + 2] = 1 + Math.random() * 3;
      this.life[i] = this.maxLife * (0.6 + Math.random() * 0.4);
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  update(dt: number) {
    if (!this.points.visible) return;
    let anyAlive = false;
    let maxLifeNow = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      anyAlive = true;
      this.life[i] -= dt;
      this.velocities[i * 3 + 1] -= 9.81 * dt; // yerçekimi
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.life[i] > maxLifeNow) maxLifeNow = this.life[i];
    }
    this.geo.attributes.position.needsUpdate = true;
    // Toplu sönme
    this.mat.opacity = Math.max(0, Math.min(1, maxLifeNow / 0.6));
    if (!anyAlive) this.points.visible = false;
  }
}
