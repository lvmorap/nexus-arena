import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { COLORS } from '../constants/Colors';

export class Minimap {
  private _gui: AdvancedDynamicTexture;
  private _container: Rectangle;
  private _playerDot: Ellipse;
  private _aiDot: Ellipse;
  private _isVisible: boolean;

  constructor(gui: AdvancedDynamicTexture) {
    this._gui = gui;
    this._isVisible = true;

    /* ---- Container (bottom-right, 120×120) ---- */
    this._container = new Rectangle('minimapContainer');
    this._container.width = '120px';
    this._container.height = '120px';
    this._container.cornerRadius = 12;
    this._container.background = 'rgba(3,3,8,0.7)';
    this._container.color = COLORS.NEUTRAL;
    this._container.thickness = 1;
    this._container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this._container.paddingRightInPixels = 16;
    this._container.paddingBottomInPixels = 16;

    /* ---- Player dot ---- */
    this._playerDot = this._createDot('playerDot', COLORS.PLAYER_CYAN);
    this._container.addControl(this._playerDot);

    /* ---- AI dot ---- */
    this._aiDot = this._createDot('aiDot', COLORS.AI_MAGENTA);
    this._container.addControl(this._aiDot);

    this._gui.addControl(this._container);
  }

  public updatePositions(
    playerX: number,
    playerZ: number,
    aiX: number,
    aiZ: number,
    arenaRadius: number,
  ): void {
    const halfSize = 50; // usable radius within the 120px container
    const scale = arenaRadius > 0 ? halfSize / arenaRadius : 1;

    this._playerDot.leftInPixels = playerX * scale;
    this._playerDot.topInPixels = -playerZ * scale; // Z forward → up on minimap

    this._aiDot.leftInPixels = aiX * scale;
    this._aiDot.topInPixels = -aiZ * scale;
  }

  public setVisible(visible: boolean): void {
    this._container.isVisible = visible;
    this._isVisible = visible;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    this._gui.removeControl(this._container);
    this._container.dispose();
  }

  private _createDot(name: string, color: string): Ellipse {
    const dot = new Ellipse(name);
    dot.width = '8px';
    dot.height = '8px';
    dot.background = color;
    dot.color = color;
    dot.thickness = 0;
    dot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    dot.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    return dot;
  }
}
