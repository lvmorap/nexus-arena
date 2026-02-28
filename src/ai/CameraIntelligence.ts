import { logger } from '../utils/Logger';

export interface HandState {
  aimAngle: number;
  aimPower: number;
  isFiring: boolean;
  isRecon: boolean;
}

export class CameraIntelligence {
  private _isActive = false;
  private _isInitialized = false;

  private _videoElement: HTMLVideoElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _stream: MediaStream | null = null;
  private _previewElement: HTMLVideoElement | null = null;
  private _frameCount = 0;
  private _lastFpsCheck = 0;
  private _currentFps = 30;
  private _handX = 0.5;
  private _handY = 0.5;
  private _motionDetected = false;
  private _prevFrameData: Uint8ClampedArray | null = null;
  private _animFrameId = 0;

  public get isActive(): boolean {
    return this._isActive;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get currentFps(): number {
    return this._currentFps;
  }

  public async initialize(): Promise<boolean> {
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });

      this._videoElement = document.createElement('video');
      this._videoElement.srcObject = this._stream;
      this._videoElement.playsInline = true;
      await this._videoElement.play();

      this._canvas = document.createElement('canvas');
      this._canvas.width = 160;
      this._canvas.height = 120;
      this._ctx = this._canvas.getContext('2d');

      this._isInitialized = true;
      this._isActive = true;
      this._lastFpsCheck = performance.now();
      this._processFrame();

      logger.info('CameraIntelligence: camera initialized successfully');
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.info(`CameraIntelligence: camera unavailable, falling back to mouse: ${msg}`);
      this._isInitialized = false;
      this._isActive = false;
      return false;
    }
  }

  private _processFrame(): void {
    if (!this._isActive || !this._videoElement || !this._ctx || !this._canvas) return;

    this._ctx.drawImage(this._videoElement, 0, 0, this._canvas.width, this._canvas.height);
    const imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);

    this._detectMotion(imageData.data);
    this._trackBrightestPoint(imageData.data, this._canvas.width, this._canvas.height);

    this._frameCount++;
    const now = performance.now();
    if (now - this._lastFpsCheck >= 1000) {
      this._currentFps = this._frameCount;
      this._frameCount = 0;
      this._lastFpsCheck = now;

      if (this._currentFps < 15) {
        logger.info(`CameraIntelligence: FPS dropped to ${this._currentFps}, falling back to mouse`);
        this.deactivate();
        return;
      }
    }

    this._prevFrameData = new Uint8ClampedArray(imageData.data);
    this._animFrameId = requestAnimationFrame(() => this._processFrame());
  }

  private _trackBrightestPoint(data: Uint8ClampedArray, width: number, height: number): void {
    let totalBrightness = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 128) {
          totalBrightness += brightness;
          weightedX += x * brightness;
          weightedY += y * brightness;
        }
      }
    }

    if (totalBrightness > 0) {
      this._handX = weightedX / totalBrightness / width;
      this._handY = weightedY / totalBrightness / height;
    }
  }

  private _detectMotion(currentData: Uint8ClampedArray): void {
    if (!this._prevFrameData) {
      this._motionDetected = false;
      return;
    }

    let motionPixels = 0;
    const threshold = 30;
    const totalPixels = currentData.length / 4;

    for (let i = 0; i < currentData.length; i += 4) {
      const diff =
        Math.abs(currentData[i] - this._prevFrameData[i]) +
        Math.abs(currentData[i + 1] - this._prevFrameData[i + 1]) +
        Math.abs(currentData[i + 2] - this._prevFrameData[i + 2]);
      if (diff > threshold * 3) motionPixels++;
    }

    // Significant motion across >5% of pixels treated as "pinch" gesture
    this._motionDetected = motionPixels / totalPixels > 0.05;
  }

  public getHandState(): HandState | null {
    if (!this._isActive) return null;

    const aimAngle = (this._handX - 0.5) * Math.PI;
    const aimPower = 1 - this._handY;

    return {
      aimAngle,
      aimPower,
      isFiring: this._motionDetected,
      isRecon: false,
    };
  }

  public createPreview(): void {
    if (!this._stream || !this._isActive) return;

    this._previewElement = document.createElement('video');
    this._previewElement.srcObject = this._stream;
    this._previewElement.playsInline = true;
    this._previewElement.style.cssText =
      'position:fixed;bottom:10px;right:10px;width:100px;height:75px;' +
      'border:2px solid #00f5ff;border-radius:4px;opacity:0.8;z-index:1000;' +
      'object-fit:cover;pointer-events:none;';
    document.body.appendChild(this._previewElement);
    this._previewElement.play().catch(() => {
      /* preview is non-critical */
    });
  }

  public deactivate(): void {
    this._isActive = false;
    cancelAnimationFrame(this._animFrameId);
  }

  public dispose(): void {
    this.deactivate();
    this._isInitialized = false;
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    if (this._previewElement) {
      this._previewElement.remove();
      this._previewElement = null;
    }
    if (this._videoElement) {
      this._videoElement.remove();
      this._videoElement = null;
    }
  }
}

export const cameraIntelligence = new CameraIntelligence();
