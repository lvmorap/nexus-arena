import { controlRemapper } from '../ui/ControlRemapper';

export interface InputState {
  moveForward: boolean;
  moveBack: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  push: boolean;
  confirm: boolean;
  escape: boolean;
  mouseX: number;
  mouseY: number;
}

export class InputManager {
  private _keys: Set<string> = new Set();
  private _mouseX = 0;
  private _mouseY = 0;
  private _pushTriggered = false;
  private _confirmTriggered = false;
  private _escapeTriggered = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this._keys.add(e.code);
      if (e.code === 'Space') {
        this._pushTriggered = true;
        e.preventDefault();
      }
      if (e.code === 'Enter') {
        this._confirmTriggered = true;
      }
      if (e.code === 'Escape') {
        this._escapeTriggered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.code);
    });

    canvas.addEventListener('mousemove', (e) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
    });

    canvas.addEventListener('click', () => {
      this._pushTriggered = true;
    });
  }

  public getState(): InputState {
    const b = controlRemapper.bindings;
    const state: InputState = {
      moveForward: this._keys.has(b.moveForward) || this._keys.has('ArrowUp'),
      moveBack: this._keys.has(b.moveBack) || this._keys.has('ArrowDown'),
      moveLeft: this._keys.has(b.moveLeft) || this._keys.has('ArrowLeft'),
      moveRight: this._keys.has(b.moveRight) || this._keys.has('ArrowRight'),
      push: this._pushTriggered,
      confirm: this._confirmTriggered,
      escape: this._escapeTriggered,
      mouseX: this._mouseX,
      mouseY: this._mouseY,
    };
    this._pushTriggered = false;
    this._confirmTriggered = false;
    this._escapeTriggered = false;
    return state;
  }
}
