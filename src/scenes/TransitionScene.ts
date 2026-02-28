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
import {
  AdvancedDynamicTexture,
  TextBlock,
  StackPanel,
  Rectangle,
} from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { RuleMutation } from '../ai/FluxEngine';
import { VillainMeshFactory } from '../entities/VillainMeshFactory';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export class TransitionScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _clickHandler: (() => void) | null = null;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.012, 0.004, 0.03, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(
    roundLabel: string,
    playerScore: number,
    aiScore: number,
    mutations: RuleMutation[],
    onContinue: () => void
  ): void {
    this._buildBackground();
    this._buildUI(roundLabel, playerScore, aiScore, mutations, onContinue);
    logger.info('TransitionScene setup complete');
  }

  private _buildBackground(): void {
    const camera = new ArcRotateCamera(
      'transCam',
      0,
      Math.PI / 3,
      20,
      Vector3.Zero(),
      this._scene
    );
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 20;

    this._scene.registerBeforeRender(() => {
      camera.alpha += 0.002;
    });

    const light = new HemisphericLight(
      'transLight',
      new Vector3(0, 1, 0),
      this._scene
    );
    light.intensity = 0.3;
    light.diffuse = new Color3(0.2, 0.1, 0.4);

    const glow = new GlowLayer('transGlow', this._scene);
    glow.intensity = 0.6;

    // Floating data orb (represents FluxEngine analyzing)
    const orb = MeshBuilder.CreateIcoSphere(
      'dataOrb',
      { radius: 1.5, subdivisions: 3 },
      this._scene
    );
    orb.position = new Vector3(0, 0, 0);
    const orbMat = new StandardMaterial('dataOrbMat', this._scene);
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);
    orbMat.emissiveColor = new Color3(purple.r, purple.g, purple.b);
    orbMat.diffuseColor = new Color3(
      purple.r * 0.3,
      purple.g * 0.3,
      purple.b * 0.3
    );
    orbMat.alpha = 0.7;
    orb.material = orbMat;

    this._scene.registerBeforeRender(() => {
      orb.rotation.y += 0.01;
      orb.rotation.x += 0.005;
    });

    // Ring around orb
    const ring = MeshBuilder.CreateTorus(
      'dataRing',
      { diameter: 4, thickness: 0.12, tessellation: 32 },
      this._scene
    );
    const ringMat = new StandardMaterial('dataRingMat', this._scene);
    const cyan = hexToRgb(COLORS.NEXARI_CYAN);
    ringMat.emissiveColor = new Color3(cyan.r, cyan.g, cyan.b);
    ringMat.disableLighting = true;
    ring.material = ringMat;

    this._scene.registerBeforeRender(() => {
      ring.rotation.x += 0.008;
      ring.rotation.z += 0.003;
    });

    // Stars
    for (let i = 0; i < 80; i++) {
      const star = MeshBuilder.CreateSphere(
        `tStar_${i}`,
        { diameter: 0.06 + Math.random() * 0.08 },
        this._scene
      );
      star.position = new Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40 + 5,
        (Math.random() - 0.5) * 60
      );
      const sMat = new StandardMaterial(`tStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(0.7, 0.7, 1);
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(
    roundLabel: string,
    playerScore: number,
    aiScore: number,
    mutations: RuleMutation[],
    onContinue: () => void
  ): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'transUI',
      true,
      this._scene
    );

    const panel = new StackPanel('transPanel');
    panel.width = '600px';
    panel.isVertical = true;
    this._guiTexture.addControl(panel);

    // Round complete header
    const header = new TextBlock('header');
    header.text = `${roundLabel} COMPLETE`;
    header.color = COLORS.NEXARI_CYAN;
    header.fontSize = 36;
    header.fontFamily = 'Orbitron, sans-serif';
    header.height = '70px';
    panel.addControl(header);

    // Score
    const scoreText = new TextBlock('score');
    scoreText.text = `YOU: ${playerScore}  —  NEXARI: ${aiScore}`;
    scoreText.color = COLORS.NEXARI_GOLD;
    scoreText.fontSize = 24;
    scoreText.fontFamily = 'Orbitron, sans-serif';
    scoreText.height = '50px';
    panel.addControl(scoreText);

    // Spacer
    const spacer1 = new Rectangle('spacer1');
    spacer1.height = '30px';
    spacer1.thickness = 0;
    panel.addControl(spacer1);

    // Mutations header
    if (mutations.length > 0) {
      const mutHeader = new TextBlock('mutHeader');
      mutHeader.text = 'RULES HAVE BEEN REWRITTEN';
      mutHeader.color = COLORS.NEXARI_PURPLE;
      mutHeader.fontSize = 22;
      mutHeader.fontFamily = 'Orbitron, sans-serif';
      mutHeader.height = '45px';
      panel.addControl(mutHeader);

      // D'Anielor's dialogue during FluxEngine mutation reveal
      // D'Anielor's Eye of the Void icon during mutation reveal
      VillainMeshFactory.createEyeOfTheVoid(this._scene, new Vector3(0, 3, -5));

      const danielorText = new TextBlock('danielor');
      danielorText.text = '"YOUR PATTERN IS NOTED. THE ARENA HAS BEEN INFORMED." — D\'ANIELOR';
      danielorText.color = COLORS.NEXARI_GOLD;
      danielorText.fontSize = 13;
      danielorText.fontFamily = 'Rajdhani, sans-serif';
      danielorText.height = '30px';
      danielorText.alpha = 0;
      panel.addControl(danielorText);

      setTimeout(() => {
        danielorText.alpha = 0.7;
      }, 600);

      // Show mutations one by one with staggered delay
      for (let i = 0; i < mutations.length; i++) {
        const mut = mutations[i];
        const mutText = new TextBlock(`mut_${mut.id}`);
        mutText.text = `⚡ ${mut.displayName} — ${mut.description}`;
        mutText.color = COLORS.NEUTRAL;
        mutText.fontSize = 16;
        mutText.fontFamily = 'Rajdhani, sans-serif';
        mutText.height = '35px';
        mutText.alpha = 0;
        panel.addControl(mutText);

        // Stagger reveal
        setTimeout(() => {
          mutText.alpha = 1;
        }, 1000 + i * 800);
      }
    } else {
      const noMut = new TextBlock('noMut');
      noMut.text = 'The Nexari observe your patterns...';
      noMut.color = COLORS.NEUTRAL;
      noMut.fontSize = 18;
      noMut.fontFamily = 'Rajdhani, sans-serif';
      noMut.height = '40px';
      noMut.alpha = 0.7;
      panel.addControl(noMut);
    }

    // Spacer
    const spacer2 = new Rectangle('spacer2');
    spacer2.height = '40px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Continue prompt (appears after delay)
    const continueText = new TextBlock('continue');
    continueText.text = 'PRESS SPACE OR CLICK TO CONTINUE';
    continueText.color = COLORS.NEXARI_CYAN;
    continueText.fontSize = 18;
    continueText.fontFamily = 'Rajdhani, sans-serif';
    continueText.height = '40px';
    continueText.alpha = 0;
    panel.addControl(continueText);

    const revealDelay = 2000 + mutations.length * 800;
    let canContinue = false;

    setTimeout(() => {
      continueText.alpha = 0.8;
      canContinue = true;
    }, revealDelay);

    // Input handling
    this._keyHandler = (e: KeyboardEvent): void => {
      if (!canContinue) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        this._removeInputHandlers();
        onContinue();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    this._clickHandler = (): void => {
      if (!canContinue) return;
      this._removeInputHandlers();
      onContinue();
    };
    this._engine.canvas.addEventListener('click', this._clickHandler);
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
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
