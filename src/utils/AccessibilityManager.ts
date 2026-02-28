import { logger } from './Logger';

export class AccessibilityManager {
  private _colorBlindMode = false;
  private _reducedMotion = false;
  private _highContrast = false;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _onColorBlindToggle: (() => void)[] = [];
  private _onHighContrastToggle: (() => void)[] = [];

  constructor() {
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this._reducedMotion) {
      logger.info('Reduced motion preference detected');
    }

    this._keyHandler = (e: KeyboardEvent): void => {
      if (e.key === 'c' || e.key === 'C') {
        this._colorBlindMode = !this._colorBlindMode;
        logger.info(`Colorblind mode: ${this._colorBlindMode ? 'ON' : 'OFF'}`);
        this._onColorBlindToggle.forEach((cb) => cb());
      }
      if (e.key === 'h' || e.key === 'H') {
        this._highContrast = !this._highContrast;
        logger.info(`High contrast mode: ${this._highContrast ? 'ON' : 'OFF'}`);
        this._onHighContrastToggle.forEach((cb) => cb());
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  public get isColorBlind(): boolean {
    return this._colorBlindMode;
  }

  public get isReducedMotion(): boolean {
    return this._reducedMotion;
  }

  public get isHighContrast(): boolean {
    return this._highContrast;
  }

  public onColorBlindChange(cb: () => void): void {
    this._onColorBlindToggle.push(cb);
  }

  public onHighContrastChange(cb: () => void): void {
    this._onHighContrastToggle.push(cb);
  }

  public dispose(): void {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    this._onColorBlindToggle = [];
    this._onHighContrastToggle = [];
  }
}

export const accessibility = new AccessibilityManager();
