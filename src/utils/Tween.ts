export function linear(t: number): number {
  return t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export class Tween {
  private _from: number;
  private _to: number;
  private _durationMs: number;
  private _easingFn: (t: number) => number;
  private _elapsed: number;
  private _value: number;

  constructor(from: number, to: number, durationMs: number, easingFn: (t: number) => number) {
    this._from = from;
    this._to = to;
    this._durationMs = durationMs;
    this._easingFn = easingFn;
    this._elapsed = 0;
    this._value = from;
  }

  public update(deltaMs: number): number {
    this._elapsed = Math.min(this._elapsed + deltaMs, this._durationMs);
    const t = this._durationMs > 0 ? this._elapsed / this._durationMs : 1;
    const eased = this._easingFn(t);
    this._value = this._from + (this._to - this._from) * eased;
    return this._value;
  }

  public get isComplete(): boolean {
    return this._elapsed >= this._durationMs;
  }

  public get value(): number {
    return this._value;
  }

  public reset(): void {
    this._elapsed = 0;
    this._value = this._from;
  }
}
