import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

import { Stadium } from '../scene/Stadium';
import { Goal, GOAL_LINE_Z, GOAL_HEIGHT, GOAL_WIDTH } from '../scene/Goal';
import { Keeper, type DiveZone } from '../scene/Keeper';
import { Ball } from '../scene/Ball';
import { PoseTracker } from '../tracking/PoseTracker';
import { GestureDetector } from '../tracking/GestureDetector';
import { SkeletonRenderer } from '../ui/Skeleton';
import { HUD } from '../ui/HUD';
import { SoundManager } from '../audio/SoundManager';
import { KeeperAI } from './KeeperAI';
import { GameState, TOTAL_SHOTS, type ShotResult } from './GameState';
import { GAME_CONFIG } from '../config';

const ZONE_TARGET_X: Record<DiveZone, number> = GAME_CONFIG.shot.zoneTargetX;

export interface GameDeps {
  canvas: HTMLCanvasElement;
  rapier: typeof RAPIER;
  world: RAPIER.World;
  pose: PoseTracker;
  gesture: GestureDetector;
  skeleton: SkeletonRenderer;
  hud: HUD;
  sound: SoundManager;
  state: GameState;
  trackingEnabled: boolean;
}

/**
 * Ana oyun döngüsü: hareket girişini okur, fiziği günceller, şutları
 * çözümler ve sahneyi render eder.
 */
export class GameLoop {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;

  private stadium = new Stadium();
  private goal = new Goal();
  private keeper = new Keeper();
  private keeperAI = new KeeperAI();
  private ball: Ball;

  private d: GameDeps;

  private lastTime = 0;
  private shotElapsed = 0;
  private resolved = true;
  private resultTimer = 0;
  private physicsAccumulator = 0;
  private readonly FIXED_STEP = 1 / 60;

  // Klavye yedeği (kamerasız test)
  private keyZone: DiveZone = 'center';
  private keyKick = false;

  constructor(deps: GameDeps) {
    this.d = deps;
    this.ball = new Ball(deps.rapier, deps.world);

    this.renderer = new THREE.WebGLRenderer({
      canvas: deps.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearAlpha(0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    this.camera.position.set(0, 1.75, 5.6);
    this.camera.lookAt(0, 1.1, -6);

    this.stadium.addTo(this.scene);
    this.goal.addTo(this.scene);
    this.keeper.addTo(this.scene);
    this.ball.addTo(this.scene);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindKeyboard();
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keyZone = 'left';
      else if (e.key === 'ArrowRight') this.keyZone = 'right';
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') this.keyZone = 'center';
      else if (e.code === 'Space') {
        e.preventDefault();
        this.keyKick = true;
      }
    });
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  /** Poz takibi hazır olunca dışarıdan etkinleştir. */
  setTrackingEnabled(on: boolean) {
    this.d.trackingEnabled = on;
  }

  /** Yeni maç başlarken kaleci hafızasını ve sahneyi sıfırla. */
  newGame() {
    this.keeperAI.reset();
    this.keeper.reset();
    this.ball.reset();
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.update(now, dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  private update(now: number, dt: number) {
    const { state, gesture, hud } = this.d;

    // --- Giriş: hareket veya klavye ---
    let zone: DiveZone = this.keyZone;
    let kick = false;
    let power = 0.7;
    let charge = 0;

    if (this.d.trackingEnabled && this.d.pose.ready) {
      const landmarks = this.d.pose.detect(now);
      this.d.skeleton.draw(landmarks);
      const g = gesture.update(landmarks);
      zone = g.zone;
      charge = g.kickCharge;
      if (g.kick) {
        kick = true;
        power = g.power;
      }
    }
    if (this.keyKick) {
      kick = true;
      power = 0.8;
      this.keyKick = false;
    }

    // --- Faz makinesi ---
    if (state.phase === 'ready') {
      hud.setActiveZone(zone);
      hud.setPower(charge);
      hud.setStatus('Köşeyi seç, bacağını savur!');
      if (kick) this.shoot(zone, power);
    } else if (state.phase === 'shooting') {
      this.shotElapsed += dt;
      this.stepShot();
    } else if (state.phase === 'result') {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.finishResult();
    }

    // --- Fizik (sabit adım, kare hızından bağımsız) + senkron ---
    this.d.world.timestep = this.FIXED_STEP;
    this.physicsAccumulator += dt;
    let steps = 0;
    while (this.physicsAccumulator >= this.FIXED_STEP && steps < 6) {
      this.d.world.step();
      this.physicsAccumulator -= this.FIXED_STEP;
      steps++;
    }
    this.ball.sync();
    this.keeper.update(dt);
  }

  private shoot(zone: DiveZone, power: number) {
    const { state, gesture, hud } = this.d;

    // Hedef nokta ve hız
    const ballPos = this.ball.position();
    const targetX = ZONE_TARGET_X[zone];
    const target = new THREE.Vector3(targetX, GAME_CONFIG.shot.aimHeight, GOAL_LINE_Z);
    const dir = target.clone().sub(ballPos).normalize();
    const speed = THREE.MathUtils.lerp(
      GAME_CONFIG.shot.speedMin,
      GAME_CONFIG.shot.speedMax,
      power
    );
    const vel = dir.multiplyScalar(speed);
    vel.y += GAME_CONFIG.shot.arcBoost; // hafif yay

    // Topa ileri yuvarlanma + yana fırıl
    const spin = new THREE.Vector3(-speed * 1.5, dir.x * 6, 0);
    this.ball.shoot(vel, spin);
    this.d.sound.playKick(power);

    // Kaleci AI: eğilimi okur, maç ilerledikçe zorlaşır
    const dive = this.keeperAI.decide(zone, state.shots, TOTAL_SHOTS);
    this.keeperAI.record(zone);
    this.keeper.dive(dive);

    // Durum
    this.shotElapsed = 0;
    this.resolved = false;
    state.phase = 'shooting';
    gesture.reset();
    hud.setStatus('');
    hud.setPower(0);
  }

  private stepShot() {
    if (this.resolved) return;
    const pos = this.ball.position();

    // Kale çizgisine ulaştı mı?
    if (pos.z <= GOAL_LINE_Z + 0.05) {
      this.resolveShot(pos);
      return;
    }
    // Zaman aşımı (top ulaşamadı) -> aut
    if (this.shotElapsed > GAME_CONFIG.shot.timeoutSec) {
      this.resolveShot(pos, true);
    }
  }

  private resolveShot(pos: THREE.Vector3, timeout = false) {
    this.resolved = true;
    const { state, hud } = this.d;

    const halfW = GOAL_WIDTH / 2;
    const inGoal =
      !timeout &&
      Math.abs(pos.x) < halfW + 0.15 &&
      pos.y > 0 &&
      pos.y < GOAL_HEIGHT + 0.15;

    let result: ShotResult;
    if (!inGoal) {
      result = 'miss';
    } else {
      // Kurtarış: kaleci topun geldiği noktaya yeterince yakın mı?
      const keeperX = this.keeper.currentX();
      const horizDist = Math.abs(keeperX - pos.x);
      const canReach = pos.y < GAME_CONFIG.save.maxHeight;
      if (horizDist < GAME_CONFIG.save.horizReach && canReach) {
        result = 'save';
        // Topu uzaklaştır
        this.ball.deflect(
          new THREE.Vector3((pos.x - keeperX) * 4 + Math.sign(pos.x || 1) * 3, 4, 7)
        );
      } else {
        result = 'goal';
      }
    }

    state.recordResult(result);
    if (result === 'goal') this.d.sound.playGoal();
    else if (result === 'save') this.d.sound.playSave();
    else this.d.sound.playMiss();
    hud.flashResult(result);
    hud.updateStats(state);
    hud.setStatus(
      result === 'goal' ? 'GOL!' : result === 'save' ? 'Kaleci kurtardı!' : 'Dışarı!'
    );
    this.resultTimer = 1.4;
  }

  private finishResult() {
    const { state, hud, gesture } = this.d;
    this.ball.reset();
    this.keeper.reset();
    gesture.reset();
    state.next();

    if (state.isOver) {
      hud.showEndScreen(state);
    } else {
      hud.setStatus('Köşeyi seç, bacağını savur!');
    }
  }
}
