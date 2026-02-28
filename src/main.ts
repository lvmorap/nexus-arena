import '@babylonjs/core/Meshes/Builders/polygonBuilder';
import earcut from 'earcut';
(window as unknown as Record<string, unknown>).earcut = earcut;

import { Engine } from './core/Engine';
import { GameStateMachine } from './core/GameStateMachine';
import { InputManager } from './core/InputManager';
import { FluxEngine } from './ai/FluxEngine';
import { MenuScene } from './scenes/MenuScene';
import { ResultsScene } from './scenes/ResultsScene';
import { FluxArenaGame, FluxArenaScore } from './minigames/FluxArena/FluxArenaGame';
import { logger } from './utils/Logger';

class NexusArena {
  private _engine: Engine;
  private _stateMachine: GameStateMachine;
  private _input: InputManager;
  private _fluxEngine: FluxEngine;

  private _menuScene: MenuScene | null = null;
  private _fluxArenaGame: FluxArenaGame | null = null;
  private _resultsScene: ResultsScene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._engine = new Engine(canvas);
    this._stateMachine = new GameStateMachine();
    this._input = new InputManager(canvas);
    this._fluxEngine = new FluxEngine();

    this._engine.startRenderLoop();
  }

  public async start(): Promise<void> {
    logger.info('NEXUS ARENA starting...');
    this._showMenu();
  }

  private _showMenu(): void {
    // Dispose previous scenes
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('MENU');
    this._menuScene = new MenuScene(this._engine);
    this._menuScene.setup(() => {
      this._startFluxArena();
    });
    this._engine.setScene(this._menuScene.scene);
  }

  private _startFluxArena(): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('FLUX_ARENA');
    this._fluxArenaGame = new FluxArenaGame(this._engine, this._input);
    this._fluxArenaGame.setup((score: FluxArenaScore) => {
      this._onFluxArenaComplete(score);
    });
    this._engine.setScene(this._fluxArenaGame.scene);
  }

  private _onFluxArenaComplete(score: FluxArenaScore): void {
    // Update FluxEngine with performance data
    const avgPos =
      score.positionSamples.length > 0
        ? score.positionSamples[0]
        : 0.5;

    this._fluxEngine.updateHistory({
      knockoffs: score.knockoffs,
      selfKOs: score.selfKOs,
      avgPositionFromCenter: avgPos,
      fluxEventsExploited: score.fluxEventsExploited,
      totalScore: score.player,
    });

    // Compute mutations
    const mutations = this._fluxEngine.computeMutations();

    // Show results
    this._showResults(score, mutations);
  }

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

  private _disposeCurrentScenes(): void {
    if (this._menuScene) {
      this._menuScene.dispose();
      this._menuScene = null;
    }
    if (this._fluxArenaGame) {
      this._fluxArenaGame.dispose();
      this._fluxArenaGame = null;
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
