import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type RAPIER from '@dimforge/rapier3d-compat';

import { Stadium } from '../scene/Stadium';
import { Goal, GOAL_LINE_Z, GOAL_HEIGHT, GOAL_WIDTH } from '../scene/Goal';
import { Keeper, type DiveZone } from '../scene/Keeper';
import { Ball } from '../scene/Ball';
import { BallTrail } from '../scene/BallTrail';
import { Confetti } from '../scene/Confetti';
import { PoseTracker } from '../tracking/PoseTracker';
import {
  GestureDetector,
  type GestureSample,
  type Foot,
} from '../tracking/GestureDetector';
import { SkeletonRenderer } from '../ui/Skeleton';
import { HUD } from '../ui/HUD';
import { SoundManager } from '../audio/SoundManager';
import { KeeperAI } from './KeeperAI';
import { ScoreStore } from './ScoreStore';
import { GameState, TOTAL_SHOTS, type ShotResult } from './GameState';
import { GAME_CONFIG, type DifficultyName } from '../config';

export interface GameDeps {
  canvas: HTMLCanvasElement;
  rapier: typeof RAPIER;
  world: RAPIER.World;
  pose: PoseTracker;
  gesture: GestureDetector;
  skeleton: SkeletonRenderer;
  hud: HUD;
  sound: SoundManager;
  scoreStore: ScoreStore;
  state: GameState;
  trackingEnabled: boolean;
  /** Maç bitince çağrılır (örn. wake lock'ı bırak). */
  onGameOver?: () => void;
}

/**
 * Ana oyun döngüsü: hareket girişini okur, fiziği günceller, şutları
 * çözümler ve sahneyi render eder.
 */
export class GameLoop {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer?: EffectComposer;
  private bloomPass?: UnrealBloomPass;

  private stadium = new Stadium();
  private goal = new Goal();
  private keeper = new Keeper();
  private keeperAI = new KeeperAI();
  private ball: Ball;
  private trail = new BallTrail();
  private confetti = new Confetti();

  private d: GameDeps;

  private lastTime = 0;
  private shotElapsed = 0;
  private resolved = true;
  private resultTimer = 0;
  private physicsAccumulator = 0;
  private readonly FIXED_STEP = 1 / 60;
  private saveReach: number = GAME_CONFIG.save.horizReach;

  // Sinematik (golde ağır çekim + kamera takibi)
  private timeScale = 1;
  private slowmoTimer = 0;
  private readonly SLOWMO_DUR = 0.85;
  private readonly DEFAULT_CAM_POS = new THREE.Vector3(0, 1.75, 5.6);
  private readonly DEFAULT_LOOK = new THREE.Vector3(0, 1.1, -6);
  private camTargetPos = new THREE.Vector3(0, 1.75, 5.6);
  private camLookAt = new THREE.Vector3(0, 1.1, -6);
  private camLookTarget = new THREE.Vector3(0, 1.1, -6);

  // Klavye yedeği (kamerasız test)
  private keyZone: DiveZone = 'center';
  private keyKick = false;
  private shotZone: DiveZone = 'center';

  // Kalibrasyon durumu
  private calibrating = false;
  private calSamples: GestureSample[] = [];
  private calEndMs = 0;
  private calResolve: ((ok: boolean) => void) | null = null;

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
    this.camera.position.copy(this.DEFAULT_CAM_POS);
    this.camera.lookAt(this.camLookAt);

    this.stadium.addTo(this.scene);
    this.goal.addTo(this.scene);
    this.keeper.addTo(this.scene);
    this.ball.addTo(this.scene);
    this.trail.addTo(this.scene);
    this.confetti.addTo(this.scene);
    this.trail.reset(this.ball.position());

    // Post-processing (bloom) — şeffaf arka plan korunur
    if (GAME_CONFIG.graphics.bloom) {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      renderPass.clearAlpha = 0;
      this.composer.addPass(renderPass);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        GAME_CONFIG.graphics.bloomStrength,
        GAME_CONFIG.graphics.bloomRadius,
        GAME_CONFIG.graphics.bloomThreshold
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindKeyboard();
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(ratio);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
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

  /** Zorluk seviyesini uygula (kaleci becerisi + kurtarış toleransı). */
  setDifficulty(name: DifficultyName) {
    const p = GAME_CONFIG.difficulty.presets[name];
    this.keeperAI.setSkill(p.skillBase, p.skillRamp);
    this.saveReach = p.saveReach;
  }

  /** Yeni maç başlarken kaleci hafızasını ve sahneyi sıfırla. */
  newGame() {
    this.keeperAI.reset();
    this.keeper.reset();
    this.ball.reset();
    this.trail.reset(this.ball.position());
  }

  /**
   * Kalibrasyon: oyuncu nötr dururken referans değerleri topla.
   * Kamera yoksa hemen false döner. Yeterli örnek toplanırsa eşikleri uyarlar.
   */
  calibrate(durationMs = 2600): Promise<boolean> {
    if (!this.d.trackingEnabled || !this.d.pose.ready) return Promise.resolve(false);
    this.calSamples = [];
    this.calibrating = true;
    this.calEndMs = performance.now() + durationMs;
    return new Promise((resolve) => {
      this.calResolve = resolve;
    });
  }

  private handleCalibration(now: number) {
    const landmarks = this.d.pose.detect(now);
    this.d.skeleton.draw(landmarks);
    const sample = GestureDetector.sample(landmarks);
    if (sample) this.calSamples.push(sample);

    const remainSec = Math.max(0, Math.ceil((this.calEndMs - now) / 1000));
    this.d.hud.setCalibration(remainSec, GestureDetector.checklist(landmarks));

    if (now >= this.calEndMs) {
      this.calibrating = false;
      this.d.hud.hideCalibration();
      const ok = this.finalizeCalibration();
      this.calResolve?.(ok);
      this.calResolve = null;
    }
  }

  /** Toplanan örneklerin ortalamasını kalibrasyon olarak uygula. */
  private finalizeCalibration(): boolean {
    if (this.calSamples.length < 10) return false; // yeterli veri yok
    const n = this.calSamples.length;
    const avg = (sel: (c: GestureSample) => number) =>
      this.calSamples.reduce((s, c) => s + sel(c), 0) / n;
    this.d.gesture.setCalibration({
      neutralLeanX: avg((c) => c.mirroredX),
      bodyScale: avg((c) => c.bodyScale),
      standingAnkleY: avg((c) => c.standingAnkleY),
    });
    return true;
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.update(now, dt);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  private update(now: number, dt: number) {
    const { state, gesture, hud } = this.d;

    // Kalibrasyon modu her şeyin önündedir
    if (this.calibrating) {
      this.handleCalibration(now);
      return;
    }

    // --- Giriş: hareket veya klavye ---
    let zone: DiveZone = this.keyZone;
    let aim = this.keyZone === 'left' ? -1 : this.keyZone === 'right' ? 1 : 0;
    let kick = false;
    let power = 0.7;
    let charge = 0;
    let tracked = true;
    let kickFoot: Foot | null = null;
    let missing: string[] = [];

    if (this.d.trackingEnabled && this.d.pose.ready) {
      const landmarks = this.d.pose.detect(now);
      this.d.skeleton.draw(landmarks);
      const g = gesture.update(landmarks, now);
      zone = g.zone;
      aim = g.aim;
      charge = g.kickCharge;
      tracked = g.tracked;
      missing = g.missing;
      if (g.kick) {
        kick = true;
        power = g.power;
        kickFoot = g.kickFoot;
      }
    }
    if (this.keyKick) {
      kick = true;
      power = 0.8;
      this.keyKick = false;
    }

    // Kadrajda değilse uyar (klavye girişini engellemez)
    const showWarn = this.d.trackingEnabled && !tracked && state.phase === 'ready';
    hud.setWarning(showWarn, missing);

    // --- Faz makinesi ---
    if (state.phase === 'ready') {
      hud.setActiveZone(zone);
      hud.setPower(charge);
      if (!showWarn) hud.setStatus('Köşeyi seç, bacağını savur!');
      if (kick) this.shoot(zone, aim, power, kickFoot);
    } else if (state.phase === 'shooting') {
      this.shotElapsed += dt;
      this.stepShot();
    } else if (state.phase === 'result') {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.finishResult();
    }

    // Ağır çekim: golde zaman ölçeği 0.3'ten 1'e yumuşar
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= dt;
      const f = Math.max(0, this.slowmoTimer / this.SLOWMO_DUR);
      this.timeScale = 0.3 + 0.7 * (1 - f);
    } else {
      this.timeScale = 1;
    }
    const sdt = dt * this.timeScale;

    // --- Fizik (sabit adım, kare hızından bağımsız) + senkron ---
    this.d.world.timestep = this.FIXED_STEP;
    this.physicsAccumulator += sdt;
    let steps = 0;
    const inFlight = state.phase === 'shooting';
    while (this.physicsAccumulator >= this.FIXED_STEP && steps < 6) {
      if (inFlight) this.ball.applyMagnus(GAME_CONFIG.shot.magnus, this.FIXED_STEP);
      this.d.world.step();
      this.physicsAccumulator -= this.FIXED_STEP;
      steps++;
    }
    this.ball.sync();
    this.keeper.update(sdt);

    // Görsel efektler
    this.trail.update(this.ball.position(), inFlight);
    this.confetti.update(sdt);
    this.goal.updateNet(sdt);

    // Kamera yumuşak takip (golde sinematik hedefe doğru)
    const ck = 1 - Math.pow(0.0006, dt);
    this.camera.position.lerp(this.camTargetPos, ck);
    this.camLookAt.lerp(this.camLookTarget, ck);
    this.camera.lookAt(this.camLookAt);
  }

  private shoot(zone: DiveZone, aim: number, power: number, foot: Foot | null) {
    const { state, gesture, hud } = this.d;

    // Hedef nokta: sürekli nişan (eğilme miktarı) -> kale içinde x
    const halfW = GOAL_WIDTH / 2;
    const margin = 0.5;
    const targetX = THREE.MathUtils.clamp(
      aim * GAME_CONFIG.shot.maxAimX,
      -(halfW - margin),
      halfW - margin
    );
    const ballPos = this.ball.position();
    const target = new THREE.Vector3(targetX, GAME_CONFIG.shot.aimHeight, GOAL_LINE_Z);
    const dir = target.clone().sub(ballPos).normalize();
    const speed = THREE.MathUtils.lerp(
      GAME_CONFIG.shot.speedMin,
      GAME_CONFIG.shot.speedMax,
      power
    );
    const vel = dir.multiplyScalar(speed);
    vel.y += GAME_CONFIG.shot.arcBoost; // hafif yay

    // Topa ileri yuvarlanma + yana fırıl. Vuran ayak hafif falso ekler.
    const footSpin = foot === 'right' ? 1.5 : foot === 'left' ? -1.5 : 0;
    const spin = new THREE.Vector3(-speed * 1.5, dir.x * 6 + footSpin, 0);
    this.ball.shoot(vel, spin);
    this.d.sound.playKick(power);

    // Kaleci AI: eğilimi okur, maç ilerledikçe zorlaşır
    const dive = this.keeperAI.decide(zone, state.shots, TOTAL_SHOTS);
    this.keeperAI.record(zone);
    this.keeper.dive(dive);

    // Durum
    this.shotZone = zone;
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
      if (horizDist < this.saveReach && canReach) {
        result = 'save';
        // Topu uzaklaştır
        this.ball.deflect(
          new THREE.Vector3((pos.x - keeperX) * 4 + Math.sign(pos.x || 1) * 3, 4, 7)
        );
      } else {
        result = 'goal';
      }
    }

    state.recordResult(result, this.shotZone);
    if (result === 'goal') {
      this.d.sound.playGoal();
      if (state.lastGoalScore) hud.flashGoalScore(state.lastGoalScore);
      this.confetti.burst(pos);
      this.goal.hitNet(pos);
      // Sinematik: ağır çekim + kamera file önüne yaklaşır
      this.slowmoTimer = this.SLOWMO_DUR;
      this.camTargetPos.set(pos.x * 0.35, 1.0, 1.8);
      this.camLookTarget.set(pos.x * 0.5, 1.2, GOAL_LINE_Z + 0.6);
    } else if (result === 'save') this.d.sound.playSave();
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
    this.trail.reset(this.ball.position());
    this.keeper.reset();
    gesture.reset();
    // Kamerayı varsayılana döndür
    this.camTargetPos.copy(this.DEFAULT_CAM_POS);
    this.camLookTarget.copy(this.DEFAULT_LOOK);
    state.next();

    if (state.isOver) {
      const isRecord = this.d.scoreStore.trySetBest(state.score);
      hud.showEndScreen(state, this.d.scoreStore.getBest(), isRecord);
      this.d.onGameOver?.();
    } else {
      hud.setStatus('Köşeyi seç, bacağını savur!');
    }
  }
}
