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
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.7 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.5 });

    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };

    // Gövde
    const torso = mk(new THREE.BoxGeometry(0.5, 0.7, 0.3), orange);
    torso.position.y = 1.25;
    g.add(torso);

    // Kafa
    const head = mk(new THREE.SphereGeometry(0.16, 20, 20), skin);
    head.position.y = 1.78;
    g.add(head);

    // Bacaklar
    const legL = mk(new THREE.BoxGeometry(0.18, 0.8, 0.22), dark);
    legL.position.set(-0.13, 0.5, 0);
    const legR = legL.clone();
    legR.position.x = 0.13;
    g.add(legL, legR);

    // Kollar (omuz pivotundan döndürmek için grup kullan)
    this.leftArm = mk(new THREE.BoxGeometry(0.14, 0.62, 0.14), orange);
    this.leftArm.geometry.translate(0, -0.31, 0); // pivot üstte (omuz)
    const lShoulder = new THREE.Group();
    lShoulder.position.set(-0.32, 1.55, 0);
    lShoulder.add(this.leftArm);
    const lGlove = mk(new THREE.SphereGeometry(0.1, 12, 12), glove);
    lGlove.position.y = -0.62;
    this.leftArm.add(lGlove);
    g.add(lShoulder);

    this.rightArm = mk(new THREE.BoxGeometry(0.14, 0.62, 0.14), orange);
    this.rightArm.geometry.translate(0, -0.31, 0);
    const rShoulder = new THREE.Group();
    rShoulder.position.set(0.32, 1.55, 0);
    rShoulder.add(this.rightArm);
    const rGlove = mk(new THREE.SphereGeometry(0.1, 12, 12), glove);
    rGlove.position.y = -0.62;
    this.rightArm.add(rGlove);
    g.add(rShoulder);

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
