import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  TransformNode,
  ParticleSystem,
} from '@babylonjs/core';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export class VillainMeshFactory {
  /**
   * D'Anielor Kasthellanox: Black crystalline humanoid with star-map head and gold dust particles.
   */
  static createDAnielor(scene: Scene, position: Vector3): TransformNode {
    const root = new TransformNode('danielor', scene);
    root.position = position;

    // Body: elongated octahedron (crystalline)
    const body = MeshBuilder.CreatePolyhedron('danielor_body', { type: 1, size: 0.8 }, scene);
    body.scaling = new Vector3(0.6, 1.4, 0.6);
    body.parent = root;
    const bodyMat = new StandardMaterial('danielor_bodyMat', scene);
    bodyMat.diffuseColor = new Color3(0.02, 0.02, 0.05);
    bodyMat.emissiveColor = new Color3(0.03, 0.02, 0.06);
    bodyMat.specularColor = new Color3(0.8, 0.8, 1.0);
    bodyMat.specularPower = 64;
    body.material = bodyMat;

    // Head: icosphere with star-map emissive pattern
    const head = MeshBuilder.CreateIcoSphere(
      'danielor_head',
      { radius: 0.5, subdivisions: 3 },
      scene,
    );
    head.position.y = 1.8;
    head.parent = root;
    const headMat = new StandardMaterial('danielor_headMat', scene);
    headMat.diffuseColor = new Color3(0.01, 0.01, 0.02);
    headMat.emissiveColor = new Color3(0.1, 0.05, 0.2);
    headMat.specularColor = new Color3(1, 1, 1);
    head.material = headMat;

    // Star points on head (small emissive spheres)
    for (let i = 0; i < 8; i++) {
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;
      const star = MeshBuilder.CreateSphere(`danielor_star_${i}`, { diameter: 0.06 }, scene);
      star.position = new Vector3(
        Math.sin(theta) * Math.cos(phi) * 0.5,
        1.8 + Math.sin(theta) * Math.sin(phi) * 0.5,
        Math.cos(theta) * 0.5,
      );
      star.parent = root;
      const starMat = new StandardMaterial(`danielor_starMat_${i}`, scene);
      starMat.emissiveColor = new Color3(1, 0.9, 0.5);
      starMat.disableLighting = true;
      star.material = starMat;
    }

    // Gold dust particles
    const particles = new ParticleSystem('danielor_dust', 100, scene);
    particles.emitter = body;
    particles.createSphereEmitter(1.5);
    const goldRgb = hexToRgb(COLORS.NEXARI_GOLD);
    particles.color1 = new Color4(goldRgb.r, goldRgb.g, goldRgb.b, 0.8);
    particles.color2 = new Color4(goldRgb.r * 0.7, goldRgb.g * 0.7, goldRgb.b * 0.3, 0.5);
    particles.colorDead = new Color4(0, 0, 0, 0);
    particles.minSize = 0.02;
    particles.maxSize = 0.08;
    particles.minLifeTime = 1.0;
    particles.maxLifeTime = 3.0;
    particles.emitRate = 15;
    particles.gravity = new Vector3(0, 0.3, 0);
    particles.blendMode = ParticleSystem.BLENDMODE_ADD;
    particles.start();

    logger.info('VillainMeshFactory: D\'Anielor mesh created');
    return root;
  }

  /**
   * Xebasthiaan Du'Qae: Translucent capsule with amber interior glow, floating 0.33 units above surfaces.
   */
  static createXebasthiaan(scene: Scene, position: Vector3): TransformNode {
    const root = new TransformNode('xebasthiaan', scene);
    root.position = position.add(new Vector3(0, 0.33, 0));

    // Outer capsule (translucent)
    const outer = MeshBuilder.CreateCapsule(
      'xeb_outer',
      { height: 2.5, radius: 0.5, tessellation: 16 },
      scene,
    );
    outer.parent = root;
    const outerMat = new StandardMaterial('xeb_outerMat', scene);
    outerMat.diffuseColor = new Color3(0.8, 0.6, 0.2);
    outerMat.emissiveColor = new Color3(0.3, 0.2, 0.05);
    outerMat.alpha = 0.35;
    outerMat.specularColor = new Color3(1, 0.8, 0.4);
    outer.material = outerMat;

    // Inner amber glow (smaller sphere)
    const inner = MeshBuilder.CreateSphere('xeb_inner', { diameter: 0.8 }, scene);
    inner.position.y = 0.2;
    inner.parent = root;
    const innerMat = new StandardMaterial('xeb_innerMat', scene);
    innerMat.emissiveColor = new Color3(0.9, 0.6, 0.1);
    innerMat.disableLighting = true;
    innerMat.alpha = 0.7;
    inner.material = innerMat;

    logger.info('VillainMeshFactory: Xebasthiaan mesh created');
    return root;
  }

  /**
   * Ithalokk Kapas'SOX: 4 overlapping translucent mesh copies with noise displacement, phase-shifted.
   */
  static createIthalokk(scene: Scene, position: Vector3): TransformNode {
    const root = new TransformNode('ithalokk', scene);
    root.position = position;

    const phases = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const colors = [
      new Color3(0.6, 0, 0.8),
      new Color3(0.4, 0, 1.0),
      new Color3(0.8, 0.1, 0.6),
      new Color3(0.5, 0.05, 0.9),
    ];

    for (let i = 0; i < 4; i++) {
      const copy = MeshBuilder.CreateCapsule(
        `ithalokk_copy_${i}`,
        { height: 2.0, radius: 0.45, tessellation: 12 },
        scene,
      );
      copy.parent = root;
      const mat = new StandardMaterial(`ithalokk_mat_${i}`, scene);
      mat.diffuseColor = colors[i];
      mat.emissiveColor = new Color3(colors[i].r * 0.4, colors[i].g * 0.4, colors[i].b * 0.4);
      mat.alpha = 0.25;
      copy.material = mat;

      const phase = phases[i];
      const offset = 0.15;
      copy.position = new Vector3(Math.cos(phase) * offset, 0, Math.sin(phase) * offset);
    }

    // Each copy oscillates with its phase
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.001;
      const children = root.getChildMeshes();
      for (let i = 0; i < 4; i++) {
        const child = children[i];
        if (child) {
          const phase = phases[i];
          child.position.x = Math.cos(t * 0.5 + phase) * 0.15;
          child.position.z = Math.sin(t * 0.7 + phase) * 0.15;
          child.position.y = Math.sin(t * 0.3 + phase) * 0.05;
        }
      }
    });

    logger.info('VillainMeshFactory: Ithalokk mesh created');
    return root;
  }

  /**
   * D'Anielor's Eye of the Void icon — emissive torus + sphere for HUD overlay during transitions.
   */
  static createEyeOfTheVoid(scene: Scene, position: Vector3): TransformNode {
    const root = new TransformNode('eyeOfVoid', scene);
    root.position = position;

    const ring = MeshBuilder.CreateTorus(
      'eyeRing',
      { diameter: 1.0, thickness: 0.1, tessellation: 24 },
      scene,
    );
    ring.parent = root;
    const ringMat = new StandardMaterial('eyeRingMat', scene);
    const goldRgb = hexToRgb(COLORS.NEXARI_GOLD);
    ringMat.emissiveColor = new Color3(goldRgb.r, goldRgb.g, goldRgb.b);
    ringMat.disableLighting = true;
    ring.material = ringMat;

    const pupil = MeshBuilder.CreateSphere('eyePupil', { diameter: 0.4 }, scene);
    pupil.parent = root;
    const pupilMat = new StandardMaterial('eyePupilMat', scene);
    pupilMat.emissiveColor = new Color3(0.6, 0, 1.0);
    pupilMat.disableLighting = true;
    pupil.material = pupilMat;

    // Slow rotation
    scene.registerBeforeRender(() => {
      ring.rotation.y += 0.02;
      ring.rotation.x = Math.sin(performance.now() * 0.001) * 0.3;
    });

    logger.info('VillainMeshFactory: Eye of the Void created');
    return root;
  }

  /**
   * Xebasthiaan's hologram — translucent orbiting figure for FluxArena.
   */
  static createXebasthiaanHologram(
    scene: Scene,
    orbitCenter: Vector3,
    orbitRadius: number,
  ): TransformNode {
    const root = new TransformNode('xeb_hologram', scene);

    const figure = MeshBuilder.CreateCapsule(
      'xeb_holo_fig',
      { height: 1.5, radius: 0.3 },
      scene,
    );
    figure.parent = root;
    const mat = new StandardMaterial('xeb_holo_mat', scene);
    mat.emissiveColor = new Color3(0.9, 0.6, 0.1);
    mat.alpha = 0.3;
    mat.disableLighting = true;
    figure.material = mat;

    // Orbit animation
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.0005;
      root.position.x = orbitCenter.x + Math.cos(t) * orbitRadius;
      root.position.y = orbitCenter.y + 5 + Math.sin(t * 2) * 0.5;
      root.position.z = orbitCenter.z + Math.sin(t) * orbitRadius;
    });

    logger.info('VillainMeshFactory: Xebasthiaan hologram created');
    return root;
  }
}
