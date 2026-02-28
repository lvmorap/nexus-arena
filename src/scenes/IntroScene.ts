import {
  Scene,
  Color4,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
  ArcRotateCamera,
  GlowLayer,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

const INTRO_LINES = [
  '> NEXARI TRANSMISSION RECEIVED',
  `> EARTH DATE: ${new Date().toISOString().split('T')[0]}`,
  '',
  '> 3.7 BILLION HUMANS RECEIVED THE SAME DREAM SIMULTANEOUSLY.',
  '> THREE SILHOUETTES ABOVE THE BURNING REMAINS OF MARS.',
  '',
  '> D\'ANIELOR KASTHELLANOX — THE STRATEGIST',
  '> XEBASTHIAAN DU\'QAE — THE JUDGE',
  '> ITHALOKK KAPAS\'SOX — THE ARCHITECT OF CHAOS',
  '',
  '> "PARTICIPATION IS MANDATORY. DEFEAT IS RELOCATION.',
  '>  VICTORY IS... INTERESTING."',
  '',
  '> HUMANITY HAS BEEN SELECTED.',
  '> THE TRIAL BEGINS NOW.',
  '',
  '> YOU WILL COMPETE IN THREE ROUNDS.',
  '> THE RULES WILL CHANGE BASED ON HOW YOU PLAY.',
  '> YOUR MASTERY REWRITES THE COMPETITION.',
  '',
  '> WIN, AND EARTH ENDURES.',
  '> LOSE, AND EARTH SHALL BE RELOCATED.',
  '',
  '> INITIATING NEXUS ARENA...',
];

export class IntroScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _onComplete: (() => void) | null = null;
  private _currentLine = 0;
  private _currentChar = 0;
  private _lineTexts: TextBlock[] = [];
  private _typingInterval: ReturnType<typeof setInterval> | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _clickHandler: (() => void) | null = null;
  private _canSkip = false;
  private _skipTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isComplete = false;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.008, 0.004, 0.02, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(onComplete: () => void): void {
    this._onComplete = onComplete;
    this._buildBackground();
    this._buildUI();
    this._startTypewriter();
    this._setupSkipInput();
    logger.info('IntroScene setup complete');
  }

  private _buildBackground(): void {
    const camera = new ArcRotateCamera(
      'introCam',
      0,
      Math.PI / 2.5,
      40,
      Vector3.Zero(),
      this._scene
    );
    camera.lowerRadiusLimit = 40;
    camera.upperRadiusLimit = 40;

    this._scene.registerBeforeRender(() => {
      camera.alpha += 0.0005;
    });

    const light = new HemisphericLight('introLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.15;
    light.diffuse = new Color3(0.1, 0.15, 0.3);

    const glow = new GlowLayer('introGlow', this._scene);
    glow.intensity = 0.5;

    // Distant stars
    for (let i = 0; i < 250; i++) {
      const star = MeshBuilder.CreateSphere(
        `introStar_${i}`,
        { diameter: 0.06 + Math.random() * 0.1 },
        this._scene
      );
      star.position = new Vector3(
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 120
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

    // Small Earth in the distance
    const earth = MeshBuilder.CreateSphere('introEarth', { diameter: 3, segments: 16 }, this._scene);
    earth.position = new Vector3(15, 5, -20);
    const earthMat = new StandardMaterial('introEarthMat', this._scene);
    const blue = hexToRgb(COLORS.NEBULA_BLUE);
    earthMat.diffuseColor = new Color3(0.1, 0.3, 0.6);
    earthMat.emissiveColor = new Color3(blue.r * 0.3, blue.g * 0.3, blue.b + 0.1);
    earth.material = earthMat;

    this._scene.registerBeforeRender(() => {
      earth.rotation.y += 0.003;
    });

    // Nexari signal orb (pulsing)
    const signal = MeshBuilder.CreateIcoSphere(
      'introSignal',
      { radius: 0.8, subdivisions: 2 },
      this._scene
    );
    signal.position = new Vector3(-10, 3, -15);
    const sigMat = new StandardMaterial('introSigMat', this._scene);
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);
    sigMat.emissiveColor = new Color3(purple.r, purple.g, purple.b);
    sigMat.alpha = 0.7;
    signal.material = sigMat;

    this._scene.registerBeforeRender(() => {
      const t = performance.now() * 0.002;
      signal.scaling.setAll(0.8 + Math.sin(t) * 0.2);
      signal.rotation.y += 0.02;
    });
  }

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('introUI', true, this._scene);

    // Dark overlay for readability
    const overlay = new Rectangle('overlay');
    overlay.width = '100%';
    overlay.height = '100%';
    overlay.background = 'black';
    overlay.alpha = 0.4;
    overlay.thickness = 0;
    this._guiTexture.addControl(overlay);

    // Terminal-style text area
    const yStart = -200;
    for (let i = 0; i < INTRO_LINES.length; i++) {
      const line = new TextBlock(`introLine_${i}`);
      line.text = '';
      line.color = COLORS.SUCCESS;
      line.fontSize = 20;
      line.fontFamily = 'Rajdhani, monospace';
      line.top = `${yStart + i * 30}px`;
      line.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      line.paddingLeft = '15%';
      line.alpha = 0;
      this._guiTexture.addControl(line);
      this._lineTexts.push(line);
    }

    // Skip prompt (shows after 1.5s)
    const skipText = new TextBlock('skip');
    skipText.text = 'Press any key to skip...';
    skipText.color = COLORS.NEUTRAL;
    skipText.fontSize = 14;
    skipText.fontFamily = 'Rajdhani, sans-serif';
    skipText.top = '45%';
    skipText.alpha = 0;
    this._guiTexture.addControl(skipText);

    this._skipTimeout = setTimeout(() => {
      skipText.alpha = 0.4;
      this._canSkip = true;
    }, 1500);
  }

  private _startTypewriter(): void {
    this._typingInterval = setInterval(() => {
      if (this._currentLine >= INTRO_LINES.length) {
        this._finishTypewriter();
        return;
      }

      const currentLineText = INTRO_LINES[this._currentLine];
      const textBlock = this._lineTexts[this._currentLine];

      if (currentLineText === '') {
        // Empty line — just skip
        textBlock.alpha = 1;
        this._currentLine++;
        this._currentChar = 0;
        return;
      }

      textBlock.alpha = 1;
      this._currentChar++;
      textBlock.text = currentLineText.slice(0, this._currentChar);

      if (this._currentChar >= currentLineText.length) {
        this._currentLine++;
        this._currentChar = 0;
      }
    }, 40);
  }

  private _finishTypewriter(): void {
    if (this._typingInterval) {
      clearInterval(this._typingInterval);
      this._typingInterval = null;
    }

    // Show all remaining text immediately
    for (let i = 0; i < INTRO_LINES.length; i++) {
      this._lineTexts[i].text = INTRO_LINES[i];
      this._lineTexts[i].alpha = 1;
    }

    // Auto-proceed after 2s
    setTimeout(() => {
      this._complete();
    }, 2000);
  }

  private _setupSkipInput(): void {
    this._keyHandler = (): void => {
      if (!this._canSkip) return;
      this._complete();
    };
    window.addEventListener('keydown', this._keyHandler);

    this._clickHandler = (): void => {
      if (!this._canSkip) return;
      this._complete();
    };
    this._engine.canvas.addEventListener('click', this._clickHandler);
  }

  private _complete(): void {
    if (this._isComplete) return;
    this._isComplete = true;
    this._removeInputHandlers();
    if (this._typingInterval) {
      clearInterval(this._typingInterval);
      this._typingInterval = null;
    }
    if (this._onComplete) this._onComplete();
  }

  private _removeInputHandlers(): void {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      this._engine.canvas.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
  }

  public dispose(): void {
    this._removeInputHandlers();
    if (this._typingInterval) {
      clearInterval(this._typingInterval);
      this._typingInterval = null;
    }
    if (this._skipTimeout) {
      clearTimeout(this._skipTimeout);
      this._skipTimeout = null;
    }
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
