import * as THREE from 'three';

/**
 * Stadyum: çim zemin (biçme şeritleri + beyaz çizgiler), ışıklar ve
 * basit tribün hissi. Ölçüler gerçeğe yakın (metre).
 */
export class Stadium {
  readonly group = new THREE.Group();
  readonly shadowLight: THREE.DirectionalLight;

  constructor() {
    this.group.add(this.buildPitch());
    this.shadowLight = this.buildLights();
    this.buildStands();
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  /** Çim + çizgiler tek bir CanvasTexture içinde çizilir. */
  private buildPitch(): THREE.Mesh {
    const width = 40; // x ekseni (kale genişliği yönü)
    const depth = 30; // z ekseni (penaltı atışı yönü)

    const tex = this.makePitchTexture();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const geo = new THREE.PlaneGeometry(width, depth);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // yatay düzlem
    mesh.position.set(0, 0, -3); // kaleye doğru biraz kaydır
    mesh.receiveShadow = true;
    return mesh;
  }

  private makePitchTexture(): THREE.CanvasTexture {
    const W = 1024;
    const H = 768;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;

    // Biçme şeritleri
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2f8f3a' : '#2a8133';
      ctx.fillRect(0, (i * H) / stripes, W, H / stripes + 1);
    }

    // Beyaz çizgiler (görüntünün üst kısmı = kale tarafı = -z)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;

    // Ceza sahası (büyük dikdörtgen)
    const boxW = W * 0.66;
    const boxH = H * 0.34;
    const boxX = (W - boxW) / 2;
    ctx.strokeRect(boxX, 0, boxW, boxH);

    // Kale alanı (küçük dikdörtgen)
    const sixW = W * 0.34;
    const sixH = H * 0.16;
    ctx.strokeRect((W - sixW) / 2, 0, sixW, sixH);

    // Penaltı noktası
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(W / 2, boxH * 0.62, 6, 0, Math.PI * 2);
    ctx.fill();

    // Penaltı yayı
    ctx.beginPath();
    ctx.arc(W / 2, boxH * 0.62, W * 0.12, Math.PI * 0.18, Math.PI - Math.PI * 0.18);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  private buildLights(): THREE.DirectionalLight {
    // Ortam / gökyüzü ışığı
    const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x2a5a2a, 0.7);
    this.group.add(hemi);

    // Ana yönlü ışık (gölge kaynağı)
    const dir = new THREE.DirectionalLight(0xffffff, 2.1);
    dir.position.set(8, 16, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 60;
    const s = 18;
    dir.shadow.camera.left = -s;
    dir.shadow.camera.right = s;
    dir.shadow.camera.top = s;
    dir.shadow.camera.bottom = -s;
    dir.shadow.bias = -0.0005;
    this.group.add(dir);
    this.group.add(dir.target);
    dir.target.position.set(0, 0, -11);

    // Renkli stadyum spot ışıkları
    const spotL = new THREE.SpotLight(0x6fb6ff, 120, 60, Math.PI / 6, 0.4, 1.2);
    spotL.position.set(-14, 14, 4);
    spotL.target.position.set(0, 1, -11);
    this.group.add(spotL, spotL.target);

    const spotR = new THREE.SpotLight(0xffd28a, 120, 60, Math.PI / 6, 0.4, 1.2);
    spotR.position.set(14, 14, 4);
    spotR.target.position.set(0, 1, -11);
    this.group.add(spotR, spotR.target);

    return dir;
  }

  /** Kalenin arkasında basit, soluk tribün düzlemi. */
  private buildStands() {
    const geo = new THREE.PlaneGeometry(50, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x10202c,
      roughness: 1,
      metalness: 0,
    });
    const stand = new THREE.Mesh(geo, mat);
    stand.position.set(0, 6, -17);
    stand.receiveShadow = false;
    this.group.add(stand);

    // Tribünde dağınık renkli noktalar (seyirci hissi)
    const dots = new THREE.Group();
    const colors = [0xffffff, 0xff5555, 0x55aaff, 0xffd24d];
    for (let i = 0; i < 400; i++) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 6),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      m.position.set((Math.random() - 0.5) * 46, 1 + Math.random() * 10, -16.8);
      dots.add(m);
    }
    this.group.add(dots);
  }
}
