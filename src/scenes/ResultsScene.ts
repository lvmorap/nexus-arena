import { Scene, Color4, Vector3, MeshBuilder, StandardMaterial, Color3, HemisphericLight, ArcRotateCamera, GlowLayer } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Button, StackPanel, Rectangle } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { FluxArenaScore } from '../minigames/FluxArena/FluxArenaGame';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';
import { RuleMutation } from '../ai/FluxEngine';

export class ResultsScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _onRestart: (() => void) | null = null;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.012, 0.004, 0.03, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(
    score: FluxArenaScore,
    mutations: RuleMutation[],
    onRestart: () => void
  ): void {
    this._onRestart = onRestart;
    this._buildBackground();
    this._buildUI(score, mutations);
    logger.info('ResultsScene setup complete');
  }

  private _buildBackground(): void {
    const camera = new ArcRotateCamera('resultsCam', 0, Math.PI / 3, 25, Vector3.Zero(), this._scene);
    camera.lowerRadiusLimit = 25;
    camera.upperRadiusLimit = 25;

    this._scene.registerBeforeRender(() => {
      camera.alpha += 0.001;
    });

    const light = new HemisphericLight('resultsLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.4;

    const glow = new GlowLayer('resultsGlow', this._scene);
    glow.intensity = 0.6;

    // Earth sphere
    const earth = MeshBuilder.CreateSphere('earth', { diameter: 5, segments: 24 }, this._scene);
    earth.position = new Vector3(0, 0, 0);
    const earthMat = new StandardMaterial('earthMat', this._scene);
    const blueRgb = hexToRgb(COLORS.NEBULA_BLUE);
    earthMat.diffuseColor = new Color3(0.1, 0.3, 0.6);
    earthMat.emissiveColor = new Color3(blueRgb.r * 0.5, blueRgb.g * 0.5, blueRgb.b + 0.2);
    earthMat.specularColor = new Color3(0.3, 0.3, 0.5);
    earth.material = earthMat;

    this._scene.registerBeforeRender(() => {
      earth.rotation.y += 0.005;
    });

    // Stars
    for (let i = 0; i < 100; i++) {
      const star = MeshBuilder.CreateSphere(`rStar_${i}`, { diameter: 0.06 + Math.random() * 0.08 }, this._scene);
      star.position = new Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40 + 5,
        (Math.random() - 0.5) * 60
      );
      const sMat = new StandardMaterial(`rStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(0.7, 0.7, 1);
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(score: FluxArenaScore, mutations: RuleMutation[]): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('resultsUI', true, this._scene);

    const panel = new StackPanel('resultsPanel');
    panel.width = '600px';
    panel.isVertical = true;
    this._guiTexture.addControl(panel);

    const playerWins = score.player > score.ai;
    const closeMatch = Math.abs(score.player - score.ai) <= 1;

    // Outcome header
    const outcomeText = new TextBlock('outcome');
    if (playerWins) {
      outcomeText.text = 'HUMANITY ENDURES.';
      outcomeText.color = COLORS.SUCCESS;
    } else if (closeMatch) {
      outcomeText.text = 'THE NEXARI ARE... IMPRESSED.';
      outcomeText.color = COLORS.NEXARI_GOLD;
    } else {
      outcomeText.text = 'EARTH SHALL BE RELOCATED.';
      outcomeText.color = COLORS.DANGER;
    }
    outcomeText.fontSize = 36;
    outcomeText.fontFamily = 'Orbitron, sans-serif';
    outcomeText.height = '80px';
    panel.addControl(outcomeText);

    // Subtitle
    const subtitleText = new TextBlock('subtitle');
    if (playerWins) {
      subtitleText.text = 'The Nexari bow before humanity\'s champion.';
    } else if (closeMatch) {
      subtitleText.text = 'A special dialogue has been earned. Earth\'s fate hangs in balance.';
    } else {
      subtitleText.text = 'Earth\'s hologram dims as the relocation begins.';
    }
    subtitleText.color = COLORS.NEUTRAL;
    subtitleText.fontSize = 18;
    subtitleText.fontFamily = 'Rajdhani, sans-serif';
    subtitleText.height = '50px';
    subtitleText.alpha = 0.8;
    panel.addControl(subtitleText);

    // Spacer
    const spacer1 = new Rectangle('spacer1');
    spacer1.height = '30px';
    spacer1.thickness = 0;
    panel.addControl(spacer1);

    // Score
    const scoreText = new TextBlock('finalScore');
    scoreText.text = `FINAL SCORE: YOU ${score.player} — NEXARI ${score.ai}`;
    scoreText.color = COLORS.NEXARI_CYAN;
    scoreText.fontSize = 28;
    scoreText.fontFamily = 'Orbitron, sans-serif';
    scoreText.height = '50px';
    panel.addControl(scoreText);

    // Stats
    const statsText = new TextBlock('stats');
    const statsLines: string[] = [];
    statsLines.push(`RULES TRIGGERED: ${mutations.length}`);
    if (score.knockoffs > 0 || score.selfKOs > 0) {
      statsLines.push(`Knockoffs: ${score.knockoffs}  |  Self-KOs: ${score.selfKOs}`);
    }
    if (score.fluxEventsExploited > 0) {
      statsLines.push(`Flux Events Exploited: ${score.fluxEventsExploited}`);
    }
    statsLines.push('Three rounds of adaptive competition complete.');
    statsText.text = statsLines.join('  |  ');
    statsText.color = COLORS.NEUTRAL;
    statsText.fontSize = 14;
    statsText.fontFamily = 'Rajdhani, sans-serif';
    statsText.height = '40px';
    statsText.textWrapping = true;
    panel.addControl(statsText);

    // Spacer
    const spacer2 = new Rectangle('spacer2');
    spacer2.height = '20px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Mutations summary
    if (mutations.length > 0) {
      const mutHeader = new TextBlock('mutHeader');
      mutHeader.text = 'THE ARENA LEARNED:';
      mutHeader.color = COLORS.NEXARI_PURPLE;
      mutHeader.fontSize = 20;
      mutHeader.fontFamily = 'Orbitron, sans-serif';
      mutHeader.height = '40px';
      panel.addControl(mutHeader);

      for (const mut of mutations) {
        const mutText = new TextBlock(`mut_${mut.id}`);
        const favorIcon = mut.favoredPlayer === 'PLAYER' ? '▲' : mut.favoredPlayer === 'AI' ? '▼' : '◆';
        mutText.text = `${favorIcon} ${mut.displayName} — ${mut.description}`;
        mutText.color = mut.favoredPlayer === 'PLAYER' ? COLORS.SUCCESS
          : mut.favoredPlayer === 'AI' ? COLORS.DANGER
          : COLORS.NEUTRAL;
        mutText.fontSize = 14;
        mutText.fontFamily = 'Rajdhani, sans-serif';
        mutText.height = '30px';
        mutText.alpha = 0.8;
        panel.addControl(mutText);
      }

      // Reflective debrief
      const debriefSpacer = new Rectangle('debriefSpacer');
      debriefSpacer.height = '10px';
      debriefSpacer.thickness = 0;
      panel.addControl(debriefSpacer);

      const playerFavorCount = mutations.filter((m) => m.favoredPlayer === 'PLAYER').length;
      const aiFavorCount = mutations.filter((m) => m.favoredPlayer === 'AI').length;
      const debriefText = new TextBlock('debrief');
      if (aiFavorCount > playerFavorCount) {
        debriefText.text = 'Your patterns were exploited. The arena adapted against you.';
      } else if (playerFavorCount > aiFavorCount) {
        debriefText.text = 'Your skill unlocked advantages. The arena rewarded your mastery.';
      } else {
        debriefText.text = 'A balanced showing. The arena could not predict you.';
      }
      debriefText.color = COLORS.NEXARI_GOLD;
      debriefText.fontSize = 15;
      debriefText.fontFamily = 'Rajdhani, sans-serif';
      debriefText.height = '35px';
      debriefText.alpha = 0.9;
      panel.addControl(debriefText);

      // D'Anielor quote
      const danielorQuote = new TextBlock('danielorQuote');
      danielorQuote.text =
        '"PREDICTABILITY IS A FORM OF SURRENDER." — D\'ANIELOR KASTHELLANOX';
      danielorQuote.color = COLORS.NEXARI_GOLD;
      danielorQuote.fontSize = 13;
      danielorQuote.fontFamily = 'Rajdhani, sans-serif';
      danielorQuote.height = '25px';
      danielorQuote.alpha = 0.6;
      panel.addControl(danielorQuote);
    }

    // Previous Human Competitions section
    const prevSpacer = new Rectangle('prevSpacer');
    prevSpacer.height = '15px';
    prevSpacer.thickness = 0;
    panel.addControl(prevSpacer);

    const prevHeader = new TextBlock('prevHeader');
    prevHeader.text = 'PREVIOUS HUMAN COMPETITIONS OBSERVED BY THE NEXARI:';
    prevHeader.color = COLORS.SUCCESS;
    prevHeader.fontSize = 12;
    prevHeader.fontFamily = 'Rajdhani, monospace';
    prevHeader.height = '25px';
    prevHeader.alpha = 0.7;
    panel.addControl(prevHeader);

    const prevBlind = new TextBlock('prevBlind');
    prevBlind.text = '→ Experiment #7,441-B: Blind Pool in Darkness   [BLIND BREAK]';
    prevBlind.color = COLORS.SUCCESS;
    prevBlind.fontSize = 11;
    prevBlind.fontFamily = 'Rajdhani, monospace';
    prevBlind.height = '20px';
    prevBlind.alpha = 0.5;
    panel.addControl(prevBlind);

    const prevFusion = new TextBlock('prevFusion');
    prevFusion.text = '→ Experiment #7,441-C: Voluntary Rule Dissolution [FUSIONBOTS ARENA]';
    prevFusion.color = COLORS.SUCCESS;
    prevFusion.fontSize = 11;
    prevFusion.fontFamily = 'Rajdhani, monospace';
    prevFusion.height = '20px';
    prevFusion.alpha = 0.5;
    panel.addControl(prevFusion);

    // Spacer
    const spacer3 = new Rectangle('spacer3');
    spacer3.height = '40px';
    spacer3.thickness = 0;
    panel.addControl(spacer3);

    // Play again button
    const restartBtn = Button.CreateSimpleButton('restartBtn', 'PLAY AGAIN');
    restartBtn.width = '300px';
    restartBtn.height = '55px';
    restartBtn.color = COLORS.NEXARI_CYAN;
    restartBtn.fontSize = 22;
    restartBtn.fontFamily = 'Orbitron, sans-serif';
    restartBtn.cornerRadius = 5;
    restartBtn.thickness = 2;
    restartBtn.background = 'transparent';
    restartBtn.hoverCursor = 'pointer';
    restartBtn.onPointerEnterObservable.add(() => {
      restartBtn.background = COLORS.NEXARI_CYAN + '22';
    });
    restartBtn.onPointerOutObservable.add(() => {
      restartBtn.background = 'transparent';
    });
    restartBtn.onPointerUpObservable.add(() => {
      if (this._onRestart) this._onRestart();
    });
    panel.addControl(restartBtn);

    // Return to menu button
    const menuBtn = Button.CreateSimpleButton('menuBtn', 'RETURN TO MENU');
    menuBtn.width = '300px';
    menuBtn.height = '45px';
    menuBtn.color = COLORS.NEUTRAL;
    menuBtn.fontSize = 18;
    menuBtn.fontFamily = 'Rajdhani, sans-serif';
    menuBtn.cornerRadius = 5;
    menuBtn.thickness = 1;
    menuBtn.background = 'transparent';
    menuBtn.hoverCursor = 'pointer';
    menuBtn.onPointerUpObservable.add(() => {
      if (this._onRestart) this._onRestart();
    });
    panel.addControl(menuBtn);

    // Credits with Nexari Judges
    const creditsSpacer = new Rectangle('creditsSpacer');
    creditsSpacer.height = '20px';
    creditsSpacer.thickness = 0;
    panel.addControl(creditsSpacer);

    const creditsText = new TextBlock('credits');
    creditsText.text =
      'NEXARI JUDGES: D\'Anielor Kasthellanox · Xebasthiaan Du\'Qae · Ithalokk Kapas\'Sox';
    creditsText.color = COLORS.NEUTRAL;
    creditsText.fontSize = 11;
    creditsText.fontFamily = 'Rajdhani, sans-serif';
    creditsText.height = '20px';
    creditsText.alpha = 0.4;
    panel.addControl(creditsText);
  }

  public dispose(): void {
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
