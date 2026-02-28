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

export class Player {
  private _mesh: Mesh | null = null;
  private _score: number = 0;
  private _position: Vector3;

  constructor(scene: Scene, startPosition: Vector3) {
    this._position = startPosition.clone();

    const mesh = MeshBuilder.CreateBox(
      'player',
      { width: 1, height: 1.8, depth: 1 },
      scene,
    );
    mesh.position = this._position.clone();

    const material = new StandardMaterial('playerMat', scene);
    const rgb = hexToRgb(COLORS.PLAYER_CYAN);
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
