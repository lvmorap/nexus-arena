import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';

export interface Portal {
  mesh: Mesh;
  ringMesh: Mesh;
  position: Vector3;
  radius: number;
  isActive: boolean;
}

export class PortalSystem {
  private _portals: Portal[] = [];
  private _scene: Scene;
  private _nextId = 0;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  get portals(): ReadonlyArray<Portal> {
    return this._portals;
  }

  /**
   * Creates a glowing toroid/ring mesh that acts as a portal.
   */
  createPortal(position: Vector3, radius: number): Portal {
    const id = this._nextId++;

    // Glowing sphere core
    const sphere = MeshBuilder.CreateSphere(
      `portal_sphere_${id}`,
      { diameter: radius, segments: 16 },
      this._scene,
    );
    sphere.position = position.clone();

    const sphereMat = new StandardMaterial(`portalSphereMat_${id}`, this._scene);
    sphereMat.emissiveColor = new Color3(0.6, 0.1, 0.8);
    sphereMat.diffuseColor = new Color3(0.2, 0.03, 0.25);
    sphereMat.alpha = 0.6;
    sphere.material = sphereMat;

    // Torus ring
    const torus = MeshBuilder.CreateTorus(
      `portal_ring_${id}`,
      { diameter: radius * 1.5, thickness: 0.15, tessellation: 24 },
      this._scene,
    );
    torus.position = position.clone();

    const torusMat = new StandardMaterial(`portalTorusMat_${id}`, this._scene);
    torusMat.emissiveColor = new Color3(0.6, 0.1, 0.8);
    torusMat.disableLighting = true;
    torus.material = torusMat;

    const portal: Portal = {
      mesh: sphere,
      ringMesh: torus,
      position: position.clone(),
      radius,
      isActive: true,
    };

    this._portals.push(portal);
    return portal;
  }

  /**
   * Returns the first active portal that captures the ball, or null.
   * Capture occurs when the ball center is within (portal.radius + ballRadius) of the portal center.
   */
  checkCapture(ballPosition: Vector3, ballRadius: number): Portal | null {
    for (const portal of this._portals) {
      if (!portal.isActive) continue;
      const dx = ballPosition.x - portal.position.x;
      const dz = ballPosition.z - portal.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < portal.radius + ballRadius) {
        return portal;
      }
    }
    return null;
  }

  /**
   * Applies slight random drift to portal positions, making prediction harder.
   */
  driftPortals(deltaTime: number): void {
    const driftSpeed = 0.3;
    for (const portal of this._portals) {
      if (!portal.isActive) continue;
      portal.position.x += (Math.random() - 0.5) * driftSpeed * deltaTime;
      portal.position.z += (Math.random() - 0.5) * driftSpeed * deltaTime;
      portal.mesh.position.copyFrom(portal.position);
    }
  }

  dispose(): void {
    for (const portal of this._portals) {
      portal.mesh.dispose();
      portal.ringMesh.dispose();
    }
    this._portals = [];
  }
}
