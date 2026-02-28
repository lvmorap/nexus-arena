export interface PlayerPerformanceHistory {
  fluxArena: {
    knockoffs: number;
    selfKOs: number;
    avgPositionFromCenter: number;
    fluxEventsExploited: number;
    totalScore: number;
  };
}

export interface RuleMutation {
  id: string;
  displayName: string;
  description: string;
  effect: string;
  favoredPlayer: 'PLAYER' | 'AI' | 'NEUTRAL';
}

export class FluxEngine {
  private _history: PlayerPerformanceHistory = {
    fluxArena: {
      knockoffs: 0,
      selfKOs: 0,
      avgPositionFromCenter: 0.5,
      fluxEventsExploited: 0,
      totalScore: 0,
    },
  };

  public get history(): PlayerPerformanceHistory {
    return this._history;
  }

  public updateHistory(partial: Partial<PlayerPerformanceHistory['fluxArena']>): void {
    Object.assign(this._history.fluxArena, partial);
  }

  public computeMutations(): RuleMutation[] {
    const mutations: RuleMutation[] = [];
    const fa = this._history.fluxArena;

    if (fa.selfKOs > fa.knockoffs) {
      mutations.push({
        id: 'arena_compress',
        displayName: 'RECKLESS PATTERNS DETECTED',
        description: 'The Arena compresses — platform shrinks 10%',
        effect: 'ARENA_SHRINK_INITIAL',
        favoredPlayer: 'AI',
      });
    }

    if (fa.avgPositionFromCenter < 0.3) {
      mutations.push({
        id: 'center_punish',
        displayName: 'CENTER BIAS DETECTED',
        description: 'Staying centered now reduces push power',
        effect: 'CENTER_WEAKNESS',
        favoredPlayer: 'AI',
      });
    }

    if (fa.fluxEventsExploited >= 2) {
      mutations.push({
        id: 'flux_mastery',
        displayName: 'FLUX MASTERY ACHIEVED',
        description: 'Flux Events trigger more frequently',
        effect: 'FASTER_FLUX',
        favoredPlayer: 'NEUTRAL',
      });
    }

    if (fa.knockoffs >= 3) {
      mutations.push({
        id: 'push_reduction',
        displayName: 'DOMINANCE COUNTERED',
        description: 'Your push power is reduced by 20%',
        effect: 'PUSH_NERF',
        favoredPlayer: 'AI',
      });
    }

    return mutations;
  }
}
