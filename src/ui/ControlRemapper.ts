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

export interface ControlBindings {
  moveForward: string;
  moveBack: string;
  moveLeft: string;
  moveRight: string;
  push: string;
  pause: string;
}

const DEFAULT_BINDINGS: ControlBindings = {
  moveForward: 'KeyW',
  moveBack: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  push: 'Space',
  pause: 'Escape',
};

const ACTION_LABELS: Record<keyof ControlBindings, string> = {
  moveForward: 'Forward',
  moveBack: 'Back',
  moveLeft: 'Left',
  moveRight: 'Right',
  push: 'Push / Shoot',
  pause: 'Pause',
};

function keyCodeToDisplay(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'Escape') return 'ESC';
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.toUpperCase();
}

export class ControlRemapper {
  private _bindings: ControlBindings = { ...DEFAULT_BINDINGS };
  private _gui: AdvancedDynamicTexture | null = null;
  private _container: Rectangle | null = null;
  private _isVisible = false;
  private _listeningFor: keyof ControlBindings | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _bindingButtons: Map<keyof ControlBindings, Button> = new Map();

  public get bindings(): ControlBindings {
    return this._bindings;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public show(scene: Scene): void {
    if (this._isVisible) return;

    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('controlsUI', true, scene);
    this._container = this._buildUI();
    this._gui.addControl(this._container);
    this._isVisible = true;

    this._keyHandler = (e: KeyboardEvent): void => {
      if (this._listeningFor) {
        e.preventDefault();
        this._bindings[this._listeningFor] = e.code;
        const btn = this._bindingButtons.get(this._listeningFor);
        if (btn) {
          const textBlock = btn.children[0] as TextBlock | undefined;
          if (textBlock) {
            textBlock.text = keyCodeToDisplay(e.code);
          }
          btn.color = COLORS.NEXARI_CYAN;
          btn.background = 'transparent';
        }
        this._listeningFor = null;
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    logger.info('ControlRemapper opened');
  }

  public hide(): void {
    if (!this._isVisible) return;

    this._listeningFor = null;
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._gui) {
      this._gui.dispose();
      this._gui = null;
    }
    this._container = null;
    this._bindingButtons.clear();
    this._isVisible = false;
  }

  public dispose(): void {
    this.hide();
  }

  private _buildUI(): Rectangle {
    const bg = new Rectangle('controlsBg');
    bg.width = 1;
    bg.height = 1;
    bg.background = 'rgba(3, 3, 8, 0.85)';
    bg.thickness = 0;

    const panel = new StackPanel('controlsPanel');
    panel.width = '450px';
    panel.isVertical = true;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(panel);

    // Title
    const title = new TextBlock('controlsTitle', 'CONTROLS');
    title.color = COLORS.NEXARI_CYAN;
    title.fontSize = 40;
    title.fontFamily = 'Orbitron, sans-serif';
    title.height = '70px';
    title.shadowColor = COLORS.NEXARI_PURPLE;
    title.shadowOffsetX = 2;
    title.shadowOffsetY = 2;
    panel.addControl(title);

    const hint = new TextBlock('controlsHint', 'Click a key to remap it');
    hint.color = COLORS.NEUTRAL;
    hint.fontSize = 14;
    hint.fontFamily = 'Rajdhani, sans-serif';
    hint.height = '30px';
    hint.alpha = 0.7;
    panel.addControl(hint);

    // Spacer
    const spacer = new Rectangle('controlsSpacer');
    spacer.height = '20px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Binding rows
    const actions = Object.keys(ACTION_LABELS) as (keyof ControlBindings)[];
    for (const action of actions) {
      this._addBindingRow(panel, action);
    }

    // Spacer
    const spacer2 = new Rectangle('controlsSpacer2');
    spacer2.height = '20px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Reset defaults button
    const resetBtn = Button.CreateSimpleButton('controlsReset', 'RESET DEFAULTS');
    resetBtn.width = '250px';
    resetBtn.height = '45px';
    resetBtn.color = COLORS.NEXARI_GOLD;
    resetBtn.fontSize = 18;
    resetBtn.fontFamily = 'Orbitron, sans-serif';
    resetBtn.cornerRadius = 4;
    resetBtn.thickness = 2;
    resetBtn.background = 'transparent';
    resetBtn.hoverCursor = 'pointer';
    resetBtn.onPointerEnterObservable.add(() => {
      resetBtn.background = COLORS.NEXARI_GOLD + '22';
    });
    resetBtn.onPointerOutObservable.add(() => {
      resetBtn.background = 'transparent';
    });
    resetBtn.onPointerUpObservable.add(() => {
      this._resetDefaults();
    });
    panel.addControl(resetBtn);

    // Spacer
    const spacer3 = new Rectangle('controlsSpacer3');
    spacer3.height = '15px';
    spacer3.thickness = 0;
    panel.addControl(spacer3);

    // Close button
    const closeBtn = Button.CreateSimpleButton('controlsClose', 'CLOSE');
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

  private _addBindingRow(panel: StackPanel, action: keyof ControlBindings): void {
    const row = new StackPanel(action + 'Row');
    row.isVertical = false;
    row.height = '45px';
    row.width = '400px';
    panel.addControl(row);

    const label = new TextBlock(action + 'Label', ACTION_LABELS[action]);
    label.color = COLORS.NEUTRAL;
    label.fontSize = 18;
    label.fontFamily = 'Rajdhani, sans-serif';
    label.width = '200px';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(label);

    const btn = Button.CreateSimpleButton(
      action + 'Btn',
      keyCodeToDisplay(this._bindings[action]),
    );
    btn.width = '180px';
    btn.height = '36px';
    btn.color = COLORS.NEXARI_CYAN;
    btn.fontSize = 16;
    btn.fontFamily = 'Orbitron, sans-serif';
    btn.cornerRadius = 4;
    btn.thickness = 1;
    btn.background = 'transparent';
    btn.hoverCursor = 'pointer';

    btn.onPointerEnterObservable.add(() => {
      if (this._listeningFor !== action) {
        btn.background = COLORS.NEXARI_CYAN + '11';
      }
    });
    btn.onPointerOutObservable.add(() => {
      if (this._listeningFor !== action) {
        btn.background = 'transparent';
      }
    });

    btn.onPointerUpObservable.add(() => {
      // Cancel previous listening
      if (this._listeningFor && this._listeningFor !== action) {
        const prevBtn = this._bindingButtons.get(this._listeningFor);
        if (prevBtn) {
          prevBtn.color = COLORS.NEXARI_CYAN;
          prevBtn.background = 'transparent';
        }
      }
      this._listeningFor = action;
      btn.color = COLORS.NEXARI_GOLD;
      btn.background = COLORS.NEXARI_GOLD + '22';
      const textBlock = btn.children[0] as TextBlock | undefined;
      if (textBlock) {
        textBlock.text = '...';
      }
    });

    this._bindingButtons.set(action, btn);
    row.addControl(btn);
  }

  private _resetDefaults(): void {
    this._bindings = { ...DEFAULT_BINDINGS };
    this._listeningFor = null;

    for (const [action, btn] of this._bindingButtons) {
      const textBlock = btn.children[0] as TextBlock | undefined;
      if (textBlock) {
        textBlock.text = keyCodeToDisplay(this._bindings[action]);
      }
      btn.color = COLORS.NEXARI_CYAN;
      btn.background = 'transparent';
    }

    logger.info('Control bindings reset to defaults');
  }
}

export const controlRemapper = new ControlRemapper();
