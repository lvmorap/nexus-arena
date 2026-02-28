import { Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from './MathUtils';

const MAX_PARTICLES = 500;

function hexToColor4(hex: string, alpha: number): Color4 {
  const rgb = hexToRgb(hex);
  return new Color4(rgb.r, rgb.g, rgb.b, alpha);
}

export class ParticleFactory {
  public static createPortalAbsorb(scene: Scene, position: Vector3, color: Color4): ParticleSystem {
    const ps = new ParticleSystem('portalAbsorb', MAX_PARTICLES, scene);
    ps.emitter = position;
    ps.createPointEmitter(new Vector3(-1, 0, -1), new Vector3(1, 0, 1));
    ps.color1 = color;
    ps.color2 = new Color4(color.r * 0.5, color.g * 0.5, color.b * 0.5, color.a);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.3;
    ps.minLifeTime = 0.3;
    ps.maxLifeTime = 0.8;
    ps.emitRate = 80;
    ps.gravity = new Vector3(0, -2, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 1.0;
    ps.disposeOnStop = true;
    return ps;
  }

  public static createKnockoffExplosion(scene: Scene, position: Vector3): ParticleSystem {
    const ps = new ParticleSystem('knockoffExplosion', MAX_PARTICLES, scene);
    ps.emitter = position;
    ps.createSphereEmitter(1.5);
    ps.color1 = hexToColor4(COLORS.DANGER, 1.0);
    ps.color2 = hexToColor4(COLORS.NEXARI_GOLD, 1.0);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.1;
    ps.maxSize = 0.5;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 200;
    ps.gravity = new Vector3(0, -4, 0);
    ps.minEmitPower = 3;
    ps.maxEmitPower = 8;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.5;
    ps.disposeOnStop = true;
    return ps;
  }

  public static createFluxEventShockwave(scene: Scene, position: Vector3): ParticleSystem {
    const ps = new ParticleSystem('fluxShockwave', MAX_PARTICLES, scene);
    ps.emitter = position;
    ps.createSphereEmitter(3.0);
    ps.color1 = hexToColor4(COLORS.NEXARI_PURPLE, 0.9);
    ps.color2 = hexToColor4(COLORS.NEXARI_CYAN, 0.9);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.2;
    ps.maxSize = 0.6;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1.5;
    ps.emitRate = 150;
    ps.gravity = new Vector3(0, 0, 0);
    ps.minEmitPower = 5;
    ps.maxEmitPower = 10;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.8;
    ps.disposeOnStop = true;
    return ps;
  }

  public static createTrailContinuous(scene: Scene, emitter: Vector3): ParticleSystem {
    const ps = new ParticleSystem('trail', 200, scene);
    ps.emitter = emitter;
    ps.createPointEmitter(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
    ps.color1 = hexToColor4(COLORS.PLAYER_CYAN, 0.8);
    ps.color2 = hexToColor4(COLORS.PLAYER_GLOW, 0.5);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.02;
    ps.maxSize = 0.15;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.6;
    ps.emitRate = 40;
    ps.gravity = new Vector3(0, -1, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    return ps;
  }

  public static createBlindBonusBurst(scene: Scene, position: Vector3): ParticleSystem {
    const ps = new ParticleSystem('blindBurst', MAX_PARTICLES, scene);
    ps.emitter = position;
    ps.createSphereEmitter(1.0);
    ps.color1 = hexToColor4(COLORS.NEXARI_GOLD, 1.0);
    ps.color2 = hexToColor4(COLORS.SUCCESS, 1.0);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.1;
    ps.maxSize = 0.4;
    ps.minLifeTime = 0.3;
    ps.maxLifeTime = 0.9;
    ps.emitRate = 120;
    ps.gravity = new Vector3(0, 2, 0);
    ps.minEmitPower = 2;
    ps.maxEmitPower = 5;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.6;
    ps.disposeOnStop = true;
    return ps;
  }

  public static createMirrorGhostParticles(scene: Scene, emitter: Vector3): ParticleSystem {
    const ps = new ParticleSystem('mirrorGhost', 150, scene);
    ps.emitter = emitter;
    ps.createPointEmitter(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5));
    ps.color1 = hexToColor4(COLORS.AI_MAGENTA, 0.6);
    ps.color2 = hexToColor4(COLORS.AI_GLOW, 0.3);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.03;
    ps.maxSize = 0.12;
    ps.minLifeTime = 0.3;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 30;
    ps.gravity = new Vector3(0, 0.5, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    return ps;
  }

  public static createNebulaAmbient(scene: Scene, center: Vector3): ParticleSystem {
    const ps = new ParticleSystem('nebulaAmbient', 300, scene);
    ps.emitter = center;
    ps.createSphereEmitter(15.0);
    ps.color1 = hexToColor4(COLORS.NEBULA_BLUE, 0.3);
    ps.color2 = hexToColor4(COLORS.DEEP_SPACE, 0.2);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.5;
    ps.maxSize = 2.0;
    ps.minLifeTime = 3.0;
    ps.maxLifeTime = 8.0;
    ps.emitRate = 10;
    ps.gravity = new Vector3(0, 0, 0);
    ps.minEmitPower = 0.1;
    ps.maxEmitPower = 0.5;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    return ps;
  }
}
