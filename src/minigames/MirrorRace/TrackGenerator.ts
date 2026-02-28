import { Vector3 } from '@babylonjs/core';
import { randomRange } from '../../utils/MathUtils';

export interface Obstacle {
  position: Vector3;
  type: 'barrier_left' | 'barrier_right' | 'barrier_center' | 'energy_wall' | 'flux_portal';
  passed: boolean;
  dodgedCorrectly: boolean;
}

export class TrackGenerator {
  private _obstacles: Obstacle[] = [];
  private _trackLength: number;
  private _playerBias: number;

  constructor(trackLength: number, playerLaneBias = 0) {
    this._trackLength = trackLength;
    this._playerBias = playerLaneBias;
  }

  public generate(): Obstacle[] {
    this._obstacles = [];

    const spacing = 25; // Distance between obstacles
    const numObstacles = Math.floor(this._trackLength / spacing);

    for (let i = 0; i < numObstacles; i++) {
      const zPos = -(i + 1) * spacing;
      const type = this._pickObstacleType(i);
      const xPos = this._pickXPosition(type);

      this._obstacles.push({
        position: new Vector3(xPos, 0, zPos),
        type,
        passed: false,
        dodgedCorrectly: false,
      });
    }

    return this._obstacles;
  }

  private _pickObstacleType(
    index: number
  ): Obstacle['type'] {
    const r = randomRange(0, 1);

    // Every 5th obstacle is a flux portal (reward)
    if (index > 0 && index % 5 === 0) return 'flux_portal';

    // Bias obstacles toward player's preferred lane
    if (this._playerBias > 0.2) {
      // Player prefers right → more right barriers
      if (r < 0.4) return 'barrier_right';
      if (r < 0.7) return 'barrier_center';
      return 'barrier_left';
    } else if (this._playerBias < -0.2) {
      // Player prefers left → more left barriers
      if (r < 0.4) return 'barrier_left';
      if (r < 0.7) return 'barrier_center';
      return 'barrier_right';
    }

    // Balanced
    if (r < 0.3) return 'barrier_left';
    if (r < 0.6) return 'barrier_right';
    if (r < 0.85) return 'barrier_center';
    return 'energy_wall';
  }

  private _pickXPosition(type: Obstacle['type']): number {
    switch (type) {
      case 'barrier_left':
        return -2.5;
      case 'barrier_right':
        return 2.5;
      case 'barrier_center':
        return 0;
      case 'energy_wall':
        return 0;
      case 'flux_portal':
        return randomRange(-2, 2);
    }
  }

  public get obstacles(): Obstacle[] {
    return this._obstacles;
  }

  public get trackLength(): number {
    return this._trackLength;
  }
}
