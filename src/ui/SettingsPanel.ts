import {
  AdvancedDynamicTexture,
  TextBlock,
  Slider,
  Button,
  StackPanel,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import { Scene } from '@babylonjs/core';
import { AudioManager } from '../core/AudioManager';
import { COLORS } from '../constants/Colors';
import { logger } from '../utils/Logger';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export class SettingsPanel {
  private _gui: AdvancedDynamicTexture;
  private _container: Rectangle;
  private _isVisible = false;
  private _audio: AudioManager;
  private _quality: GraphicsQuality = 'HIGH';
  private _onQualityChange: ((q: GraphicsQuality) => void) | null = null;
  private _qualityButtons: Map<GraphicsQuality, Button> = new Map();

  constructor(
    scene: Scene,
    audio: AudioManager,
    onQualityChange?: (q: GraphicsQuality) => void,
  ) {
    this._audio = audio;
    this._onQualityChange = onQualityChange ?? null;

    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('settingsUI', true, scene);
    this._container = this._buildUI();
    this._container.isVisible = false;
    this._gui.addControl(this._container);

    logger.info('SettingsPanel created');
  }

  private _buildUI(): Rectangle {
    // Dark overlay background
    const bg = new Rectangle('settingsBg');
    bg.width = 1;
    bg.height = 1;
    bg.background = 'rgba(3, 3, 8, 0.85)';
    bg.thickness = 0;

    // Content panel
    const panel = new StackPanel('settingsPanel');
    panel.width = '420px';
    panel.isVertical = true;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(panel);

    // Title
    const title = new TextBlock('settingsTitle', 'SETTINGS');
    title.color = COLORS.NEXARI_CYAN;
    title.fontSize = 40;
    title.fontFamily = 'Orbitron, sans-serif';
    title.height = '70px';
    title.shadowColor = COLORS.NEXARI_PURPLE;
    title.shadowOffsetX = 2;
    title.shadowOffsetY = 2;
    panel.addControl(title);

    // Volume sliders
    this._addSlider(panel, 'Master Volume', this._audio.masterVolume, (v) =>
      this._audio.setMasterVolume(v),
    );
    this._addSlider(panel, 'Music Volume', this._audio.musicVolume, (v) =>
      this._audio.setMusicVolume(v),
    );
    this._addSlider(panel, 'SFX Volume', this._audio.sfxVolume, (v) =>
      this._audio.setSfxVolume(v),
    );

    // Spacer
    const spacer = new Rectangle('settingsSpacer');
    spacer.height = '20px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Graphics quality label
    const qualityLabel = new TextBlock('qualityLabel', 'Graphics Quality');
    qualityLabel.color = COLORS.NEUTRAL;
    qualityLabel.fontSize = 18;
    qualityLabel.fontFamily = 'Rajdhani, sans-serif';
    qualityLabel.height = '30px';
    panel.addControl(qualityLabel);

    // Quality buttons row
    const qualityRow = new StackPanel('qualityRow');
    qualityRow.isVertical = false;
    qualityRow.height = '50px';
    qualityRow.width = '360px';
    panel.addControl(qualityRow);

    const qualities: GraphicsQuality[] = ['LOW', 'MEDIUM', 'HIGH'];
    for (const q of qualities) {
      const btn = Button.CreateSimpleButton('quality_' + q, q);
      btn.width = '110px';
      btn.height = '40px';
      btn.color = q === this._quality ? COLORS.NEXARI_CYAN : COLORS.NEUTRAL;
      btn.fontSize = 16;
      btn.fontFamily = 'Orbitron, sans-serif';
      btn.cornerRadius = 4;
      btn.thickness = q === this._quality ? 2 : 1;
      btn.background = q === this._quality ? COLORS.NEXARI_CYAN + '22' : 'transparent';
      btn.hoverCursor = 'pointer';
      btn.paddingLeftInPixels = 4;
      btn.paddingRightInPixels = 4;

      btn.onPointerUpObservable.add(() => {
        this._setQuality(q);
      });
      btn.onPointerEnterObservable.add(() => {
        if (q !== this._quality) {
          btn.background = COLORS.NEXARI_CYAN + '11';
        }
      });
      btn.onPointerOutObservable.add(() => {
        if (q !== this._quality) {
          btn.background = 'transparent';
        }
      });

      this._qualityButtons.set(q, btn);
      qualityRow.addControl(btn);
    }

    // Spacer
    const spacer2 = new Rectangle('settingsSpacer2');
    spacer2.height = '30px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Close button
    const closeBtn = Button.CreateSimpleButton('settingsClose', 'CLOSE');
    closeBtn.width = '200px';
    closeBtn.height = '50px';
    closeBtn.color = COLORS.NEXARI_PURPLE;
    closeBtn.fontSize = 22;
    closeBtn.fontFamily = 'Orbitron, sans-serif';
    closeBtn.cornerRadius = 5;
    closeBtn.thickness = 2;
    closeBtn.background = 'transparent';
    closeBtn.hoverCursor = 'pointer';
    closeBtn.onPointerEnterObservable.add(() => {
      closeBtn.background = COLORS.NEXARI_PURPLE + '22';
    });
    closeBtn.onPointerOutObservable.add(() => {
      closeBtn.background = 'transparent';
    });
    closeBtn.onPointerUpObservable.add(() => {
      this.hide();
    });
    panel.addControl(closeBtn);

    return bg;
  }

  private _addSlider(
    panel: StackPanel,
    label: string,
    initial: number,
    onChange: (v: number) => void,
  ): void {
    // Label with value
    const row = new StackPanel(label + 'Row');
    row.isVertical = false;
    row.height = '30px';
    row.width = '380px';
    panel.addControl(row);

    const labelText = new TextBlock(label + 'Label', label);
    labelText.color = COLORS.NEUTRAL;
    labelText.fontSize = 16;
    labelText.fontFamily = 'Rajdhani, sans-serif';
    labelText.width = '200px';
    labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(labelText);

    const valueText = new TextBlock(label + 'Value', `${Math.round(initial * 100)}%`);
    valueText.color = COLORS.NEXARI_CYAN;
    valueText.fontSize = 16;
    valueText.fontFamily = 'Rajdhani, sans-serif';
    valueText.width = '180px';
    valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    row.addControl(valueText);

    // Slider
    const slider = new Slider(label + 'Slider');
    slider.minimum = 0;
    slider.maximum = 1;
    slider.value = initial;
    slider.height = '24px';
    slider.width = '380px';
    slider.color = COLORS.NEXARI_CYAN;
    slider.background = COLORS.DEEP_SPACE;
    slider.thumbColor = COLORS.NEXARI_CYAN;
    slider.borderColor = COLORS.NEXARI_PURPLE;
    slider.isThumbCircle = true;
    slider.thumbWidth = '18px';
    slider.barOffset = '0px';

    slider.onValueChangedObservable.add((value) => {
      valueText.text = `${Math.round(value * 100)}%`;
      onChange(value);
    });

    panel.addControl(slider);

    // Small spacer after slider
    const spacer = new Rectangle(label + 'Spacer');
    spacer.height = '10px';
    spacer.thickness = 0;
    panel.addControl(spacer);
  }

  private _setQuality(q: GraphicsQuality): void {
    this._quality = q;

    for (const [key, btn] of this._qualityButtons) {
      if (key === q) {
        btn.color = COLORS.NEXARI_CYAN;
        btn.thickness = 2;
        btn.background = COLORS.NEXARI_CYAN + '22';
      } else {
        btn.color = COLORS.NEUTRAL;
        btn.thickness = 1;
        btn.background = 'transparent';
      }
    }

    if (this._onQualityChange) {
      this._onQualityChange(q);
    }
  }

  public show(): void {
    this._container.isVisible = true;
    this._isVisible = true;
  }

  public hide(): void {
    this._container.isVisible = false;
    this._isVisible = false;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    this._gui.dispose();
  }
}
