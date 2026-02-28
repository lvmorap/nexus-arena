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
import { AdvancedDynamicTexture, TextBlock, StackPanel, Rectangle } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { RuleMutation } from '../ai/FluxEngine';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export interface TransitionData {
  roundCompleted: number;
  playerScore: number;
  aiScore: number;
  mutations: RuleMutation[];
  nextRoundName: string;
}

export class TransitionScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _onComplete: (() => void) | null = null;
  private _animationTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.02, 0.01, 0.04, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(data: TransitionData, onComplete: () => void): void {
    this._onComplete = onComplete;
    this._buildBackground();
    this._buildUI(data);
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
      camera.alpha += 0.003;
    });

    const light = new HemisphericLight('transLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.3;
    light.diffuse = new Color3(0.2, 0.1, 0.3);

    const glow = new GlowLayer('transGlow', this._scene);
    glow.intensity = 0.8;

    // Data flow visualization: floating orbs that pulse
    const purpleRgb = hexToRgb(COLORS.NEXARI_PURPLE);
    const cyanRgb = hexToRgb(COLORS.NEXARI_CYAN);
    for (let i = 0; i < 20; i++) {
      const orb = MeshBuilder.CreateSphere(`dataOrb_${i}`, { diameter: 0.2 + Math.random() * 0.3 }, this._scene);
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 8;
      orb.position = new Vector3(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * dist
      );
      const orbMat = new StandardMaterial(`dataOrbMat_${i}`, this._scene);
      const useCyan = Math.random() > 0.5;
      orbMat.emissiveColor = useCyan
        ? new Color3(cyanRgb.r, cyanRgb.g, cyanRgb.b)
        : new Color3(purpleRgb.r, purpleRgb.g, purpleRgb.b);
      orbMat.disableLighting = true;
      orb.material = orbMat;

      // Animate orbit
      const speed = 0.001 + Math.random() * 0.002;
      const ySpeed = 0.0005 + Math.random() * 0.001;
      this._scene.registerBeforeRender(() => {
        const time = performance.now() * speed;
        orb.position.x = Math.cos(time + angle) * dist;
        orb.position.z = Math.sin(time + angle) * dist;
        orb.position.y += Math.sin(performance.now() * ySpeed) * 0.002;
      });
    }

    // Stars
    for (let i = 0; i < 80; i++) {
      const star = MeshBuilder.CreateSphere(`tStar_${i}`, { diameter: 0.06 + Math.random() * 0.08 }, this._scene);
      star.position = new Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40 + 10,
        (Math.random() - 0.5) * 60
      );
      const sMat = new StandardMaterial(`tStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(0.7, 0.7, 1);
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(data: TransitionData): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('transUI', true, this._scene);

    const panel = new StackPanel('transPanel');
    panel.width = '600px';
    panel.isVertical = true;
    this._guiTexture.addControl(panel);

    // Round complete header
    const header = new TextBlock('roundComplete');
    header.text = `ROUND ${data.roundCompleted} COMPLETE`;
    header.color = COLORS.NEXARI_GOLD;
    header.fontSize = 40;
    header.fontFamily = 'Orbitron, sans-serif';
    header.height = '70px';
    header.alpha = 0;
    panel.addControl(header);

    // Score
    const scoreText = new TextBlock('transScore');
    scoreText.text = `YOU: ${data.playerScore}  |  NEXARI: ${data.aiScore}`;
    scoreText.color = COLORS.NEXARI_CYAN;
    scoreText.fontSize = 28;
    scoreText.fontFamily = 'Orbitron, sans-serif';
    scoreText.height = '50px';
    scoreText.alpha = 0;
    panel.addControl(scoreText);

    // Spacer
    const spacer1 = new Rectangle('tSpacer1');
    spacer1.height = '30px';
    spacer1.thickness = 0;
    panel.addControl(spacer1);

    // Data analysis text
    const analysisText = new TextBlock('analysis');
    analysisText.text = '⟡ ANALYZING YOUR PATTERNS... ⟡';
    analysisText.color = COLORS.NEXARI_PURPLE;
    analysisText.fontSize = 22;
    analysisText.fontFamily = 'Rajdhani, sans-serif';
    analysisText.height = '40px';
    analysisText.alpha = 0;
    panel.addControl(analysisText);

    // Spacer
    const spacer2 = new Rectangle('tSpacer2');
    spacer2.height = '20px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Mutation reveals (hidden initially)
    const mutationTexts: TextBlock[] = [];
    if (data.mutations.length > 0) {
      const mutHeader = new TextBlock('mutHeader');
      mutHeader.text = 'RULES HAVE BEEN REWRITTEN:';
      mutHeader.color = COLORS.DANGER;
      mutHeader.fontSize = 24;
      mutHeader.fontFamily = 'Orbitron, sans-serif';
      mutHeader.height = '45px';
      mutHeader.alpha = 0;
      panel.addControl(mutHeader);
      mutationTexts.push(mutHeader);

      for (const mut of data.mutations) {
        const mutText = new TextBlock(`tMut_${mut.id}`);
        mutText.text = `▶ ${mut.displayName}\n   ${mut.description}`;
        mutText.color = mut.favoredPlayer === 'AI' ? COLORS.AI_MAGENTA : COLORS.NEXARI_CYAN;
        mutText.fontSize = 16;
        mutText.fontFamily = 'Rajdhani, sans-serif';
        mutText.height = '50px';
        mutText.textWrapping = true;
        mutText.alpha = 0;
        panel.addControl(mutText);
        mutationTexts.push(mutText);
      }
    } else {
      const noMut = new TextBlock('noMut');
      noMut.text = 'THE ARENA FOUND NO EXPLOITABLE PATTERNS... YET.';
      noMut.color = COLORS.NEUTRAL;
      noMut.fontSize = 18;
      noMut.fontFamily = 'Rajdhani, sans-serif';
      noMut.height = '40px';
      noMut.alpha = 0;
      panel.addControl(noMut);
      mutationTexts.push(noMut);
    }

    // Spacer
    const spacer3 = new Rectangle('tSpacer3');
    spacer3.height = '30px';
    spacer3.thickness = 0;
    panel.addControl(spacer3);

    // Next round text
    const nextText = new TextBlock('nextRound');
    nextText.text = `ENTERING: ${data.nextRoundName}`;
    nextText.color = COLORS.NEXARI_GOLD;
    nextText.fontSize = 24;
    nextText.fontFamily = 'Orbitron, sans-serif';
    nextText.height = '50px';
    nextText.alpha = 0;
    panel.addControl(nextText);

    // Animated reveals
    const t1 = setTimeout(() => { header.alpha = 1; }, 300);
    const t2 = setTimeout(() => { scoreText.alpha = 1; }, 800);
    const t3 = setTimeout(() => { analysisText.alpha = 1; }, 1500);

    this._animationTimers.push(t1, t2, t3);

    // Reveal mutations one by one
    let delay = 2500;
    for (const mt of mutationTexts) {
      const t = setTimeout(() => { mt.alpha = 1; }, delay);
      this._animationTimers.push(t);
      delay += 700;
    }

    // Next round reveal
    const tNext = setTimeout(() => { nextText.alpha = 1; }, delay + 500);
    this._animationTimers.push(tNext);

    // Auto-advance
    const tAdvance = setTimeout(() => {
      if (this._onComplete) {
        this._onComplete();
      }
    }, delay + 3000);
    this._animationTimers.push(tAdvance);
  }

  public dispose(): void {
    for (const t of this._animationTimers) {
      clearTimeout(t);
    }
    this._animationTimers = [];
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
