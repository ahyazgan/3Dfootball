/**
 * Ekran yardımcıları: oyun sırasında ekranın uyumasını engelle (Wake Lock),
 * tam ekran ve yönlendirme kilidi. Hepsi en iyi çaba — desteklenmezse sessiz.
 */

type WakeLockSentinelLike = { release: () => Promise<void> } | null;

let wakeLock: WakeLockSentinelLike = null;

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
}

/** Ekranı uyanık tut. Sekme tekrar görünür olunca otomatik yeniden dener. */
export async function keepAwake(): Promise<void> {
  const nav = navigator as Navigator & WakeLockNavigator;
  if (!nav.wakeLock) return;
  try {
    wakeLock = await nav.wakeLock.request('screen');
  } catch {
    // izin yok / desteklenmiyor — yoksay
  }
}

export async function releaseWake(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* yoksay */
  }
  wakeLock = null;
}

/** Sekme yeniden görünür olunca wake lock'ı tazele (tarayıcı serbest bırakır). */
export function bindWakeLockRefresh(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLock === null) {
      void keepAwake();
    }
  });
}

/** Tam ekran iste (kullanıcı hareketinden çağrılmalı). */
export async function requestFullscreen(): Promise<void> {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch {
    /* reddedildi — yoksay */
  }
}

/** Yönlendirmeyi dikey kilitle (yalnızca tam ekran/yüklü modda çalışır). */
export async function lockPortrait(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  try {
    await orientation.lock?.('portrait');
  } catch {
    /* desteklenmiyor — yoksay */
  }
}
