import { GameState } from './game/GameState';
import { GameLoop } from './game/GameLoop';
import { ScoreStore } from './game/ScoreStore';
import { CalibrationStore } from './game/CalibrationStore';
import { PoseTracker } from './tracking/PoseTracker';
import { GestureDetector } from './tracking/GestureDetector';
import { SkeletonRenderer } from './ui/Skeleton';
import { HUD } from './ui/HUD';
import { SoundManager } from './audio/SoundManager';
import {
  keepAwake,
  releaseWake,
  bindWakeLockRefresh,
  requestFullscreen,
  lockPortrait,
} from './util/screen';
import { PlayerStore } from './career/PlayerStore';
import { CareerSave } from './career/CareerSave';
import { MainMenu } from './career/MainMenu';
import { CharacterCreate } from './career/CharacterCreate';
import { CareerHub } from './career/CareerHub';
import { toast } from './career/careerStyles';

async function main() {
  const sceneCanvas = document.getElementById('scene') as HTMLCanvasElement;
  const skeletonCanvas = document.getElementById('skeleton') as HTMLCanvasElement;
  const video = document.getElementById('camera') as HTMLVideoElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;

  // --- Fizik dünyası (Rapier) — dinamik import ile ayrı parça ---
  const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
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
  const scoreStore = new ScoreStore();
  const calibrationStore = new CalibrationStore();

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
    scoreStore,
    calibrationStore,
    state,
    trackingEnabled: false,
    onGameOver: () => void releaseWake(),
  });
  game.start();

  // --- Başlat akışı ---
  let trackingError: string | undefined;

  bindWakeLockRefresh();

  hud.onStart = async () => {
    hud.hideOverlay();
    // Seçilen zorluğu uygula
    game.setDifficulty(hud.getDifficulty());
    // Ekranı uyanık tut + tam ekran (kullanıcı hareketi içinde)
    void keepAwake();
    void requestFullscreen().then(() => lockPortrait());
    // Ses motorunu kullanıcı hareketiyle başlat ve başlangıç düdüğü çal
    await sound.init().catch(() => {});

    // Kamera/poz henüz başlamadıysa başlatmayı dene
    if (!pose.ready && !trackingError) {
      try {
        hud.setStatus('Kamera başlatılıyor...');
        await pose.init();
        game.setTrackingEnabled(true);
      } catch (err) {
        console.warn('Poz takibi başlatılamadı:', err);
        trackingError = 'Kamera/poz takibi başlatılamadı. Klavye ile oynayabilirsin.';
      }
    }

    // Kamera varsa: kayıtlı kalibrasyon varsa onu kullan, yoksa 2 adımlı yap
    if (pose.ready) {
      if (game.tryLoadCalibration()) {
        hud.setStatus('Önceki kalibrasyon yüklendi ✓');
      } else {
        const ok = await game.calibrate();
        if (!ok) hud.setStatus('Kalibrasyon atlandı — yine de oynayabilirsin');
      }
    }

    sound.playWhistle();
    state.start();
    game.newGame();
    hud.updateStats(state);
    hud.setStatus(
      trackingError ? 'Klavye: ← → yön, BOŞLUK şut' : 'Köşeyi seç, bacağını savur!'
    );
  };

  // --- Ana menü + kariyer akışı (Aşama 1) ---
  const careerSave = new CareerSave();
  const mainMenu = new MainMenu();
  const characterCreate = new CharacterCreate();
  const careerHub = new CareerHub();

  function showMainMenu() {
    hud.setMatchUIVisible(false);
    mainMenu.show(
      {
        onQuick: () => {
          mainMenu.hide();
          hud.setMatchUIVisible(true);
          hud.showStartScreen(trackingError, scoreStore.getBest());
        },
        onCareer: openCareer,
      },
      careerSave.exists()
    );
  }

  function openCareer() {
    mainMenu.hide();
    const saved = careerSave.get();
    if (saved) {
      showHub(new PlayerStore(saved));
    } else {
      characterCreate.show(
        (name, position, appearance) => {
          const store = new PlayerStore(PlayerStore.create(name, position, appearance));
          careerSave.set(store.data);
          characterCreate.hide();
          showHub(store);
        },
        () => {
          characterCreate.hide();
          showMainMenu();
        }
      );
    }
  }

  function showHub(store: PlayerStore) {
    careerHub.show(store.data, {
      onMatch: () => toast('Maç motoru Aşama 2’de gelecek ⚽'),
      onTrain: () => toast('Antrenman Aşama 3’te gelecek 💪'),
      onRest: () => {
        store.rest();
        careerSave.set(store.data);
        showHub(store);
        toast('Dinlendin — enerji yenilendi');
      },
      onMenu: () => {
        careerHub.hide();
        showMainMenu();
      },
    });
  }

  showMainMenu();
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#fff;padding:20px;white-space:pre-wrap">Hata: ${
    (err as Error).message
  }</pre>`;
});
