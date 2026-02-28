import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { COLORS } from '../constants/Colors';

interface RuleMutationDisplay {
  displayName: string;
  description: string;
  favoredPlayer: 'PLAYER' | 'AI' | 'NEUTRAL';
}

export class RuleDisplay {
  private _gui: AdvancedDynamicTexture;
  private _container: Rectangle;
  private _titleText: TextBlock;
  private _descText: TextBlock;
  private _isVisible: boolean;
  private _fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(gui: AdvancedDynamicTexture) {
    this._gui = gui;
    this._isVisible = false;

    /* ---- Container (center-screen overlay) ---- */
    this._container = new Rectangle('ruleContainer');
    this._container.width = '420px';
    this._container.height = '160px';
    this._container.cornerRadius = 8;
    this._container.background = 'rgba(3,3,8,0.85)';
    this._container.color = COLORS.NEXARI_GOLD;
    this._container.thickness = 2;
    this._container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._container.isVisible = false;

    /* ---- Title ---- */
    this._titleText = new TextBlock('ruleTitle', '');
    this._titleText.fontSize = '22px';
    this._titleText.fontWeight = 'bold';
    this._titleText.color = COLORS.NEXARI_GOLD;
    this._titleText.fontFamily = 'Arial, sans-serif';
    this._titleText.resizeToFit = true;
    this._titleText.topInPixels = -30;
    this._titleText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._titleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._container.addControl(this._titleText);

    /* ---- Description ---- */
    this._descText = new TextBlock('ruleDesc', '');
    this._descText.fontSize = '16px';
    this._descText.color = '#ffffff';
    this._descText.fontFamily = 'Arial, sans-serif';
    this._descText.resizeToFit = true;
    this._descText.textWrapping = true;
    this._descText.topInPixels = 20;
    this._descText.width = '380px';
    this._descText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._descText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._container.addControl(this._descText);

    this._gui.addControl(this._container);
  }

  public showMutation(mutation: RuleMutationDisplay): void {
    this._clearFadeTimer();

    this._titleText.text = mutation.displayName;
    this._descText.text = mutation.description;

    // Border color based on favored player
    switch (mutation.favoredPlayer) {
      case 'PLAYER':
        this._container.color = COLORS.PLAYER_CYAN;
        break;
      case 'AI':
        this._container.color = COLORS.AI_MAGENTA;
        break;
      default:
        this._container.color = COLORS.NEXARI_GOLD;
        break;
    }

    this._container.alpha = 1;
    this._container.isVisible = true;
    this._isVisible = true;

    // Auto-hide after 3 seconds
    this._fadeTimer = setTimeout(() => {
      this.hide();
    }, 3000);
  }

  public hide(): void {
    this._clearFadeTimer();
    this._container.isVisible = false;
    this._isVisible = false;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    this._clearFadeTimer();
    this._gui.removeControl(this._container);
    this._container.dispose();
  }

  private _clearFadeTimer(): void {
    if (this._fadeTimer !== null) {
      clearTimeout(this._fadeTimer);
      this._fadeTimer = null;
    }
  }
}
