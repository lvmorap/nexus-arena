import { logger } from '../utils/Logger';

export class AudioManager {
  private _masterVolume: number;
  private _musicVolume: number;
  private _sfxVolume: number;
  private _muted: boolean;

  constructor() {
    this._masterVolume = 1.0;
    this._musicVolume = 0.7;
    this._sfxVolume = 1.0;
    this._muted = false;
    logger.info('AudioManager initialized (stub mode)');
  }

  public playMusic(key: string): void {
    logger.debug(`AudioManager: playMusic('${key}') — stub`);
  }

  public stopMusic(): void {
    logger.debug('AudioManager: stopMusic() — stub');
  }

  public playSfx(key: string): void {
    logger.debug(`AudioManager: playSfx('${key}') — stub`);
  }

  public setMasterVolume(vol: number): void {
    this._masterVolume = Math.max(0, Math.min(1, vol));
  }

  public setMusicVolume(vol: number): void {
    this._musicVolume = Math.max(0, Math.min(1, vol));
  }

  public setSfxVolume(vol: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(muted: boolean): void {
    this._muted = muted;
  }

  public setIntensity(intensity: number): void {
    logger.debug(
      `AudioManager: setIntensity(${intensity}) — adaptive crossfade stub`,
    );
  }

  public get isMuted(): boolean {
    return this._muted;
  }

  public dispose(): void {
    logger.info('AudioManager disposed');
  }
}
