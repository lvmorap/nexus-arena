import { Scene } from '@babylonjs/core/scene';
import { Engine } from '../core/Engine';

export interface MiniGameScore {
  player: number;
  ai: number;
}

export abstract class MiniGameBase {
  protected _engine: Engine;
  protected _scene: Scene;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public abstract setup(onComplete: (score: MiniGameScore) => void): void;
  public abstract dispose(): void;
}
