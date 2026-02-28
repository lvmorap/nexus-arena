import { randomRange } from '../../utils/MathUtils';

export type FluxEventType =
  | 'GRAVITY_FLIP'
  | 'ARENA_SHRINK'
  | 'SPEED_BOOST'
  | 'ZERO_G_PULSE'
  | 'MIRROR_CONTROLS'
  | 'SHIELD_ORB'
  | 'EARTHQUAKE'
  | 'RULE_REVERSAL'
  | 'NEXARI_SUMMON'
  | 'PORTAL_ESCAPE'
  | 'COMBO_KNOCK';

export interface FluxEvent {
  type: FluxEventType;
  displayName: string;
  description: string;
  durationMs: number;
}

const FLUX_EVENT_POOL: FluxEvent[] = [
  {
    type: 'GRAVITY_FLIP',
    displayName: 'GRAVITY INVERTED',
    description: 'Gravity reverses for 8 seconds!',
    durationMs: 8000,
  },
  {
    type: 'ARENA_SHRINK',
    displayName: 'ARENA CONTRACTS',
    description: 'The platform shrinks by 15%!',
    durationMs: 0, // permanent
  },
  {
    type: 'SPEED_BOOST',
    displayName: 'VELOCITY SURGE',
    description: 'Both players move 40% faster!',
    durationMs: 10000,
  },
  {
    type: 'ZERO_G_PULSE',
    displayName: 'ZERO GRAVITY',
    description: 'Gravity disabled for 3 seconds!',
    durationMs: 3000,
  },
  {
    type: 'MIRROR_CONTROLS',
    displayName: 'CONTROLS INVERTED',
    description: 'Your controls are mirrored!',
    durationMs: 6000,
  },
  {
    type: 'EARTHQUAKE',
    displayName: 'SEISMIC SHIFT',
    description: 'The platform shakes violently!',
    durationMs: 4000,
  },
  {
    type: 'RULE_REVERSAL',
    displayName: 'RULE REVERSAL',
    description: 'Falling off now SCORES a point!',
    durationMs: 12000,
  },
  {
    type: 'SHIELD_ORB',
    displayName: 'SHIELD ORB SPAWNED',
    description: 'A protective orb appears — grab it for immunity!',
    durationMs: 8000,
  },
  {
    type: 'NEXARI_SUMMON',
    displayName: 'NEXARI REINFORCEMENT',
    description: 'A second Nexari opponent joins for 10 seconds!',
    durationMs: 10000,
  },
  {
    type: 'PORTAL_ESCAPE',
    displayName: 'PORTAL EDGES',
    description: 'Portals at arena edges — fall through to score 1 pt!',
    durationMs: 15000,
  },
  {
    type: 'COMBO_KNOCK',
    displayName: 'COMBO MODE',
    description: 'Score 2 knockoffs within 10s for +3 bonus!',
    durationMs: 10000,
  },
];

export class RuleMutator {
  private _lastEventType: FluxEventType | null = null;
  private _shrinkCount = 0;

  public getNextEvent(): FluxEvent {
    // Filter out recently used event and limit shrinks
    let pool = FLUX_EVENT_POOL.filter((e) => e.type !== this._lastEventType);
    if (this._shrinkCount >= 3) {
      pool = pool.filter((e) => e.type !== 'ARENA_SHRINK');
    }
    if (pool.length === 0) pool = FLUX_EVENT_POOL;

    const idx = Math.floor(randomRange(0, pool.length));
    const event = pool[idx];
    this._lastEventType = event.type;
    if (event.type === 'ARENA_SHRINK') {
      this._shrinkCount++;
    }
    return event;
  }

  public reset(): void {
    this._lastEventType = null;
    this._shrinkCount = 0;
  }
}
