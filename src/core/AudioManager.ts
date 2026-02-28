import { logger } from '../utils/Logger';
import { AUDIO_KEYS } from '../constants/Audio';

type OscType = OscillatorType;

interface MusicState {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  key: string;
}

export class AudioManager {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _musicGain: GainNode | null = null;
  private _sfxGain: GainNode | null = null;
  private _masterVolume = 1.0;
  private _musicVolume = 0.7;
  private _sfxVolume = 1.0;
  private _muted = false;
  private _intensity = 0.5;
  private _currentMusic: MusicState | null = null;

  constructor() {
    logger.info('AudioManager initialized');
  }

  private _ensureContext(): AudioContext | null {
    if (!this._ctx) {
      try {
        this._ctx = new AudioContext();
        this._masterGain = this._ctx.createGain();
        this._masterGain.connect(this._ctx.destination);
        this._musicGain = this._ctx.createGain();
        this._musicGain.connect(this._masterGain);
        this._sfxGain = this._ctx.createGain();
        this._sfxGain.connect(this._masterGain);
        this._updateGains();
      } catch {
        logger.info('Web Audio API not available');
        return null;
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  private _updateGains(): void {
    const effective = this._muted ? 0 : this._masterVolume;
    if (this._masterGain) this._masterGain.gain.value = effective;
    if (this._musicGain) this._musicGain.gain.value = this._musicVolume * this._intensity;
    if (this._sfxGain) this._sfxGain.gain.value = this._sfxVolume;
  }

  private _osc(
    ctx: AudioContext,
    type: OscType,
    freq: number,
    dest: AudioNode,
    duration: number,
    freqEnd?: number,
    gainStart = 0.3,
    gainEnd = 0,
  ): { osc: OscillatorNode; gain: GainNode } {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainEnd, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    return { osc, gain };
  }

  private _noise(ctx: AudioContext, dest: AudioNode, duration: number, gainStart = 0.3): GainNode {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(dest);
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + duration);
    return gain;
  }

  private _noteSeq(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscType,
    freqs: number[],
    noteDur: number,
    gainVal = 0.25,
  ): void {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainVal, ctx.currentTime + i * noteDur);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (i + 1) * noteDur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(ctx.currentTime + i * noteDur);
      osc.stop(ctx.currentTime + (i + 1) * noteDur);
    });
  }

  public playSfx(key: string): void {
    try {
      const ctx = this._ensureContext();
      if (!ctx || !this._sfxGain) return;
      const dest = this._sfxGain;
      const S = AUDIO_KEYS.SFX;

      switch (key) {
        case S.ORB_SHOOT:
          this._osc(ctx, 'sine', 200, dest, 0.15, 600, 0.3, 0);
          break;
        case S.ORB_COLLISION:
          this._noise(ctx, dest, 0.05, 0.4);
          break;
        case S.ORB_PORTAL:
          this._osc(ctx, 'sine', 800, dest, 0.4, 200, 0.25, 0);
          this._osc(ctx, 'triangle', 810, dest, 0.4, 190, 0.15, 0);
          break;
        case S.SCRATCH:
          this._osc(ctx, 'square', 100, dest, 0.2, undefined, 0.2, 0);
          break;
        case S.PUSH_LAND:
          this._osc(ctx, 'sine', 80, dest, 0.1, undefined, 0.4, 0);
          break;
        case S.KNOCKOFF:
          this._noise(ctx, dest, 0.3, 0.4);
          this._osc(ctx, 'sine', 300, dest, 0.3, 1000, 0.3, 0);
          break;
        case S.FLUX_EVENT_TRIGGER:
          this._noteSeq(ctx, dest, 'sawtooth', [523.25, 659.25, 783.99], 0.1, 0.2);
          break;
        case S.UI_HOVER:
          this._osc(ctx, 'sine', 1000, dest, 0.03, undefined, 0.15, 0);
          break;
        case S.UI_SELECT:
          this._osc(ctx, 'sine', 800, dest, 0.05, 1200, 0.2, 0);
          this._osc(ctx, 'sine', 1200, dest, 0.05, undefined, 0.2, 0);
          break;
        case S.TRANSITION_WHOOSH: {
          const gain = this._noise(ctx, dest, 0.5, 0);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.15);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          break;
        }
        case S.RACE_ENGINE:
          this._osc(ctx, 'sawtooth', 60, dest, 0.2, undefined, 0.2, 0);
          break;
        case S.CRASH:
          this._noise(ctx, dest, 0.2, 0.5);
          this._osc(ctx, 'sine', 60, dest, 0.2, undefined, 0.4, 0);
          break;
        case S.FINISH_LINE:
          this._noteSeq(ctx, dest, 'sine', [523.25, 659.25, 783.99, 1046.5], 0.15, 0.25);
          break;
        default:
          logger.debug(`AudioManager: unknown SFX key '${key}'`);
      }
    } catch {
      // audio must never crash the game
    }
  }

  public playMusic(key: string): void {
    try {
      const ctx = this._ensureContext();
      if (!ctx || !this._musicGain) return;
      this._stopMusicImmediate();

      const dest = this._musicGain;
      const M = AUDIO_KEYS.MUSIC;
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      const makeDrone = (freq: number, type: OscType, vol: number): void => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        oscillators.push(osc);
        gains.push(gain);
      };

      const makeLfo = (target: AudioParam, rate: number, amount: number, base: number): void => {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        lfoGain.gain.value = amount;
        lfo.connect(lfoGain);
        lfoGain.connect(target);
        target.value = base;
        lfo.start();
        oscillators.push(lfo);
      };

      switch (key) {
        case M.MENU_AMBIENT:
          makeDrone(65.41, 'sine', 0.15);
          makeLfo(oscillators[0].frequency, 0.3, 4, 65.41);
          makeDrone(73.42, 'triangle', 0.08);
          break;
        case M.DARK_SHOT_TENSION:
          makeDrone(82.41, 'sine', 0.1);
          makeLfo(gains[0].gain, 0.5, 0.08, 0.1);
          break;
        case M.FLUX_ARENA_HYPE:
          makeDrone(110, 'square', 0.1);
          makeLfo(gains[0].gain, 140 / 60, 0.08, 0.1);
          break;
        case M.MIRROR_RACE_PULSE:
          makeDrone(130.81, 'sawtooth', 0.1);
          makeLfo(gains[0].gain, 160 / 60, 0.08, 0.1);
          break;
        case M.NEXARI_WIN:
          this._playVictoryChord(ctx, dest, [261.63, 329.63, 392.0], oscillators, gains);
          break;
        case M.PLAYER_WIN:
          this._playVictoryChord(ctx, dest, [261.63, 329.63, 392.0, 523.25], oscillators, gains);
          break;
        case M.RULE_MUTATION:
          makeDrone(200, 'sawtooth', 0.12);
          oscillators[0].frequency.linearRampToValueAtTime(100, ctx.currentTime + 2);
          oscillators[0].frequency.linearRampToValueAtTime(200, ctx.currentTime + 4);
          break;
        default:
          logger.debug(`AudioManager: unknown music key '${key}'`);
          return;
      }

      this._currentMusic = { oscillators, gains, key };
    } catch {
      // audio must never crash the game
    }
  }

  private _playVictoryChord(
    ctx: AudioContext,
    dest: AudioNode,
    freqs: number[],
    oscillators: OscillatorNode[],
    gains: GainNode[],
  ): void {
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 2);
      oscillators.push(osc);
      gains.push(gain);
    }
  }

  private _stopMusicImmediate(): void {
    if (!this._currentMusic || !this._ctx) return;
    const now = this._ctx.currentTime;
    for (const g of this._currentMusic.gains) {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.value = 0;
      } catch { /* already stopped */ }
    }
    for (const o of this._currentMusic.oscillators) {
      try { o.stop(); } catch { /* already stopped */ }
    }
    this._currentMusic = null;
  }

  public stopMusic(): void {
    try {
      if (!this._currentMusic || !this._ctx) return;
      const now = this._ctx.currentTime;
      const fadeTime = 0.3;
      const music = this._currentMusic;
      for (const g of music.gains) {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + fadeTime);
      }
      const oscs = music.oscillators;
      this._currentMusic = null;
      setTimeout(() => {
        for (const o of oscs) {
          try { o.stop(); } catch { /* already stopped */ }
        }
      }, fadeTime * 1000 + 50);
    } catch {
      // audio must never crash the game
    }
  }

  public setMasterVolume(vol: number): void {
    this._masterVolume = Math.max(0, Math.min(1, vol));
    this._updateGains();
  }

  public setMusicVolume(vol: number): void {
    this._musicVolume = Math.max(0, Math.min(1, vol));
    this._updateGains();
  }

  public setSfxVolume(vol: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
    this._updateGains();
  }

  public setMuted(muted: boolean): void {
    this._muted = muted;
    this._updateGains();
  }

  public setIntensity(intensity: number): void {
    this._intensity = Math.max(0, Math.min(1, intensity));
    this._updateGains();
  }

  public get isMuted(): boolean {
    return this._muted;
  }

  public dispose(): void {
    try {
      this._stopMusicImmediate();
      if (this._ctx) {
        this._ctx.close().catch(() => {});
        this._ctx = null;
      }
      this._masterGain = null;
      this._musicGain = null;
      this._sfxGain = null;
    } catch {
      // safe cleanup
    }
    logger.info('AudioManager disposed');
  }
}
