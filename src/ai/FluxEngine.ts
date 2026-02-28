import { logger } from '../utils/Logger';

export interface PlayerPerformanceHistory {
  fluxArena: {
    knockoffs: number;
    selfKOs: number;
    avgPositionFromCenter: number;
    fluxEventsExploited: number;
    totalScore: number;
  };
  darkShot: {
    blindPockets: number;
    litPockets: number;
    scratches: number;
    avgShotPower: number;
    totalScore: number;
  };
  mirrorRace?: {
    patternBreaks: number;
    crashes: number;
    finishTime: number;
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
    darkShot: {
      blindPockets: 0,
      litPockets: 0,
      scratches: 0,
      avgShotPower: 0.5,
      totalScore: 0,
    },
  };

  public get history(): PlayerPerformanceHistory {
    return this._history;
  }

  /** @deprecated Use updateFluxArenaHistory instead */
  public updateHistory(partial: Partial<PlayerPerformanceHistory['fluxArena']>): void {
    this.updateFluxArenaHistory(partial);
  }

  public updateFluxArenaHistory(partial: Partial<PlayerPerformanceHistory['fluxArena']>): void {
    Object.assign(this._history.fluxArena, partial);
    logger.info('FluxEngine: updated fluxArena history');
  }

  public updateDarkShotHistory(partial: Partial<PlayerPerformanceHistory['darkShot']>): void {
    Object.assign(this._history.darkShot, partial);
    logger.info('FluxEngine: updated darkShot history');
  }

  public updateMirrorRaceHistory(partial: Partial<NonNullable<PlayerPerformanceHistory['mirrorRace']>>): void {
    if (!this._history.mirrorRace) {
      this._history.mirrorRace = {
        patternBreaks: 0,
        crashes: 0,
        finishTime: 0,
        totalScore: 0,
      };
    }
    Object.assign(this._history.mirrorRace, partial);
    logger.info('FluxEngine: updated mirrorRace history');
  }

  public computeMutations(): RuleMutation[] {
    const mutations: RuleMutation[] = [];
    const fa = this._history.fluxArena;
    const ds = this._history.darkShot;

    // FluxArena → mutations
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

    // DarkShot → FluxArena mutations
    if (ds.blindPockets > ds.litPockets) {
      mutations.push({
        id: 'shadow_step',
        displayName: 'SHADOW STEP',
        description: 'Player gains brief invisibility from dark-pocket mastery',
        effect: 'PLAYER_INVISIBILITY',
        favoredPlayer: 'PLAYER',
      });
    }

    if (ds.scratches >= 2) {
      mutations.push({
        id: 'scratch_shrink',
        displayName: 'SCRATCHES EXPLOITED',
        description: 'Arena shrinks 10% at start due to sloppy shooting',
        effect: 'ARENA_SHRINK_INITIAL',
        favoredPlayer: 'AI',
      });
    }

    return mutations;
  }
}
