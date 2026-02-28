import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { COLORS } from '../constants/Colors';
import { logger } from '../utils/Logger';

/**
 * Dev overlay showing FPS, active meshes, total meshes, and particle system count.
 * Toggle with F3.
 */
export class PerformanceOverlay {
  private _gui: AdvancedDynamicTexture | null = null;
  private _container: Rectangle | null = null;
  private _fpsText: TextBlock | null = null;
  private _meshText: TextBlock | null = null;
  private _particleText: TextBlock | null = null;
  private _isVisible = false;
  private _scene: Scene | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Attach to a scene. Press F3 to toggle visibility. */
  public attach(scene: Scene): void {
    this._scene = scene;
    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('perfOverlay', true, scene);

    this._container = new Rectangle('perfContainer');
    this._container.width = '210px';
    this._container.height = '100px';
    this._container.cornerRadius = 4;
    this._container.color = COLORS.NEXARI_CYAN;
    this._container.thickness = 1;
    this._container.background = 'rgba(3,3,8,0.75)';
    this._container.horizontalAlignment = 0; // left
    this._container.verticalAlignment = 0; // top
    this._container.left = '8px';
    this._container.top = '8px';
    this._container.isVisible = false;
    this._gui.addControl(this._container);

    this._fpsText = this._createLabel('fpsText', '-20px');
    this._meshText = this._createLabel('meshText', '0px');
    this._particleText = this._createLabel('particleText', '20px');

    this._keyHandler = (e: KeyboardEvent): void => {
      if (e.code === 'F3') {
        e.preventDefault();
        this._toggle();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    scene.registerBeforeRender(() => {
      this.update();
    });

    logger.debug('PerformanceOverlay attached');
  }

  private _createLabel(name: string, top: string): TextBlock {
    const tb = new TextBlock(name);
    tb.fontSize = 13;
    tb.color = COLORS.NEXARI_CYAN;
    tb.textHorizontalAlignment = 0; // left
    tb.left = '8px';
    tb.top = top;
    tb.resizeToFit = true;
    this._container!.addControl(tb);
    return tb;
  }

  private _toggle(): void {
    this._isVisible = !this._isVisible;
    if (this._container) this._container.isVisible = this._isVisible;
    logger.debug(`PerformanceOverlay ${this._isVisible ? 'shown' : 'hidden'}`);
  }

  public update(): void {
    if (!this._isVisible || !this._scene) return;

    const engine = this._scene.getEngine();
    if (this._fpsText) {
      this._fpsText.text = `FPS: ${engine.getFps().toFixed(0)}`;
    }
    if (this._meshText) {
      this._meshText.text = `Meshes: ${this._scene.getActiveMeshes().length} / ${this._scene.meshes.length}`;
    }
    if (this._particleText) {
      this._particleText.text = `Particles: ${this._scene.particleSystems.length}`;
    }
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public detach(): void {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._scene = null;
  }

  public dispose(): void {
    this.detach();
    if (this._gui) {
      this._gui.dispose();
      this._gui = null;
    }
    this._container = null;
    this._fpsText = null;
    this._meshText = null;
    this._particleText = null;
  }
}

export const performanceOverlay = new PerformanceOverlay();
