import * as THREE from 'three';

/**
 * Topun arkasında parlayan iz. Son N konumu tutar; toplamsal (additive)
 * harmanla uca doğru sönerek "ışık izi" hissi verir.
 */
export class BallTrail {
  readonly line: THREE.Line;
  private readonly N = 22;
  private positions: Float32Array;
  private colors: Float32Array;
  private geo: THREE.BufferGeometry;

  constructor(private color = new THREE.Color(0xffffff)) {
    this.positions = new Float32Array(this.N * 3);
    this.colors = new Float32Array(this.N * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.line = new THREE.Line(this.geo, mat);
    this.line.frustumCulled = false;
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.line);
  }

  /** İzi tek noktaya topla (atışlar arası gizli). */
  reset(p: THREE.Vector3) {
    for (let i = 0; i < this.N; i++) {
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      this.colors[i * 3] = this.colors[i * 3 + 1] = this.colors[i * 3 + 2] = 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  /** Yeni konumu öne ekle, eskileri kaydır; uca doğru söndür. */
  update(p: THREE.Vector3, visible: boolean) {
    // Kaydır
    for (let i = this.N - 1; i > 0; i--) {
      this.positions[i * 3] = this.positions[(i - 1) * 3];
      this.positions[i * 3 + 1] = this.positions[(i - 1) * 3 + 1];
      this.positions[i * 3 + 2] = this.positions[(i - 1) * 3 + 2];
    }
    this.positions[0] = p.x;
    this.positions[1] = p.y;
    this.positions[2] = p.z;

    const base = visible ? 1 : 0;
    for (let i = 0; i < this.N; i++) {
      const t = (1 - i / this.N) * base; // başta parlak, uçta sönük
      this.colors[i * 3] = this.color.r * t;
      this.colors[i * 3 + 1] = this.color.g * t;
      this.colors[i * 3 + 2] = this.color.b * t;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
