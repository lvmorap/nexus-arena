import { Vector3 } from '@babylonjs/core';
import { randomRange } from '../utils/MathUtils';

export type AIState = 'AGGRESSIVE' | 'DEFENSIVE' | 'FLUX_EXPLOIT' | 'MIRROR';

export class NexariAdaptiveAI {
  private _state: AIState = 'AGGRESSIVE';
  private _reactionMs: number;
  private _lastActionTime = 0;
  private _targetPosition: Vector3 = Vector3.Zero();

  constructor(reactionMs = 400) {
    this._reactionMs = reactionMs;
  }

  public get state(): AIState {
    return this._state;
  }

  public update(
    aiPosition: Vector3,
    playerPosition: Vector3,
    arenaRadius: number,
    scoreDiff: number,
    currentTime: number
  ): { moveDirection: Vector3; shouldPush: boolean } {
    // Rate-limit decisions
    if (currentTime - this._lastActionTime < this._reactionMs) {
      return { moveDirection: this._targetPosition.subtract(aiPosition).normalize(), shouldPush: false };
    }
    this._lastActionTime = currentTime;

    // State transitions based on game state
    const aiDistFromCenter = Math.sqrt(aiPosition.x * aiPosition.x + aiPosition.z * aiPosition.z);
    const playerDistFromCenter = Math.sqrt(
      playerPosition.x * playerPosition.x + playerPosition.z * playerPosition.z
    );

    if (scoreDiff < -1) {
      this._state = 'AGGRESSIVE';
    } else if (aiDistFromCenter > arenaRadius * 0.7) {
      this._state = 'DEFENSIVE';
    } else if (scoreDiff > 1) {
      this._state = 'DEFENSIVE';
    } else {
      this._state = Math.random() > 0.5 ? 'AGGRESSIVE' : 'MIRROR';
    }

    let moveDirection: Vector3;
    let shouldPush = false;

    const state: string = this._state;
    switch (state) {
      case 'AGGRESSIVE': {
        // Move toward player, push when close
        moveDirection = playerPosition.subtract(aiPosition).normalize();
        const distToPlayer = Vector3.Distance(aiPosition, playerPosition);
        if (distToPlayer < 3.5) {
          shouldPush = true;
        }
        // Add slight randomness
        moveDirection.x += randomRange(-0.15, 0.15);
        moveDirection.z += randomRange(-0.15, 0.15);
        break;
      }
      case 'DEFENSIVE': {
        // Move toward center
        moveDirection = Vector3.Zero().subtract(aiPosition).normalize();
        // Push only if player is very close
        const dist = Vector3.Distance(aiPosition, playerPosition);
        if (dist < 2.5) {
          shouldPush = true;
        }
        break;
      }
      case 'MIRROR': {
        // Mirror player's position relative to center
        this._targetPosition = new Vector3(
          -playerPosition.x + randomRange(-1, 1),
          0,
          -playerPosition.z + randomRange(-1, 1)
        );
        moveDirection = this._targetPosition.subtract(aiPosition).normalize();
        const d = Vector3.Distance(aiPosition, playerPosition);
        if (d < 3) {
          shouldPush = true;
        }
        break;
      }
      case 'FLUX_EXPLOIT':
      default: {
        // Move toward center during flux events
        moveDirection = Vector3.Zero().subtract(aiPosition).normalize();
        if (playerDistFromCenter > arenaRadius * 0.5) {
          moveDirection = playerPosition.subtract(aiPosition).normalize();
          shouldPush = true;
        }
        break;
      }
    }

    this._targetPosition = aiPosition.add(moveDirection);
    return { moveDirection: moveDirection.normalize(), shouldPush };
  }

  public onFluxEvent(): void {
    this._state = 'FLUX_EXPLOIT';
  }
}
