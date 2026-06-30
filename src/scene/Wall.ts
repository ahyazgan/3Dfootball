import * as THREE from 'three';

/** Serbest vuruş barajının z konumu (kale ile top arasında). */
export const WALL_Z = -6.5;
/** Baraj yarı genişliği (m) — engelleme kontrolünde kullanılır. */
export const WALL_HALF_WIDTH = 1.1;
/** Baraj yüksekliği (m). */
export const WALL_HEIGHT = 1.9;

/**
 * Serbest vuruş barajı: yan yana dizilmiş 4 savunmacı. Topun düz/alçak
 * rotasını kapatır; oyuncu falsoyla yana ya da üstten aşmalıdır.
 * show(centerX) ile konumlanır, hide() ile gizlenir.
 */
export class Wall {
  readonly group = new THREE.Group();

  constructor() {
    this.group.visible = false;
    this.build();
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private build() {
    const jersey = new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.7 });

    const count = 4;
    const spacing = (WALL_HALF_WIDTH * 2) / count;
    for (let i = 0; i < count; i++) {
      const x = -WALL_HALF_WIDTH + spacing * (i + 0.5);
      const p = new THREE.Group();
      p.position.x = x;

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.28), jersey);
      torso.position.y = 1.15;
      torso.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skin);
      head.position.y = 1.78;
      head.castShadow = true;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), dark);
      legL.position.set(-0.11, 0.35, 0);
      const legR = legL.clone();
      legR.position.x = 0.11;
      // Elleri önde (savunma duruşu)
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), jersey);
      armL.position.set(-0.3, 1.15, 0.05);
      armL.rotation.z = 0.25;
      const armR = armL.clone();
      armR.position.x = 0.3;
      armR.rotation.z = -0.25;
      p.add(torso, head, legL, legR, armL, armR);
      this.group.add(p);
    }
  }

  /** Barajı verilen x merkezine yerleştir ve göster. */
  show(centerX: number) {
    this.group.position.set(centerX, 0, WALL_Z);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  /** Top barajdan engellendi mi? (verilen x baraj bandında ve y duvar altında) */
  blocks(ballX: number, ballY: number, ballRadius: number): boolean {
    if (!this.group.visible) return false;
    const dx = Math.abs(ballX - this.group.position.x);
    return dx < WALL_HALF_WIDTH + ballRadius && ballY < WALL_HEIGHT;
  }
}
