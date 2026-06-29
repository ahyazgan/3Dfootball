import RAPIER from '@dimforge/rapier3d-compat';

import { GameState } from './game/GameState';
import { GameLoop } from './game/GameLoop';
import { PoseTracker } from './tracking/PoseTracker';
import { GestureDetector } from './tracking/GestureDetector';
import { SkeletonRenderer } from './ui/Skeleton';
import { HUD } from './ui/HUD';
import { SoundManager } from './audio/SoundManager';

async function main() {
  const sceneCanvas = document.getElementById('scene') as HTMLCanvasElement;
  const skeletonCanvas = document.getElementById('skeleton') as HTMLCanvasElement;
  const video = document.getElementById('camera') as HTMLVideoElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;

  // --- Fizik dünyası (Rapier) ---
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // Zemin (sabit çarpışma gövdesi)
  const groundDesc = RAPIER.ColliderDesc.cuboid(30, 0.1, 30)
    .setTranslation(0, -0.1, -5)
    .setRestitution(0.4)
    .setFriction(0.8);
  world.createCollider(groundDesc);

  // --- Çekirdek nesneler ---
  const state = new GameState();
  const gesture = new GestureDetector();
  const skeleton = new SkeletonRenderer(skeletonCanvas);
  const hud = new HUD(hudRoot);
  const pose = new PoseTracker(video);
  const sound = new SoundManager();

  hud.onToggleMute = (muted) => sound.setMuted(muted);

  const game = new GameLoop({
    canvas: sceneCanvas,
    rapier: RAPIER,
    world,
    pose,
    gesture,
    skeleton,
    hud,
    sound,
    state,
    trackingEnabled: false,
  });
  game.start();

  // --- Başlat akışı ---
  let trackingError: string | undefined;

  hud.onStart = async () => {
    hud.hideOverlay();
    // Ses motorunu kullanıcı hareketiyle başlat ve başlangıç düdüğü çal
    await sound.init().catch(() => {});
    sound.playWhistle();
    state.start();
    game.newGame();
    hud.updateStats(state);
    hud.setStatus('Köşeyi seç, bacağını savur!');

    // Kamera/poz henüz başlamadıysa başlatmayı dene
    if (!pose.ready && !trackingError) {
      try {
        hud.setStatus('Kamera başlatılıyor...');
        await pose.init();
        game.setTrackingEnabled(true);
        hud.setStatus('Köşeyi seç, bacağını savur!');
      } catch (err) {
        console.warn('Poz takibi başlatılamadı:', err);
        trackingError =
          'Kamera/poz takibi başlatılamadı. Klavye ile oynayabilirsin.';
        hud.setStatus('Klavye: ← → yön, BOŞLUK şut');
      }
    }
  };

  hud.showStartScreen(trackingError);
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#fff;padding:20px;white-space:pre-wrap">Hata: ${
    (err as Error).message
  }</pre>`;
});
