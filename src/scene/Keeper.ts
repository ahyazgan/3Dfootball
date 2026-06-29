import * as THREE from 'three';
import { GOAL_LINE_Z, GOAL_WIDTH } from './Goal';

export type DiveZone = 'left' | 'center' | 'right';

/**
 * Turuncu formalı kaleci. Basit kutucuk/küre gövde + dalış animasyonu.
 * dive(zone) hedef pozu ayarlar; update(dt) yumuşak geçiş yapar.
 */
export class Keeper {
  readonly group = new THREE.Group();

  private body: THREE.Group;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;

  // Animasyon hedefleri
  private targetX = 0;
  private targetTilt = 0; // z ekseni eğimi (dalış)
  private targetArmsUp = 0; // 0..1 kol kaldırma
  private armsUp = 0;

  // Kalecinin orta noktası kale çizgisinin biraz önünde
  private readonly baseZ = GOAL_LINE_Z + 0.4;
  readonly reach = GOAL_WIDTH / 2 - 0.4; // dalışta ulaşabildiği x

  constructor() {
    this.group.position.set(0, 0, this.baseZ);
    this.body = this.build();
    this.group.add(this.body);
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private build(): THREE.Group {
    const g = new THREE.Group();
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.55 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x12121a, roughness: 0.7 });
    const sock = new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.7 });
    const leg = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.5 });

    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // Gövde (yuvarlatılmış kapsül forma)
    const torso = mk(new THREE.CapsuleGeometry(0.24, 0.42, 6, 16), orange);
    torso.scale.z = 0.7; // önden ince
    torso.position.y = 1.3;
    g.add(torso);

    // Boyun + kafa + saç
    const neck = mk(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12), skin);
    neck.position.y = 1.66;
    g.add(neck);
    const head = mk(new THREE.SphereGeometry(0.16, 24, 24), skin);
    head.position.y = 1.82;
    g.add(head);
    const cap = mk(
      new THREE.SphereGeometry(0.165, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair
    );
    cap.position.y = 1.84;
    g.add(cap);

    // Şort
    const shortsM = mk(new THREE.BoxGeometry(0.46, 0.26, 0.34), shorts);
    shortsM.position.y = 0.92;
    g.add(shortsM);

    // Bacaklar (üst ten + alt çorap) + krampon
    const mkLeg = (x: number) => {
      const thigh = mk(new THREE.CapsuleGeometry(0.1, 0.34, 4, 12), leg);
      thigh.position.set(x, 0.62, 0);
      const shin = mk(new THREE.CapsuleGeometry(0.09, 0.32, 4, 12), sock);
      shin.position.set(x, 0.24, 0);
      const boot = mk(new THREE.BoxGeometry(0.16, 0.1, 0.3), glove);
      boot.position.set(x, 0.05, 0.05);
      g.add(thigh, shin, boot);
    };
    mkLeg(-0.13);
    mkLeg(0.13);

    // Kollar (omuz pivotundan döndürmek için grup kullan)
    const mkArm = (sign: number) => {
      const arm = mk(new THREE.CapsuleGeometry(0.07, 0.5, 4, 12), orange);
      arm.geometry.translate(0, -0.3, 0); // pivot üstte (omuz)
      const shoulder = new THREE.Group();
      shoulder.position.set(sign * 0.3, 1.52, 0);
      shoulder.add(arm);
      const gloveM = mk(new THREE.SphereGeometry(0.11, 16, 16), glove);
      gloveM.position.y = -0.6;
      gloveM.scale.set(1, 1.25, 0.7);
      arm.add(gloveM);
      g.add(shoulder);
      return arm;
    };
    this.leftArm = mkArm(-1);
    this.rightArm = mkArm(1);

    // Hafif "hazır" duruşu
    this.leftArm.rotation.z = 0.5;
    this.rightArm.rotation.z = -0.5;

    return g;
  }

  /** Dalış başlat. */
  dive(zone: DiveZone) {
    if (zone === 'left') {
      this.targetX = -this.reach;
      this.targetTilt = 0.9;
    } else if (zone === 'right') {
      this.targetX = this.reach;
      this.targetTilt = -0.9;
    } else {
      this.targetX = 0;
      this.targetTilt = 0;
    }
    this.targetArmsUp = 1;
  }

  /** Merkeze dön, hazır duruşa geç. */
  reset() {
    this.targetX = 0;
    this.targetTilt = 0;
    this.targetArmsUp = 0;
  }

  /** O an kalecinin kapsadığı yatay aralık (kurtarış kontrolü için). */
  currentX(): number {
    return this.group.position.x;
  }

  update(dt: number) {
    const k = 1 - Math.pow(0.001, dt); // zaman bağımsız lerp
    this.group.position.x += (this.targetX - this.group.position.x) * k;
    this.body.rotation.z += (this.targetTilt - this.body.rotation.z) * k;
    // Dalışta yere yakınlaş (zıpla)
    const diveAmount = Math.abs(this.body.rotation.z) / 0.9;
    this.group.position.y = diveAmount * 0.35;

    this.armsUp += (this.targetArmsUp - this.armsUp) * k;
    this.leftArm.rotation.z = 0.5 + this.armsUp * 1.8;
    this.rightArm.rotation.z = -0.5 - this.armsUp * 1.8;
  }
}
