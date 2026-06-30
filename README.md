# ⚽ Futbol 3D — Hareketle Penaltı

Kameranın karşısına geçip **vücudunu eğerek** köşe seçtiğin, **bacağını savurarak**
şut çektiğin web tabanlı 3D penaltı oyunu. Tarayıcıda çalışır; daha sonra Capacitor
ile App Store / Google Play'e paketlenebilir.

## 🎮 Nasıl Oynanır

1. **BAŞLA**'ya bas, kamera iznini ver. **2 adımlı kalibrasyon** açılır:
   (1) düz dur, (2) sola-sağa yatır — eşikler ve nişan aralığın sana göre
   ayarlanır. Oyun sırasında duruşun **otomatik** tazelenir; uzun süre
   kadrajdan çıkıp dönersen kalibrasyon kendiliğinden yeniden başlar.
2. **Vücudunu sağa/sola eğ** → nişan al. Az eğil hafif köşe, çok eğil sert
   köşe (**sürekli açı**); altta SOL / ORTA / SAĞ göstergesi yanar.
3. **Bacağını hızla öne/yukarı savur** → top fırlar. İki ayak ayrı izlenir
   (diz de yükselmeli, yanlış tetik olmasın); hangi ayakla vurduğun **falso**ya
   etki eder. Ne kadar hızlı savurursan o kadar sert.
4. Kaleci rastgele dalış yapar; bazen yönünü doğru tahmin eder.
5. 5 şut sonunda skorun gösterilir.

**Kamerasız test / yedek kontrol:** `←` `→` ile yön, `BOŞLUK` ile şut.

## 🧱 Teknoloji

- **Vite + TypeScript** — proje iskeleti ve build
- **Three.js** — 3D sahne (stadyum, kale, kaleci, top), yumuşak gölgeler
- **@mediapipe/tasks-vision** (PoseLandmarker) — kameradan 33 noktalı vücut takibi
- **@dimforge/rapier3d-compat** — top fiziği (yerçekimi, sekme, çarpışma)
- **Capacitor** — mobil mağaza paketlemesi (kurulum sonradan)

## 📁 Proje Yapısı

```
src/
├── main.ts                  # giriş noktası, her şeyi başlatır
├── config.ts                # tüm ayarlanabilir sabitler (tek nokta)
├── scene/
│   ├── Stadium.ts           # çim, çizgiler, ışıklar, tribün
│   ├── Goal.ts              # kale (7.32×2.44m) + file
│   ├── Keeper.ts            # kaleci modeli + dalış animasyonu
│   └── Ball.ts              # top mesh + Rapier fizik + falso (Magnus)
├── tracking/
│   ├── PoseTracker.ts       # MediaPipe kurulumu, kamera, landmark akışı
│   ├── GestureDetector.ts   # eğilme (yön) + bacak şutu + kalibrasyon
│   └── OneEuroFilter.ts     # düşük gecikmeli yumuşatma
├── game/
│   ├── GameState.ts         # skor, combo, şut sayısı, faz makinesi
│   ├── GameLoop.ts          # ana döngü, fizik, şut çözümü, kalibrasyon
│   ├── KeeperAI.ts          # kaleci kararı (eğilim okuma, zorluk)
│   └── ScoreStore.ts        # en iyi skor (localStorage)
├── audio/
│   └── SoundManager.ts      # Web Audio ile sentezlenen ses efektleri
└── ui/
    ├── HUD.ts               # skor, güç, zorluk, başlat/bitir ekranları
    └── Skeleton.ts          # iskelet çizimi (geri bildirim)
```

### Ekran katmanları (alttan üste)

1. Canlı kamera (aynalı, %35 opaklık)
2. Three.js 3D sahne (şeffaf arka plan)
3. İskelet çizimi (yeşil, aynalı)
4. HUD (skor, güç, durum, ekranlar)

## 🚀 Çalıştırma

```bash
npm install
npm run dev            # http://localhost:5173
```

Telefonda test (aynı WiFi):

```bash
npm run dev -- --host  # telefondan bilgisayarının IP'sine git
```

> Kamera için güvenli bağlam gerekir: `localhost` çalışır; ağdaki gerçek
> cihazlarda HTTPS gerekebilir.

Üretim derlemesi:

```bash
npm run build          # tip kontrolü + vite build -> dist/
npm run preview
```

## 🎚️ Kalibrasyon ve denge (`src/config.ts`)

Tüm ayarlanabilir sabitler tek dosyada toplanmıştır: **`src/config.ts`**.

| Grup         | Örnek alanlar                                  | Ne işe yarar               |
| ------------ | ---------------------------------------------- | -------------------------- |
| `gesture`    | `leanRange` `kickVelThreshold` `kickKneeRatio` | nişan + şut algılama eşiği |
| `keeper`     | `skillBase` `skillRamp` `readAimChance`        | kaleci zekâsı (varsayılan) |
| `difficulty` | `presets.kolay/orta/zor`                       | zorluk seviyeleri          |
| `scoring`    | `goalBase` `cornerBonus` `streakStep`          | puan, köşe bonusu, combo   |
| `shot`       | `speedMin` `speedMax` `arcBoost` `magnus`      | şut hızı, yay, falso       |
| `save`       | `horizReach` `maxHeight`                       | kurtarış toleransı         |
| `graphics`   | `bloom` `bloomStrength` `bloomThreshold`       | ışıma efekti (aç/kapat)    |

> Örnek: "şut çok hassas" → `gesture.kickVelThreshold` değerini yükselt.
> "kaleci çok kolay" → `keeper.skillBase`/`skillRamp` değerlerini artır.

## 🏆 Kariyer Modu — derinlik (Aşama 6–9)

Çekirdek kariyer (karakter yaratma → hub → antrenman → sezon → transfer → ödüller)
üzerine eklenen derinlik katmanları (`src/career/`):

| Aşama | Sistem | Dosyalar |
| ----- | ------ | -------- |
| **6 — Maç & rakip** | İsimli kaleciler, **ezeli rakip & derbi** (ek şöhret/moral), **maç içi olaylar** (yağmur, sakat kaleci, gözlemci…) | `MatchEvents.ts`, `MatchEngine.ts` |
| **7 — Milli takım** | Çağrı + **eleme turnuvası** (Dünya Kupası / Avrupa Şampiyonası): Son 16 → Final, tur ilerledikçe zorlaşan kaleci, uluslararası kupa | `Tournament.ts`, `TournamentScreen.ts` |
| **8 — Gelişim** | **Form** (maç zorluğunu etkiler), **yetenekler** (Penaltı Uzmanı, Demir Adam…), **sakatlık & fitness**, **yaş eğrisi** (zirve sonrası düşüş) | `Traits.ts`, `Development.ts`, `TraitsScreen.ts` |
| **9 — Yaşam & ekonomi** | **Takipçi**, **sponsorluklar** (maç başı gelir), **yaşam tarzı** (ev/araba/jet → moral), **basın olayları** (seçimli) | `Business.ts`, `PressEvents.ts`, `BusinessScreen.ts` |

Tüm denge sabitleri `config.career` altında; mantık saf+test edilebilir fonksiyonlarda
(rng enjekte edilebilir). Eski kayıtlar `PlayerStore` içinde otomatik göç eder.

## 🧪 Geliştirme (test, lint, format)

```bash
npm test           # Vitest birim testleri (GestureDetector, KeeperAI)
npm run lint       # ESLint
npm run format     # Prettier ile biçimlendir
npm run typecheck  # tsc tip kontrolü
```

CI: her push'ta `.github/workflows/ci.yml` tip kontrolü + lint + test + build çalıştırır.

## 📲 PWA (uygulama gibi)

Oyun bir **Progressive Web App**: tarayıcıdan "Ana ekrana ekle" ile yüklenir,
tam ekran (standalone) açılır ve uygulama kabuğu çevrimdışı önbelleğe alınır.

- `manifest.webmanifest` + ikonlar (`public/icon-192.png`, `icon-512.png`)
- Service worker (vite-plugin-pwa, `registerType: autoUpdate`) build'de üretilir
- Çevrimdışı: ilk açılıştan sonra app shell + Rapier önbellekten yüklenir
  (poz takibi modeli CDN'den geldiği için çevrimdışıyken klavye modu çalışır)

> Service worker yalnızca üretim derlemesinde aktiftir: `npm run build && npm run preview`.

## 📱 Android paketleme (Capacitor — hazır)

Android platformu **kuruldu** (`capacitor.config.ts`, `android/` projesi,
kamera izinleri). Web bundle'ı `cap sync` ile üretildiği için repoda izlenmez.

Android Studio + JDK 17 kurulu bir makinede:

```bash
npm install
npm run cap:sync          # web'i derle + native'e kopyala
npm run android:open      # derle, senkronla ve Android Studio'da aç
```

Hazır npm scriptleri:

| Script                 | İşlevi                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `npm run cap:sync`     | `npm run build` + `cap sync` (web bundle'ı native'e kopyalar) |
| `npm run android:add`  | `cap add android` (platform yoksa yeniden oluşturur)          |
| `npm run android:open` | build + sync + Android Studio'da açar                         |

Kamera (vücut takibi) için yapılandırılanlar:

- `AndroidManifest.xml` → `CAMERA` izni + kamera özellikleri
- `MainActivity.java` → açılışta çalışma anı kamera izni isteği

> **iOS** için: `npm i @capacitor/ios && npx cap add ios`, ardından
> `Info.plist` içine `NSCameraUsageDescription` ekleyin.
