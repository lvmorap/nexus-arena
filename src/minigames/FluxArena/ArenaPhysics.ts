import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface ArenaEntity {
  position: Vector3;
  velocity: Vector3;
  mass: number;
}

export class ArenaPhysics {
  /**
   * Returns an impulse vector directed from attacker toward target,
   * scaled by pushPower.
   */
  static applyPushImpulse(
    attacker: ArenaEntity,
    target: ArenaEntity,
    pushPower: number,
  ): Vector3 {
    const direction = target.position.subtract(attacker.position);
    direction.y = 0;
    const dist = direction.length();
    if (dist < 0.001) return Vector3.Zero();
    return direction.normalize().scale(pushPower);
  }

  /**
   * Returns true if the entity has fallen off the platform:
   * either below the fall threshold (y) or beyond the arena radius (XZ distance).
   */
  static checkFallOff(
    entityPosition: Vector3,
    platformCenter: Vector3,
    platformRadius: number,
    fallThreshold: number,
  ): boolean {
    if (entityPosition.y < platformCenter.y + fallThreshold) {
      return true;
    }
    const dx = entityPosition.x - platformCenter.x;
    const dz = entityPosition.z - platformCenter.z;
    return Math.sqrt(dx * dx + dz * dz) > platformRadius;
  }

  /**
   * Applies gravity (optionally flipped) to a velocity vector.
   */
  static applyGravity(
    velocity: Vector3,
    gravityStrength: number,
    isFlipped: boolean,
    deltaTime: number,
  ): Vector3 {
    const direction = isFlipped ? 1 : -1;
    return new Vector3(
      velocity.x,
      velocity.y + direction * gravityStrength * deltaTime,
      velocity.z,
    );
  }

  /**
   * Applies linear damping using exponential decay: v' = v * (1 - damping)^(dt * 60)
   */
  static applyDamping(velocity: Vector3, damping: number, deltaTime: number): Vector3 {
    const factor = Math.pow(1 - damping, deltaTime * 60);
    return velocity.scale(factor);
  }

  /**
   * Clamps an entity's XZ position to stay within the arena circle
   * centered at `center` with given `radius`.
   */
  static clampToArena(
    position: Vector3,
    center: Vector3,
    radius: number,
  ): Vector3 {
    const dx = position.x - center.x;
    const dz = position.z - center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= radius) return position.clone();

    const scale = radius / dist;
    return new Vector3(
      center.x + dx * scale,
      position.y,
      center.z + dz * scale,
    );
  }
}
