import '@babylonjs/core/Meshes/Builders/polygonBuilder';
import earcut from 'earcut';
(window as unknown as Record<string, unknown>).earcut = earcut;

import { Engine } from './core/Engine';
import { GameStateMachine } from './core/GameStateMachine';
import { InputManager } from './core/InputManager';
import { FluxEngine } from './ai/FluxEngine';
import { MenuScene } from './scenes/MenuScene';
import { IntroScene } from './scenes/IntroScene';
import { TransitionScene } from './scenes/TransitionScene';
import { ResultsScene } from './scenes/ResultsScene';
import { DarkShotGame, DarkShotScore } from './minigames/DarkShot/DarkShotGame';
import { FluxArenaGame, FluxArenaScore } from './minigames/FluxArena/FluxArenaGame';
import { MirrorRaceGame, MirrorRaceScore } from './minigames/MirrorRace/MirrorRaceGame';
import { GhostRecorder } from './minigames/MirrorRace/GhostRecorder';
import { logger } from './utils/Logger';

class NexusArena {
  private _engine: Engine;
  private _stateMachine: GameStateMachine;
  private _input: InputManager;
  private _fluxEngine: FluxEngine;
  private _ghostRecorder: GhostRecorder;

  // Track cumulative scores across mini-games
  private _totalPlayerScore = 0;
  private _totalAiScore = 0;
  private _playerLaneBias = 0;

  // Active scenes (only one at a time)
  private _menuScene: MenuScene | null = null;
  private _introScene: IntroScene | null = null;
  private _darkShotGame: DarkShotGame | null = null;
  private _transitionScene: TransitionScene | null = null;
  private _fluxArenaGame: FluxArenaGame | null = null;
  private _mirrorRaceGame: MirrorRaceGame | null = null;
  private _resultsScene: ResultsScene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._engine = new Engine(canvas);
    this._stateMachine = new GameStateMachine();
    this._input = new InputManager(canvas);
    this._fluxEngine = new FluxEngine();
    this._ghostRecorder = new GhostRecorder();

    this._engine.startRenderLoop();
  }

  public async start(): Promise<void> {
    logger.info('NEXUS ARENA starting...');
    this._showMenu();
  }

  private _showMenu(): void {
    this._disposeCurrentScenes();

    // Reset cumulative scores for new playthrough
    this._totalPlayerScore = 0;
    this._totalAiScore = 0;
    this._playerLaneBias = 0;
    this._fluxEngine = new FluxEngine();
    this._ghostRecorder = new GhostRecorder();

    this._stateMachine.transitionTo('MENU');
    this._menuScene = new MenuScene(this._engine);
    this._menuScene.setup(() => {
      this._showIntro();
    });
    this._engine.setScene(this._menuScene.scene);
  }

  /* ---- INTRO ---- */

  private _showIntro(): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('INTRO');
    this._introScene = new IntroScene(this._engine);
    this._introScene.setup(() => {
      this._startDarkShot();
    });
    this._engine.setScene(this._introScene.scene);
  }

  /* ---- ROUND 1: DARK SHOT ---- */

  private _startDarkShot(): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('DARK_SHOT');
    this._darkShotGame = new DarkShotGame(this._engine, this._input);
    this._darkShotGame.setup((score: DarkShotScore) => {
      this._onDarkShotComplete(score);
    });
    this._engine.setScene(this._darkShotGame.scene);
  }

  private _onDarkShotComplete(score: DarkShotScore): void {
    this._totalPlayerScore += score.player;
    this._totalAiScore += score.ai;

    // Feed DarkShot data into FluxEngine
    this._fluxEngine.updateDarkShotHistory({
      blindPockets: score.blindPockets,
      litPockets: score.litPockets,
      scratches: score.scratches,
      avgShotPower: score.avgShotPower,
      totalScore: score.player,
    });

    // Compute mutations that will affect FluxArena
    const mutations = this._fluxEngine.computeMutations();

    // Show transition before FluxArena
    this._showTransition('ROUND 1: DARK SHOT', score.player, score.ai, mutations, () => {
      this._startFluxArena();
    });
  }

  /* ---- TRANSITION ---- */

  private _showTransition(
    roundLabel: string,
    playerScore: number,
    aiScore: number,
    mutations: ReturnType<FluxEngine['computeMutations']>,
    onContinue: () => void
  ): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('TRANSITION');
    this._transitionScene = new TransitionScene(this._engine);
    this._transitionScene.setup(roundLabel, playerScore, aiScore, mutations, onContinue);
    this._engine.setScene(this._transitionScene.scene);
  }

  /* ---- ROUND 2: FLUX ARENA ---- */

  private _startFluxArena(): void {
    this._disposeCurrentScenes();

    // Get mutations computed from DarkShot performance
    const mutations = this._fluxEngine.computeMutations();

    this._stateMachine.transitionTo('FLUX_ARENA');
    this._fluxArenaGame = new FluxArenaGame(this._engine, this._input, mutations);
    this._fluxArenaGame.setup((score: FluxArenaScore) => {
      this._onFluxArenaComplete(score);
    });
    this._engine.setScene(this._fluxArenaGame.scene);
  }

  private _onFluxArenaComplete(score: FluxArenaScore): void {
    this._totalPlayerScore += score.player;
    this._totalAiScore += score.ai;

    // Update FluxEngine with FluxArena performance data
    const avgPos =
      score.positionSamples.length > 0
        ? score.positionSamples[0]
        : 0.5;

    this._fluxEngine.updateFluxArenaHistory({
      knockoffs: score.knockoffs,
      selfKOs: score.selfKOs,
      avgPositionFromCenter: avgPos,
      fluxEventsExploited: score.fluxEventsExploited,
      totalScore: score.player,
    });

    // Track player lane bias from FluxArena position for MirrorRace track generation
    this._playerLaneBias = avgPos > 0.5 ? 0.3 : -0.3;

    // Compute mutations for display
    const mutations = this._fluxEngine.computeMutations();

    // Show transition before MirrorRace
    this._showTransition('ROUND 2: FLUX ARENA', score.player, score.ai, mutations, () => {
      this._startMirrorRace();
    });
  }

  /* ---- ROUND 3: MIRROR RACE ---- */

  private _startMirrorRace(): void {
    this._disposeCurrentScenes();

    // Get mutations computed from DarkShot + FluxArena performance
    const mutations = this._fluxEngine.computeMutations();

    this._stateMachine.transitionTo('MIRROR_RACE');
    this._mirrorRaceGame = new MirrorRaceGame(
      this._engine,
      this._input,
      this._ghostRecorder,
      this._playerLaneBias,
      mutations
    );
    this._mirrorRaceGame.setup((score: MirrorRaceScore) => {
      this._onMirrorRaceComplete(score);
    });
    this._engine.setScene(this._mirrorRaceGame.scene);
  }

  private _onMirrorRaceComplete(score: MirrorRaceScore): void {
    this._totalPlayerScore += score.player;
    this._totalAiScore += score.ai;

    // Update FluxEngine with MirrorRace data
    this._fluxEngine.updateMirrorRaceHistory({
      patternBreaks: score.patternBreaks,
      crashes: score.crashes,
      finishTime: score.finishTime,
      totalScore: score.player,
    });

    // Compute final mutations for results display
    const mutations = this._fluxEngine.computeMutations();

    // Show final results with cumulative scores
    const combinedScore: FluxArenaScore = {
      player: this._totalPlayerScore,
      ai: this._totalAiScore,
      knockoffs: 0,
      selfKOs: 0,
      fluxEventsExploited: 0,
      positionSamples: [],
    };

    this._showResults(combinedScore, mutations);
  }

  /* ---- RESULTS ---- */

  private _showResults(
    score: FluxArenaScore,
    mutations: ReturnType<FluxEngine['computeMutations']>
  ): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('RESULTS');
    this._resultsScene = new ResultsScene(this._engine);
    this._resultsScene.setup(score, mutations, () => {
      this._showMenu();
    });
    this._engine.setScene(this._resultsScene.scene);
  }

  /* ---- CLEANUP ---- */

  private _disposeCurrentScenes(): void {
    if (this._menuScene) {
      this._menuScene.dispose();
      this._menuScene = null;
    }
    if (this._introScene) {
      this._introScene.dispose();
      this._introScene = null;
    }
    if (this._darkShotGame) {
      this._darkShotGame.dispose();
      this._darkShotGame = null;
    }
    if (this._transitionScene) {
      this._transitionScene.dispose();
      this._transitionScene = null;
    }
    if (this._fluxArenaGame) {
      this._fluxArenaGame.dispose();
      this._fluxArenaGame = null;
    }
    if (this._mirrorRaceGame) {
      this._mirrorRaceGame.dispose();
      this._mirrorRaceGame = null;
    }
    if (this._resultsScene) {
      this._resultsScene.dispose();
      this._resultsScene = null;
    }
  }
}

const main = async (): Promise<void> => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const game = new NexusArena(canvas);
  await game.start();
};

main().catch(console.error);
