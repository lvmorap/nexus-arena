import { Engine as BabylonEngine, Scene } from '@babylonjs/core';
import { logger } from '../utils/Logger';

export class Engine {
  private _engine: BabylonEngine;
  private _canvas: HTMLCanvasElement;
  private _currentScene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._engine = new BabylonEngine(this._canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    window.addEventListener('resize', () => {
      this._engine.resize();
    });

    logger.info('Babylon.js engine initialized');
  }

  public get babylonEngine(): BabylonEngine {
    return this._engine;
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public get currentScene(): Scene | null {
    return this._currentScene;
  }

  public setScene(scene: Scene): void {
    this._currentScene = scene;
  }

  public startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      if (this._currentScene) {
        this._currentScene.render();
      }
    });
  }

  public dispose(): void {
    this._engine.dispose();
  }
}
