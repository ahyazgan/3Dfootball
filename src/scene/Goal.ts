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
    const depth = 1.6; // filenin arkaya derinliği
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
  }
}
