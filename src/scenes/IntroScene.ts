import {
  Scene,
  Color4,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
  ArcRotateCamera,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, StackPanel } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { COLORS } from '../constants/Colors';
import { logger } from '../utils/Logger';

export class IntroScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _onComplete: (() => void) | null = null;
  private _typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private _canSkip = false;
  private _skipTimeout: ReturnType<typeof setTimeout> | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _clickHandler: (() => void) | null = null;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.01, 0.01, 0.02, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(onComplete: () => void): void {
    this._onComplete = onComplete;
    this._buildBackground();
    this._buildUI();

    this._skipTimeout = setTimeout(() => {
      this._canSkip = true;
    }, 1000);

    this._keyHandler = (): void => {
      if (this._canSkip && this._onComplete) {
        this._finish();
      }
    };
    this._clickHandler = (): void => {
      if (this._canSkip && this._onComplete) {
        this._finish();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
    this._engine.canvas.addEventListener('click', this._clickHandler);

    logger.info('IntroScene setup complete');
  }

  private _buildBackground(): void {
    const camera = new ArcRotateCamera(
      'introCam',
      0,
      Math.PI / 2,
      50,
      Vector3.Zero(),
      this._scene
    );
    camera.lowerRadiusLimit = 50;
    camera.upperRadiusLimit = 50;

    const light = new HemisphericLight('introLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.2;
    light.diffuse = new Color3(0.1, 0.2, 0.1);

    // Distant stars
    for (let i = 0; i < 120; i++) {
      const star = MeshBuilder.CreateSphere(
        `introStar_${i}`,
        { diameter: 0.06 + Math.random() * 0.1 },
        this._scene
      );
      star.position = new Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 100
      );
      const sMat = new StandardMaterial(`introStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        0.8 + Math.random() * 0.2
      );
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'introUI',
      true,
      this._scene
    );

    const panel = new StackPanel('introPanel');
    panel.width = '700px';
    panel.isVertical = true;
    this._guiTexture.addControl(panel);

    const lines = [
      '> NEXARI TRANSMISSION RECEIVED',
      `> EARTH DATE: ${new Date().toISOString().split('T')[0]}`,
      '',
      '> HUMANITY HAS BEEN SELECTED.',
      '> THE TRIAL BEGINS NOW.',
      '',
      '> THREE ROUNDS OF COMPETITION.',
      '> RULES THAT LEARN. RULES THAT ADAPT.',
      '> YOUR PLAY STYLE BECOMES THE CHALLENGE.',
      '',
      '> WIN, AND EARTH ENDURES.',
      '> LOSE, AND EARTH IS RELOCATED.',
      '',
      '> INITIATING NEXUS ARENA...',
    ];

    const textBlocks: TextBlock[] = [];
    for (let i = 0; i < lines.length; i++) {
      const tb = new TextBlock(`introLine_${i}`);
      tb.text = '';
      tb.color = COLORS.SUCCESS;
      tb.fontSize = 20;
      tb.fontFamily = 'Rajdhani, monospace';
      tb.height = '32px';
      tb.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      tb.paddingLeft = '50px';
      tb.alpha = 0;
      panel.addControl(tb);
      textBlocks.push(tb);
    }

    // Spacer
    const spacer = new Rectangle('introSpacer');
    spacer.height = '40px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Skip hint
    const skipText = new TextBlock('skipHint');
    skipText.text = 'Press any key to continue...';
    skipText.color = COLORS.NEUTRAL;
    skipText.fontSize = 14;
    skipText.fontFamily = 'Rajdhani, sans-serif';
    skipText.height = '30px';
    skipText.alpha = 0;
    panel.addControl(skipText);

    // Typewriter effect
    let currentLine = 0;
    let currentChar = 0;

    this._typewriterInterval = setInterval(() => {
      if (currentLine >= lines.length) {
        if (this._typewriterInterval) {
          clearInterval(this._typewriterInterval);
          this._typewriterInterval = null;
        }
        skipText.alpha = 0.5;
        // Auto-advance after 3 seconds
        setTimeout(() => {
          if (this._onComplete) {
            this._finish();
          }
        }, 3000);
        return;
      }

      const line = lines[currentLine];
      const tb = textBlocks[currentLine];

      if (line === '') {
        tb.alpha = 1;
        currentLine++;
        currentChar = 0;
        return;
      }

      if (currentChar === 0) {
        tb.alpha = 1;
      }

      if (currentChar < line.length) {
        tb.text = line.substring(0, currentChar + 1);
        currentChar++;
      } else {
        currentLine++;
        currentChar = 0;
      }
    }, 40);
  }

  private _finish(): void {
    if (this._typewriterInterval) {
      clearInterval(this._typewriterInterval);
      this._typewriterInterval = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      this._engine.canvas.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    if (this._onComplete) {
      const cb = this._onComplete;
      this._onComplete = null;
      cb();
    }
  }

  public dispose(): void {
    if (this._typewriterInterval) {
      clearInterval(this._typewriterInterval);
      this._typewriterInterval = null;
    }
    if (this._skipTimeout) {
      clearTimeout(this._skipTimeout);
      this._skipTimeout = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      this._engine.canvas.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
