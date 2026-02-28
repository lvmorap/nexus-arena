import '@babylonjs/core/Meshes/Builders/polygonBuilder';
import earcut from 'earcut';
(window as unknown as Record<string, unknown>).earcut = earcut;

import { Engine } from './core/Engine';
import { GameStateMachine } from './core/GameStateMachine';
import { InputManager } from './core/InputManager';
import { FluxEngine, RuleMutation } from './ai/FluxEngine';
import { IntroScene } from './scenes/IntroScene';
import { MenuScene } from './scenes/MenuScene';
import { TransitionScene, TransitionData } from './scenes/TransitionScene';
import { ResultsScene } from './scenes/ResultsScene';
import { FluxArenaGame, FluxArenaScore } from './minigames/FluxArena/FluxArenaGame';
import { logger } from './utils/Logger';

interface RoundResult {
  score: FluxArenaScore;
  mutations: RuleMutation[];
}

class NexusArena {
  private _engine: Engine;
  private _stateMachine: GameStateMachine;
  private _input: InputManager;
  private _fluxEngine: FluxEngine;

  // Scenes
  private _introScene: IntroScene | null = null;
  private _menuScene: MenuScene | null = null;
  private _transitionScene: TransitionScene | null = null;
  private _fluxArenaGame: FluxArenaGame | null = null;
  private _resultsScene: ResultsScene | null = null;

  // Multi-round state
  private _currentRound = 0;
  private _totalRounds = 2;
  private _roundResults: RoundResult[] = [];
  private _activeMutations: RuleMutation[] = [];
  private _hasSeenIntro = false;

  constructor(canvas: HTMLCanvasElement) {
    this._engine = new Engine(canvas);
    this._stateMachine = new GameStateMachine();
    this._input = new InputManager(canvas);
    this._fluxEngine = new FluxEngine();

    this._engine.startRenderLoop();
  }

  public async start(): Promise<void> {
    logger.info('NEXUS ARENA starting...');
    this._showIntro();
  }

  private _showIntro(): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('INTRO');
    this._introScene = new IntroScene(this._engine);
    this._introScene.setup(() => {
      this._hasSeenIntro = true;
      this._showMenu();
    });
    this._engine.setScene(this._introScene.scene);
  }

  private _showMenu(): void {
    this._disposeCurrentScenes();

    // Reset round state for a new game
    this._currentRound = 0;
    this._roundResults = [];
    this._activeMutations = [];
    this._fluxEngine = new FluxEngine();

    this._stateMachine.transitionTo('MENU');
    this._menuScene = new MenuScene(this._engine);
    this._menuScene.setup(() => {
      this._startNextRound();
    });
    this._engine.setScene(this._menuScene.scene);
  }

  private _startNextRound(): void {
    this._currentRound++;
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('FLUX_ARENA');
    this._fluxArenaGame = new FluxArenaGame(
      this._engine,
      this._input,
      this._activeMutations,
      this._currentRound
    );
    this._fluxArenaGame.setup((score: FluxArenaScore) => {
      this._onRoundComplete(score);
    });
    this._engine.setScene(this._fluxArenaGame.scene);
  }

  private _onRoundComplete(score: FluxArenaScore): void {
    // Update FluxEngine with performance data
    const avgPos =
      score.positionSamples.length > 0 ? score.positionSamples[0] : 0.5;

    this._fluxEngine.updateHistory({
      knockoffs: score.knockoffs,
      selfKOs: score.selfKOs,
      avgPositionFromCenter: avgPos,
      fluxEventsExploited: score.fluxEventsExploited,
      totalScore: score.player,
    });

    // Compute mutations for next round
    const mutations = this._fluxEngine.computeMutations();

    this._roundResults.push({ score, mutations });

    if (this._currentRound < this._totalRounds) {
      // Show transition scene, then start next round
      this._activeMutations = mutations;
      this._showTransition(score, mutations);
    } else {
      // Final round complete — show results
      this._showResults(score, mutations);
    }
  }

  private _showTransition(score: FluxArenaScore, mutations: RuleMutation[]): void {
    this._disposeCurrentScenes();

    this._stateMachine.transitionTo('TRANSITION');
    const data: TransitionData = {
      roundCompleted: this._currentRound,
      playerScore: score.player,
      aiScore: score.ai,
      mutations,
      nextRoundName: `FLUX ARENA — ROUND ${this._currentRound + 1}`,
    };

    this._transitionScene = new TransitionScene(this._engine);
    this._transitionScene.setup(data, () => {
      this._startNextRound();
    });
    this._engine.setScene(this._transitionScene.scene);
  }

  private _showResults(_score: FluxArenaScore, _mutations: RuleMutation[]): void {
    this._disposeCurrentScenes();

    // Aggregate scores across all rounds
    const totalPlayerScore = this._roundResults.reduce((sum, r) => sum + r.score.player, 0);
    const totalAiScore = this._roundResults.reduce((sum, r) => sum + r.score.ai, 0);
    const totalKnockoffs = this._roundResults.reduce((sum, r) => sum + r.score.knockoffs, 0);
    const totalSelfKOs = this._roundResults.reduce((sum, r) => sum + r.score.selfKOs, 0);
    const totalFluxExploited = this._roundResults.reduce(
      (sum, r) => sum + r.score.fluxEventsExploited,
      0
    );
    const avgPositions = this._roundResults
      .filter((r) => r.score.positionSamples.length > 0)
      .map((r) => r.score.positionSamples[0]);
    const overallAvgPos =
      avgPositions.length > 0
        ? avgPositions.reduce((a, b) => a + b, 0) / avgPositions.length
        : 0.5;

    const aggregatedScore: FluxArenaScore = {
      player: totalPlayerScore,
      ai: totalAiScore,
      knockoffs: totalKnockoffs,
      selfKOs: totalSelfKOs,
      fluxEventsExploited: totalFluxExploited,
      positionSamples: [overallAvgPos],
    };

    // Collect all mutations from all rounds
    const allMutations = this._roundResults.flatMap((r) => r.mutations);

    this._stateMachine.transitionTo('RESULTS');
    this._resultsScene = new ResultsScene(this._engine);
    this._resultsScene.setup(aggregatedScore, allMutations, () => {
      if (this._hasSeenIntro) {
        this._showMenu();
      } else {
        this._showIntro();
      }
    });
    this._engine.setScene(this._resultsScene.scene);
  }

  private _disposeCurrentScenes(): void {
    if (this._introScene) {
      this._introScene.dispose();
      this._introScene = null;
    }
    if (this._menuScene) {
      this._menuScene.dispose();
      this._menuScene = null;
    }
    if (this._transitionScene) {
      this._transitionScene.dispose();
      this._transitionScene = null;
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
