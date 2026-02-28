import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointLight } from '@babylonjs/core/Lights/pointLight';

export interface IlluminationSource {
  id: string;
  position: Vector3;
  radius: number;
  intensity: number;
  round: number;
}

export class FogOfWarSystem {
  private _scene: Scene;
  private _lights: Map<string, PointLight> = new Map();
  private _illuminationSources: Map<string, IlluminationSource> = new Map();
  private _currentRound = 1;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  setRound(round: number): void {
    this._currentRound = round;
  }

  /**
   * Adds a light source at position with the given radius.
   */
  addIllumination(id: string, position: Vector3, radius: number): void {
    const light = new PointLight(`fog_light_${id}`, position.clone(), this._scene);
    light.intensity = 1.0;
    light.range = radius;

    this._lights.set(id, light);
    this._illuminationSources.set(id, {
      id,
      position: position.clone(),
      radius,
      intensity: 1.0,
      round: this._currentRound,
    });
  }

  /**
   * Moves an existing illumination source to a new position.
   */
  updateIllumination(id: string, position: Vector3): void {
    const light = this._lights.get(id);
    if (light) {
      light.position.copyFrom(position);
    }
    const source = this._illuminationSources.get(id);
    if (source) {
      source.position.copyFrom(position);
    }
  }

  removeIllumination(id: string): void {
    const light = this._lights.get(id);
    if (light) {
      light.dispose();
      this._lights.delete(id);
    }
    this._illuminationSources.delete(id);
  }

  /**
   * Returns true if position is within any active illumination radius.
   */
  isPositionIlluminated(position: Vector3): boolean {
    for (const source of this._illuminationSources.values()) {
      const dx = position.x - source.position.x;
      const dz = position.z - source.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < source.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns illumination level at a position:
   * - FULL: within a light created in the current round
   * - GHOST: within a light from a previous round
   * - DARK: not within any light
   */
  getIlluminationLevel(position: Vector3): 'FULL' | 'GHOST' | 'DARK' {
    let hasGhost = false;

    for (const source of this._illuminationSources.values()) {
      const dx = position.x - source.position.x;
      const dz = position.z - source.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < source.radius) {
        if (source.round === this._currentRound) {
          return 'FULL';
        }
        hasGhost = true;
      }
    }

    return hasGhost ? 'GHOST' : 'DARK';
  }

  dispose(): void {
    for (const light of this._lights.values()) {
      light.dispose();
    }
    this._lights.clear();
    this._illuminationSources.clear();
  }
}
