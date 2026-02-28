import { Scene, Color4, Vector3, HemisphericLight, FreeCamera, Color3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, StackPanel } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { COLORS } from '../constants/Colors';
import { logger } from '../utils/Logger';

const LOADING_TEXT = 'ESTABLISHING NEXARI LINK...';
const LOADING_DURATION_MS = 2000;
const LOADING_INTERVAL_MS = 50;
const BAR_WIDTH = 30;

export class BootScene {
  private _scene: Scene;
  private _engine: Engine;
  private _gui: AdvancedDynamicTexture | null = null;
  private _loadingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.008, 0.002, 0.02, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(onComplete: () => void): void {
    // Minimal camera/light
    const camera = new FreeCamera('bootCam', new Vector3(0, 0, -10), this._scene);
    camera.setTarget(Vector3.Zero());

    const light = new HemisphericLight('bootLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.2;
    light.diffuse = new Color3(0.1, 0.15, 0.3);

    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('bootUI', true, this._scene);

    const panel = new StackPanel('bootPanel');
    panel.isVertical = true;
    panel.width = '600px';
    this._gui.addControl(panel);

    // Loading title
    const title = new TextBlock('bootTitle');
    title.text = LOADING_TEXT;
    title.color = COLORS.NEXARI_CYAN;
    title.fontSize = 28;
    title.fontFamily = 'Orbitron, sans-serif';
    title.height = '60px';
    panel.addControl(title);

    // Progress bar background
    const barBg = new Rectangle('barBg');
    barBg.width = '400px';
    barBg.height = '30px';
    barBg.color = COLORS.NEXARI_CYAN;
    barBg.thickness = 2;
    barBg.background = 'transparent';
    barBg.cornerRadius = 4;
    panel.addControl(barBg);

    // Progress bar fill
    const barFill = new Rectangle('barFill');
    barFill.width = '0px';
    barFill.height = '26px';
    barFill.background = COLORS.NEXARI_CYAN + '88';
    barFill.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;
    barFill.left = '2px';
    barFill.cornerRadius = 2;
    barFill.thickness = 0;
    barBg.addControl(barFill);

    // Percentage text
    const pctText = new TextBlock('bootPct');
    pctText.text = '0%';
    pctText.color = COLORS.NEXARI_CYAN;
    pctText.fontSize = 18;
    pctText.fontFamily = 'Rajdhani, monospace';
    pctText.height = '40px';
    panel.addControl(pctText);

    // ASCII bar text
    const asciiBar = new TextBlock('bootAscii');
    asciiBar.text = `[${' '.repeat(BAR_WIDTH)}]`;
    asciiBar.color = COLORS.SUCCESS;
    asciiBar.fontSize = 16;
    asciiBar.fontFamily = 'Rajdhani, monospace';
    asciiBar.height = '30px';
    asciiBar.alpha = 0.7;
    panel.addControl(asciiBar);

    // Animate progress
    const steps = Math.ceil(LOADING_DURATION_MS / LOADING_INTERVAL_MS);
    let current = 0;
    const maxBarPx = 396;

    this._loadingInterval = setInterval(() => {
      current++;
      const pct = Math.min(current / steps, 1);
      const pctInt = Math.round(pct * 100);

      barFill.width = `${Math.round(pct * maxBarPx)}px`;
      pctText.text = `${pctInt}%`;

      const filled = Math.round(pct * BAR_WIDTH);
      asciiBar.text = `[${'='.repeat(filled)}${' '.repeat(BAR_WIDTH - filled)}] ${pctInt}%`;

      if (pct >= 1) {
        if (this._loadingInterval) {
          clearInterval(this._loadingInterval);
          this._loadingInterval = null;
        }
        onComplete();
      }
    }, LOADING_INTERVAL_MS);

    logger.info('BootScene setup complete');
  }

  public dispose(): void {
    if (this._loadingInterval) {
      clearInterval(this._loadingInterval);
      this._loadingInterval = null;
    }
    if (this._gui) {
      this._gui.dispose();
      this._gui = null;
    }
    this._scene.dispose();
  }
}
