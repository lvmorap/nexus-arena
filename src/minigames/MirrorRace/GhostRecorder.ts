import { Vector3 } from '@babylonjs/core';
import { randomRange } from '../../utils/MathUtils';
import { logger } from '../../utils/Logger';

export interface GhostBehavior {
  avgLanePosition: number; // -1 (left) to 1 (right)
  reactionDelay: number; // ms
  speedVariance: number; // 0-1
  aggressiveness: number; // 0-1
}

interface PlayerSample {
  timestamp: number;
  lanePosition: number;
  speed: number;
}

export class GhostRecorder {
  private _samples: PlayerSample[] = [];

  public recordSample(lanePosition: number, speed: number): void {
    this._samples.push({
      timestamp: performance.now(),
      lanePosition,
      speed,
    });
  }

  public buildBehaviorModel(): GhostBehavior {
    if (this._samples.length === 0) {
      logger.info('GhostRecorder: no samples, using default behavior');
      return {
        avgLanePosition: 0,
        reactionDelay: 300,
        speedVariance: 0.5,
        aggressiveness: 0.5,
      };
    }

    const totalLane = this._samples.reduce((s, p) => s + p.lanePosition, 0);
    const avgLane = totalLane / this._samples.length;

    const totalSpeed = this._samples.reduce((s, p) => s + p.speed, 0);
    const avgSpeed = totalSpeed / this._samples.length;

    const speedDiffs = this._samples.map((p) => Math.abs(p.speed - avgSpeed));
    const speedVariance =
      speedDiffs.reduce((s, d) => s + d, 0) / speedDiffs.length;

    logger.info(
      `GhostRecorder: built model — avgLane=${avgLane.toFixed(2)}, speedVar=${speedVariance.toFixed(2)}`
    );

    return {
      avgLanePosition: avgLane,
      reactionDelay: 200 + Math.random() * 200,
      speedVariance: Math.min(speedVariance, 1),
      aggressiveness: Math.min(avgSpeed / 15, 1),
    };
  }

  /**
   * Get ghost lane position at a given timestamp, adding noise based on behavior model.
   */
  public getGhostLane(behavior: GhostBehavior, elapsed: number): number {
    // Ghost biases toward the player's average lane, with some noise
    const bias = behavior.avgLanePosition;
    const noise = randomRange(-0.3, 0.3) * (1 - behavior.aggressiveness);
    const oscillation = Math.sin(elapsed * 0.002) * 0.3;
    return bias + noise + oscillation;
  }

  public getGhostSpeed(behavior: GhostBehavior, baseSpeed: number): number {
    const variance = randomRange(-1, 1) * behavior.speedVariance * 2;
    return baseSpeed * (0.9 + variance * 0.1);
  }

  public getGhostDodgeDirection(
    behavior: GhostBehavior,
    _obstaclePosition: Vector3
  ): number {
    // Ghost tends to dodge toward its preferred lane
    return behavior.avgLanePosition > 0 ? 1 : -1;
  }

  public reset(): void {
    this._samples = [];
  }
}
