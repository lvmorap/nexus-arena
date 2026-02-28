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
import { InputManager, InputState } from '../../core/InputManager';
import { ScreenShake } from '../../utils/ScreenShake';
import { NexariAdaptiveAI } from '../../ai/NexariAdaptiveAI';
import { RuleMutator, FluxEventType } from './RuleMutator';
import { RuleMutation } from '../../ai/FluxEngine';
import { COLORS } from '../../constants/Colors';
import { GAME_CONFIG } from '../../constants/GameConfig';
import { hexToRgb, distanceXZ } from '../../utils/MathUtils';
import { logger } from '../../utils/Logger';
import { accessibility } from '../../utils/AccessibilityManager';

export interface FluxArenaScore {
  player: number;
  ai: number;
  knockoffs: number;
  selfKOs: number;
  fluxEventsExploited: number;
  positionSamples: number[];
}

interface ActiveFluxEffect {
  type: FluxEventType;
  expiresAt: number;
}

export class FluxArenaGame {
  private _scene: Scene;
  private _engine: Engine;
  private _input: InputManager;
  private _ai: NexariAdaptiveAI;
  private _ruleMutator: RuleMutator;
  private _camera!: ArcRotateCamera;

  // Meshes
  private _platform!: Mesh;
  private _playerMesh!: Mesh;
  private _aiMesh!: Mesh;

  // Game state
  private _score: FluxArenaScore = {
    player: 0,
    ai: 0,
    knockoffs: 0,
    selfKOs: 0,
    fluxEventsExploited: 0,
    positionSamples: [],
  };
  private _matchStartTime = 0;
  private _lastFluxEventTime = 0;
  private _lastPushTime = 0;
  private _lastAiPushTime = 0;
  private _activeEffects: ActiveFluxEffect[] = [];
  private _arenaRadius: number;
  private _isRunning = false;
  private _matchTimeRemaining = 0;
  private _onComplete: ((score: FluxArenaScore) => void) | null = null;

  // Velocity tracking (manual since no Havok for simplicity)
  private _playerVelocity = Vector3.Zero();
  private _aiVelocity = Vector3.Zero();

  // UI
  private _guiTexture!: AdvancedDynamicTexture;
  private _scoreText!: TextBlock;
  private _timerText!: TextBlock;
  private _fluxEventText!: TextBlock;
  private _ruleText!: TextBlock;
  private _instructionText!: TextBlock;
  private _commentaryText!: TextBlock;

  // Countdown
  private _countdownActive = false;
  private _countdownStartTime = 0;

  // Inherited mutations from previous rounds
  private _initialMutations: RuleMutation[] = [];
  private _screenShake = new ScreenShake();
  private _pushPowerModifier = 1.0;
  private _playerInvisibilityCharges = 0;
  private _hasCenterWeakness = false;
  private _fluxEventInterval: number = GAME_CONFIG.FLUX_ARENA.FLUX_EVENT_INTERVAL_MS;

  // Rule overlay
  private _ruleOverlay: TextBlock | null = null;
  private _ruleOverlayVisible = false;
  private _ruleKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(engine: Engine, input: InputManager, initialMutations: RuleMutation[] = []) {
    this._engine = engine;
    this._input = input;
    this._ai = new NexariAdaptiveAI(GAME_CONFIG.FLUX_ARENA.AI_REACTION_MS);
    this._ruleMutator = new RuleMutator();
    this._arenaRadius = GAME_CONFIG.FLUX_ARENA.ARENA_RADIUS;
    this._initialMutations = initialMutations;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.02, 0.01, 0.05, 1);

    // Apply inherited mutations from DarkShot performance
    this._applyInitialMutations();
  }

  private _applyInitialMutations(): void {
    for (const mut of this._initialMutations) {
      switch (mut.effect) {
        case 'ARENA_SHRINK_INITIAL':
          this._arenaRadius *= 0.9;
          logger.info('FluxArena: Arena shrunk 10% from DarkShot scratches');
          break;
        case 'PUSH_NERF':
          this._pushPowerModifier *= 0.8;
          logger.info('FluxArena: Push power reduced 20% from dominance');
          break;
        case 'PLAYER_INVISIBILITY':
          this._playerInvisibilityCharges = 3;
          logger.info('FluxArena: Player earned 3 invisibility charges from blind mastery');
          break;
        case 'CENTER_WEAKNESS':
          this._hasCenterWeakness = true;
          logger.info('FluxArena: Center position weakens push power');
          break;
        case 'FASTER_FLUX':
          this._fluxEventInterval = GAME_CONFIG.FLUX_ARENA.FLUX_EVENT_INTERVAL_MS * 0.6;
          logger.info('FluxArena: Flux events will trigger more frequently');
          break;
      }
    }
  }

  public get scene(): Scene {
    return this._scene;
  }

  public async setup(onComplete: (score: FluxArenaScore) => void): Promise<void> {
    this._onComplete = onComplete;
    this._buildEnvironment();
    this._buildPlayer();
    this._buildAI();
    this._buildUI();
    this._startCountdown();

    this._scene.registerBeforeRender(() => {
      const dt = this._scene.getEngine().getDeltaTime() / 1000;
      this._update(dt);
    });

    logger.info('FluxArena setup complete');
  }

  private _buildEnvironment(): void {
    // Camera
    this._camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3.5,
      28,
      Vector3.Zero(),
      this._scene
    );
    this._camera.lowerRadiusLimit = 15;
    this._camera.upperRadiusLimit = 40;
    this._camera.attachControl(this._engine.canvas, false);

    // Lights
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this._scene);
    hemiLight.intensity = 0.4;
    hemiLight.diffuse = new Color3(0.3, 0.3, 0.5);

    const pointLight = new PointLight('point', new Vector3(0, 15, 0), this._scene);
    pointLight.intensity = 1.2;
    const cyan = hexToRgb(COLORS.NEXARI_CYAN);
    pointLight.diffuse = new Color3(cyan.r, cyan.g, cyan.b);

    // Glow layer
    const glow = new GlowLayer('glow', this._scene);
    glow.intensity = 0.6;

    // Post-processing pipeline
    const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this._scene, [this._camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.6;
    pipeline.bloomWeight = 0.4;
    pipeline.bloomKernel = 64;
    pipeline.fxaaEnabled = true;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.0;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1);

    // Octagonal platform
    const platformShape: Vector3[] = [];
    for (let i = 0; i < GAME_CONFIG.FLUX_ARENA.ARENA_SIDES; i++) {
      const angle = (i * 2 * Math.PI) / GAME_CONFIG.FLUX_ARENA.ARENA_SIDES;
      platformShape.push(
        new Vector3(
          Math.cos(angle) * this._arenaRadius,
          0,
          Math.sin(angle) * this._arenaRadius
        )
      );
    }

    this._platform = MeshBuilder.CreatePolygon(
      'platform',
      {
        shape: platformShape,
        depth: GAME_CONFIG.FLUX_ARENA.PLATFORM_THICKNESS,
      },
      this._scene
    );
    this._platform.position.y = -GAME_CONFIG.FLUX_ARENA.PLATFORM_THICKNESS / 2;

    const platformMat = new StandardMaterial('platformMat', this._scene);
    const floorColor = hexToRgb(COLORS.ARENA_FLOOR);
    platformMat.diffuseColor = new Color3(floorColor.r, floorColor.g, floorColor.b);
    platformMat.emissiveColor = new Color3(0.02, 0.05, 0.08);
    platformMat.specularColor = new Color3(0.1, 0.1, 0.2);
    this._platform.material = platformMat;

    // Edge markers (glowing lines)
    for (let i = 0; i < GAME_CONFIG.FLUX_ARENA.ARENA_SIDES; i++) {
      const angle1 = (i * 2 * Math.PI) / GAME_CONFIG.FLUX_ARENA.ARENA_SIDES;
      const angle2 = ((i + 1) * 2 * Math.PI) / GAME_CONFIG.FLUX_ARENA.ARENA_SIDES;
      const p1 = new Vector3(
        Math.cos(angle1) * this._arenaRadius,
        0.05,
        Math.sin(angle1) * this._arenaRadius
      );
      const p2 = new Vector3(
        Math.cos(angle2) * this._arenaRadius,
        0.05,
        Math.sin(angle2) * this._arenaRadius
      );
      const line = MeshBuilder.CreateTube(
        `edge_${i}`,
        {
          path: [p1, p2],
          radius: 0.08,
          tessellation: 6,
        },
        this._scene
      );
      const edgeMat = new StandardMaterial(`edgeMat_${i}`, this._scene);
      const purpleRgb = hexToRgb(COLORS.NEXARI_PURPLE);
      edgeMat.emissiveColor = new Color3(purpleRgb.r, purpleRgb.g, purpleRgb.b);
      edgeMat.disableLighting = true;
      line.material = edgeMat;
    }

    // Starfield background
    for (let i = 0; i < 200; i++) {
      const star = MeshBuilder.CreateSphere(`star_${i}`, { diameter: 0.1 + Math.random() * 0.15 }, this._scene);
      star.position = new Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 60 + 20,
        (Math.random() - 0.5) * 100
      );
      const starMat = new StandardMaterial(`starMat_${i}`, this._scene);
      starMat.emissiveColor = new Color3(0.7 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 1);
      starMat.disableLighting = true;
      star.material = starMat;
    }
  }

  private _buildPlayer(): void {
    // Player: angular humanoid (capsule approximation)
    this._playerMesh = MeshBuilder.CreateCapsule(
      'player',
      { height: 2, radius: 0.5, tessellation: 12 },
      this._scene
    );
    this._playerMesh.position = new Vector3(-4, 1, 0);
    const playerMat = new StandardMaterial('playerMat', this._scene);
    const pc = hexToRgb(COLORS.PLAYER_CYAN);
    playerMat.diffuseColor = new Color3(pc.r, pc.g, pc.b);
    playerMat.emissiveColor = new Color3(pc.r * 0.4, pc.g * 0.4, pc.b * 0.4);
    playerMat.specularColor = new Color3(1, 1, 1);
    this._playerMesh.material = playerMat;
  }

  private _buildAI(): void {
    // AI: organic fluid shape (icosphere)
    this._aiMesh = MeshBuilder.CreateIcoSphere(
      'ai',
      { radius: 0.7, subdivisions: 2 },
      this._scene
    );
    this._aiMesh.position = new Vector3(4, 1, 0);
    const aiMat = new StandardMaterial('aiMat', this._scene);
    const ac = hexToRgb(COLORS.AI_MAGENTA);
    aiMat.diffuseColor = new Color3(ac.r, ac.g, ac.b);
    aiMat.emissiveColor = new Color3(ac.r * 0.5, ac.g * 0.5, ac.b * 0.5);
    aiMat.specularColor = new Color3(1, 1, 1);
    this._aiMesh.material = aiMat;

    // AI eye indicator
    const eye = MeshBuilder.CreateSphere('aiEye', { diameter: 0.25 }, this._scene);
    eye.position = new Vector3(0, 0.8, 0);
    eye.parent = this._aiMesh;
    const eyeMat = new StandardMaterial('eyeMat', this._scene);
    eyeMat.emissiveColor = new Color3(1, 0, 0.6);
    eyeMat.disableLighting = true;
    eye.material = eyeMat;
  }

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this._scene);

    // Score display
    this._scoreText = new TextBlock('score');
    this._scoreText.text = 'YOU: 0  |  NEXARI: 0';
    this._scoreText.color = COLORS.NEXARI_CYAN;
    this._scoreText.fontSize = 28;
    this._scoreText.fontFamily = 'Orbitron, sans-serif';
    this._scoreText.top = '-45%';
    this._scoreText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    this._guiTexture.addControl(this._scoreText);

    // Timer
    this._timerText = new TextBlock('timer');
    this._timerText.text = '1:30';
    this._timerText.color = COLORS.NEXARI_GOLD;
    this._timerText.fontSize = 36;
    this._timerText.fontFamily = 'Orbitron, sans-serif';
    this._timerText.top = '-38%';
    this._guiTexture.addControl(this._timerText);

    // Flux event announcement
    this._fluxEventText = new TextBlock('fluxEvent');
    this._fluxEventText.text = '';
    this._fluxEventText.color = COLORS.NEXARI_PURPLE;
    this._fluxEventText.fontSize = 32;
    this._fluxEventText.fontFamily = 'Orbitron, sans-serif';
    this._fluxEventText.top = '0%';
    this._fluxEventText.alpha = 0;
    this._guiTexture.addControl(this._fluxEventText);

    // Active rules
    this._ruleText = new TextBlock('rules');
    this._ruleText.text = '';
    this._ruleText.color = COLORS.NEUTRAL;
    this._ruleText.fontSize = 16;
    this._ruleText.fontFamily = 'Rajdhani, sans-serif';
    this._ruleText.top = '40%';
    this._guiTexture.addControl(this._ruleText);

    // Instructions
    this._instructionText = new TextBlock('instructions');
    this._instructionText.text = 'WASD to move | SPACE/Click to push | Push the Nexari off the platform!';
    this._instructionText.color = COLORS.NEUTRAL;
    this._instructionText.fontSize = 16;
    this._instructionText.fontFamily = 'Rajdhani, sans-serif';
    this._instructionText.top = '46%';
    this._instructionText.alpha = 0.7;
    this._guiTexture.addControl(this._instructionText);

    // Xebasthiaan commentary (visible during flux events)
    this._commentaryText = new TextBlock('commentary');
    this._commentaryText.text = '';
    this._commentaryText.color = COLORS.NEXARI_GOLD;
    this._commentaryText.fontSize = 14;
    this._commentaryText.fontFamily = 'Rajdhani, sans-serif';
    this._commentaryText.top = '8%';
    this._commentaryText.alpha = 0;
    this._guiTexture.addControl(this._commentaryText);

    this._ruleOverlay = new TextBlock('ruleOverlay');
    this._ruleOverlay.text = 'FLUX ARENA RULES:\n• Push opponents off the platform (+2 pts)\n• Stay on the platform to survive\n• Flux Events change rules every 20s\n• Self-KO costs -1 point\n\nPress ? to close';
    this._ruleOverlay.color = COLORS.NEXARI_CYAN;
    this._ruleOverlay.fontSize = 18;
    this._ruleOverlay.fontFamily = 'Rajdhani, sans-serif';
    this._ruleOverlay.textWrapping = true;
    this._ruleOverlay.lineSpacing = '8px';
    this._ruleOverlay.isVisible = false;
    this._guiTexture.addControl(this._ruleOverlay);

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

  private _startCountdown(): void {
    this._countdownActive = true;
    this._countdownStartTime = performance.now();

    // Show inherited mutations from previous rounds
    if (this._initialMutations.length > 0) {
      const mutText = new TextBlock('inheritedMuts');
      const mutNames = this._initialMutations.map((m) => `[${m.displayName}]`).join('  ');
      mutText.text = `ACTIVE RULES: ${mutNames}`;
      mutText.color = COLORS.NEXARI_PURPLE;
      mutText.fontSize = 16;
      mutText.fontFamily = 'Rajdhani, sans-serif';
      mutText.top = '15%';
      mutText.alpha = 0.9;
      this._guiTexture.addControl(mutText);

      // Fade out after 5 seconds
      setTimeout(() => {
        let a = 0.9;
        const fade = setInterval(() => {
          a -= 0.03;
          if (a <= 0) {
            mutText.dispose();
            clearInterval(fade);
          } else {
            mutText.alpha = a;
          }
        }, 50);
      }, 5000);
    }

    const countdownText = new TextBlock('countdown');
    countdownText.text = '3';
    countdownText.color = COLORS.NEXARI_GOLD;
    countdownText.fontSize = 120;
    countdownText.fontFamily = 'Orbitron, sans-serif';
    this._guiTexture.addControl(countdownText);

    const interval = setInterval(() => {
      const elapsed = performance.now() - this._countdownStartTime;
      if (elapsed < 1000) {
        countdownText.text = '3';
      } else if (elapsed < 2000) {
        countdownText.text = '2';
      } else if (elapsed < 3000) {
        countdownText.text = '1';
      } else if (elapsed < 3800) {
        countdownText.text = 'COMPETE!';
        countdownText.fontSize = 72;
        countdownText.color = COLORS.SUCCESS;
      } else {
        countdownText.dispose();
        clearInterval(interval);
        this._countdownActive = false;
        this._startMatch();
      }
    }, 100);
  }

  private _startMatch(): void {
    this._isRunning = true;
    this._matchStartTime = performance.now();
    this._lastFluxEventTime = this._matchStartTime;
    this._matchTimeRemaining = GAME_CONFIG.FLUX_ARENA.MATCH_DURATION_MS;
    logger.info('FluxArena match started!');
  }

  private _update(dt: number): void {
    if (this._countdownActive || !this._isRunning) return;

    const now = performance.now();
    this._matchTimeRemaining = GAME_CONFIG.FLUX_ARENA.MATCH_DURATION_MS - (now - this._matchStartTime);

    if (this._matchTimeRemaining <= 0) {
      this._endMatch();
      return;
    }

    // Expire flux effects
    this._activeEffects = this._activeEffects.filter((e) => e.expiresAt === 0 || now < e.expiresAt);

    // Trigger flux events
    if (now - this._lastFluxEventTime > this._fluxEventInterval) {
      this._triggerFluxEvent();
      this._lastFluxEventTime = now;
    }

    // Check active effects
    const mirrorControls = this._hasEffect('MIRROR_CONTROLS');
    const speedBoost = this._hasEffect('SPEED_BOOST');
    const zeroG = this._hasEffect('ZERO_G_PULSE');
    const ruleReversal = this._hasEffect('RULE_REVERSAL');

    // Player movement
    const input = this._input.getState();
    this._handlePlayerMovement(input, dt, mirrorControls, speedBoost);

    // Player push
    if (input.push && now - this._lastPushTime > GAME_CONFIG.FLUX_ARENA.PUSH_COOLDOWN_MS) {
      this._playerPush(now);
      this._lastPushTime = now;
    }

    // AI update
    const scoreDiff = this._score.ai - this._score.player;
    const aiDecision = this._ai.update(
      this._aiMesh.position,
      this._playerMesh.position,
      this._arenaRadius,
      scoreDiff,
      now
    );

    // AI movement
    const aiSpeed = GAME_CONFIG.FLUX_ARENA.PLAYER_SPEED * 0.85 * (speedBoost ? 1.4 : 1);
    const targetAiVelX = aiDecision.moveDirection.x * aiSpeed;
    const targetAiVelZ = aiDecision.moveDirection.z * aiSpeed;
    this._aiVelocity.x = this._aiVelocity.x + (targetAiVelX - this._aiVelocity.x) * Math.min(1, 6 * dt);
    this._aiVelocity.z = this._aiVelocity.z + (targetAiVelZ - this._aiVelocity.z) * Math.min(1, 6 * dt);

    // AI push
    if (aiDecision.shouldPush && now - this._lastAiPushTime > GAME_CONFIG.FLUX_ARENA.PUSH_COOLDOWN_MS * 1.2) {
      this._aiPush();
      this._lastAiPushTime = now;
    }

    // Apply velocities with damping
    const damping = Math.pow(1 - GAME_CONFIG.FLUX_ARENA.LINEAR_DAMPING, dt * 60);
    this._playerVelocity.scaleInPlace(damping);
    this._aiVelocity.scaleInPlace(damping);

    this._playerMesh.position.addInPlace(this._playerVelocity.scale(dt));
    this._aiMesh.position.addInPlace(this._aiVelocity.scale(dt));

    const gravityFlip = this._hasEffect('GRAVITY_FLIP');
    if (gravityFlip) {
      this._playerMesh.position.y += 2 * dt;
      this._aiMesh.position.y += 2 * dt;
      this._playerMesh.position.y = Math.min(this._playerMesh.position.y, 6);
      this._aiMesh.position.y = Math.min(this._aiMesh.position.y, 6);
    } else if (!zeroG) {
      this._playerMesh.position.y = 1 + Math.max(0, (this._playerMesh.position.y - 1) * 0.9);
      this._aiMesh.position.y = 1 + Math.max(0, (this._aiMesh.position.y - 1) * 0.9);
      if (Math.abs(this._playerMesh.position.y - 1) < 0.05) this._playerMesh.position.y = 1;
      if (Math.abs(this._aiMesh.position.y - 1) < 0.05) this._aiMesh.position.y = 1;
    } else {
      this._playerMesh.position.y += (Math.sin(now * 0.003) * 0.01);
      this._aiMesh.position.y += (Math.cos(now * 0.003) * 0.01);
    }

    // Earthquake effect
    if (this._hasEffect('EARTHQUAKE')) {
      const shake = Math.sin(now * 0.05) * 0.4;
      const shake2 = Math.cos(now * 0.07) * 0.3;
      this._playerVelocity.x += shake * dt * 60;
      this._playerVelocity.z += shake2 * dt * 60;
      this._aiVelocity.x += shake * 0.7 * dt * 60;
      this._aiVelocity.z += shake2 * 0.7 * dt * 60;
    }

    // Track player position for stats
    const playerDist = distanceXZ(this._playerMesh.position, Vector3.Zero());
    this._score.positionSamples.push(playerDist / this._arenaRadius);

    // Fall detection
    this._checkFallOff('player', ruleReversal);
    this._checkFallOff('ai', ruleReversal);

    if (!accessibility.isReducedMotion) {
      const shakeOffset = this._screenShake.update(dt * 1000);
      if (shakeOffset.length() > 0) {
        this._camera.position.addInPlace(shakeOffset);
      }
    }

    // Update UI
    this._updateUI();
  }

  private _handlePlayerMovement(
    input: InputState,
    dt: number,
    mirrorControls: boolean,
    speedBoost: boolean
  ): void {
    const speed = GAME_CONFIG.FLUX_ARENA.PLAYER_SPEED * (speedBoost ? 1.4 : 1);
    const dir = new Vector3(0, 0, 0);

    const forward = mirrorControls ? input.moveBack : input.moveForward;
    const back = mirrorControls ? input.moveForward : input.moveBack;
    const left = mirrorControls ? input.moveRight : input.moveLeft;
    const right = mirrorControls ? input.moveLeft : input.moveRight;

    if (forward) dir.z += 1;
    if (back) dir.z -= 1;
    if (left) dir.x -= 1;
    if (right) dir.x += 1;

    if (dir.length() > 0) {
      dir.normalize();
      const targetVelX = dir.x * speed;
      const targetVelZ = dir.z * speed;
      this._playerVelocity.x = this._playerVelocity.x + (targetVelX - this._playerVelocity.x) * Math.min(1, 8 * dt);
      this._playerVelocity.z = this._playerVelocity.z + (targetVelZ - this._playerVelocity.z) * Math.min(1, 8 * dt);
    }
  }

  private _playerPush(now: number): void {
    const direction = this._aiMesh.position.subtract(this._playerMesh.position);
    const dist = direction.length();
    if (dist > 5) return; // Too far

    direction.normalize();
    let power = GAME_CONFIG.FLUX_ARENA.PUSH_POWER * (1 - dist / 8) * this._pushPowerModifier;

    // CENTER_WEAKNESS mutation: reduce push power when near center
    if (this._hasCenterWeakness) {
      const playerDist = distanceXZ(this._playerMesh.position, Vector3.Zero());
      if (playerDist < this._arenaRadius * 0.3) {
        power *= 0.6;
      }
    }

    this._aiVelocity.addInPlace(direction.scale(power));
    this._screenShake.trigger(0.1, 150);

    // Small self knockback
    this._playerVelocity.addInPlace(direction.scale(-power * 0.15));

    // Use invisibility charge on push (brief visual feedback)
    if (this._playerInvisibilityCharges > 0) {
      this._playerInvisibilityCharges--;
      const pMat = this._playerMesh.material as StandardMaterial;
      pMat.alpha = 0.3;
      setTimeout(() => {
        pMat.alpha = 1.0;
      }, 1500);
      this._showFluxText('SHADOW STEP ACTIVATED!', COLORS.NEXARI_PURPLE);
    }

    // Check if scored within 3s of flux event
    const timeSinceFlux = now - this._lastFluxEventTime;
    if (timeSinceFlux < 3000 && timeSinceFlux > 0) {
      this._score.fluxEventsExploited++;
    }

    // Visual feedback - brief color flash
    this._flashMesh(this._playerMesh, COLORS.SUCCESS);
  }

  private _aiPush(): void {
    const direction = this._playerMesh.position.subtract(this._aiMesh.position);
    const dist = direction.length();
    if (dist > 5) return;

    direction.normalize();
    const power = GAME_CONFIG.FLUX_ARENA.PUSH_POWER * 0.8 * (1 - dist / 8);
    this._playerVelocity.addInPlace(direction.scale(power));
    this._aiVelocity.addInPlace(direction.scale(-power * 0.15));

    this._flashMesh(this._aiMesh, COLORS.DANGER);
  }

  private _flashMesh(mesh: Mesh, color: string): void {
    const mat = mesh.material as StandardMaterial;
    const rgb = hexToRgb(color);
    const originalEmissive = mat.emissiveColor.clone();
    mat.emissiveColor = new Color3(rgb.r, rgb.g, rgb.b);
    setTimeout(() => {
      mat.emissiveColor = originalEmissive;
    }, 150);
  }

  private _checkFallOff(who: 'player' | 'ai', ruleReversal: boolean): void {
    const mesh = who === 'player' ? this._playerMesh : this._aiMesh;
    const dist = distanceXZ(mesh.position, Vector3.Zero());

    if (dist > this._arenaRadius + 1) {
      this._screenShake.trigger(0.2, 300);
      if (who === 'player') {
        if (ruleReversal) {
          this._score.player += 1;
          this._showFluxText('RULE REVERSAL — YOU SCORED!', COLORS.SUCCESS);
        } else {
          this._score.ai += GAME_CONFIG.SCORING.KNOCKOFF;
          this._score.selfKOs++;
          this._showFluxText('YOU FELL!', COLORS.DANGER);
        }
        this._playerMesh.position = new Vector3(-3, 1, 0);
        this._playerVelocity = Vector3.Zero();
      } else {
        if (ruleReversal) {
          this._score.ai += 1;
        } else {
          this._score.player += GAME_CONFIG.SCORING.KNOCKOFF;
          this._score.knockoffs++;
          this._showFluxText('KNOCKOFF! +2', COLORS.SUCCESS);
        }
        this._aiMesh.position = new Vector3(3, 1, 0);
        this._aiVelocity = Vector3.Zero();
      }
    }
  }

  private _triggerFluxEvent(): void {
    const event = this._ruleMutator.getNextEvent();
    logger.info(`Flux Event: ${event.displayName}`);
    this._ai.onFluxEvent();
    this._screenShake.trigger(0.4, 500);

    // Show announcement
    this._showFluxText(`⚡ ${event.displayName} ⚡\n${event.description}`, COLORS.NEXARI_PURPLE);

    // Xebasthiaan commentary during flux events
    const xebasthiaanLines = [
      '"PERFORMANCE: ADEQUATE. POTENTIAL: STILL UNMEASURED." — XEBASTHIAAN',
      '"THE SCORE DOES NOT CONCERN ME. YOUR METHOD DOES." — XEBASTHIAAN',
      '"YOU FIGHT LIKE A SPECIES THAT HAS NEVER LOST EVERYTHING." — XEBASTHIAAN',
    ];
    const commentIdx = this._activeEffects.length % xebasthiaanLines.length;
    this._commentaryText.text = xebasthiaanLines[commentIdx];
    this._commentaryText.alpha = 0.7;
    setTimeout(() => {
      this._commentaryText.alpha = 0;
    }, 3000);

    // Apply effect
    if (event.type === 'ARENA_SHRINK') {
      this._arenaRadius *= 0.85;
      this._rebuildPlatformEdges();
    }

    if (event.durationMs > 0) {
      this._activeEffects.push({
        type: event.type,
        expiresAt: performance.now() + event.durationMs,
      });
    }

    // Update active rules display
    this._updateRulesDisplay();
  }

  private _rebuildPlatformEdges(): void {
    // Scale the platform mesh to reflect smaller arena
    const scale = this._arenaRadius / GAME_CONFIG.FLUX_ARENA.ARENA_RADIUS;
    this._platform.scaling = new Vector3(scale, 1, scale);
  }

  private _showFluxText(text: string, color: string): void {
    this._fluxEventText.text = text;
    this._fluxEventText.color = color;
    this._fluxEventText.alpha = 1;
    this._fluxEventText.fontSize = 32;

    // Fade out
    let alpha = 1;
    const fadeInterval = setInterval(() => {
      alpha -= 0.02;
      if (alpha <= 0) {
        this._fluxEventText.alpha = 0;
        clearInterval(fadeInterval);
      } else {
        this._fluxEventText.alpha = alpha;
      }
    }, 50);
  }

  private _hasEffect(type: FluxEventType): boolean {
    return this._activeEffects.some((e) => e.type === type);
  }

  private _updateRulesDisplay(): void {
    const activeNames = this._activeEffects.map((e) => `[${e.type.replace(/_/g, ' ')}]`);
    this._ruleText.text = activeNames.length > 0 ? `Active: ${activeNames.join(' ')}` : '';
  }

  private _updateUI(): void {
    this._scoreText.text = `YOU: ${this._score.player}  |  NEXARI: ${this._score.ai}`;

    const secs = Math.max(0, Math.ceil(this._matchTimeRemaining / 1000));
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    this._timerText.text = `${mins}:${remainSecs.toString().padStart(2, '0')}`;

    if (secs <= 10) {
      this._timerText.color = COLORS.DANGER;
    }
  }

  private _endMatch(): void {
    this._isRunning = false;
    logger.info('FluxArena match ended');

    // Calculate average position
    const avgPos =
      this._score.positionSamples.length > 0
        ? this._score.positionSamples.reduce((a, b) => a + b, 0) / this._score.positionSamples.length
        : 0.5;

    const finalScore: FluxArenaScore = {
      ...this._score,
      positionSamples: [avgPos],
    };

    // Show end announcement
    const winner = this._score.player > this._score.ai ? 'HUMANITY PREVAILS!' : 'NEXARI TRIUMPH!';
    this._showFluxText(
      `${winner}\nFinal: ${this._score.player} - ${this._score.ai}`,
      this._score.player > this._score.ai ? COLORS.SUCCESS : COLORS.DANGER
    );

    setTimeout(() => {
      if (this._onComplete) {
        this._onComplete(finalScore);
      }
    }, 3000);
  }

  public dispose(): void {
    if (this._ruleKeyHandler) window.removeEventListener('keydown', this._ruleKeyHandler);
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
