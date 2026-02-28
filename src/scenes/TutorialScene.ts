import {
  Scene,
  Color4,
  Vector3,
  HemisphericLight,
  FreeCamera,
  Color3,
  GlowLayer,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, StackPanel, Ellipse } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

interface TutorialStep {
  title: string;
  text: string;
  minDurationMs: number;
}

const STEPS: TutorialStep[] = [
  {
    title: 'THE ARENA',
    text: 'WELCOME, HUMAN CHAMPION.\nYOU STAND IN THE NEXUS ARENA — WHERE ALIEN SPORTS\nDETERMINE THE FATE OF CIVILIZATIONS.',
    minDurationMs: 3000,
  },
  {
    title: 'DARK SHOT DEMO',
    text: 'YOUR SHOT IS YOUR ONLY LIGHT.\nIN DARKNESS, AIM WITH INSTINCT.\nCLICK AND DRAG TO LAUNCH YOUR SHOT.',
    minDurationMs: 3000,
  },
  {
    title: 'FLUX ARENA DEMO',
    text: 'THE ARENA WATCHES. THE RULES CHANGE.\nADAPT TO SHIFTING GRAVITY, WALLS, AND HAZARDS.\nUSE WASD + SPACE TO MOVE AND DODGE.',
    minDurationMs: 3000,
  },
  {
    title: 'FLUX ENGINE REVEAL',
    text: 'EVERY MOVE YOU MAKE IS ANALYZED.\nTHE NEXARI FLUX ENGINE ADAPTS THE GAME\nTO CHALLENGE YOUR STRENGTHS.',
    minDurationMs: 3000,
  },
  {
    title: 'MIRROR RACE INTRO',
    text: 'YOUR GREATEST OPPONENT IS YOUR OWN PATTERN.\nRACE AGAINST AN AI GHOST THAT MIRRORS YOUR STYLE.\nUSE A/D TO STEER. OUTRUN YOURSELF.',
    minDurationMs: 3000,
  },
];

export class TutorialScene {
  private _scene: Scene;
  private _engine: Engine;
  private _gui: AdvancedDynamicTexture | null = null;
  private _currentStep = 0;
  private _steps: TutorialStep[] = STEPS;
  private _onComplete: (() => void) | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _canAdvance = false;
  private _advanceTimeout: ReturnType<typeof setTimeout> | null = null;
  private _pulseObserver: (() => void) | null = null;
  private _isComplete = false;

  // UI elements updated per step
  private _titleBlock!: TextBlock;
  private _textBlock!: TextBlock;
  private _spaceHint!: TextBlock;
  private _dots: Ellipse[] = [];
  private _stepLabel!: TextBlock;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.01, 0.005, 0.025, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(onComplete: () => void): void {
    this._onComplete = onComplete;
    this._buildBackground();
    this._buildUI();
    this._showStep(0);
    this._setupInput();
    logger.info('TutorialScene setup complete');
  }

  private _buildBackground(): void {
    const camera = new FreeCamera('tutCam', new Vector3(0, 2, -10), this._scene);
    camera.setTarget(Vector3.Zero());

    const light = new HemisphericLight('tutLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.3;
    light.diffuse = new Color3(0.15, 0.1, 0.3);

    const glow = new GlowLayer('tutGlow', this._scene);
    glow.intensity = 0.6;

    // Simple arena floor
    const floor = MeshBuilder.CreateGround('tutFloor', { width: 20, height: 20 }, this._scene);
    floor.position.y = -2;
    const floorMat = new StandardMaterial('tutFloorMat', this._scene);
    const floorRgb = hexToRgb(COLORS.ARENA_FLOOR);
    floorMat.diffuseColor = new Color3(floorRgb.r, floorRgb.g, floorRgb.b);
    floorMat.emissiveColor = new Color3(0.02, 0.04, 0.08);
    floor.material = floorMat;

    // Ambient stars
    for (let i = 0; i < 80; i++) {
      const star = MeshBuilder.CreateSphere(`tutStar_${i}`, { diameter: 0.06 + Math.random() * 0.08 }, this._scene);
      star.position = new Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40 + 10,
        (Math.random() - 0.5) * 60,
      );
      const sMat = new StandardMaterial(`tutStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1);
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(): void {
    this._gui = AdvancedDynamicTexture.CreateFullscreenUI('tutUI', true, this._scene);

    // Dark overlay
    const overlay = new Rectangle('tutOverlay');
    overlay.width = '100%';
    overlay.height = '100%';
    overlay.background = 'black';
    overlay.alpha = 0.5;
    overlay.thickness = 0;
    this._gui.addControl(overlay);

    const panel = new StackPanel('tutPanel');
    panel.isVertical = true;
    panel.width = '700px';
    this._gui.addControl(panel);

    // Step label (e.g. "STEP 1 / 5")
    this._stepLabel = new TextBlock('tutStepLabel');
    this._stepLabel.text = '';
    this._stepLabel.color = COLORS.NEXARI_GOLD;
    this._stepLabel.fontSize = 16;
    this._stepLabel.fontFamily = 'Rajdhani, sans-serif';
    this._stepLabel.height = '30px';
    this._stepLabel.alpha = 0.7;
    panel.addControl(this._stepLabel);

    // Title
    this._titleBlock = new TextBlock('tutTitle');
    this._titleBlock.text = '';
    this._titleBlock.color = COLORS.NEXARI_CYAN;
    this._titleBlock.fontSize = 42;
    this._titleBlock.fontFamily = 'Orbitron, sans-serif';
    this._titleBlock.height = '70px';
    panel.addControl(this._titleBlock);

    // Body text
    this._textBlock = new TextBlock('tutText');
    this._textBlock.text = '';
    this._textBlock.color = COLORS.NEUTRAL;
    this._textBlock.fontSize = 20;
    this._textBlock.fontFamily = 'Rajdhani, sans-serif';
    this._textBlock.height = '120px';
    this._textBlock.textWrapping = true;
    this._textBlock.lineSpacing = '6px';
    panel.addControl(this._textBlock);

    // Progress dots container
    const dotsPanel = new StackPanel('dotsPanel');
    dotsPanel.isVertical = false;
    dotsPanel.height = '30px';
    dotsPanel.width = '200px';
    panel.addControl(dotsPanel);

    for (let i = 0; i < this._steps.length; i++) {
      const dot = new Ellipse(`dot_${i}`);
      dot.width = '14px';
      dot.height = '14px';
      dot.color = COLORS.NEXARI_CYAN;
      dot.thickness = 2;
      dot.background = 'transparent';
      dot.paddingLeft = '6px';
      dot.paddingRight = '6px';
      dotsPanel.addControl(dot);
      this._dots.push(dot);
    }

    // Spacer
    const spacer = new Rectangle('tutSpacer');
    spacer.height = '30px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Space hint
    this._spaceHint = new TextBlock('spaceHint');
    this._spaceHint.text = '[ PRESS SPACE TO CONTINUE ]';
    this._spaceHint.color = COLORS.NEXARI_CYAN;
    this._spaceHint.fontSize = 16;
    this._spaceHint.fontFamily = 'Rajdhani, sans-serif';
    this._spaceHint.height = '30px';
    this._spaceHint.alpha = 0;
    panel.addControl(this._spaceHint);

    // ESC hint
    const escHint = new TextBlock('escHint');
    escHint.text = 'ESC to skip tutorial';
    escHint.color = COLORS.NEUTRAL;
    escHint.fontSize = 13;
    escHint.fontFamily = 'Rajdhani, sans-serif';
    escHint.height = '25px';
    escHint.alpha = 0.35;
    panel.addControl(escHint);

    // Pulse animation for space hint
    this._scene.registerBeforeRender(() => {
      if (this._canAdvance) {
        const t = performance.now() * 0.003;
        this._spaceHint.alpha = 0.5 + Math.sin(t) * 0.5;
      }
    });
  }

  private _showStep(index: number): void {
    this._currentStep = index;
    this._canAdvance = false;
    this._spaceHint.alpha = 0;

    const step = this._steps[index];
    this._stepLabel.text = `STEP ${index + 1} / ${this._steps.length}`;
    this._titleBlock.text = step.title;
    this._textBlock.text = step.text;

    // Update dots
    for (let i = 0; i < this._dots.length; i++) {
      this._dots[i].background = i <= index ? COLORS.NEXARI_CYAN : 'transparent';
    }

    // Enable advance after min duration
    if (this._advanceTimeout) {
      clearTimeout(this._advanceTimeout);
    }
    this._advanceTimeout = setTimeout(() => {
      this._canAdvance = true;
    }, step.minDurationMs);
  }

  private _advanceStep(): void {
    if (!this._canAdvance) return;
    const next = this._currentStep + 1;
    if (next >= this._steps.length) {
      this._complete();
    } else {
      this._showStep(next);
    }
  }

  private _setupInput(): void {
    this._keyHandler = (e: KeyboardEvent): void => {
      if (this._isComplete) return;
      if (e.code === 'Escape') {
        this._complete();
      } else if (e.code === 'Space') {
        this._advanceStep();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  private _complete(): void {
    if (this._isComplete) return;
    this._isComplete = true;
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._advanceTimeout) {
      clearTimeout(this._advanceTimeout);
      this._advanceTimeout = null;
    }
    if (this._onComplete) this._onComplete();
  }

  public dispose(): void {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._advanceTimeout) {
      clearTimeout(this._advanceTimeout);
      this._advanceTimeout = null;
    }
    if (this._gui) {
      this._gui.dispose();
      this._gui = null;
    }
    this._scene.dispose();
  }
}
