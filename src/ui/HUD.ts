import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { COLORS } from '../constants/Colors';

export class HUD {
  private _gui: AdvancedDynamicTexture;
  private _playerScoreText: TextBlock;
  private _aiScoreText: TextBlock;
  private _timerText: TextBlock;
  private _ruleText: TextBlock;
  private _panel: StackPanel;

  constructor(gui: AdvancedDynamicTexture) {
    this._gui = gui;

    /* ---- Score panel (top-left) ---- */
    this._panel = new StackPanel('scorePanel');
    this._panel.width = '200px';
    this._panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._panel.paddingTopInPixels = 16;
    this._panel.paddingLeftInPixels = 16;
    this._gui.addControl(this._panel);

    this._playerScoreText = this._createText(
      'playerScore',
      'Player: 0',
      '24px',
      COLORS.PLAYER_CYAN,
    );
    this._panel.addControl(this._playerScoreText);

    this._aiScoreText = this._createText(
      'aiScore',
      'AI: 0',
      '24px',
      COLORS.AI_MAGENTA,
    );
    this._panel.addControl(this._aiScoreText);

    /* ---- Timer (top-center) ---- */
    this._timerText = this._createText('timer', '00:00', '28px', '#ffffff');
    this._timerText.fontWeight = 'bold';
    this._timerText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._timerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._timerText.paddingTopInPixels = 16;
    this._gui.addControl(this._timerText);

    /* ---- Rule text (bottom-center) ---- */
    this._ruleText = this._createText('rule', '', '18px', COLORS.NEXARI_GOLD);
    this._ruleText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._ruleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this._ruleText.paddingBottomInPixels = 32;
    this._ruleText.isVisible = false;
    this._gui.addControl(this._ruleText);
  }

  public updatePlayerScore(score: number): void {
    this._playerScoreText.text = `Player: ${score}`;
  }

  public updateAiScore(score: number): void {
    this._aiScoreText.text = `AI: ${score}`;
  }

  public updateTimer(seconds: number): void {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this._timerText.text = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public showRule(text: string): void {
    this._ruleText.text = text;
    this._ruleText.isVisible = true;
  }

  public hideRule(): void {
    this._ruleText.isVisible = false;
  }

  public setVisible(visible: boolean): void {
    this._panel.isVisible = visible;
    this._timerText.isVisible = visible;
    if (!visible) {
      this._ruleText.isVisible = false;
    }
  }

  public dispose(): void {
    this._gui.removeControl(this._panel);
    this._gui.removeControl(this._timerText);
    this._gui.removeControl(this._ruleText);
    this._panel.dispose();
    this._timerText.dispose();
    this._ruleText.dispose();
  }

  private _createText(
    name: string,
    text: string,
    fontSize: string,
    color: string,
  ): TextBlock {
    const tb = new TextBlock(name, text);
    tb.fontSize = fontSize;
    tb.color = color;
    tb.fontFamily = 'Arial, sans-serif';
    tb.resizeToFit = true;
    return tb;
  }
}
