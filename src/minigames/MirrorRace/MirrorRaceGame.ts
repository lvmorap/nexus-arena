import {
  Scene,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  HemisphericLight,
  PointLight,
  FreeCamera,
  Mesh,
  GlowLayer,
  DefaultRenderingPipeline,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { Engine } from '../../core/Engine';
import { InputManager } from '../../core/InputManager';
import { ScreenShake } from '../../utils/ScreenShake';
import { GhostRecorder, GhostBehavior } from './GhostRecorder';
import { TrackGenerator, Obstacle } from './TrackGenerator';
import { RuleMutation } from '../../ai/FluxEngine';
import { COLORS } from '../../constants/Colors';
import { hexToRgb, clamp } from '../../utils/MathUtils';
import { logger } from '../../utils/Logger';

export interface MirrorRaceScore {
  player: number;
  ai: number;
  patternBreaks: number;
  crashes: number;
  finishTime: number;
  playerFinished: boolean;
  ghostFinished: boolean;
}

export class MirrorRaceGame {
  private _scene: Scene;
  private _engine: Engine;
  private _input: InputManager;
  private _camera!: FreeCamera;
  private _ghostRecorder: GhostRecorder;
  private _trackGenerator: TrackGenerator;

  // Meshes
  private _playerMesh!: Mesh;
  private _ghostMesh!: Mesh;
  private _trackMeshes: Mesh[] = [];
  private _obstacleMeshes: Mesh[] = [];

  // Game state
  private _score: MirrorRaceScore = {
    player: 0,
    ai: 0,
    patternBreaks: 0,
    crashes: 0,
    finishTime: 0,
    playerFinished: false,
    ghostFinished: false,
  };

  private _screenShake = new ScreenShake();
  private _isRunning = false;
  private _matchStartTime = 0;
  private _playerZ = 0;
  private _playerX = 0;
  private _playerSpeed = 15;
  private _ghostZ = 0;
  private _ghostX = 0;
  private _ghostSpeed = 14;
  private _ghostBehavior: GhostBehavior;
  private _obstacles: Obstacle[] = [];
  private _trackLength = 500;
  private _slowdownTimer = 0;
  private _playerHistoricalBias = 0;

  // UI
  private _guiTexture!: AdvancedDynamicTexture;
  private _progressText!: TextBlock;
  private _speedText!: TextBlock;
  private _announcementText!: TextBlock;
  private _instructionText!: TextBlock;
  private _scoreText!: TextBlock;
  private _commentaryText!: TextBlock;

  // Countdown
  private _countdownActive = false;
  private _countdownStartTime = 0;

  // Timers for cleanup
  private _activeIntervals: ReturnType<typeof setInterval>[] = [];
  private _activeTimeouts: ReturnType<typeof setTimeout>[] = [];

  private _onComplete: ((score: MirrorRaceScore) => void) | null = null;

  constructor(
    engine: Engine,
    input: InputManager,
    ghostRecorder: GhostRecorder,
    playerLaneBias = 0,
    mutations: RuleMutation[] = []
  ) {
    this._engine = engine;
    this._input = input;
    this._ghostRecorder = ghostRecorder;
    this._playerHistoricalBias = playerLaneBias;
    this._ghostBehavior = this._ghostRecorder.buildBehaviorModel();
    this._trackGenerator = new TrackGenerator(this._trackLength, playerLaneBias);
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.02, 0.005, 0.04, 1);

    // Apply mutations from previous rounds
    this._applyMutations(mutations);
  }

  private _applyMutations(mutations: RuleMutation[]): void {
    for (const mut of mutations) {
      switch (mut.effect) {
        case 'ARENA_SHRINK_INITIAL':
          // More obstacles in the track
          this._trackLength = 550;
          this._trackGenerator = new TrackGenerator(this._trackLength, this._playerHistoricalBias);
          logger.info('MirrorRace: Track extended due to reckless patterns');
          break;
        case 'CENTER_WEAKNESS':
          // Ghost is more predictable (stabilized mirror)
          this._ghostBehavior.speedVariance *= 0.5;
          logger.info('MirrorRace: Ghost stabilized due to center bias');
          break;
        case 'PUSH_NERF':
          // Ghost is slightly faster
          this._ghostSpeed += 0.5;
          logger.info('MirrorRace: Ghost faster due to dominance counter');
          break;
      }
    }
  }

  public get scene(): Scene {
    return this._scene;
  }

  public async setup(onComplete: (score: MirrorRaceScore) => void): Promise<void> {
    this._onComplete = onComplete;
    this._buildEnvironment();
    this._buildTrack();
    this._buildObstacles();
    this._buildPlayer();
    this._buildGhost();
    this._buildUI();
    this._startCountdown();

    this._scene.registerBeforeRender(() => {
      const dt = this._scene.getEngine().getDeltaTime() / 1000;
      this._update(dt);
    });

    logger.info('MirrorRace setup complete');
  }

  private _buildEnvironment(): void {
    // Chase camera behind player
    this._camera = new FreeCamera('camera', new Vector3(0, 5, 10), this._scene);
    this._camera.setTarget(new Vector3(0, 1, -10));

    // Ambient lighting - neon tunnel feel
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this._scene);
    hemiLight.intensity = 0.3;
    hemiLight.diffuse = new Color3(0.1, 0.05, 0.2);

    // Glow layer
    const glow = new GlowLayer('glow', this._scene);
    glow.intensity = 0.8;

    // Post-processing pipeline
    const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this._scene, [this._camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.5;
    pipeline.bloomWeight = 0.5;
    pipeline.bloomKernel = 64;
    pipeline.fxaaEnabled = true;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 3.0;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1);

    // Neon tunnel walls
    const tunnelLeft = this._createTunnelWall('left', -5);
    const tunnelRight = this._createTunnelWall('right', 5);
    this._trackMeshes.push(tunnelLeft, tunnelRight);

    // Floor
    const floor = MeshBuilder.CreateGround(
      'trackFloor',
      { width: 10, height: this._trackLength + 50 },
      this._scene
    );
    floor.position = new Vector3(0, 0, -this._trackLength / 2);
    const floorMat = new StandardMaterial('floorMat', this._scene);
    const deepSpace = hexToRgb(COLORS.DEEP_SPACE);
    floorMat.diffuseColor = new Color3(deepSpace.r, deepSpace.g, deepSpace.b);
    floorMat.emissiveColor = new Color3(0.02, 0.01, 0.04);
    floorMat.specularColor = new Color3(0.1, 0.1, 0.2);
    floor.material = floorMat;
    this._trackMeshes.push(floor);

    // Lane markers (neon lines on floor)
    for (let lane = -2; lane <= 2; lane += 2) {
      for (let seg = 0; seg < this._trackLength; seg += 10) {
        const marker = MeshBuilder.CreateBox(
          `lane_${lane}_${seg}`,
          { width: 0.05, height: 0.02, depth: 4 },
          this._scene
        );
        marker.position = new Vector3(lane, 0.01, -seg);
        const lMat = new StandardMaterial(`laneMat_${lane}_${seg}`, this._scene);
        const cyan = hexToRgb(COLORS.NEXARI_CYAN);
        lMat.emissiveColor = new Color3(cyan.r * 0.3, cyan.g * 0.3, cyan.b * 0.3);
        lMat.disableLighting = true;
        lMat.alpha = 0.4;
        marker.material = lMat;
      }
    }

    // Overhead lights at intervals
    for (let z = 0; z > -this._trackLength; z -= 30) {
      const pLight = new PointLight(`trackLight_${z}`, new Vector3(0, 6, z), this._scene);
      const purple = hexToRgb(COLORS.NEXARI_PURPLE);
      pLight.diffuse = new Color3(purple.r, purple.g, purple.b);
      pLight.intensity = 0.6;
      pLight.range = 20;
    }
  }

  private _createTunnelWall(side: string, xPos: number): Mesh {
    const wall = MeshBuilder.CreateBox(
      `wall_${side}`,
      { width: 0.3, height: 4, depth: this._trackLength + 50 },
      this._scene
    );
    wall.position = new Vector3(xPos, 2, -this._trackLength / 2);
    const wallMat = new StandardMaterial(`wallMat_${side}`, this._scene);
    const purple = hexToRgb(COLORS.NEXARI_PURPLE);
    wallMat.emissiveColor = new Color3(purple.r * 0.2, purple.g * 0.2, purple.b * 0.2);
    wallMat.diffuseColor = new Color3(0.03, 0.01, 0.06);
    wallMat.alpha = 0.8;
    wall.material = wallMat;
    return wall;
  }

  private _buildTrack(): void {
    this._obstacles = this._trackGenerator.generate();
  }

  private _buildObstacles(): void {
    for (let i = 0; i < this._obstacles.length; i++) {
      const obs = this._obstacles[i];
      let mesh: Mesh;

      switch (obs.type) {
        case 'barrier_left':
        case 'barrier_right':
        case 'barrier_center': {
          mesh = MeshBuilder.CreateBox(
            `obstacle_${i}`,
            { width: 3.5, height: 2.5, depth: 0.5 },
            this._scene
          );
          const bMat = new StandardMaterial(`obsMat_${i}`, this._scene);
          const red = hexToRgb(COLORS.NEXARI_RED);
          bMat.emissiveColor = new Color3(red.r * 0.6, red.g * 0.6, red.b * 0.6);
          bMat.diffuseColor = new Color3(red.r * 0.3, red.g * 0.3, red.b * 0.3);
          bMat.alpha = 0.8;
          mesh.material = bMat;
          break;
        }
        case 'energy_wall': {
          mesh = MeshBuilder.CreateBox(
            `obstacle_${i}`,
            { width: 8, height: 3, depth: 0.3 },
            this._scene
          );
          const eMat = new StandardMaterial(`obsMat_${i}`, this._scene);
          const gold = hexToRgb(COLORS.NEXARI_GOLD);
          eMat.emissiveColor = new Color3(gold.r * 0.5, gold.g * 0.5, gold.b * 0.5);
          eMat.alpha = 0.5;
          mesh.material = eMat;
          break;
        }
        case 'flux_portal': {
          mesh = MeshBuilder.CreateTorus(
            `obstacle_${i}`,
            { diameter: 3, thickness: 0.3, tessellation: 16 },
            this._scene
          );
          const pMat = new StandardMaterial(`obsMat_${i}`, this._scene);
          const cyan = hexToRgb(COLORS.NEXARI_CYAN);
          pMat.emissiveColor = new Color3(cyan.r, cyan.g, cyan.b);
          pMat.disableLighting = true;
          mesh.material = pMat;
          break;
        }
      }

      mesh.position = obs.position.clone();
      mesh.position.y = obs.type === 'flux_portal' ? 1.5 : 1.25;
      this._obstacleMeshes.push(mesh);
    }
  }

  private _buildPlayer(): void {
    this._playerMesh = MeshBuilder.CreateCapsule(
      'player',
      { height: 1.8, radius: 0.4, tessellation: 12 },
      this._scene
    );
    this._playerMesh.position = new Vector3(0, 0.9, 0);
    const playerMat = new StandardMaterial('playerMat', this._scene);
    const pc = hexToRgb(COLORS.PLAYER_CYAN);
    playerMat.diffuseColor = new Color3(pc.r, pc.g, pc.b);
    playerMat.emissiveColor = new Color3(pc.r * 0.5, pc.g * 0.5, pc.b * 0.5);
    playerMat.specularColor = new Color3(1, 1, 1);
    this._playerMesh.material = playerMat;

    // Player headlight
    const headlight = new PointLight('playerLight', new Vector3(0, 1, -3), this._scene);
    const cyanC = hexToRgb(COLORS.PLAYER_CYAN);
    headlight.diffuse = new Color3(cyanC.r, cyanC.g, cyanC.b);
    headlight.intensity = 1.5;
    headlight.range = 20;
    headlight.parent = this._playerMesh;
  }

  private _buildGhost(): void {
    this._ghostMesh = MeshBuilder.CreateCapsule(
      'ghost',
      { height: 1.8, radius: 0.4, tessellation: 12 },
      this._scene
    );
    this._ghostMesh.position = new Vector3(0, 0.9, 0);
    const ghostMat = new StandardMaterial('ghostMat', this._scene);
    const mc = hexToRgb(COLORS.AI_MAGENTA);
    ghostMat.diffuseColor = new Color3(mc.r, mc.g, mc.b);
    ghostMat.emissiveColor = new Color3(mc.r * 0.6, mc.g * 0.6, mc.b * 0.6);
    ghostMat.alpha = 0.6;
    this._ghostMesh.material = ghostMat;

    // Ghost trail light
    const ghostLight = new PointLight('ghostLight', new Vector3(0, 1, -2), this._scene);
    ghostLight.diffuse = new Color3(mc.r, mc.g, mc.b);
    ghostLight.intensity = 0.8;
    ghostLight.range = 10;
    ghostLight.parent = this._ghostMesh;
  }

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this._scene);

    this._progressText = new TextBlock('progress');
    this._progressText.text = 'DISTANCE: 0%';
    this._progressText.color = COLORS.NEXARI_CYAN;
    this._progressText.fontSize = 24;
    this._progressText.fontFamily = 'Orbitron, sans-serif';
    this._progressText.top = '-45%';
    this._guiTexture.addControl(this._progressText);

    this._speedText = new TextBlock('speed');
    this._speedText.text = '';
    this._speedText.color = COLORS.NEXARI_GOLD;
    this._speedText.fontSize = 20;
    this._speedText.fontFamily = 'Orbitron, sans-serif';
    this._speedText.top = '-38%';
    this._guiTexture.addControl(this._speedText);

    this._scoreText = new TextBlock('score');
    this._scoreText.text = 'PATTERN BREAKS: 0';
    this._scoreText.color = COLORS.SUCCESS;
    this._scoreText.fontSize = 18;
    this._scoreText.fontFamily = 'Rajdhani, sans-serif';
    this._scoreText.top = '-32%';
    this._guiTexture.addControl(this._scoreText);

    this._announcementText = new TextBlock('announcement');
    this._announcementText.text = '';
    this._announcementText.color = COLORS.NEXARI_PURPLE;
    this._announcementText.fontSize = 32;
    this._announcementText.fontFamily = 'Orbitron, sans-serif';
    this._announcementText.top = '0%';
    this._announcementText.alpha = 0;
    this._guiTexture.addControl(this._announcementText);

    this._instructionText = new TextBlock('instructions');
    this._instructionText.text = 'A/D or ←/→ to steer | Race past your own ghost!';
    this._instructionText.color = COLORS.NEUTRAL;
    this._instructionText.fontSize = 16;
    this._instructionText.fontFamily = 'Rajdhani, sans-serif';
    this._instructionText.top = '46%';
    this._instructionText.alpha = 0.7;
    this._guiTexture.addControl(this._instructionText);

    // Ithalokk commentary
    this._commentaryText = new TextBlock('commentary');
    this._commentaryText.text = '';
    this._commentaryText.color = COLORS.NEXARI_PURPLE;
    this._commentaryText.fontSize = 14;
    this._commentaryText.fontFamily = 'Rajdhani, sans-serif';
    this._commentaryText.top = '8%';
    this._commentaryText.alpha = 0;
    this._guiTexture.addControl(this._commentaryText);
  }

  private _startCountdown(): void {
    this._countdownActive = true;
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
        text.text = 'RACE!';
        text.fontSize = 72;
        text.color = COLORS.SUCCESS;
      } else {
        text.dispose();
        clearInterval(interval);
        this._countdownActive = false;
        this._startRace();
      }
    }, 100);
    this._activeIntervals.push(interval);
  }

  private _startRace(): void {
    this._isRunning = true;
    this._matchStartTime = performance.now();
    logger.info('MirrorRace started!');
  }

  private _update(dt: number): void {
    if (this._countdownActive || !this._isRunning) return;

    const elapsed = performance.now() - this._matchStartTime;

    // Slowdown effect from energy walls
    if (this._slowdownTimer > 0) {
      this._slowdownTimer -= dt;
      dt *= 0.5; // Halved speed during slowdown
    }

    // Player movement
    const input = this._input.getState();
    this._handlePlayerMovement(input, dt);

    // Auto-forward movement
    this._playerZ -= this._playerSpeed * dt;

    // Ghost movement
    this._updateGhost(dt, elapsed);

    // Update positions
    this._playerMesh.position.x = this._playerX;
    this._playerMesh.position.z = this._playerZ;
    this._ghostMesh.position.x = this._ghostX;
    this._ghostMesh.position.z = this._ghostZ;

    // Camera follows player
    this._camera.position = new Vector3(
      this._playerX * 0.3,
      5,
      this._playerZ + 8
    );
    this._camera.setTarget(
      new Vector3(this._playerX * 0.5, 1, this._playerZ - 10)
    );

    // Check obstacle collisions
    this._checkObstacles();

    // Check finish
    this._checkFinish(elapsed);

    const shakeOffset = this._screenShake.update(dt * 1000);
    if (shakeOffset.length() > 0) {
      this._camera.position.addInPlace(shakeOffset);
    }

    // Update UI
    this._updateUI(elapsed);
  }

  private _handlePlayerMovement(
    input: { moveLeft: boolean; moveRight: boolean },
    dt: number
  ): void {
    const laneSpeed = 12;
    if (input.moveLeft) {
      this._playerX -= laneSpeed * dt;
    }
    if (input.moveRight) {
      this._playerX += laneSpeed * dt;
    }
    // Clamp to track bounds
    this._playerX = clamp(this._playerX, -4, 4);

    // Record for ghost behavior analysis
    this._ghostRecorder.recordSample(this._playerX / 4, this._playerSpeed);
  }

  private _updateGhost(dt: number, elapsed: number): void {
    // Ghost moves forward automatically
    const ghostCurrentSpeed = this._ghostRecorder.getGhostSpeed(
      this._ghostBehavior,
      this._ghostSpeed
    );
    this._ghostZ -= ghostCurrentSpeed * dt;

    // Ghost lateral movement based on behavior model
    const targetX = this._ghostRecorder.getGhostLane(this._ghostBehavior, elapsed) * 3;
    const ghostLaneSpeed = 5;
    const diff = targetX - this._ghostX;
    if (Math.abs(diff) > 0.1) {
      this._ghostX += Math.sign(diff) * ghostLaneSpeed * dt;
    }
    this._ghostX = clamp(this._ghostX, -4, 4);

    // Ghost obstacle avoidance (simple)
    for (const obs of this._obstacles) {
      if (obs.passed) continue;
      const dz = Math.abs(this._ghostZ - obs.position.z);
      if (dz < 12 && dz > 2) {
        // Approaching obstacle - dodge
        const dx = Math.abs(this._ghostX - obs.position.x);
        if (dx < 2 && obs.type !== 'flux_portal') {
          const dodgeDir = this._ghostRecorder.getGhostDodgeDirection(
            this._ghostBehavior,
            obs.position
          );
          this._ghostX += dodgeDir * ghostLaneSpeed * dt * 1.2;
          this._ghostX = clamp(this._ghostX, -4, 4);
        }
      }
    }
  }

  private _checkObstacles(): void {
    for (let i = 0; i < this._obstacles.length; i++) {
      const obs = this._obstacles[i];
      if (obs.passed) continue;

      const dz = Math.abs(this._playerZ - obs.position.z);
      if (dz > 2) continue;

      // Mark as passed
      obs.passed = true;

      const dx = Math.abs(this._playerX - obs.position.x);

      if (obs.type === 'flux_portal') {
        if (dx < 2) {
          // Warp forward!
          this._playerZ -= 10;
          this._score.player += 1;
          this._showAnnouncement('FLUX WARP! +1', COLORS.NEXARI_CYAN);
          this._screenShake.trigger(0.2, 200);
        }
        continue;
      }

      if (obs.type === 'energy_wall') {
        // Always hits - slowdown
        this._slowdownTimer = 2;
        this._score.crashes++;
        this._showAnnouncement('ENERGY WALL!', COLORS.NEXARI_GOLD);
        continue;
      }

      // Barrier collision check
      if (dx < 2) {
        this._score.crashes++;
        this._slowdownTimer = 1.5;
        this._showAnnouncement('CRASH!', COLORS.DANGER);
        this._screenShake.trigger(0.3, 300);

        // Ithalokk on crashes
        if (this._score.crashes === 1) {
          this._commentaryText.text = '"OH. OH THIS IS NEW." — ITHALOKK';
          this._commentaryText.alpha = 0.7;
          const t = setTimeout(() => {
            this._commentaryText.alpha = 0;
          }, 2500);
          this._activeTimeouts.push(t);
        }
      } else {
        // Dodged - check if pattern break
        const dodgedSide = this._playerX > obs.position.x ? 1 : -1;
        const isPatternBreak =
          (this._playerHistoricalBias > 0 && dodgedSide < 0) ||
          (this._playerHistoricalBias < 0 && dodgedSide > 0);

        if (isPatternBreak) {
          this._score.patternBreaks++;
          this._score.player += 1;
          this._showAnnouncement('PATTERN BREAK! +1', COLORS.SUCCESS);
          obs.dodgedCorrectly = true;

          // Ithalokk commentary on pattern breaks
          this._commentaryText.text =
            '"YOUR GHOST IS MORE INTERESTING THAN YOU ARE. IMPROVE." — ITHALOKK';
          this._commentaryText.alpha = 0.7;
          const t = setTimeout(() => {
            this._commentaryText.alpha = 0;
          }, 3000);
          this._activeTimeouts.push(t);
        }
      }
    }
  }

  private _checkFinish(elapsed: number): void {
    if (!this._score.playerFinished && this._playerZ <= -this._trackLength) {
      this._score.playerFinished = true;
      this._score.finishTime = elapsed / 1000;
      this._score.player += 5; // Race finish bonus
      this._showAnnouncement('FINISH! +5', COLORS.SUCCESS);
      logger.info(`Player finished in ${this._score.finishTime.toFixed(1)}s`);
    }

    if (!this._score.ghostFinished && this._ghostZ <= -this._trackLength) {
      this._score.ghostFinished = true;
      this._score.ai += 5;
    }

    // End match when both finish or 60 seconds elapsed
    if (
      (this._score.playerFinished && this._score.ghostFinished) ||
      elapsed > 60000
    ) {
      this._endRace(elapsed);
    }
  }

  private _endRace(elapsed: number): void {
    this._isRunning = false;
    logger.info('MirrorRace ended');

    if (!this._score.playerFinished) {
      this._score.finishTime = elapsed / 1000;
    }

    // Clean run bonus
    if (this._score.crashes === 0) {
      this._score.player += 2;
      this._showAnnouncement('CLEAN RUN! +2', COLORS.NEXARI_GOLD);
    }

    // Lead time bonus
    if (this._score.playerFinished && this._score.ghostFinished) {
      const playerFinishZ = this._playerZ;
      const ghostFinishZ = this._ghostZ;
      if (playerFinishZ < ghostFinishZ) {
        const leadBonus = Math.floor(Math.abs(playerFinishZ - ghostFinishZ) / 10);
        this._score.player += leadBonus;
      }
    } else if (this._score.playerFinished && !this._score.ghostFinished) {
      this._score.player += 2; // Bonus for finishing when ghost didn't
    }

    // Ghost score for things it "did"
    this._score.ai = Math.max(this._score.ai, Math.floor(this._score.player * 0.7));

    const winner =
      this._score.player > this._score.ai ? 'YOU OUTRAN YOUR GHOST!' : 'THE GHOST PREVAILS!';
    this._showAnnouncement(
      `${winner}\n${this._score.player} - ${this._score.ai}`,
      this._score.player > this._score.ai ? COLORS.SUCCESS : COLORS.DANGER
    );

    const endTimeout = setTimeout(() => {
      if (this._onComplete) {
        this._onComplete(this._score);
      }
    }, 3000);
    this._activeTimeouts.push(endTimeout);
  }

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
    this._activeIntervals.push(fadeInterval);
  }

  private _updateUI(elapsed: number): void {
    const progress = Math.min(
      100,
      (Math.abs(this._playerZ) / this._trackLength) * 100
    );
    const ghostProgress = Math.min(
      100,
      (Math.abs(this._ghostZ) / this._trackLength) * 100
    );
    this._progressText.text = `YOU: ${progress.toFixed(0)}% | GHOST: ${ghostProgress.toFixed(0)}%`;

    const secs = Math.floor(elapsed / 1000);
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    this._speedText.text = `TIME: ${mins}:${remSecs.toString().padStart(2, '0')}`;

    this._scoreText.text = `PATTERN BREAKS: ${this._score.patternBreaks} | CRASHES: ${this._score.crashes}`;
  }

  public dispose(): void {
    for (const interval of this._activeIntervals) {
      clearInterval(interval);
    }
    this._activeIntervals = [];
    for (const timeout of this._activeTimeouts) {
      clearTimeout(timeout);
    }
    this._activeTimeouts = [];
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
