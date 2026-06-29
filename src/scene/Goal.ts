import * as THREE from 'three';

export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;
/** Kale çizgisinin z konumu (oyuncudan uzakta). */
export const GOAL_LINE_Z = -11;

/**
 * Gerçek boyutlu kale (7.32m × 2.44m): direkler, üst direk ve file.
 */
export class Goal {
  readonly group = new THREE.Group();

  private netGeo!: THREE.BufferGeometry;
  private netBase!: Float32Array; // dinlenme konumları
  private netDisp!: Float32Array; // anlık yer değiştirme (base'den fark)
  private readonly NET_DEPTH = 1.6;

  constructor() {
    this.group.position.set(0, 0, GOAL_LINE_Z);
    this.buildFrame();
    this.buildNet();
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private buildFrame() {
    const r = 0.06; // direk yarıçapı
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    const halfW = GOAL_WIDTH / 2;

    const post = (x: number) => {
      const geo = new THREE.CylinderGeometry(r, r, GOAL_HEIGHT, 16);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, GOAL_HEIGHT / 2, 0);
      m.castShadow = true;
      this.group.add(m);
    };
    post(-halfW);
    post(halfW);

    // Üst direk
    const barGeo = new THREE.CylinderGeometry(r, r, GOAL_WIDTH + r * 2, 16);
    const bar = new THREE.Mesh(barGeo, mat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, GOAL_HEIGHT, 0);
    bar.castShadow = true;
    this.group.add(bar);
  }

  /** File: ön açıklıktan arkaya eğimli, ızgara çizgili. */
  private buildNet() {
    const halfW = GOAL_WIDTH / 2;
    const depth = this.NET_DEPTH; // filenin arkaya derinliği
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
    });

    const pts: number[] = [];
    const cols = 18;
    const rows = 7;

    // Arka panel (eğimli): üstte z=-? Filenin üstü arkaya gider.
    const backZTop = -depth;
    const backZBottom = -depth;

    // Dikey çizgiler — arka panel
    for (let i = 0; i <= cols; i++) {
      const x = -halfW + (GOAL_WIDTH * i) / cols;
      pts.push(x, 0, backZBottom, x, GOAL_HEIGHT, backZTop);
    }
    // Yatay çizgiler — arka panel
    for (let j = 0; j <= rows; j++) {
      const y = (GOAL_HEIGHT * j) / rows;
      pts.push(-halfW, y, backZTop, halfW, y, backZTop);
    }
    // Üst panel (kaleden arkaya eğim)
    for (let i = 0; i <= cols; i++) {
      const x = -halfW + (GOAL_WIDTH * i) / cols;
      pts.push(x, GOAL_HEIGHT, 0, x, GOAL_HEIGHT, backZTop);
    }
    for (let j = 0; j <= 3; j++) {
      const z = -(depth * j) / 3;
      pts.push(-halfW, GOAL_HEIGHT, z, halfW, GOAL_HEIGHT, z);
    }
    // Yan paneller
    for (const sx of [-halfW, halfW]) {
      for (let j = 0; j <= rows; j++) {
        const y = (GOAL_HEIGHT * j) / rows;
        pts.push(sx, y, 0, sx, y, backZTop);
      }
      pts.push(sx, 0, backZTop, sx, GOAL_HEIGHT, backZTop);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const net = new THREE.LineSegments(geo, mat);
    this.group.add(net);

    this.netGeo = geo;
    this.netBase = Float32Array.from(pts);
    this.netDisp = new Float32Array(pts.length);
  }

  /**
   * Top fileye girince çarpma noktasında file şişer.
   * worldPoint dünya koordinatında; kale grubuna göre yerele çevrilir.
   */
  hitNet(worldPoint: THREE.Vector3) {
    const lx = worldPoint.x - this.group.position.x;
    const ly = worldPoint.y - this.group.position.y;
    const sigma2 = 2 * 0.7 * 0.7;
    const strength = 0.55;
    for (let i = 0; i < this.netBase.length; i += 3) {
      const bx = this.netBase[i];
      const by = this.netBase[i + 1];
      const bz = this.netBase[i + 2];
      const d2 = (bx - lx) ** 2 + (by - ly) ** 2;
      const fall = Math.exp(-d2 / sigma2);
      // Sadece geride olan (file) düğümler şişsin; çerçeveye yakın olanlar az
      const depthFactor = Math.min(1, -bz / this.NET_DEPTH + 0.2);
      const push = strength * fall * depthFactor;
      this.netDisp[i] = (lx - bx) * fall * 0.25; // çarpmaya doğru çek
      this.netDisp[i + 1] = (ly - by) * fall * 0.25;
      this.netDisp[i + 2] = -push; // arkaya doğru şiş
    }
  }

  /** File yer değiştirmesini yumuşakça dinlenmeye döndür. */
  updateNet(dt: number) {
    const decay = Math.pow(0.0025, dt); // ~ yaylanma
    const arr = this.netGeo.attributes.position.array as Float32Array;
    let active = false;
    for (let i = 0; i < this.netDisp.length; i++) {
      this.netDisp[i] *= decay;
      if (Math.abs(this.netDisp[i]) > 1e-4) active = true;
      arr[i] = this.netBase[i] + this.netDisp[i];
    }
    if (active) this.netGeo.attributes.position.needsUpdate = true;
  }
}
