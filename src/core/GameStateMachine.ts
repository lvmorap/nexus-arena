import { logger } from '../utils/Logger';

export type GamePhase =
  | 'BOOT'
  | 'INTRO'
  | 'MENU'
  | 'TUTORIAL'
  | 'PRE_GAME'
  | 'FLUX_ARENA'
  | 'TRANSITION'
  | 'RESULTS'
  | 'PAUSED';

export type PhaseChangeListener = (from: GamePhase, to: GamePhase) => void;

export class GameStateMachine {
  private _currentPhase: GamePhase = 'BOOT';
  private _listeners: PhaseChangeListener[] = [];

  public get currentPhase(): GamePhase {
    return this._currentPhase;
  }

  public onPhaseChange(listener: PhaseChangeListener): void {
    this._listeners.push(listener);
  }

  public transitionTo(newPhase: GamePhase): void {
    const oldPhase = this._currentPhase;
    logger.info(`Phase transition: ${oldPhase} → ${newPhase}`);
    this._currentPhase = newPhase;
    for (const listener of this._listeners) {
      listener(oldPhase, newPhase);
    }
  }
}
