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

const DAMPING_FACTOR = 0.98;

export class FluxOrb {
  private _mesh: Mesh | null = null;
  private _velocity: Vector3;
  private _radius: number;
  private _isActive: boolean;

  constructor(scene: Scene, position: Vector3, radius: number) {
    this._velocity = Vector3.Zero();
    this._radius = radius;
    this._isActive = true;

    const mesh = MeshBuilder.CreateSphere(
      'fluxOrb',
      { diameter: radius * 2, segments: 16 },
      scene,
    );
    mesh.position = position.clone();

    const material = new StandardMaterial('fluxOrbMat', scene);
    const rgb = hexToRgb(COLORS.NEXARI_GOLD);
    material.emissiveColor = new Color3(rgb.r, rgb.g, rgb.b);
    material.diffuseColor = new Color3(rgb.r, rgb.g, rgb.b);
    mesh.material = material;

    this._mesh = mesh;
  }

  public get mesh(): Mesh | null {
    return this._mesh;
  }

  public get position(): Vector3 {
    if (this._mesh) {
      return this._mesh.position.clone();
    }
    return Vector3.Zero();
  }

  public get velocity(): Vector3 {
    return this._velocity.clone();
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public applyForce(force: Vector3): void {
    this._velocity = this._velocity.add(force);
  }

  public setActive(active: boolean): void {
    this._isActive = active;
    if (this._mesh) {
      this._mesh.setEnabled(active);
    }
  }

  public update(deltaTime: number): void {
    if (!this._isActive || !this._mesh) {
      return;
    }

    this._mesh.position = this._mesh.position.add(
      this._velocity.scale(deltaTime),
    );
    this._velocity = this._velocity.scale(DAMPING_FACTOR);
  }

  public dispose(): void {
    if (this._mesh) {
      this._mesh.dispose();
      this._mesh = null;
    }
    this._isActive = false;
  }
}
