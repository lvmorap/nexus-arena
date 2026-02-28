import {
  AdvancedDynamicTexture,
  TextBlock,
  Button,
  StackPanel,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import { Scene } from '@babylonjs/core';
import { COLORS } from '../constants/Colors';
import { logger } from '../utils/Logger';

export class PauseOverlay {
  private _gui: AdvancedDynamicTexture;
  private _container: Rectangle;
  private _isPaused = false;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _onResume: () => void;
  private _onSettings: () => void;
  private _onQuit: () => void;

  constructor(
    scene: Scene,
    onResume: () => void,
    onSettings: () => void,
    onQuit: () => void,
  ) {
    this._onResume = onResume;
    this._onSettings = onSettings;
    this._onQuit = onQuit;

    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('pauseUI', true, scene);
    this._container = this._buildUI();
    this._container.isVisible = false;
    this._gui.addControl(this._container);

    this._keyHandler = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        this.toggle();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    logger.info('PauseOverlay created');
  }

  private _buildUI(): Rectangle {
    const bg = new Rectangle('pauseBg');
    bg.width = 1;
    bg.height = 1;
    bg.background = 'rgba(3, 3, 8, 0.80)';
    bg.thickness = 0;

    const panel = new StackPanel('pausePanel');
    panel.width = '400px';
    panel.isVertical = true;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(panel);

    // Title
    const title = new TextBlock('pauseTitle', 'PAUSED');
    title.color = COLORS.NEXARI_CYAN;
    title.fontSize = 52;
    title.fontFamily = 'Orbitron, sans-serif';
    title.height = '90px';
    title.shadowColor = COLORS.NEXARI_PURPLE;
    title.shadowOffsetX = 2;
    title.shadowOffsetY = 2;
    panel.addControl(title);

    // Spacer
    const spacer = new Rectangle('pauseSpacer');
    spacer.height = '40px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Resume button
    const resumeBtn = this._createButton('RESUME', COLORS.NEXARI_CYAN);
    resumeBtn.onPointerUpObservable.add(() => {
      this.hide();
      this._onResume();
    });
    panel.addControl(resumeBtn);

    // Settings button
    const settingsBtn = this._createButton('SETTINGS', COLORS.NEXARI_GOLD);
    settingsBtn.onPointerUpObservable.add(() => {
      this._onSettings();
    });
    panel.addControl(settingsBtn);

    // Spacer
    const spacer2 = new Rectangle('pauseSpacer2');
    spacer2.height = '20px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Quit button
    const quitBtn = this._createButton('QUIT TO MENU', COLORS.NEXARI_RED);
    quitBtn.onPointerUpObservable.add(() => {
      this.hide();
      this._onQuit();
    });
    panel.addControl(quitBtn);

    return bg;
  }

  private _createButton(text: string, color: string): Button {
    const btn = Button.CreateSimpleButton('pause_' + text, text);
    btn.width = '300px';
    btn.height = '55px';
    btn.color = color;
    btn.fontSize = 22;
    btn.fontFamily = 'Orbitron, sans-serif';
    btn.cornerRadius = 5;
    btn.thickness = 2;
    btn.background = 'transparent';
    btn.hoverCursor = 'pointer';

    btn.onPointerEnterObservable.add(() => {
      btn.background = color + '22';
      btn.thickness = 3;
    });
    btn.onPointerOutObservable.add(() => {
      btn.background = 'transparent';
      btn.thickness = 2;
    });

    return btn;
  }

  public show(): void {
    this._container.isVisible = true;
    this._isPaused = true;
  }

  public hide(): void {
    this._container.isVisible = false;
    this._isPaused = false;
  }

  public toggle(): void {
    if (this._isPaused) {
      this.hide();
      this._onResume();
    } else {
      this.show();
    }
  }

  public get isPaused(): boolean {
    return this._isPaused;
  }

  public dispose(): void {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._gui.dispose();
  }
}
