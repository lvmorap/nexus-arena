import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface BallState {
  position: Vector3;
  velocity: Vector3;
  radius: number;
  isActive: boolean;
}

export class BallPhysics {
  /**
   * Applies linear damping to slow balls over time.
   * Uses exponential decay: v' = v * (1 - damping)^(dt * 60)
   */
  static applyDamping(velocity: Vector3, damping: number, deltaTime: number): Vector3 {
    const factor = Math.pow(1 - damping, deltaTime * 60);
    return velocity.scale(factor);
  }

  /**
   * Resolves an elastic collision between two balls using
   * impulse-based resolution along the collision normal.
   */
  static resolveCollision(a: BallState, b: BallState, restitution: number): void {
    const diff = a.position.subtract(b.position);
    diff.y = 0;
    const dist = diff.length();
    const minDist = a.radius + b.radius;

    if (dist >= minDist || dist < 0.001) return;

    const normal = diff.normalize();
    const relVel = a.velocity.subtract(b.velocity);
    const velAlongNormal = Vector3.Dot(relVel, normal);

    // Already separating
    if (velAlongNormal > 0) return;

    const impulse = (-(1 + restitution) * velAlongNormal) / 2;
    a.velocity.addInPlace(normal.scale(impulse));
    b.velocity.addInPlace(normal.scale(-impulse));

    // Separate overlapping balls
    const overlap = minDist - dist;
    a.position.addInPlace(normal.scale(overlap / 2));
    b.position.addInPlace(normal.scale(-overlap / 2));
  }

  /**
   * Applies a tiny nudge toward the scene center to simulate
   * zero-gravity orbital drift.
   */
  static applyOrbitalDrift(
    position: Vector3,
    velocity: Vector3,
    centerForce: number,
    deltaTime: number,
  ): Vector3 {
    const toCenter = Vector3.Zero().subtract(position);
    toCenter.y = 0;
    const dist = toCenter.length();
    if (dist < 0.001) return velocity.clone();

    const nudge = toCenter.normalize().scale(centerForce * deltaTime);
    return velocity.add(nudge);
  }

  /**
   * Checks if a ball is within a portal's capture range.
   */
  static isInPortal(ballPos: Vector3, portalPos: Vector3, portalRadius: number): boolean {
    const dx = ballPos.x - portalPos.x;
    const dz = ballPos.z - portalPos.z;
    return Math.sqrt(dx * dx + dz * dz) < portalRadius;
  }

  /**
   * Returns the normalized direction vector from startPos to endPos.
   */
  static calculateShotDirection(startPos: Vector3, endPos: Vector3): Vector3 {
    const dir = endPos.subtract(startPos);
    dir.y = 0;
    const len = dir.length();
    if (len < 0.001) return Vector3.Zero();
    return dir.normalize();
  }

  /**
   * Maps a hold duration (ms) to shot power on a [0, maxPower] range
   * using a clamped linear ramp.
   */
  static calculateShotPower(holdDurationMs: number, maxPower: number): number {
    const t = Math.min(Math.max(holdDurationMs / 1000, 0), 1);
    return t * maxPower;
  }
}
