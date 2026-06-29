import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type PoseLandmarks = NormalizedLandmark[];

/**
 * MediaPipe PoseLandmarker'ı kurar, kamerayı açar ve her kare için
 * 33 vücut noktasını döndürür.
 */
export class PoseTracker {
  private landmarker: PoseLandmarker | null = null;
  private video: HTMLVideoElement;
  private lastVideoTime = -1;
  private latest: PoseLandmarks | null = null;
  ready = false;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  /** Modeli ve kamerayı başlat. Kamera izni burada istenir. */
  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();

    // Video gerçekten boyut alana kadar bekle
    await new Promise<void>((resolve) => {
      if (this.video.videoWidth > 0) return resolve();
      this.video.onloadeddata = () => resolve();
    });

    this.ready = true;
  }

  /**
   * O anki kareyi işle. Yeni landmark varsa döndürür, yoksa son bilineni.
   * timestamp: monoton artan ms (performance.now()).
   */
  detect(timestampMs: number): PoseLandmarks | null {
    if (!this.landmarker || !this.ready) return null;
    if (this.video.currentTime === this.lastVideoTime) return this.latest;
    this.lastVideoTime = this.video.currentTime;

    const result = this.landmarker.detectForVideo(this.video, timestampMs);
    if (result.landmarks && result.landmarks.length > 0) {
      this.latest = result.landmarks[0];
    } else {
      this.latest = null;
    }
    return this.latest;
  }

  get videoWidth() {
    return this.video.videoWidth;
  }
  get videoHeight() {
    return this.video.videoHeight;
  }
}
