import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

export const BALL_RADIUS = 0.11; // ~22cm çap

/** Penaltı noktası (topun başlangıç konumu). */
export const SPOT = new THREE.Vector3(0, BALL_RADIUS, 0);

/**
 * Futbol topu: Three.js mesh + Rapier dinamik gövde.
 * Mesh her karede fizik gövdesinden senkronlanır; top dönerek uçar.
 */
export class Ball {
  readonly mesh: THREE.Mesh;
  private rb: RAPIER.RigidBody;
  private rapier: typeof RAPIER;
  private world: RAPIER.World;

  constructor(rapier: typeof RAPIER, world: RAPIER.World) {
    this.rapier = rapier;
    this.world = world;

    const tex = this.makeBallTexture();
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.0 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;

    // Fizik gövdesi
    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(SPOT.x, SPOT.y, SPOT.z)
      .setLinearDamping(0.25)
      .setAngularDamping(0.4)
      .setCcdEnabled(true);
    this.rb = world.createRigidBody(bodyDesc);

    const colDesc = rapier.ColliderDesc.ball(BALL_RADIUS)
      .setRestitution(0.55)
      .setFriction(0.6)
      .setDensity(2.0);
    world.createCollider(colDesc, this.rb);

    this.sync();
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.mesh);
  }

  /** Beyaz top + siyah beşgen lekeler dokusu. */
  private makeBallTexture(): THREE.CanvasTexture {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#15151a';
    const spots = [
      [0.5, 0.28],
      [0.22, 0.55],
      [0.78, 0.55],
      [0.5, 0.82],
      [0.1, 0.15],
      [0.9, 0.15],
    ];
    for (const [u, v] of spots) {
      this.pentagon(ctx, u * S, v * S, S * 0.11);
    }
    return new THREE.CanvasTexture(c);
  }

  private pentagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Topu penaltı noktasına geri koy, durdur. */
  reset() {
    this.rb.setTranslation({ x: SPOT.x, y: SPOT.y, z: SPOT.z }, true);
    this.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.sync();
  }

  /** Belirli bir hızla şut at. */
  shoot(velocity: THREE.Vector3, spin: THREE.Vector3) {
    this.rb.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    this.rb.setAngvel({ x: spin.x, y: spin.y, z: spin.z }, true);
  }

  /** Kurtarış: topa sapma uygula. */
  deflect(velocity: THREE.Vector3) {
    this.rb.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  position(): THREE.Vector3 {
    const t = this.rb.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  /** Mesh'i fizik gövdesine göre güncelle. */
  sync() {
    const t = this.rb.translation();
    const r = this.rb.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }
}
