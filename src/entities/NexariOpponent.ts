import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';

type OpponentState = 'IDLE' | 'AGGRESSIVE' | 'DEFENSIVE' | 'MIRROR';

export class NexariOpponent {
  private _mesh: Mesh | null = null;
  private _score: number = 0;
  private _position: Vector3;
  private _state: OpponentState;

  constructor(scene: Scene, startPosition: Vector3) {
    this._position = startPosition.clone();
    this._state = 'IDLE';

    const mesh = MeshBuilder.CreateSphere(
      'nexariOpponent',
      { diameter: 1.6, segments: 16 },
      scene,
    );
    mesh.position = this._position.clone();

    const material = new StandardMaterial('opponentMat', scene);
    const rgb = hexToRgb(COLORS.AI_MAGENTA);
    material.emissiveColor = new Color3(rgb.r, rgb.g, rgb.b);
    material.diffuseColor = new Color3(rgb.r, rgb.g, rgb.b);
    mesh.material = material;

    this._mesh = mesh;
  }

  public get mesh(): Mesh | null {
    return this._mesh;
  }

  public get score(): number {
    return this._score;
  }

  public get position(): Vector3 {
    return this._position;
  }

  public get state(): OpponentState {
    return this._state;
  }

  public addScore(points: number): void {
    this._score += points;
  }

  public resetScore(): void {
    this._score = 0;
  }

  public setPosition(pos: Vector3): void {
    this._position = pos.clone();
    if (this._mesh) {
      this._mesh.position = this._position.clone();
    }
  }

  public setState(state: OpponentState): void {
    this._state = state;
  }

  public update(_deltaTime: number): void {
    if (this._mesh) {
      this._position = this._mesh.position.clone();
    }
  }

  public dispose(): void {
    if (this._mesh) {
      this._mesh.dispose();
      this._mesh = null;
    }
  }
}
