import {
  Scene,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  HemisphericLight,
  PointLight,
  ArcRotateCamera,
  Mesh,
  GlowLayer,
  DefaultRenderingPipeline,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { Engine } from '../../core/Engine';
import { InputManager } from '../../core/InputManager';
import { ScreenShake } from '../../utils/ScreenShake';
import { COLORS } from '../../constants/Colors';
import { GAME_CONFIG } from '../../constants/GameConfig';
import { hexToRgb, randomRange, clamp } from '../../utils/MathUtils';
import { logger } from '../../utils/Logger';
import { accessibility } from '../../utils/AccessibilityManager';

export interface DarkShotScore {
  player: number;
  ai: number;
  blindPockets: number;
  litPockets: number;
  scratches: number;
  avgShotPower: number;
  totalShots: number;
}

interface Orb {
  mesh: Mesh;
  velocity: Vector3;
  light: PointLight;
  isCue: boolean;
  isActive: boolean;
  cbShape?: Mesh;
}

interface Portal {
  mesh: Mesh;
  torusMesh: Mesh;
  position: Vector3;
}

type TurnOwner = 'player' | 'ai';
type ShotPhase = 'countdown' | 'aiming' | 'shooting' | 'ai_turn' | 'ended';

export class DarkShotGame {
  private _scene: Scene;
  private _engine: Engine;
  private _input: InputManager;
  private _camera!: ArcRotateCamera;

  // Game objects
  private _table!: Mesh;
  private _orbs: Orb[] = [];
  private _cueOrb!: Orb;
  private _portals: Portal[] = [];

  // Game state
  private _score: DarkShotScore = {
    player: 0,
    ai: 0,
    blindPockets: 0,
    litPockets: 0,
    scratches: 0,
    avgShotPower: 0,
    totalShots: 0,
  };
  private _currentRound = 1;
  private _currentTurn: TurnOwner = 'player';
  private _phase: ShotPhase = 'countdown';
  private _totalPowerSum = 0;
  private _onComplete: ((score: DarkShotScore) => void) | null = null;

  // Aiming state
  private _isAiming = false;
  private _aimStartX = 0;
  private _aimStartZ = 0;
  private _aimEndX = 0;
  private _aimEndZ = 0;

  // Pointer handlers (stored for cleanup)
  private _pointerDownHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerUpHandler: ((e: PointerEvent) => void) | null = null;

  // UI
  private _guiTexture!: AdvancedDynamicTexture;
  private _scoreText!: TextBlock;
  private _turnText!: TextBlock;
  private _roundText!: TextBlock;
  private _announcementText!: TextBlock;
  private _instructionText!: TextBlock;
  private _commentaryText!: TextBlock;

  // Countdown
  private _countdownStartTime = 0;

  // AI
  private _aiDelayTimer = 0;
  private _aiHasShot = false;

  // Visual effects
  private _activeSquashes: { mesh: Mesh; startTime: number; dur: number }[] = [];
  private _screenShake = new ScreenShake();

  // Rule overlay
  private _ruleOverlay: TextBlock | null = null;
  private _ruleOverlayVisible = false;
  private _ruleKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Config shortcut
  private readonly _cfg = GAME_CONFIG.DARK_SHOT;

  // Judgment Orb
  private _judgmentOrb: Orb | null = null;
  private _centralPortal: Portal | null = null;

  // D'Anielor's Mirror
  private _mirrorMesh: Mesh | null = null;
  private _duplicatedOrbs: Set<Mesh> = new Set();

  // Ithalokk's Ghost Hands
  private _ghostHandTimer = 0;
  private _ghostHandInterval = 10;

  constructor(engine: Engine, input: InputManager) {
    this._engine = engine;
    this._input = input;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.02, 0.01, 0.03, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public async setup(onComplete: (score: DarkShotScore) => void): Promise<void> {
    this._onComplete = onComplete;
    this._buildEnvironment();
    this._buildTable();
    this._buildPortals();
    this._buildOrbs();
    this._buildUI();
    this._setupPointerInput();
    this._setupAccessibility();
    this._buildCentralPortal();
    this._buildJudgmentOrb();
    this._startCountdown();

    this._scene.registerBeforeRender(() => {
      const dt = this._scene.getEngine().getDeltaTime() / 1000;
      this._update(dt);
    });

    logger.info('DarkShot setup complete');
  }

  /* ------------------------------------------------------------------ */
  /*  Environment                                                        */
  /* ------------------------------------------------------------------ */

  private _buildEnvironment(): void {
    this._camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 4,
      25,
      Vector3.Zero(),
      this._scene,
    );
    this._camera.lowerRadiusLimit = 15;
    this._camera.upperRadiusLimit = 40;
    this._camera.attachControl(this._engine.canvas, false);

    // Very dim ambient light (darkness theme)
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this._scene);
    hemiLight.intensity = 0.15;
    hemiLight.diffuse = new Color3(0.2, 0.2, 0.3);

    // Glow layer for portals & orbs
    const glow = new GlowLayer('glow', this._scene);
    glow.intensity = 0.8;

    // Post-processing pipeline
    const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this._scene, [this._camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.7;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;
    pipeline.fxaaEnabled = true;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.5;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1);

    // Starfield
    for (let i = 0; i < 200; i++) {
      const star = MeshBuilder.CreateSphere(
        `star_${i}`,
        { diameter: 0.1 + Math.random() * 0.15 },
        this._scene,
      );
      star.position = new Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 60 + 20,
        (Math.random() - 0.5) * 100,
      );
      const mat = new StandardMaterial(`starMat_${i}`, this._scene);
      mat.emissiveColor = new Color3(
        0.7 + Math.random() * 0.3,
        0.7 + Math.random() * 0.3,
        1,
      );
      mat.disableLighting = true;
      star.material = mat;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Table                                                              */
  /* ------------------------------------------------------------------ */

  private _buildTable(): void {
    const shape: Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6;
      shape.push(
        new Vector3(
          Math.cos(angle) * this._cfg.TABLE_RADIUS,
          0,
          Math.sin(angle) * this._cfg.TABLE_RADIUS,
        ),
      );
    }

    this._table = MeshBuilder.CreatePolygon(
      'table',
      { shape, depth: this._cfg.TABLE_DEPTH },
      this._scene,
    );
    this._table.position.y = -this._cfg.TABLE_DEPTH / 2;

    const tableMat = new StandardMaterial('tableMat', this._scene);
    const fc = hexToRgb(COLORS.DEEP_SPACE);
    tableMat.diffuseColor = new Color3(fc.r, fc.g, fc.b);
    tableMat.emissiveColor = new Color3(0.01, 0.02, 0.04);
    tableMat.specularColor = new Color3(0.05, 0.05, 0.1);
    this._table.material = tableMat;

    // Edge lines
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);
    for (let i = 0; i < 6; i++) {
      const a1 = (i * 2 * Math.PI) / 6;
      const a2 = ((i + 1) * 2 * Math.PI) / 6;
      const p1 = new Vector3(Math.cos(a1) * this._cfg.TABLE_RADIUS, 0.05, Math.sin(a1) * this._cfg.TABLE_RADIUS);
      const p2 = new Vector3(Math.cos(a2) * this._cfg.TABLE_RADIUS, 0.05, Math.sin(a2) * this._cfg.TABLE_RADIUS);
      const edge = MeshBuilder.CreateTube(
        `edge_${i}`,
        { path: [p1, p2], radius: 0.06, tessellation: 6 },
        this._scene,
      );
      const eMat = new StandardMaterial(`edgeMat_${i}`, this._scene);
      eMat.emissiveColor = new Color3(purple.r * 0.3, purple.g * 0.3, purple.b * 0.3);
      eMat.disableLighting = true;
      edge.material = eMat;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Portals                                                            */
  /* ------------------------------------------------------------------ */

  private _buildPortals(): void {
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);

    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6;
      const pos = new Vector3(
        Math.cos(angle) * this._cfg.TABLE_RADIUS,
        0.2,
        Math.sin(angle) * this._cfg.TABLE_RADIUS,
      );

      // Glowing sphere
      const sphere = MeshBuilder.CreateSphere(
        `portal_${i}`,
        { diameter: this._cfg.PORTAL_RADIUS },
        this._scene,
      );
      sphere.position = pos.clone();
      const sMat = new StandardMaterial(`portalMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(purple.r, purple.g, purple.b);
      sMat.diffuseColor = new Color3(purple.r * 0.3, purple.g * 0.3, purple.b * 0.3);
      sMat.alpha = 0.6;
      sphere.material = sMat;

      // Ring
      const torus = MeshBuilder.CreateTorus(
        `portalRing_${i}`,
        { diameter: this._cfg.PORTAL_RADIUS * 1.5, thickness: 0.15, tessellation: 24 },
        this._scene,
      );
      torus.position = pos.clone();
      const tMat = new StandardMaterial(`torusMat_${i}`, this._scene);
      tMat.emissiveColor = new Color3(purple.r, purple.g, purple.b);
      tMat.disableLighting = true;
      torus.material = tMat;

      // Portal light
      const pLight = new PointLight(`portalLight_${i}`, pos.clone(), this._scene);
      pLight.diffuse = new Color3(purple.r, purple.g, purple.b);
      pLight.intensity = 0.5;
      pLight.range = 4;

      this._portals.push({ mesh: sphere, torusMesh: torus, position: pos });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Orbs                                                               */
  /* ------------------------------------------------------------------ */

  private _buildOrbs(): void {
    this._cueOrb = this._createOrb('cueOrb', new Vector3(0, this._cfg.CUE_ORB_RADIUS, 3), true);
    this._orbs.push(this._cueOrb);

    const positions = [
      new Vector3(0, this._cfg.ORB_RADIUS, -2),
      new Vector3(1.5, this._cfg.ORB_RADIUS, -3),
      new Vector3(-1.5, this._cfg.ORB_RADIUS, -3),
      new Vector3(0.8, this._cfg.ORB_RADIUS, -4.5),
      new Vector3(-0.8, this._cfg.ORB_RADIUS, -4.5),
    ];

    for (let i = 0; i < this._cfg.NUM_ORBS; i++) {
      this._orbs.push(this._createOrb(`orb_${i}`, positions[i], false));
    }
  }

  private _createOrb(name: string, position: Vector3, isCue: boolean): Orb {
    const radius = isCue ? this._cfg.CUE_ORB_RADIUS : this._cfg.ORB_RADIUS;
    const mesh = MeshBuilder.CreateSphere(
      name,
      { diameter: radius * 2, segments: 16 },
      this._scene,
    );
    mesh.position = position.clone();

    const mat = new StandardMaterial(`${name}Mat`, this._scene);
    if (isCue) {
      const c = hexToRgb(COLORS.PLAYER_CYAN);
      mat.diffuseColor = new Color3(c.r, c.g, c.b);
      mat.emissiveColor = new Color3(c.r * 0.4, c.g * 0.4, c.b * 0.4);
    } else {
      const c = hexToRgb(COLORS.NEXARI_GOLD);
      mat.diffuseColor = new Color3(c.r, c.g, c.b);
      mat.emissiveColor = new Color3(c.r * 0.3, c.g * 0.3, c.b * 0.3);
    }
    mat.specularColor = new Color3(1, 1, 1);
    mesh.material = mat;

    const light = new PointLight(`${name}Light`, position.clone(), this._scene);
    if (isCue) {
      const c = hexToRgb(COLORS.PLAYER_CYAN);
      light.diffuse = new Color3(c.r, c.g, c.b);
      light.intensity = 0.8;
    } else {
      const c = hexToRgb(COLORS.NEXARI_GOLD);
      light.diffuse = new Color3(c.r, c.g, c.b);
      light.intensity = 0.3;
    }
    light.range = 6;

    const cbShape = this._createColorBlindShape(`${name}_cb`, isCue, radius);
    cbShape.parent = mesh;
    cbShape.position.y = radius + 0.2;
    cbShape.isVisible = accessibility.isColorBlind;

    return { mesh, velocity: Vector3.Zero(), light, isCue, isActive: true, cbShape };
  }

  private _createColorBlindShape(name: string, isCue: boolean, orbRadius: number): Mesh {
    const size = orbRadius * 1.5;
    let shape: Mesh;
    if (isCue) {
      shape = MeshBuilder.CreateBox(name, { size: size * 0.5 }, this._scene);
      shape.rotation.y = Math.PI / 4;
    } else {
      shape = MeshBuilder.CreateCylinder(name, { height: 0.1, diameter: size, tessellation: 3 }, this._scene);
    }
    const mat = new StandardMaterial(`${name}Mat`, this._scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    shape.material = mat;
    return shape;
  }

  /* ------------------------------------------------------------------ */
  /*  UI                                                                 */
  /* ------------------------------------------------------------------ */

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this._scene);

    this._scoreText = new TextBlock('score');
    this._scoreText.text = 'YOU: 0 | NEXARI: 0';
    this._scoreText.color = COLORS.NEXARI_CYAN;
    this._scoreText.fontSize = 28;
    this._scoreText.fontFamily = 'Orbitron, sans-serif';
    this._scoreText.top = '-45%';
    this._scoreText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    this._guiTexture.addControl(this._scoreText);

    this._turnText = new TextBlock('turn');
    this._turnText.text = 'YOUR TURN';
    this._turnText.color = COLORS.NEXARI_GOLD;
    this._turnText.fontSize = 24;
    this._turnText.fontFamily = 'Orbitron, sans-serif';
    this._turnText.top = '-38%';
    this._guiTexture.addControl(this._turnText);

    this._roundText = new TextBlock('round');
    this._roundText.text = 'Round 1/7';
    this._roundText.color = COLORS.NEUTRAL;
    this._roundText.fontSize = 20;
    this._roundText.fontFamily = 'Rajdhani, sans-serif';
    this._roundText.top = '-32%';
    this._guiTexture.addControl(this._roundText);

    this._announcementText = new TextBlock('announcement');
    this._announcementText.text = '';
    this._announcementText.color = COLORS.NEXARI_PURPLE;
    this._announcementText.fontSize = 36;
    this._announcementText.fontFamily = 'Orbitron, sans-serif';
    this._announcementText.top = '0%';
    this._announcementText.alpha = 0;
    this._guiTexture.addControl(this._announcementText);

    this._instructionText = new TextBlock('instructions');
    this._instructionText.text = 'Click and drag from the cue orb to aim and shoot';
    this._instructionText.color = COLORS.NEUTRAL;
    this._instructionText.fontSize = 16;
    this._instructionText.fontFamily = 'Rajdhani, sans-serif';
    this._instructionText.top = '46%';
    this._instructionText.alpha = 0.7;
    this._guiTexture.addControl(this._instructionText);

    // Ithalokk ghost hands commentary
    this._commentaryText = new TextBlock('commentary');
    this._commentaryText.text = '';
    this._commentaryText.color = COLORS.NEXARI_PURPLE;
    this._commentaryText.fontSize = 14;
    this._commentaryText.fontFamily = 'Rajdhani, sans-serif';
    this._commentaryText.top = '8%';
    this._commentaryText.alpha = 0;
    this._guiTexture.addControl(this._commentaryText);

    this._ruleOverlay = new TextBlock('ruleOverlay');
    this._ruleOverlay.text = 'DARK SHOT RULES:\n• Drag from the cue orb to aim and shoot\n• Pocket orbs into portals to score\n• Blind portals (no light): +3\n• Shadow portals: +2\n• Lit portals: +1\n• Pocketing the cue orb is a scratch (-1)\n\nPress ? to close';
    this._ruleOverlay.color = COLORS.NEXARI_CYAN;
    this._ruleOverlay.fontSize = 18;
    this._ruleOverlay.fontFamily = 'Rajdhani, sans-serif';
    this._ruleOverlay.textWrapping = true;
    this._ruleOverlay.lineSpacing = '8px';
    this._ruleOverlay.isVisible = false;
    this._guiTexture.addControl(this._ruleOverlay);
  }

  private _setupAccessibility(): void {
    accessibility.onColorBlindChange(() => {
      for (const orb of this._orbs) {
        if (orb.cbShape) {
          orb.cbShape.isVisible = accessibility.isColorBlind;
        }
      }
    });

    this._ruleKeyHandler = (e: KeyboardEvent): void => {
      if (e.key === '?') {
        this._ruleOverlayVisible = !this._ruleOverlayVisible;
        if (this._ruleOverlay) {
          this._ruleOverlay.isVisible = this._ruleOverlayVisible;
        }
      }
    };
    window.addEventListener('keydown', this._ruleKeyHandler);
  }

  /* ------------------------------------------------------------------ */
  /*  Pointer / Aiming                                                   */
  /* ------------------------------------------------------------------ */

  private _setupPointerInput(): void {
    const canvas = this._engine.canvas;

    this._pointerDownHandler = (_e: PointerEvent): void => {
      if (this._phase !== 'aiming' || this._currentTurn !== 'player') return;
      const pick = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
      if (!pick?.hit || !pick.pickedPoint) return;

      const dx = pick.pickedPoint.x - this._cueOrb.mesh.position.x;
      const dz = pick.pickedPoint.z - this._cueOrb.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2.0) {
        this._isAiming = true;
        this._aimStartX = this._cueOrb.mesh.position.x;
        this._aimStartZ = this._cueOrb.mesh.position.z;
        this._aimEndX = pick.pickedPoint.x;
        this._aimEndZ = pick.pickedPoint.z;
      }
    };

    this._pointerMoveHandler = (_e: PointerEvent): void => {
      if (!this._isAiming) return;
      const pick = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
      if (pick?.hit && pick.pickedPoint) {
        this._aimEndX = pick.pickedPoint.x;
        this._aimEndZ = pick.pickedPoint.z;
        this._updateAimLine();
      }
    };

    this._pointerUpHandler = (_e: PointerEvent): void => {
      if (!this._isAiming) return;
      this._isAiming = false;

      const dx = this._aimEndX - this._aimStartX;
      const dz = this._aimEndZ - this._aimStartZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 0.3) {
        this._clearAimLine();
        return;
      }

      // Shot direction is opposite of drag
      const dirX = -dx / distance;
      const dirZ = -dz / distance;
      const power = clamp(distance / 8, 0, 1) * this._cfg.MAX_SHOT_POWER;

      this._shootCue(new Vector3(dirX, 0, dirZ), power);
      this._clearAimLine();
    };

    canvas.addEventListener('pointerdown', this._pointerDownHandler);
    canvas.addEventListener('pointermove', this._pointerMoveHandler);
    canvas.addEventListener('pointerup', this._pointerUpHandler);
  }

  private _updateAimLine(): void {
    this._clearAimLine();

    const dx = this._aimEndX - this._aimStartX;
    const dz = this._aimEndZ - this._aimStartZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) return;

    // Direction opposite of drag
    const dirX = -dx / dist;
    const dirZ = -dz / dist;
    const power = clamp(dist / 8, 0, 1);
    const lineLen = power * 10;
    const numSegs = 8;
    const segLen = lineLen / numSegs;
    const cueX = this._cueOrb.mesh.position.x;
    const cueZ = this._cueOrb.mesh.position.z;
    const cyan = hexToRgb(COLORS.PLAYER_CYAN);

    for (let i = 0; i < numSegs; i += 2) {
      const s = i * segLen;
      const e = (i + 1) * segLen;
      const p1 = new Vector3(cueX + dirX * s, 0.3, cueZ + dirZ * s);
      const p2 = new Vector3(cueX + dirX * e, 0.3, cueZ + dirZ * e);

      // Only draw in illuminated zones
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;
      if (!this._isPointLit(midX, midZ)) continue;

      const seg = MeshBuilder.CreateTube(
        `aimSeg_${i}`,
        { path: [p1, p2], radius: 0.04, tessellation: 6 },
        this._scene,
      );
      const mat = new StandardMaterial(`aimSegMat_${i}`, this._scene);
      mat.emissiveColor = new Color3(cyan.r, cyan.g, cyan.b);
      mat.disableLighting = true;
      mat.alpha = 0.6;
      seg.material = mat;
    }
  }

  private _clearAimLine(): void {
    const toDispose = this._scene.meshes.filter((m) => m.name.startsWith('aimSeg_'));
    for (const m of toDispose) {
      m.dispose();
    }
  }

  private _isPointLit(px: number, pz: number): boolean {
    for (const orb of this._orbs) {
      if (!orb.isActive) continue;
      const dx = px - orb.mesh.position.x;
      const dz = pz - orb.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 6) return true;
    }
    return false;
  }

  private _shootCue(direction: Vector3, power: number): void {
    this._cueOrb.velocity = direction.scale(power);
    this._cueOrb.velocity.y = 0;
    this._phase = 'shooting';
    this._totalPowerSum += power / this._cfg.MAX_SHOT_POWER;
    this._score.totalShots++;
    logger.info(`Player shot: power=${power.toFixed(2)}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Countdown                                                          */
  /* ------------------------------------------------------------------ */

  private _startCountdown(): void {
    this._phase = 'countdown';
    this._countdownStartTime = performance.now();

    const text = new TextBlock('countdown');
    text.text = '3';
    text.color = COLORS.NEXARI_GOLD;
    text.fontSize = 120;
    text.fontFamily = 'Orbitron, sans-serif';
    this._guiTexture.addControl(text);

    const interval = setInterval(() => {
      const elapsed = performance.now() - this._countdownStartTime;
      if (elapsed < 1000) {
        text.text = '3';
      } else if (elapsed < 2000) {
        text.text = '2';
      } else if (elapsed < 3000) {
        text.text = '1';
      } else if (elapsed < 3800) {
        text.text = 'BREAK!';
        text.fontSize = 72;
        text.color = COLORS.SUCCESS;
      } else {
        text.dispose();
        clearInterval(interval);
        this._phase = 'aiming';
        logger.info('DarkShot match started!');
      }
    }, 100);
  }

  /* ------------------------------------------------------------------ */
  /*  Main update loop                                                   */
  /* ------------------------------------------------------------------ */

  private _update(dt: number): void {
    if (this._phase === 'countdown' || this._phase === 'ended') return;
    if (this._engine.isPaused) return;

    const now = performance.now();

    this._animatePortals(now);
    this._updateOrbPhysics(dt);
    this._updateOrbLights();
    this._checkOrbCollisions();
    this._checkTableBoundary();
    this._checkPortalCollisions();
    this._updateGhostHands(dt);
    this._updateMirror();

    if (this._phase === 'shooting' && this._areAllOrbsStopped()) {
      this._onShotComplete();
    }

    if (this._phase === 'ai_turn') {
      this._updateAI(dt);
    }

    this._updateSquashStretch();

    if (!accessibility.isReducedMotion) {
      const shakeOffset = this._screenShake.update(dt * 1000);
      if (shakeOffset.length() > 0) {
        this._camera.position.addInPlace(shakeOffset);
      }
    }

    this._updateUI();
  }

  /* ------------------------------------------------------------------ */
  /*  Physics & collisions                                               */
  /* ------------------------------------------------------------------ */

  private _animatePortals(now: number): void {
    for (let i = 0; i < this._portals.length; i++) {
      const pulse = 0.9 + Math.sin(now * 0.003 + i) * 0.1;
      this._portals[i].torusMesh.scaling = new Vector3(pulse, pulse, pulse);
    }
  }

  private _updateSquashStretch(): void {
    if (accessibility.isReducedMotion) {
      this._activeSquashes.forEach((s) => { s.mesh.scaling = new Vector3(1, 1, 1); });
      this._activeSquashes = [];
      return;
    }
    const now = performance.now();
    this._activeSquashes = this._activeSquashes.filter((s) => {
      const t = (now - s.startTime) / s.dur;
      if (t >= 1) {
        s.mesh.scaling = new Vector3(1, 1, 1);
        return false;
      }
      const elastic = t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
      const scaleX = 1 + (0.4) * (1 - elastic);
      const scaleY = 1 - (0.3) * (1 - elastic);
      s.mesh.scaling = new Vector3(scaleX, scaleY, scaleX);
      return true;
    });
  }

  private _updateOrbPhysics(dt: number): void {
    const damping = Math.pow(1 - this._cfg.LINEAR_DAMPING, dt * 60);

    for (const orb of this._orbs) {
      if (!orb.isActive) continue;
      orb.velocity.scaleInPlace(damping);

      const toCenter = Vector3.Zero().subtract(orb.mesh.position);
      toCenter.y = 0;
      const centerDist = toCenter.length();
      if (centerDist > 1) {
        toCenter.normalize();
        orb.velocity.addInPlace(toCenter.scale(this._cfg.ORBITAL_DRIFT_FORCE * dt));
      }

      orb.mesh.position.addInPlace(orb.velocity.scale(dt));

      // Keep at table surface height
      const r = orb.isCue ? this._cfg.CUE_ORB_RADIUS : this._cfg.ORB_RADIUS;
      orb.mesh.position.y = r;

      // Sync light
      orb.light.position.copyFrom(orb.mesh.position);
      orb.light.position.y += 0.5;

      // Kill tiny velocities
      if (orb.velocity.length() < this._cfg.MIN_VELOCITY_THRESHOLD) {
        orb.velocity = Vector3.Zero();
      }
    }
  }

  private _updateOrbLights(): void {
    for (const orb of this._orbs) {
      if (!orb.isActive) {
        orb.light.intensity = 0;
        continue;
      }
      const speed = orb.velocity.length();
      orb.light.intensity = orb.isCue
        ? 0.8 + clamp(speed * 0.3, 0, 1.5)
        : 0.3 + clamp(speed * 0.4, 0, 2.0);
    }
  }

  private _checkOrbCollisions(): void {
    for (let i = 0; i < this._orbs.length; i++) {
      const a = this._orbs[i];
      if (!a.isActive) continue;
      for (let j = i + 1; j < this._orbs.length; j++) {
        const b = this._orbs[j];
        if (!b.isActive) continue;

        const rA = a.isCue ? this._cfg.CUE_ORB_RADIUS : this._cfg.ORB_RADIUS;
        const rB = b.isCue ? this._cfg.CUE_ORB_RADIUS : this._cfg.ORB_RADIUS;
        const minDist = rA + rB;

        const diff = a.mesh.position.subtract(b.mesh.position);
        diff.y = 0;
        const dist = diff.length();

        if (dist < minDist && dist > 0.001) {
          const normal = diff.normalize();
          const relVel = a.velocity.subtract(b.velocity);
          const velAlongNormal = Vector3.Dot(relVel, normal);
          if (velAlongNormal > 0) continue; // already separating

          const impulse = (-(1 + this._cfg.RESTITUTION) * velAlongNormal) / 2;
          a.velocity.addInPlace(normal.scale(impulse));
          b.velocity.addInPlace(normal.scale(-impulse));

          // Separate overlapping orbs
          const overlap = minDist - dist;
          a.mesh.position.addInPlace(normal.scale(overlap / 2));
          b.mesh.position.addInPlace(normal.scale(-overlap / 2));

          // Squash & stretch on collision
          const squashDuration = 180;
          const squashA = { mesh: a.mesh, startTime: performance.now(), dur: squashDuration };
          const squashB = { mesh: b.mesh, startTime: performance.now(), dur: squashDuration };
          this._activeSquashes.push(squashA, squashB);
          a.mesh.scaling = new Vector3(1.4, 0.7, 1.4);
          b.mesh.scaling = new Vector3(1.4, 0.7, 1.4);

          this._screenShake.trigger(0.08, 100);
        }
      }
    }
  }

  private _checkTableBoundary(): void {
    for (const orb of this._orbs) {
      if (!orb.isActive) continue;

      const dist = Math.sqrt(
        orb.mesh.position.x * orb.mesh.position.x +
          orb.mesh.position.z * orb.mesh.position.z,
      );
      const r = orb.isCue ? this._cfg.CUE_ORB_RADIUS : this._cfg.ORB_RADIUS;
      const maxDist = this._cfg.TABLE_RADIUS - r;

      // Allow orbs near portals to pass through (portal zones)
      if (this._isNearPortal(orb.mesh.position)) continue;

      if (dist > maxDist) {
        const nx = orb.mesh.position.x / dist;
        const nz = orb.mesh.position.z / dist;
        const normal = new Vector3(nx, 0, nz);

        const dot = Vector3.Dot(orb.velocity, normal);
        if (dot > 0) {
          orb.velocity.subtractInPlace(normal.scale(2 * dot));
          orb.velocity.scaleInPlace(0.7);
        }
        orb.mesh.position.x = nx * maxDist;
        orb.mesh.position.z = nz * maxDist;
      }
    }
  }

  private _isNearPortal(pos: Vector3): boolean {
    for (const portal of this._portals) {
      const dx = pos.x - portal.position.x;
      const dz = pos.z - portal.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.5) return true;
    }
    return false;
  }

  private _checkPortalCollisions(): void {
    for (const orb of this._orbs) {
      if (!orb.isActive) continue;
      // Judgment orb can only be pocketed through the central portal
      if (orb === this._judgmentOrb) continue;
      for (const portal of this._portals) {
        const dx = orb.mesh.position.x - portal.position.x;
        const dz = orb.mesh.position.z - portal.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
          this._onOrbPocketed(orb);
          break;
        }
      }
    }

    // Judgment Orb: check against central portal only
    if (this._judgmentOrb?.isActive && this._centralPortal) {
      const dx = this._judgmentOrb.mesh.position.x - this._centralPortal.position.x;
      const dz = this._judgmentOrb.mesh.position.z - this._centralPortal.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
        this._onJudgmentOrbPocketed();
      }
    }
  }

  private _onOrbPocketed(orb: Orb): void {
    if (orb.isCue) {
      // Scratch
      if (this._currentTurn === 'player') {
        this._score.player -= 1;
      } else {
        this._score.ai -= 1;
      }
      this._score.scratches++;
      this._showAnnouncement('SCRATCH! -1', COLORS.DANGER);
      this._screenShake.trigger(0.15, 200);
      logger.info('Scratch! Cue orb pocketed');

      // Reset cue
      orb.velocity = Vector3.Zero();
      orb.mesh.position = new Vector3(0, this._cfg.CUE_ORB_RADIUS, 3);
      orb.light.position = orb.mesh.position.clone();
      return;
    }

    // Determine pocket type
    const pocketType = this._determinePocketType(orb);
    let points: number;
    let label: string;

    if (pocketType === 'blind') {
      points = 3;
      label = 'BLIND PORTAL! +3';
      this._score.blindPockets++;
      this._screenShake.trigger(0.4, 400);

      // Ithalokk's ghost hands commentary on blind shots
      this._commentaryText.text =
        '"THEY CHOOSE BLINDNESS. THEY REWARD BOLDNESS." — ITHALOKK\'S NOTES';
      this._commentaryText.alpha = 0.6;
      setTimeout(() => {
        this._commentaryText.alpha = 0;
      }, 3000);
    } else if (pocketType === 'shadow') {
      points = 2;
      label = 'SHADOW PORTAL! +2';
    } else {
      points = 1;
      label = 'LIT PORTAL! +1';
      this._score.litPockets++;
    }

    if (this._currentTurn === 'player') {
      this._score.player += points;
    } else {
      this._score.ai += points;
    }

    const color =
      points >= 3 ? COLORS.NEXARI_GOLD : points >= 2 ? COLORS.NEXARI_PURPLE : COLORS.SUCCESS;
    this._showAnnouncement(label, color);
    logger.info(`Orb pocketed: ${pocketType}, ${this._currentTurn} +${points}`);

    // Deactivate orb
    orb.isActive = false;
    orb.mesh.setEnabled(false);
    orb.light.intensity = 0;
    orb.velocity = Vector3.Zero();
  }

  private _determinePocketType(orb: Orb): 'blind' | 'shadow' | 'lit' {
    let closestDist = Infinity;
    for (const other of this._orbs) {
      if (other === orb || !other.isActive) continue;
      const dx = orb.mesh.position.x - other.mesh.position.x;
      const dz = orb.mesh.position.z - other.mesh.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < closestDist) closestDist = d;
    }

    if (closestDist > this._cfg.BLIND_DISTANCE) return 'blind';
    if (closestDist > this._cfg.BLIND_DISTANCE * 0.5) return 'shadow';
    return 'lit';
  }

  private _areAllOrbsStopped(): boolean {
    for (const orb of this._orbs) {
      if (!orb.isActive) continue;
      if (orb.velocity.length() > this._cfg.MIN_VELOCITY_THRESHOLD) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Turn management                                                    */
  /* ------------------------------------------------------------------ */

  private _onShotComplete(): void {
    const activeTargets = this._orbs.filter((o) => !o.isCue && o.isActive).length;

    if (activeTargets === 0 || this._currentRound > this._cfg.TOTAL_ROUNDS) {
      this._endMatch();
      return;
    }

    if (this._currentTurn === 'player') {
      this._currentTurn = 'ai';
      this._phase = 'ai_turn';
      this._aiDelayTimer = 0;
      this._aiHasShot = false;
    } else {
      this._currentTurn = 'player';
      this._currentRound++;

      // Spawn D'Anielor's Mirror at round 3
      if (this._currentRound === 3 && !this._mirrorMesh) {
        this._spawnMirror();
      }

      if (this._currentRound > this._cfg.TOTAL_ROUNDS) {
        this._endMatch();
        return;
      }

      this._phase = 'aiming';
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Advanced Mechanics                                                  */
  /* ------------------------------------------------------------------ */

  private _buildCentralPortal(): void {
    const gold = hexToRgb(COLORS.NEXARI_GOLD);
    const pos = new Vector3(0, 0.2, 0);

    const sphere = MeshBuilder.CreateSphere(
      'centralPortal',
      { diameter: this._cfg.PORTAL_RADIUS },
      this._scene,
    );
    sphere.position = pos.clone();
    const sMat = new StandardMaterial('centralPortalMat', this._scene);
    sMat.emissiveColor = new Color3(gold.r, gold.g, gold.b);
    sMat.diffuseColor = new Color3(gold.r * 0.3, gold.g * 0.3, gold.b * 0.3);
    sMat.alpha = 0.5;
    sphere.material = sMat;

    const torus = MeshBuilder.CreateTorus(
      'centralPortalRing',
      { diameter: this._cfg.PORTAL_RADIUS * 1.5, thickness: 0.15, tessellation: 24 },
      this._scene,
    );
    torus.position = pos.clone();
    const tMat = new StandardMaterial('centralTorusMat', this._scene);
    tMat.emissiveColor = new Color3(gold.r, gold.g, gold.b);
    tMat.disableLighting = true;
    torus.material = tMat;

    const pLight = new PointLight('centralPortalLight', pos.clone(), this._scene);
    pLight.diffuse = new Color3(gold.r, gold.g, gold.b);
    pLight.intensity = 0.6;
    pLight.range = 4;

    this._centralPortal = { mesh: sphere, torusMesh: torus, position: pos };
    logger.info('DarkShot: Central portal built');
  }

  private _buildJudgmentOrb(): void {
    const gold = hexToRgb(COLORS.NEXARI_GOLD);
    const mesh = MeshBuilder.CreateTorusKnot(
      'judgmentOrb',
      { radius: 0.35, tube: 0.12, radialSegments: 32, tubularSegments: 12 },
      this._scene,
    );
    mesh.position = new Vector3(0, 0.5, 2);

    const mat = new StandardMaterial('judgmentOrbMat', this._scene);
    mat.diffuseColor = new Color3(gold.r, gold.g, gold.b);
    mat.emissiveColor = new Color3(gold.r * 0.6, gold.g * 0.6, gold.b * 0.6);
    mat.specularColor = new Color3(1, 1, 1);
    mesh.material = mat;

    const light = new PointLight('judgmentOrbLight', new Vector3(0, 1, 2), this._scene);
    light.diffuse = new Color3(gold.r, gold.g, gold.b);
    light.intensity = 0.8;
    light.range = 6;

    this._judgmentOrb = { mesh, velocity: Vector3.Zero(), light, isCue: false, isActive: true };
    this._orbs.push(this._judgmentOrb);
    logger.info('DarkShot: Judgment Orb placed');
  }

  private _onJudgmentOrbPocketed(): void {
    if (!this._judgmentOrb) return;
    this._judgmentOrb.isActive = false;
    this._judgmentOrb.mesh.setEnabled(false);
    this._judgmentOrb.light.intensity = 0;
    this._judgmentOrb.velocity = Vector3.Zero();

    this._score.player = 0;
    this._score.ai = 0;
    this._showAnnouncement('JUDGMENT! ALL SCORES RESET!', COLORS.DANGER);
    this._screenShake.trigger(0.5, 500);
    this._commentaryText.text = '"THE JUDGMENT ORB SPARES NO ONE." — ITHALOKK';
    this._commentaryText.alpha = 0.8;
    setTimeout(() => { this._commentaryText.alpha = 0; }, 4000);
    logger.info('DarkShot: Judgment Orb pocketed — all scores reset');
  }

  private _spawnMirror(): void {
    const gold = hexToRgb(COLORS.NEXARI_GOLD);
    this._mirrorMesh = MeshBuilder.CreatePlane(
      'danielorMirror',
      { width: 4, height: 2 },
      this._scene,
    );
    const angle = randomRange(0, Math.PI * 2);
    const dist = randomRange(2, this._cfg.TABLE_RADIUS * 0.6);
    this._mirrorMesh.position = new Vector3(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);
    this._mirrorMesh.rotation.y = angle;

    const mat = new StandardMaterial('mirrorMat', this._scene);
    mat.emissiveColor = new Color3(gold.r * 0.4, gold.g * 0.4, gold.b * 0.4);
    mat.diffuseColor = new Color3(gold.r * 0.2, gold.g * 0.2, gold.b * 0.2);
    mat.alpha = 0.35;
    this._mirrorMesh.material = mat;

    this._duplicatedOrbs.clear();
    this._showAnnouncement("D'ANIELOR'S MIRROR APPEARS!", COLORS.NEXARI_GOLD);
    logger.info("DarkShot: D'Anielor's Mirror spawned");
  }

  private _updateMirror(): void {
    if (!this._mirrorMesh) return;

    this._mirrorMesh.rotation.y += 0.001;

    const mirrorPos = this._mirrorMesh.position;
    const mirrorAngle = this._mirrorMesh.rotation.y;
    const mirrorNormalX = Math.sin(mirrorAngle);
    const mirrorNormalZ = Math.cos(mirrorAngle);

    for (const orb of this._orbs) {
      if (!orb.isActive || orb.isCue) continue;
      if (this._duplicatedOrbs.has(orb.mesh)) continue;

      const dx = orb.mesh.position.x - mirrorPos.x;
      const dz = orb.mesh.position.z - mirrorPos.z;
      const dotPos = dx * mirrorNormalX + dz * mirrorNormalZ;
      const distAlongPlane = Math.abs(dx * (-mirrorNormalZ) + dz * mirrorNormalX);

      if (Math.abs(dotPos) < 0.5 && distAlongPlane < 2 && orb.velocity.length() > 0.5) {
        this._duplicateOrb(orb);
        this._duplicatedOrbs.add(orb.mesh);
      }
    }
  }

  private _duplicateOrb(original: Orb): void {
    const gold = hexToRgb(COLORS.NEXARI_GOLD);
    const newOrb = this._createOrb(
      `mirror_orb_${this._orbs.length}`,
      original.mesh.position.clone(),
      false,
    );

    newOrb.velocity = new Vector3(
      original.velocity.x * 0.8 + randomRange(-1, 1),
      0,
      original.velocity.z * 0.8 + randomRange(-1, 1),
    );

    const mat = newOrb.mesh.material as StandardMaterial;
    mat.diffuseColor = new Color3(gold.r, gold.g, gold.b);
    mat.emissiveColor = new Color3(gold.r * 0.5, gold.g * 0.5, gold.b * 0.5);

    this._orbs.push(newOrb);
    this._duplicatedOrbs.add(newOrb.mesh);
    this._showAnnouncement("D'ANIELOR'S MIRROR DUPLICATES!", COLORS.NEXARI_GOLD);
    logger.info("DarkShot: Orb duplicated by D'Anielor's Mirror");
  }

  private _updateGhostHands(dt: number): void {
    this._ghostHandTimer += dt;
    if (this._ghostHandTimer < this._ghostHandInterval) return;

    this._ghostHandTimer = 0;
    this._ghostHandInterval = randomRange(8, 12);

    const candidates = this._orbs.filter((o) => !o.isCue && o.isActive && o !== this._judgmentOrb);
    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)];

    target.velocity.addInPlace(new Vector3(
      randomRange(-2, 2),
      0,
      randomRange(-2, 2),
    ));

    // Visual: brief ghost hand at orb position
    const hand = MeshBuilder.CreateBox(
      'ghostHand',
      { width: 0.8, height: 0.3, depth: 0.5 },
      this._scene,
    );
    hand.position = target.mesh.position.clone();
    hand.position.y += 0.5;
    const handMat = new StandardMaterial('ghostHandMat', this._scene);
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);
    handMat.emissiveColor = new Color3(purple.r, purple.g, purple.b);
    handMat.alpha = 0.5;
    handMat.disableLighting = true;
    hand.material = handMat;

    setTimeout(() => {
      if (!hand.isDisposed()) hand.dispose();
    }, 800);

    this._showAnnouncement('ITHALOKK INTERFERES!', COLORS.NEXARI_PURPLE);
    this._commentaryText.text = '"MY HANDS ARE EVERYWHERE." — ITHALOKK';
    this._commentaryText.alpha = 0.7;
    setTimeout(() => { this._commentaryText.alpha = 0; }, 2500);
    logger.info('DarkShot: Ghost hand pushed an orb');
  }

  /* ------------------------------------------------------------------ */
  /*  AI                                                                 */
  /* ------------------------------------------------------------------ */

  private _updateAI(dt: number): void {
    this._aiDelayTimer += dt * 1000;
    if (this._aiDelayTimer >= this._cfg.AI_DELAY_MS && !this._aiHasShot) {
      this._aiShoot();
      this._aiHasShot = true;
    }
  }

  private _aiShoot(): void {
    // Pick target orb closest to any portal
    let bestOrb: Orb | null = null;
    let bestDist = Infinity;

    for (const orb of this._orbs) {
      if (orb.isCue || !orb.isActive) continue;
      for (const portal of this._portals) {
        const dx = orb.mesh.position.x - portal.position.x;
        const dz = orb.mesh.position.z - portal.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < bestDist) {
          bestDist = d;
          bestOrb = orb;
        }
      }
    }

    if (!bestOrb) return;

    // Direction from cue to target
    const toTarget = bestOrb.mesh.position.subtract(this._cueOrb.mesh.position);
    toTarget.y = 0;
    const len = toTarget.length();
    if (len < 0.01) return;
    toTarget.scaleInPlace(1 / len);

    // Add angular variance
    const variance = randomRange(-this._cfg.AI_AIM_VARIANCE, this._cfg.AI_AIM_VARIANCE);
    const cosV = Math.cos(variance);
    const sinV = Math.sin(variance);
    const aimDir = new Vector3(
      toTarget.x * cosV - toTarget.z * sinV,
      0,
      toTarget.x * sinV + toTarget.z * cosV,
    );

    const power =
      randomRange(this._cfg.AI_POWER_MIN, this._cfg.AI_POWER_MAX) * this._cfg.MAX_SHOT_POWER;
    this._cueOrb.velocity = aimDir.scale(power);
    this._phase = 'shooting';
    this._totalPowerSum += power / this._cfg.MAX_SHOT_POWER;
    this._score.totalShots++;

    logger.info(`AI shot: power=${power.toFixed(2)}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Announcements & UI                                                 */
  /* ------------------------------------------------------------------ */

  private _showAnnouncement(text: string, color: string): void {
    this._announcementText.text = text;
    this._announcementText.color = color;
    this._announcementText.alpha = 1;

    let alpha = 1;
    const fadeInterval = setInterval(() => {
      alpha -= 0.02;
      if (alpha <= 0) {
        this._announcementText.alpha = 0;
        clearInterval(fadeInterval);
      } else {
        this._announcementText.alpha = alpha;
      }
    }, 50);
  }

  private _updateUI(): void {
    this._scoreText.text = `YOU: ${this._score.player} | NEXARI: ${this._score.ai}`;
    this._roundText.text = `Round ${Math.min(this._currentRound, this._cfg.TOTAL_ROUNDS)}/${this._cfg.TOTAL_ROUNDS}`;

    if (this._currentTurn === 'player') {
      this._turnText.text = 'YOUR TURN';
      this._turnText.color = COLORS.PLAYER_CYAN;
    } else {
      this._turnText.text = "NEXARI'S TURN";
      this._turnText.color = COLORS.AI_MAGENTA;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  End                                                                */
  /* ------------------------------------------------------------------ */

  private _endMatch(): void {
    this._phase = 'ended';
    logger.info('DarkShot match ended');

    const winner =
      this._score.player >= this._score.ai ? 'HUMANITY PREVAILS!' : 'NEXARI TRIUMPH!';
    this._showAnnouncement(
      `${winner}\nFinal: ${this._score.player} - ${this._score.ai}`,
      this._score.player >= this._score.ai ? COLORS.SUCCESS : COLORS.DANGER,
    );

    this._score.avgShotPower =
      this._score.totalShots > 0 ? this._totalPowerSum / this._score.totalShots : 0;

    setTimeout(() => {
      if (this._onComplete) {
        this._onComplete(this._score);
      }
    }, 3000);
  }

  public dispose(): void {
    const canvas = this._engine.canvas;
    if (this._pointerDownHandler) canvas.removeEventListener('pointerdown', this._pointerDownHandler);
    if (this._pointerMoveHandler) canvas.removeEventListener('pointermove', this._pointerMoveHandler);
    if (this._pointerUpHandler) canvas.removeEventListener('pointerup', this._pointerUpHandler);
    if (this._ruleKeyHandler) window.removeEventListener('keydown', this._ruleKeyHandler);
    if (this._mirrorMesh && !this._mirrorMesh.isDisposed()) this._mirrorMesh.dispose();
    if (this._judgmentOrb?.mesh && !this._judgmentOrb.mesh.isDisposed()) this._judgmentOrb.mesh.dispose();
    if (this._centralPortal?.mesh && !this._centralPortal.mesh.isDisposed()) this._centralPortal.mesh.dispose();
    if (this._centralPortal?.torusMesh && !this._centralPortal.torusMesh.isDisposed()) this._centralPortal.torusMesh.dispose();
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
