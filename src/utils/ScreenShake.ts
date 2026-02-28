import { Vector3 } from '@babylonjs/core/Maths/math.vector';

const MAX_OFFSET = 0.8;

export class ScreenShake {
  private _intensity: number = 0;
  private _duration: number = 0;
  private _elapsed: number = 0;
  private _active: boolean = false;

  public trigger(intensity: number, durationMs: number): void {
    this._intensity = intensity;
    this._duration = durationMs;
    this._elapsed = 0;
    this._active = true;
  }

  public update(deltaMs: number): Vector3 {
    if (!this._active) {
      return Vector3.Zero();
    }

    this._elapsed += deltaMs;

    if (this._elapsed >= this._duration) {
      this._active = false;
      return Vector3.Zero();
    }

    const progress = this._elapsed / this._duration;
    // Quadratic decay: intensity * (1 - (elapsed/duration)²)
    const decay = 1 - progress * progress;
    const magnitude = Math.min(this._intensity * decay, MAX_OFFSET);

    const offsetX = (Math.random() * 2 - 1) * magnitude;
    const offsetY = (Math.random() * 2 - 1) * magnitude;
    const offsetZ = (Math.random() * 2 - 1) * magnitude;

    return new Vector3(offsetX, offsetY, offsetZ);
  }

  public get isActive(): boolean {
    return this._active;
  }
}
