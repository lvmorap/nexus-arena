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

  public get isActive(): boolean {
    return this._isActive;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public async initialize(): Promise<boolean> {
    logger.info('CameraIntelligence: camera hand-tracking not available (TensorFlow/MediaPipe deps not installed)');
    this._isInitialized = false;
    this._isActive = false;
    return false;
  }

  public getHandState(): HandState | null {
    return null;
  }

  public dispose(): void {
    this._isActive = false;
    this._isInitialized = false;
  }
}
