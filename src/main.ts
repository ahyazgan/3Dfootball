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
import { MatchIntro } from './career/MatchIntro';
import { MatchResultScreen } from './career/MatchResultScreen';
import { planMatch } from './career/MatchEngine';
import { computeMatchResult, applyOutcome } from './career/MatchResult';
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

  // Kamera + kalibrasyonu hazırla (hızlı maç ve kariyer maçı paylaşır)
  async function ensureTrackingReady() {
    void keepAwake();
    void requestFullscreen().then(() => lockPortrait());
    await sound.init().catch(() => {});

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
    if (pose.ready) {
      if (game.tryLoadCalibration()) {
        hud.setStatus('Önceki kalibrasyon yüklendi ✓');
      } else {
        const ok = await game.calibrate();
        if (!ok) hud.setStatus('Kalibrasyon atlandı — yine de oynayabilirsin');
      }
    }
  }

  function matchStatusText() {
    return trackingError ? 'Klavye: ← → yön, BOŞLUK şut' : 'Köşeyi seç, bacağını savur!';
  }

  hud.onStart = async () => {
    hud.hideOverlay();
    game.setDifficulty(hud.getDifficulty());
    await ensureTrackingReady();
    sound.playWhistle();
    state.start();
    game.newGame();
    hud.updateStats(state);
    hud.setStatus(matchStatusText());
  };

  // --- Ana menü + kariyer akışı (Aşama 1) ---
  const careerSave = new CareerSave();
  const mainMenu = new MainMenu();
  const characterCreate = new CharacterCreate();
  const careerHub = new CareerHub();
  const matchIntro = new MatchIntro();
  const matchResultScreen = new MatchResultScreen();

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
      onMatch: () => startCareerMatch(store),
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

  function startCareerMatch(store: PlayerStore) {
    if (store.data.energy < 10) {
      toast('Enerjin çok düşük — önce dinlen 😴');
      return;
    }
    const plan = planMatch(store.data);
    careerHub.hide();
    matchIntro.show(
      plan,
      async () => {
        // Maça başla: kamera/kalibrasyon hazırla, maçı kur
        matchIntro.hide();
        hud.setMatchUIVisible(true);
        await ensureTrackingReady();
        sound.playWhistle();
        game.startCareerMatch(
          {
            shots: plan.criticalMoments,
            skillBase: plan.skillBase,
            skillRamp: plan.skillRamp,
            saveReach: plan.saveReach,
          },
          () => {
            // Maç bitti: sonucu hesapla, uygula, kaydet, göster
            const outcome = computeMatchResult(plan, game.getMatchStats());
            applyOutcome(store, outcome);
            careerSave.set(store.data);
            hud.setMatchUIVisible(false);
            matchResultScreen.show(outcome, () => {
              matchResultScreen.hide();
              showHub(store);
            });
          }
        );
        hud.updateStats(state);
        hud.setStatus(matchStatusText());
      },
      () => {
        matchIntro.hide();
        showHub(store);
      }
    );
  }

  showMainMenu();
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#fff;padding:20px;white-space:pre-wrap">Hata: ${
    (err as Error).message
  }</pre>`;
});
