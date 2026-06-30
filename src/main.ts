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
import { TrainingScreen } from './career/TrainingScreen';
import { SeasonSummaryScreen } from './career/SeasonSummaryScreen';
import { TransferScreen } from './career/TransferScreen';
import { CareerStatsScreen } from './career/CareerStatsScreen';
import { checkNewAchievements } from './career/Achievements';
import { planMatch } from './career/MatchEngine';
import {
  computeMatchResult,
  applyOutcome,
  type MatchOutcome,
} from './career/MatchResult';
import { trainStat, STAT_LABEL } from './career/Training';
import { recordMatchInSeason, isSeasonOver, endSeason } from './career/Season';
import { generateOffers, acceptOffer } from './career/Transfers';
import { TournamentScreen } from './career/TournamentScreen';
import {
  createTournament,
  tournamentMatchPlan,
  recordTournamentMatch,
  isTournamentOver,
} from './career/Tournament';
import { TraitsScreen } from './career/TraitsScreen';
import { unlockTrait, traitById } from './career/Traits';
import { updateFormFromRating, rollInjury } from './career/Development';
import { BusinessScreen } from './career/BusinessScreen';
import { paySponsors, updateFollowers, signSponsor, buyLifestyle } from './career/Business';
import { PressEventScreen } from './career/PressEventScreen';
import { rollPressEvent, applyPressChoice } from './career/PressEvents';
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
  const trainingScreen = new TrainingScreen();
  const seasonSummaryScreen = new SeasonSummaryScreen();
  const transferScreen = new TransferScreen();
  const careerStatsScreen = new CareerStatsScreen();
  const tournamentScreen = new TournamentScreen();
  const traitsScreen = new TraitsScreen();
  const businessScreen = new BusinessScreen();
  const pressEventScreen = new PressEventScreen();

  // Maç sonrası gelişim: form güncelle + sakatlık riski (kulüp & milli maç ortak)
  function applyPostMatchDevelopment(store: PlayerStore, rating: number): number {
    updateFormFromRating(store, rating);
    const weeks = rollInjury(store.data);
    if (weeks > 0) {
      store.data.injuryMatches = Math.max(store.data.injuryMatches, weeks);
    }
    return weeks;
  }

  // Maç sonrası ekonomi: sponsor geliri + takipçi kazancı (Aşama 9)
  function applyPostMatchEconomy(store: PlayerStore, outcome: MatchOutcome) {
    paySponsors(store);
    updateFollowers(store, outcome);
  }

  // Maç sonrası olası basın olayı; bitince next() çağrılır
  function maybePressEvent(store: PlayerStore, next: () => void) {
    const ev = rollPressEvent();
    if (!ev) {
      next();
      return;
    }
    pressEventScreen.show(ev, (choice) => {
      applyPressChoice(store, choice);
      careerSave.set(store.data);
      pressEventScreen.hide();
      toast(choice.result);
      next();
    });
  }

  function showBusiness(store: PlayerStore) {
    businessScreen.show(store.data, {
      onSign: (id) => {
        const res = signSponsor(store, id);
        if (res === 'ok') {
          careerSave.set(store.data);
          toast('Sponsorlukla imzaladın 💼');
        } else if (res === 'full') {
          toast('Sponsor kotan dolu');
        }
        showBusiness(store);
      },
      onBuy: (id) => {
        const res = buyLifestyle(store, id);
        if (res === 'ok') {
          careerSave.set(store.data);
          toast('Satın aldın — moral + takipçi 🎉');
        } else if (res === 'broke') {
          toast('Yetersiz para 💸');
        }
        showBusiness(store);
      },
      onBack: () => {
        businessScreen.hide();
        showHub(store);
      },
    });
  }

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
      onTrain: () => {
        careerHub.hide();
        showTraining(store);
      },
      onRest: () => {
        store.rest();
        careerSave.set(store.data);
        showHub(store);
        toast('Dinlendin — enerji yenilendi');
      },
      onStats: () => {
        careerHub.hide();
        careerStatsScreen.show(store.data, () => {
          careerStatsScreen.hide();
          showHub(store);
        });
      },
      onNational: () => {
        careerHub.hide();
        showTournament(store);
      },
      onTraits: () => {
        careerHub.hide();
        showTraits(store);
      },
      onBusiness: () => {
        careerHub.hide();
        showBusiness(store);
      },
      onMenu: () => {
        careerHub.hide();
        showMainMenu();
      },
    });
  }

  // --- Yetenekler (Aşama 8) ---
  function showTraits(store: PlayerStore) {
    traitsScreen.show(store.data, {
      onUnlock: (id) => {
        const res = unlockTrait(store, id);
        const t = traitById(id);
        if (res === 'ok') {
          careerSave.set(store.data);
          toast(`Yetenek açıldı: ${t?.icon} ${t?.label}`);
        } else if (res === 'broke') {
          toast('Yetersiz para 💸');
        } else if (res === 'locked') {
          toast('Koşulu sağlamıyorsun 🔒');
        }
        showTraits(store); // güncel durumla yeniden çiz
      },
      onBack: () => {
        traitsScreen.hide();
        showHub(store);
      },
    });
  }

  // --- Milli takım turnuvası (Aşama 7) ---
  function showTournament(store: PlayerStore) {
    if (!store.data.tournament) {
      store.data.tournament = createTournament(store.data);
      careerSave.set(store.data);
    }
    tournamentScreen.show(store.data.tournament, {
      onPlay: () => playTournamentMatch(store),
      onBack: () => {
        tournamentScreen.hide();
        showHub(store);
      },
      onFinish: () => {
        store.data.tournament = null; // turnuvayı kapat (sonraki çağrıda yenisi)
        careerSave.set(store.data);
        tournamentScreen.hide();
        showHub(store);
      },
    });
  }

  function playTournamentMatch(store: PlayerStore) {
    const tour = store.data.tournament;
    if (!tour || isTournamentOver(tour)) {
      showTournament(store);
      return;
    }
    if (store.data.energy < 10) {
      toast('Enerjin çok düşük — önce dinlen 😴');
      return;
    }
    const plan = tournamentMatchPlan(tour, store.data);
    tournamentScreen.hide();
    matchIntro.show(
      plan,
      async () => {
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
            const outcome = computeMatchResult(plan, game.getMatchStats());
            applyOutcome(store, outcome);
            const injuryWeeks = applyPostMatchDevelopment(store, outcome.rating);
            applyPostMatchEconomy(store, outcome);
            const res = recordTournamentMatch(store, outcome.rating);
            const fresh = checkNewAchievements(store);
            careerSave.set(store.data);
            hud.setMatchUIVisible(false);
            matchResultScreen.show(outcome, () => {
              matchResultScreen.hide();
              if (res.champion) toast('🏆 ŞAMPİYON! Kupayı kaldırdın!');
              else if (res.advanced) toast(`Tur geçildi: ${res.roundLabel} ✓`);
              else toast('Elendin — bir dahaki turnuvada!');
              if (injuryWeeks > 0)
                toast(`🚑 Sakatlandın — ${injuryWeeks} dinlenme gerek`);
              fresh.forEach((a, i) =>
                setTimeout(() => toast(`Başarım: ${a.icon} ${a.label}`), (i + 1) * 700)
              );
              maybePressEvent(store, () => showTournament(store));
            });
          }
        );
        hud.updateStats(state);
        hud.setStatus(matchStatusText());
      },
      () => {
        matchIntro.hide();
        showTournament(store);
      }
    );
  }

  function showTraining(store: PlayerStore) {
    trainingScreen.show(store.data, {
      onTrain: (stat) => {
        const res = trainStat(store, stat);
        if (!res) {
          toast('Enerjin yetersiz — önce dinlen 😴');
        } else {
          careerSave.set(store.data);
          toast(`${STAT_LABEL[stat]} +${res.gain} → ${res.newValue}`);
        }
        showTraining(store); // güncel değerlerle yeniden çiz
      },
      onBack: () => {
        trainingScreen.hide();
        showHub(store);
      },
    });
  }

  // Maç sonrası: sezon bitti mi? -> özet -> transfer; değilse hub
  function afterMatch(store: PlayerStore, outcome: MatchOutcome) {
    if (!isSeasonOver(store.data)) {
      if (outcome.transferInterest) toast('Kulüpler seni izliyor 👀');
      showHub(store);
      return;
    }
    const summary = endSeason(store);
    checkNewAchievements(store); // sezon ödülleri yeni başarım açabilir
    careerSave.set(store.data);
    seasonSummaryScreen.show(summary, () => {
      seasonSummaryScreen.hide();
      if (summary.retired) {
        // Emeklilik: kariyer özetini göster, sonra kaydı temizle
        careerStatsScreen.show(store.data, () => {
          careerStatsScreen.hide();
          careerSave.clear();
          showMainMenu();
        });
        return;
      }
      const offers = generateOffers(store.data);
      if (offers.length === 0) {
        showHub(store);
        return;
      }
      transferScreen.show(
        offers,
        (offer) => {
          acceptOffer(store, offer);
          careerSave.set(store.data);
          transferScreen.hide();
          toast(`${offer.club} ile imzaladın! ✍️`);
          showHub(store);
        },
        () => {
          transferScreen.hide();
          showHub(store);
        }
      );
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
            // Maç bitti: sonucu hesapla, uygula, sezona işle, kaydet, göster
            const outcome = computeMatchResult(plan, game.getMatchStats());
            applyOutcome(store, outcome);
            const injuryWeeks = applyPostMatchDevelopment(store, outcome.rating);
            applyPostMatchEconomy(store, outcome);
            recordMatchInSeason(store, outcome.rating);
            const fresh = checkNewAchievements(store);
            careerSave.set(store.data);
            hud.setMatchUIVisible(false);
            matchResultScreen.show(outcome, () => {
              matchResultScreen.hide();
              if (injuryWeeks > 0)
                toast(`🚑 Sakatlandın — ${injuryWeeks} dinlenme gerek`);
              fresh.forEach((a, i) =>
                setTimeout(() => toast(`Başarım: ${a.icon} ${a.label}`), (i + 1) * 700)
              );
              maybePressEvent(store, () => afterMatch(store, outcome));
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
