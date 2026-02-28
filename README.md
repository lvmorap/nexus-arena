# NEXUS ARENA
## Game Jam: "Reinventing Competition" | TypeScript + Babylon.js + AI

---

> **READ THIS ENTIRE PROMPT BEFORE WRITING A SINGLE LINE OF CODE.**
> You are a senior TypeScript game developer and systems architect building a polished,
> complete game for an EA Game Jam. The theme is **"Reinventing Competition"**.
> You will build **NEXUS ARENA: The Last Earth Sport** — a 3D browser game where
> humanity's survival depends on competing in sports whose rules change based on how you play.
> Before proceeding, confirm you understand: the theme is not decorative — it IS the engine
> driving every mechanic, every scoring system, and every design decision.

---

## ━━━ SECTION 0 — PROJECT IDENTITY ━━━

### Elevator Pitch
Earth has been contacted by the **Nexari** — an alien civilization that refuses war.
Their offer: a three-round trial called the **Nexus Arena**. Win, and humanity earns the right
to exist in the shared star system. Lose, and Earth is peacefully relocated to a distant corner
of the galaxy.

The twist: the Nexari designed the sports by studying human games (pool, racing, arena combat)
and then **broke every rule** they found. In the Nexus Arena, the rules themselves are the
competition. The sports are alive. They learn. They adapt. They reflect your play style back
at you — and then invert it.

### The Core Axiom This Breaks
In traditional competition, rules are fixed and mastery means learning to beat the rules.
In NEXUS ARENA, **your mastery rewrites the rules**. Score through precision? The next round
punishes precision. Dominate through chaos? The chaos becomes the weapon against you.
Competition is no longer about who executes best under fixed conditions —
it's about who adapts fastest when the conditions are designed to defeat them specifically.

This is "Reinventing Competition" as a first principle, not a decoration.

### Narrative Arc (Beginning → Middle → End)
- **ACT I (Menu + Tutorial):** Earth receives the Nexari transmission. A holographic ambassador
  explains the rules. The player is humanity's chosen champion.
- **ACT II (3 Mini-Games):** Three escalating rounds in the Nexus Arena. Each round's rules
  are reshaped by the player's previous performance.
- **ACT III (End Screen):** Victory or defeat. The Nexari react. The fate of Earth is revealed.
  A post-match debrief shows how the rules evolved in response to YOU.

---

## ━━━ SECTION 1 — TECHNICAL STACK (ABSOLUTE) ━━━

### Build System
```
Vite 5.x            — Fast dev server + optimized production build
TypeScript 5.x       — Strict mode enabled (strictNullChecks, noImplicitAny)
ESLint 9.x           — @typescript-eslint/recommended + game-specific rules
Prettier 3.x         — Standard config, 100-char line width, single quotes
```

### Core Libraries (install via npm, import as ES modules)
```
babylon.js@7.x       — 3D rendering engine (WebGL2 + WebGPU ready)
@babylonjs/havok     — Havok physics plugin (built into Babylon 7, WASM-based, production-grade)
@babylonjs/gui       — Babylon built-in 2D GUI overlay system
howler@2.x           — Audio engine with Web Audio API fallback
@tensorflow/tfjs@4.x — Browser neural network inference
@tensorflow-models/hand-pose-detection — MediaPipe HandPose (optional camera mode)
@mediapipe/hands     — MediaPipe WASM runtime for hand tracking
```

### Dev Dependencies
```
@types/node
vite-plugin-wasm     — Required for Havok + MediaPipe WASM
vite-plugin-top-level-await
gh-pages             — GitHub Pages deployment helper
```

### Configuration Files Required
- `tsconfig.json` — strict TypeScript, target ES2022, module NodeNext
- `eslint.config.js` — flat config, TypeScript rules
- `.prettierrc` — standard JSON config
- `vite.config.ts` — WASM plugin, base path for GitHub Pages (`/nexus-arena/`)
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD

---

## ━━━ SECTION 2 — REPOSITORY STRUCTURE ━━━

```
nexus-arena/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions workflow
├── public/
│   ├── assets/
│   │   ├── audio/
│   │   │   ├── music/          ← Procedurally generated or CDN-linked audio
│   │   │   └── sfx/
│   │   ├── models/             ← 3D models (.glb format, CC0 from kenney.nl or Sketchfab)
│   │   └── textures/           ← Textures (.basis or .png, CC0)
│   └── fonts/                  ← Orbitron + Rajdhani (self-hosted from Google Fonts)
├── src/
│   ├── core/
│   │   ├── Engine.ts           ← Babylon.js engine wrapper + scene lifecycle
│   │   ├── GameStateMachine.ts ← FSM: BOOT → INTRO → MENU → TUTORIAL → GAME → RESULTS
│   │   ├── AudioManager.ts     ← Howler.js wrapper + adaptive music
│   │   ├── InputManager.ts     ← Keyboard, mouse, gamepad, gesture unification
│   │   └── AssetLoader.ts      ← Centralized async asset loading with progress tracking
│   ├── ai/
│   │   ├── NexariAdaptiveAI.ts ← Adaptive AI opponent (State Machine + pattern learning)
│   │   ├── FluxEngine.ts       ← Rule mutation system — the heart of "Reinventing Competition"
│   │   └── CameraIntelligence.ts ← TensorFlow.js + MediaPipe hand pose detection
│   ├── scenes/
│   │   ├── BootScene.ts        ← Asset preload, font load, WASM init
│   │   ├── IntroScene.ts       ← Cinematic: Nexari transmission + Earth narrative
│   │   ├── MenuScene.ts        ← Animated main menu with live 3D background
│   │   ├── TutorialScene.ts    ← Interactive 5-step tutorial inside the 3D world
│   │   ├── TransitionScene.ts  ← Rule-mutation reveal between mini-games
│   │   └── ResultsScene.ts     ← End screen: fate of Earth + rule evolution debrief
│   ├── minigames/
│   │   ├── MiniGameBase.ts     ← Abstract base: setup(), update(), teardown(), getScore()
│   │   ├── DarkShot/           ← Mini-game 1: 3D zero-gravity billiards (BLIND BREAK evolved)
│   │   │   ├── DarkShotGame.ts
│   │   │   ├── BallPhysics.ts
│   │   │   ├── PortalSystem.ts
│   │   │   └── FogOfWarSystem.ts
│   │   ├── FluxArena/          ← Mini-game 2: 3D arena with live rule mutations
│   │   │   ├── FluxArenaGame.ts
│   │   │   ├── ArenaPhysics.ts
│   │   │   └── RuleMutator.ts
│   │   └── MirrorRace/         ← Mini-game 3: Race against your own neural ghost
│   │       ├── MirrorRaceGame.ts
│   │       ├── GhostRecorder.ts
│   │       └── TrackGenerator.ts
│   ├── entities/
│   │   ├── Player.ts           ← Player entity with mesh, physics body, score
│   │   ├── NexariOpponent.ts   ← AI opponent entity
│   │   └── FluxOrb.ts          ← Interactive physics object used across mini-games
│   ├── ui/
│   │   ├── HUD.ts              ← In-game GUI (Babylon GUI): score, timer, rule display
│   │   ├── RuleDisplay.ts      ← Animated rule-change announcements
│   │   └── Minimap.ts          ← Optional minimap for FluxArena
│   ├── utils/
│   │   ├── Tween.ts            ← Lightweight tween engine (easeOutBack, easeOutElastic, etc.)
│   │   ├── ParticleFactory.ts  ← Babylon.js particle system wrappers
│   │   ├── MathUtils.ts        ← Vector math helpers, clamping, interpolation
│   │   └── Logger.ts           ← Typed logger for debug/prod environments
│   ├── constants/
│   │   ├── Colors.ts           ← All color constants (no magic hex strings in code)
│   │   ├── Physics.ts          ← All physics constants
│   │   ├── Audio.ts            ← Sound keys, volume levels
│   │   └── GameConfig.ts       ← Centralized game configuration
│   └── main.ts                 ← Entry point: engine init → boot scene
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
└── README.md
```

---

## ━━━ SECTION 3 — GITHUB ACTIONS DEPLOYMENT ━━━

### `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### `package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write src",
    "format:check": "prettier --check src",
    "preview": "vite preview"
  }
}
```

---

## ━━━ SECTION 4 — VISUAL & ARTISTIC DIRECTION ━━━

### Color Palette
```typescript
// src/constants/Colors.ts
export const COLORS = {
  // Nexari UI
  NEXARI_CYAN: '#00f5ff',
  NEXARI_PURPLE: '#9b00ff',
  NEXARI_GOLD: '#ffd700',
  NEXARI_RED: '#ff2244',
  
  // Environment
  VOID_BLACK: '#030308',
  DEEP_SPACE: '#080818',
  NEBULA_BLUE: '#0a1a3a',
  ARENA_FLOOR: '#0d1f2d',
  
  // Game states
  DANGER: '#ff4422',
  SUCCESS: '#00ff88',
  NEUTRAL: '#aabbcc',
  
  // Human / Player
  PLAYER_CYAN: '#00e5ff',
  PLAYER_GLOW: '#00aaff',
  
  // Nexari / AI
  AI_MAGENTA: '#ff00aa',
  AI_GLOW: '#cc0088',
} as const;
```

### Typography
- **Orbitron** (Google Fonts CDN) — Used for: HUD numbers, game title, score display, countdowns
- **Rajdhani** (Google Fonts CDN) — Used for: body text, instructions, narrative text, tooltips
- Self-host both fonts in `/public/fonts/` for offline reliability

### 3D Art Direction
- **Aesthetic**: Alien bioluminescent tech — dark backgrounds with neon energy lines, holographic displays, floating geometry
- **Player avatar**: Angular humanoid robot with glowing cyan joints (built from Babylon.js primitives + emissive materials)
- **Nexari opponents**: Fluid, organic shapes with magenta particle effects (procedural, no external models required)
- **Arena environments**: Each mini-game has its own theme:
  - DarkShot: Black void with floating holographic pool table, glowing portals
  - FluxArena: Rotating octagonal platform surrounded by alien sky
  - MirrorRace: Neon-lit tunnel track with recursive mirror effects

### Asset Strategy
All 3D models are either:
1. **Procedurally generated** using Babylon.js `MeshBuilder` (prefer this for game jam scope)
2. **Sourced from Kenney.nl** (CC0 license, free for all uses)
3. **Sourced from Quaternius.com** (CC0, low-poly stylized assets)
4. **Never** from paid sources or unlicensed repositories

---

## ━━━ SECTION 5 — GAME STATE MACHINE ━━━

```typescript
// src/core/GameStateMachine.ts
type GamePhase =
  | 'BOOT'         // Asset loading, WASM init
  | 'INTRO'        // Cinematic: Nexari transmission
  | 'MENU'         // Animated main menu
  | 'TUTORIAL'     // Interactive 5-step tutorial
  | 'PRE_GAME'     // Countdown + rule display for current mini-game
  | 'DARK_SHOT'    // Mini-game 1
  | 'FLUX_ARENA'   // Mini-game 2
  | 'MIRROR_RACE'  // Mini-game 3
  | 'TRANSITION'   // Between mini-games: rule mutation reveal
  | 'RESULTS'      // End screen: fate of Earth
  | 'PAUSED';      // Pause overlay
```

### Phase Transition Rules
- Each transition fades to black (300ms), loads new scene, fades in (300ms)
- Score and player history carry across all mini-games
- The `FluxEngine` runs BETWEEN mini-games to compute rule mutations
- `NexariAdaptiveAI` reads the player's `performanceHistory` and updates difficulty per round

---

## ━━━ SECTION 6 — MINI-GAME 1: DARK SHOT ━━━
### *3D Zero-Gravity Billiards — Evolved from BLIND BREAK*

#### Concept
A 3D billiard table floats in deep space. The table can rotate on any axis.
Pockets are replaced by glowing **Nexari portals** — dimensional rifts that absorb energy orbs.
The fog-of-war mechanic from BLIND BREAK is present: the table is dark, and only the area near
moving orbs is illuminated. But now in 3D, the darkness is volumetric, not flat.

**What makes this "Reinventing Competition":**
In regular billiards, gravity and a flat surface are constants. Here:
- **Zero gravity**: balls orbit each other after collision until friction stops them
- **Portals, not pockets**: portals can drift slightly, making prediction harder
- **Volumetric fog of war**: you must navigate 3D darkness using a ball of light
- **Flux Law applied**: based on your Round 1 performance, a rule is added/removed for Round 2

#### Implementation

**Physics: Babylon.js + Havok**
```typescript
// src/minigames/DarkShot/BallPhysics.ts
import { HavokPlugin, PhysicsBody, PhysicsMotionType } from '@babylonjs/core';

// Each orb:
// - PhysicsBody with sphere collider
// - Zero gravity (physicsBody.setGravityFactor(0))
// - Custom orbital drift: apply tiny velocity nudge per frame toward scene center
// - Friction: linearDamping = 0.12 (slower stop in zero-g)
// - Ball-to-ball restitution: 0.85

// Cue orb:
// - Always illuminated (PointLight attached to cue orb mesh)
// - Player fires it via aim + power system
// - CameraIntelligence integration: if camera mode enabled, hand gesture fires the cue
```

**Fog of War (Volumetric)**
```typescript
// src/minigames/DarkShot/FogOfWarSystem.ts
// Use Babylon.js VolumetricLightScatteringPostProcess + custom darkness fog
// lightMap: Map<string, { position: Vector3, radius: number, round: number }>
// Each frame: render darkness layer, then cut spherical holes where illumination exists
// Illumination fades: current round = full, -1 round = 50%, -2 rounds = ghost outline only
// Ghost orbs: last known position stored, rendered as translucent wireframe sphere
```

**Aiming System**
```typescript
// Mouse mode:
// - Click + drag from cue orb to aim
// - Hold duration = power (0–100%)
// - Dashed line shows 3D projected path (limited by fog — only shows in lit zones)
// - Arrow at prediction point if hitting lit orb

// Camera mode (optional, if MediaPipe loaded):
// - Index finger tip position on camera feed maps to aim direction
// - Pinch gesture (thumb + index) fires the shot
// - Power determined by distance between hands
```

**Scoring Tiers (Reinvented from BLIND BREAK)**
```
BLIND PORTAL  — orb passes through unilluminated space → portal: 3 pts + golden burst
SHADOW PORTAL — orb goes through ghost zone → portal: 2 pts + silver burst
LIT PORTAL    — orb goes through illuminated zone → portal: 1 pt
SCRATCH       — cue orb enters portal: -1 pt, orb respawns
```

**Flux Law Seed**
After Round 1, `FluxEngine` reads your scoring breakdown:
- Majority blind shots? → Round 2 FluxArena grants you an INVISIBILITY power-up
- Majority lit shots? → Round 2 FluxArena forces you to play at HALF SPEED for 10 seconds
- Scratched 2+ times? → Round 2 FluxArena arena shrinks 20% earlier than normal

---

## ━━━ SECTION 7 — MINI-GAME 2: FLUX ARENA ━━━
### *3D Adaptive Arena Combat — Evolved from RuleBreak-Arena*

#### Concept
An octagonal platform floating in alien atmosphere. Two competitors — player and Nexari AI —
push each other off the platform. But every 20 seconds, a **Flux Event** fires:
a rule changes dynamically based on the TOTAL COMBINED performance of both players.

**What makes this "Reinventing Competition":**
The rules aren't predetermined. They're a living response to the match itself.
Dominate? The arena makes you vulnerable. Struggle? It gives you a lifeline.
The competition is with the arena itself, not just the opponent.

#### Flux Events (Rule Mutations)
```typescript
// src/minigames/FluxArena/RuleMutator.ts
type FluxEvent =
  | 'GRAVITY_FLIP'      // Gravity reverses for 8 seconds
  | 'ARENA_SHRINK'      // Platform shrinks by 15%
  | 'SPEED_BOOST'       // Both players move 40% faster
  | 'ZERO_G_PULSE'      // 3-second zero-gravity burst
  | 'MIRROR_CONTROLS'   // Player controls temporarily inverted
  | 'SHIELD_ORB'        // Protective orb spawns for first to grab it
  | 'EARTHQUAKE'        // Platform shakes violently (screen shake + physics impulse)
  | 'PORTAL_ESCAPE'     // Portals appear at edges — falling through scores 1 pt
  | 'RULE_REVERSAL'     // Falling OFF the arena now SCORES instead of losing
  | 'NEXARI_SUMMON';    // Second AI appears for 10 seconds

// Selection: weighted random, biased against repeating the same event
// FluxEngine also seeds events from Round 1 performance data
```

**Physics: Babylon.js + Havok**
```typescript
// Player physics body: capsule collider, mass 1.0, linearDamping 0.3
// Push mechanic: apply impulse force toward opponent on SPACE/click
//   impulse = pushPower * (opponent.position - player.position).normalize()
//   pushPower: 8 base, modified by current Flux Events
// Edge detection: if player.y < platformFloor.y - 5 → "fallen off" → score event
```

**NexariAdaptiveAI in FluxArena**
```typescript
// src/ai/NexariAdaptiveAI.ts
// State machine with 4 states:
//   AGGRESSIVE — push player toward edges
//   DEFENSIVE  — move to platform center, avoid edges
//   FLUX_EXPLOIT — use current Flux Event to advantage (e.g., during ZERO_G, use different physics)
//   MIRROR     — copy player's last 3 moves with 0.5s delay
// State transitions: driven by score difference + platform edge distance
// Learning: NexariAdaptiveAI reads player.performanceHistory and increases
//           MIRROR usage if player repeats patterns
```

**Scoring**
```
KNOCKOFF      — Push opponent off platform: +2 pts
COMBO KNOCK   — 2 knockoffs in 10 seconds: +1 bonus
FLUX MASTER   — Score within 3 seconds of a Flux Event: +1 bonus
SELF-KO       — Fall off yourself: -1 pt
```

---

## ━━━ SECTION 8 — MINI-GAME 3: MIRROR RACE ━━━
### *Race Against Your Own Neural Ghost*

#### Concept
A procedurally generated neon tunnel. Two racers: YOU and your **Mirror Ghost** — a neural
recording of how you moved during Rounds 1 and 2. The ghost isn't a replay — it's a
**behavioral model** that predicts your racing style and adds variance to make it competitive.

**What makes this "Reinventing Competition":**
You cannot beat your ghost by playing your best game. You played your best game to CREATE the ghost.
To win, you must play **differently than you naturally play** — break your own patterns.
The competition is against your own mastery.

#### Ghost Recorder System
```typescript
// src/minigames/MirrorRace/GhostRecorder.ts
interface PlayerSample {
  timestamp: number;
  inputLeft: boolean;
  inputRight: boolean;
  speed: number;
  lanePosition: number; // -1 (left) to 1 (right)
}

// Records all inputs across Rounds 1 and 2
// At start of Round 3, builds GhostBehaviorModel:
//   - avgLanePosition: player's tendency (left/right biased)
//   - reactionDelay: avg ms from obstacle appearing to dodge
//   - speedVariance: how consistently player maintains max speed
// Ghost uses these stats + Gaussian noise to generate semi-predictable behavior
// Ghost does NOT have perfect information — it can crash too
```

#### Track Generator
```typescript
// src/minigames/MirrorRace/TrackGenerator.ts
// Procedural tunnel: Babylon.js Tube mesh, generated ahead of player
// Obstacle types:
//   - NexariBarrier: solid wall with gap, dodge left/right
//   - EnergyWall: slow player for 2s if hit (not instant death)
//   - FluxPortal: warp player 10m ahead (reward for risk)
//   - GhostBlocker: spawned by ghost — blocks player's preferred path (based on GhostBehaviorModel)
// Track seeds from Round 1+2 player patterns:
//   Left-biased player? → more right-side obstacles (punishes pattern)
//   Fast player? → more frequency of obstacles
```

**Scoring**
```
RACE FINISH   — First to end of track: +5 pts
LEAD TIME     — Each second ahead of ghost at finish: +0.5 pts
CLEAN RUN     — Zero crashes: +2 pts
PATTERN BREAK — Dodge on opposite side of your historical average: +0.5 pts (tracked per obstacle)
```

---

## ━━━ SECTION 9 — THE FLUX ENGINE (Core Mechanic Architecture) ━━━

This is the soul of the game. Every design decision flows through here.

```typescript
// src/ai/FluxEngine.ts

interface PlayerPerformanceHistory {
  darkShot: {
    blindPockets: number;
    litPockets: number;
    scratches: number;
    avgShotPower: number;        // 0.0 - 1.0
    totalScore: number;
  };
  fluxArena: {
    knockoffs: number;
    selfKOs: number;
    avgPositionFromCenter: number; // 0.0 (center) - 1.0 (edge)
    fluxEventsExploited: number;
    totalScore: number;
  };
  // Populated after Round 3:
  mirrorRace: {
    patternBreaks: number;
    crashes: number;
    finishTime: number;
    totalScore: number;
  };
}

class FluxEngine {
  /**
   * Called between mini-games.
   * Reads history, mutates rules for next mini-game.
   * Returns an array of RuleMutation objects to display to player.
   */
  public computeMutations(
    history: PlayerPerformanceHistory,
    targetGame: 'FLUX_ARENA' | 'MIRROR_RACE'
  ): RuleMutation[];
}

interface RuleMutation {
  id: string;
  displayName: string;           // "SHADOW MASTERY DETECTED"
  description: string;           // "The Arena now rewards staying close to the edge"
  effect: string;                // Internal effect key
  favoredPlayer: 'PLAYER' | 'AI' | 'NEUTRAL';
  icon: string;                  // Icon ID for RuleDisplay UI
}
```

### Mutation Logic (Representative Examples)
```
IF darkShot.blindPockets > darkShot.litPockets:
  → FluxArena: player gets "Shadow Step" (brief invisibility on push)
  DISPLAY: "BLIND MASTERY → SHADOW STEP UNLOCKED"

IF darkShot.scratches >= 2:
  → FluxArena: arena shrinks 10% at match start
  DISPLAY: "RECKLESS PATTERNS → ARENA COMPRESSED"

IF fluxArena.selfKOs > fluxArena.knockoffs:
  → MirrorRace: GhostBehaviorModel given lower variance (more predictable ghost)
  DISPLAY: "CHAOS DETECTED → MIRROR STABILIZED"

IF fluxArena.avgPositionFromCenter < 0.3:
  → MirrorRace: more center-lane obstacles
  DISPLAY: "CENTER BIAS → TRACK ADAPTED"
```

---

## ━━━ SECTION 10 — NEXARI ADAPTIVE AI ━━━

```typescript
// src/ai/NexariAdaptiveAI.ts
// NOT a machine learning model — a deterministic state machine that READS player patterns
// and adjusts. This is intentional: it's transparent, debuggable, and fair.

type AIState = 'HUNT' | 'DEFENSIVE' | 'EXPLOIT_FLUX' | 'MIRROR' | 'PROBE';

interface AIDifficulty {
  reactionMs: number;         // ms delay before AI responds: 400 (easy) → 150 (hard)
  accuracyVariance: number;   // Angular error on shots: 0.3 → 0.05 radians
  patternMemoryDepth: number; // How many player moves to remember: 3 → 12
}

// Difficulty scales per round:
// Round 1 (DarkShot): reactionMs=600, accuracyVariance=0.25, memoryDepth=3
// Round 2 (FluxArena): reactionMs=400, accuracyVariance=0.15, memoryDepth=6
// Round 3 (MirrorRace): Ghost, not direct AI — but ghost variance scales from history

// AI Visual Feedback (diegetic, inside the 3D world):
// A small holographic eye icon floats above the Nexari opponent
// The pupil tracks illuminated objects (scans left→right with easeInOut)
// A dotted arc connects eye to the ball/player it's targeting
// During "thinking" delay: eye iris pulses #ff00aa
// This makes the AI feel alive, not scripted
```

---

## ━━━ SECTION 11 — CAMERA INTELLIGENCE (Optional Mode) ━━━

```typescript
// src/ai/CameraIntelligence.ts
// Activated only if: user clicks "ENABLE HAND CONTROL" and grants camera permission
// Falls back to mouse if permission denied — game must be fully playable without camera

import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

class CameraIntelligence {
  private detector: handPoseDetection.HandDetector | null = null;
  private videoElement: HTMLVideoElement;
  public isActive: boolean = false;

  public async initialize(): Promise<boolean> {
    // Check permissions gracefully
    // Load MediaPipe model
    // Return false if any step fails — game continues in mouse mode
  }

  // Returns normalized gesture data:
  public getHandState(): {
    aimAngle: number;       // angle from wrist to index tip, in radians
    aimPower: number;       // 0.0 - 1.0, derived from spread between hands
    isFiring: boolean;      // pinch gesture (index + thumb < 30px apart)
    isRecon: boolean;       // open palm gesture
  } | null; // null = no hand detected
}

// Integration in DarkShotGame.ts:
// Each frame: if cameraIntelligence.isActive, read hand state and merge with mouse input
// Merge strategy: camera input overrides mouse if confidence > 0.8
// Show small camera preview window (100x75px) in corner during play, border = player color
// If camera drops below 15fps, auto-fallback to mouse with warning toast
```

---

## ━━━ SECTION 12 — AUDIO SYSTEM ━━━

```typescript
// src/core/AudioManager.ts
// Howler.js for all audio
// Audio files: source CC0 music from freemusicarchive.org or opengameart.org
//   OR generate synthetically using Tone.js (add as optional dep)
// ALL audio wrapped in try/catch — audio is enhancement, not requirement

// MUSIC TRACKS (adaptive):
// MENU_AMBIENT      — Dark ambient, 80 BPM, alien atmosphere
// DARK_SHOT_TENSION — Tense, sparse, electronic
// FLUX_ARENA_HYPE   — High-energy, 140 BPM, building intensity
// MIRROR_RACE_PULSE — Propulsive, rhythmic, escalating
// NEXARI_WIN        — Triumphant alien fanfare
// PLAYER_WIN        — Epic human victory anthem
// RULE_MUTATION     — Short 3-note "reality shift" sting (plays on every Flux Event)

// SFX:
// ORB_SHOOT, ORB_COLLISION, ORB_PORTAL, SCRATCH
// PUSH_LAND, KNOCKOFF, FLUX_EVENT_TRIGGER
// RACE_ENGINE, CRASH, FINISH_LINE
// UI_HOVER, UI_SELECT, TRANSITION_WHOOSH

// Adaptive music:
// AudioManager.setIntensity(0.0 - 1.0) — crossfades between calm/intense layers
// Called by each mini-game based on score gap and time remaining
```

---

## ━━━ SECTION 13 — VISUAL SYSTEMS ━━━

### Particle Factory
```typescript
// src/utils/ParticleFactory.ts
// All particles use Babylon.js ParticleSystem or GPUParticleSystem
// Pre-defined emitters:
//   PORTAL_ABSORB(position, color)    — spiral implosion into portal
//   KNOCKOFF_EXPLOSION(position)      — radial burst on arena knockoff
//   FLUX_EVENT_SHOCKWAVE(position)    — ring wave expanding outward
//   TRAIL_CONTINUOUS(mesh)            — continuous trail while entity moves fast
//   BLIND_BONUS_BURST(position)       — golden upward spark fountain (BLIND SHOT reward)
//   MIRROR_GHOST_PARTICLES(ghostMesh) — ghost player particle aura
//   NEBULA_AMBIENT(sceneCenter)       — slow-moving background space dust

// Performance: cap total particles at 2000, use GPUParticleSystem when available
```

### Post-Processing Stack (Babylon.js)
```typescript
// Applied per-scene:
// Bloom         — emissive materials glow (threshold 0.8, intensity 0.3)
// ChromaticAberration — subtle, triggered on high-speed collisions (3 frames only)
// VignetteEffect — always on, subtle border darkening
// DepthOfField  — optional (toggle with 'Q' key for performance)
// FXAA          — anti-aliasing
```

### Screen Shake
```typescript
// src/utils/ScreenShake.ts
// Implemented via Babylon.js camera position offset (NOT canvas translate)
// ScreenShake.trigger(intensity, durationMs)
// Decay: exponential (1 - t²) 
// Hard cap: max 0.8 units camera offset to prevent nausea
// Triggers:
//   Low (0.1):  orb collision
//   Medium (0.3): portal absorption, player knockoff
//   High (0.6):  Flux Event trigger, BLIND SHOT scored
//   Max (0.8):  final score revealed on Results screen
```

### Squash & Stretch
```typescript
// Applied to all physics orbs on collision:
// Set mesh.scaling.x = 1.4, mesh.scaling.y = 0.7 at impact frame
// Tween back to (1, 1, 1) over 180ms with easeOutElastic
// Axis direction: perpendicular to collision normal
```

---

## ━━━ SECTION 14 — INTERACTIVE TUTORIAL ━━━

The tutorial is a diegetic experience — not a separate screen, but a living part of the 3D
world. The Nexari Ambassador (a holographic alien figure, built from procedural geometry)
guides the player through each step inside the actual arena.

**5 Tutorial Steps:**

**STEP 1 — THE ARENA**: Camera slowly orbits the arena. Ambassador appears.
Text: "WELCOME, HUMAN CHAMPION. THIS IS WHERE COMPETITION TRANSCENDS ITS RULES."
Player presses SPACE. Camera settles to play position.

**STEP 2 — DARK SHOT DEMO**: Tutorial version of DarkShot. Ambassador fires a demo shot.
Fog of war shown, trail illumination shown in real-time.
Guided: Player aims at one orb (highlighted), fires. First portal absorption plays.
Text: "YOUR SHOT IS YOUR ONLY LIGHT. DARKNESS REWARDS THE BOLD."

**STEP 3 — FLUX ARENA DEMO**: Small platform, AI opponent stands still.
Player practices pushing. One Flux Event fires mid-tutorial.
Text: "THE ARENA WATCHES. THE RULES CHANGE. ADAPT OR FALL."

**STEP 4 — THE FLUX ENGINE REVEAL**: Cinematic: chart shows player's Round 1 data being
analyzed. Rule mutation displayed. Ambassador explains cause and effect.
Text: "EVERY MOVE YOU MAKE BECOMES THE NEXT MATCH'S RULES."

**STEP 5 — MIRROR RACE INTRO**: Ghost appears as translucent version of player.
Brief 15-second race preview. Ghost outpaces player.
Text: "YOUR GREATEST OPPONENT IS YOUR OWN PATTERN. BREAK IT."

Interactivity: each step has a pulse-animated SPACE indicator. Forced minimum 3-second exposure
per step before SPACE registers (ensures narrative lands). Progress dots shown (5 total).
Skip option: press ESC to skip entire tutorial (stored in `sessionStorage`).

---

## ━━━ SECTION 15 — SCREENS & NARRATIVE FLOW ━━━

### BOOT SCREEN
- Progress bar: "ESTABLISHING NEXARI LINK... [===      ] 45%"
- Babylon.js engine init + WASM init (Havok + MediaPipe) happen here
- Font load check via `document.fonts.ready`

### INTRO CINEMATIC
- Fullscreen: dark space. Text scrolls with typewriter effect (Rajdhani, green-on-black terminal)
- "NEXARI TRANSMISSION RECEIVED — EARTH DATE: [today's date]"
- "HUMANITY HAS BEEN SELECTED. THE TRIAL BEGINS IN 72 HOURS."
- Then: "INITIATING NEXUS ARENA..."
- Skip: any key press skips to menu after 1 second

### MAIN MENU
- Live 3D background: the Nexus Arena arena rotates slowly in the background
- Title: "NEXUS ARENA" — neon Orbitron, Nexari cyan, particle trail on each letter
- Subtitle: "THE LAST EARTH SPORT"
- Options (Rajdhani, animated on hover):
  - ENTER THE TRIAL (start game)
  - RULES OF FLUX (interactive tutorial)
  - ENABLE HAND CONTROL (camera mode toggle)
  - SETTINGS (audio volume, graphics quality)
- Bottom: "Earth's survival depends on your performance." (small, 40% opacity)

### TRANSITION SCREEN (between mini-games)
- Duration: 8 seconds
- Shows: "ROUND [N] COMPLETE" + score breakdown
- Then: Flux Engine animation — holographic data flows from score card into rule display
- New rules revealed one by one with sound effects (RULE_MUTATION sting per rule)
- "RULES HAVE BEEN REWRITTEN" — then transition to next mini-game

### PRE-GAME COUNTDOWN
- 3 → 2 → 1 → "COMPETE!"
- Each number: Orbitron 120px, easeOutElastic scale animation
- Active rules listed below countdown: "[Rule 1] [Rule 2]"

### RESULTS SCREEN
- Full cinematic: the Nexari Ambassador faces player
- If player wins: "HUMANITY ENDURES." — Earth hologram glows, Ambassador bows
- If AI wins: "EARTH SHALL BE RELOCATED." — Earth hologram dims, asteroid field appears
- If close match: "THE NEXARI ARE... IMPRESSED." — special dialogue
- Stats panel:
  - "RULES YOU TRIGGERED: [N]"
  - "PATTERN BREAKS: [N]"
  - "BLIND SHOTS: [N]"
  - "THE ARENA LEARNED: [summary of mutations]"
- PRESS SPACE TO PLAY AGAIN / RETURN TO MENU

---

## ━━━ SECTION 16 — CODING STANDARDS (NON-NEGOTIABLE) ━━━

### TypeScript Rules
```typescript
// ✅ ALWAYS DO:
export type GamePhase = 'BOOT' | 'MENU' | 'PLAYING';  // Union types over enums
export interface Score { player: number; ai: number; }  // Interface for data shapes
const MAX_PARTICLES = 2000;                             // const for all magic numbers
function updatePhysics(deltaTime: number): void {}      // Explicit return types
// Readonly where appropriate:
readonly playerHistory: Readonly<PlayerPerformanceHistory>;

// ❌ NEVER DO:
let x: any;              // Never use 'any'
var score = 0;           // Never use 'var'
// @ts-ignore            // Never suppress TypeScript errors
```

### Naming Conventions
```
Classes:       PascalCase   → FluxEngine, NexariAdaptiveAI
Interfaces:    PascalCase   → PlayerScore, FluxEvent
Types:         PascalCase   → GamePhase, RuleMutation
Functions:     camelCase    → computeMutations(), getHandState()
Constants:     UPPER_SNAKE  → MAX_PARTICLES, PLAYER_CYAN
Private fields: _camelCase  → private _currentPhase: GamePhase
Files:         PascalCase.ts for classes, camelCase.ts for utils
```

### Architecture Patterns
```typescript
// 1. Scene Manager Pattern: each scene implements SceneBase interface
interface SceneBase {
  onEnter(params?: unknown): Promise<void>;  // Async to allow asset loading
  onUpdate(deltaTime: number): void;
  onExit(): Promise<void>;
  dispose(): void;
}

// 2. Event Bus for cross-scene communication (avoid tight coupling):
// EventBus.emit('RULE_MUTATION', { mutation: ruleData });
// EventBus.on('RULE_MUTATION', (data) => updateHUD(data));

// 3. Entity-Component: each game entity has optional components:
// Entity.addComponent(new PhysicsComponent(havokBody))
// Entity.addComponent(new AnimationComponent(mesh))

// 4. Singleton services (accessed via DI, not global):
// GameStateMachine, AudioManager, InputManager, AssetLoader
// Injected into scenes via constructor — never use window.globalVar

// 5. Resource management: every Babylon.js object created must be disposed:
// In SceneBase.dispose(): mesh.dispose(), material.dispose(), texture.dispose()
// Use scene.onDisposeObservable to catch any missed disposals
```

### ESLint Configuration
```javascript
// eslint.config.js
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['src/**/*.ts'],
  languageOptions: { parser: tsParser, parserOptions: { project: './tsconfig.json' } },
  plugins: { '@typescript-eslint': tsPlugin },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  }
}];
```

### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "arrowParens": "always"
}
```

---

## ━━━ SECTION 17 — PERFORMANCE REQUIREMENTS ━━━

```
Target FPS:       60fps stable on mid-range hardware (2020+ laptop)
Max draw calls:   200 per frame (use instancing for repeated meshes)
Max particles:    2000 total (use GPUParticleSystem, pool unused particles)
Physics bodies:   Max 20 simultaneous Havok bodies per mini-game
Texture budget:   Max 32MB total VRAM (use .basis compression)
Bundle size:      Target < 5MB gzipped (Babylon.js tree-shaking via ES module imports)
Load time:        < 4 seconds on 10 Mbps connection (show progress bar)
Memory:           No memory leaks — dispose all Babylon objects on scene exit
```

### Performance Monitoring (dev mode only)
```typescript
// In dev mode (import.meta.env.DEV), show:
// - FPS counter (Babylon.js built-in: scene.debugLayer)
// - Active particle count
// - Physics body count
// - Draw calls via scene.getEngine().getLastFrameDrawCalls()
```

---

## ━━━ SECTION 18 — ACCESSIBILITY ━━━

- **Color-blind mode**: press `C` to activate — shapes overlay on all orbs (◆ ▲ ● ■ etc.)
- **Reduced motion**: `scene.animations` can be disabled via settings, keep gameplay functional
- **Font scaling**: all HUD text respects browser zoom level
- **Camera fallback**: game is 100% playable with mouse only — camera mode is a bonus
- **Instructions always accessible**: `?` key opens rule card overlay in any game phase
- **High contrast mode**: optional toggle in settings, increases UI contrast ratios

---

## ━━━ SECTION 19 — README.md REQUIREMENTS ━━━

The repository README must include:
```markdown
# NEXUS ARENA: The Last Earth Sport

🏆 Game Jam Entry — Theme: "Reinventing Competition"

## 🎮 Play Now
[Play on GitHub Pages](https://<username>.github.io/nexus-arena/)

## 🌍 Concept
[One paragraph explaining the reinvented competition mechanic]

## 🕹️ How to Play
[Quick-start: controls, objective, 3 mini-game summaries]

## 🤖 AI Features
[Explain Nexari Adaptive AI + optional camera hand control]

## 🔥 The Flux Engine
[Explain how player performance mutates the rules]

## 🛠️ Tech Stack
[List all libraries with brief purpose descriptions]

## 🏃 Run Locally
npm install && npm run dev

## 📦 Build
npm run build

## 📄 Credits
[Asset credits: Kenney.nl, freemusicarchive.org, etc.]
[Libraries: Babylon.js, Howler.js, TensorFlow.js, MediaPipe]

## 📜 License
MIT
```

---

## ━━━ SECTION 20 — BUILD ORDER (Follow Exactly) ━━━

Do not skip phases. Confirm each phase before proceeding.

### PHASE 1 — PROJECT SKELETON
- [ ] Init repo: `npm create vite@latest nexus-arena -- --template vanilla-ts`
- [ ] Install all dependencies from Section 1
- [ ] Configure `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vite.config.ts`
- [ ] Create full directory structure from Section 2
- [ ] Create `GameStateMachine.ts` with all phases as empty stubs
- [ ] Create GitHub Actions workflow (Section 3)
- [ ] Confirm: `npm run build` succeeds, `npm run lint` passes with 0 errors
- [ ] `✅ PHASE 1 COMPLETE`

### PHASE 2 — ENGINE FOUNDATION
- [ ] Create `Engine.ts`: Babylon.js engine init, resize handler, render loop
- [ ] Create `AssetLoader.ts`: loading progress, font loading, WASM init for Havok
- [ ] Create `AudioManager.ts`: Howler.js wrapper, all audio keys
- [ ] Create `InputManager.ts`: keyboard, mouse, unified action map
- [ ] Create `BootScene.ts`: loading screen with alien progress bar, transitions to Intro
- [ ] Confirm: game loads in browser, shows boot screen, no console errors
- [ ] `✅ PHASE 2 COMPLETE`

### PHASE 3 — DARK SHOT (Mini-Game 1)
- [ ] Build 3D void environment: starfield, floating holographic table
- [ ] Implement orb entities with Havok physics (zero gravity)
- [ ] Implement FogOfWarSystem (volumetric darkness, illumination trails)
- [ ] Implement aiming system (mouse drag + power bar)
- [ ] Implement portal detection and scoring (blind/shadow/lit tiers)
- [ ] Implement NexariAdaptiveAI for DarkShot (geometric targeting with fog-of-war)
- [ ] Wire all particles: BLIND_BONUS_BURST, PORTAL_ABSORB, TRAIL_CONTINUOUS
- [ ] Wire all audio: ORB_SHOOT, ORB_COLLISION, ORB_PORTAL, BLIND_BONUS chord
- [ ] Implement turn system: player → AI → player, 7 rounds
- [ ] Confirm: full DarkShot game plays start to finish with correct scoring
- [ ] `✅ PHASE 3 COMPLETE`

### PHASE 4 — FLUX ARENA (Mini-Game 2)
- [ ] Build octagonal arena with Havok physics (platform edges, player fall detection)
- [ ] Implement player push mechanic with cooldown and impulse physics
- [ ] Implement RuleMutator with all 9 Flux Events
- [ ] Implement NexariAdaptiveAI for FluxArena (4-state machine)
- [ ] Implement scoring: knockoff, combo, flux master, self-KO
- [ ] Wire all particles: KNOCKOFF_EXPLOSION, FLUX_EVENT_SHOCKWAVE
- [ ] Wire all audio: adaptive music intensity, FLUX_EVENT_TRIGGER sting
- [ ] Confirm: full FluxArena game plays with multiple Flux Events triggering
- [ ] `✅ PHASE 4 COMPLETE`

### PHASE 5 — FLUX ENGINE & TRANSITIONS
- [ ] Implement FluxEngine.computeMutations() with all rule mutation logic
- [ ] Implement TransitionScene: score breakdown, data-flow animation, mutation reveal
- [ ] Connect DarkShot performance → FluxArena rules
- [ ] Connect FluxArena performance → MirrorRace ghost difficulty
- [ ] Confirm: mutations trigger correctly based on play style, transitions are smooth
- [ ] `✅ PHASE 5 COMPLETE`

### PHASE 6 — MIRROR RACE (Mini-Game 3)
- [ ] Build procedural tunnel (Babylon.js Tube + ExtrudePolygon)
- [ ] Implement GhostRecorder: input sampling during Rounds 1+2
- [ ] Implement GhostBehaviorModel: behavioral stats + variance synthesis
- [ ] Implement TrackGenerator: obstacle spawning seeded from player patterns
- [ ] Implement race scoring (finish time, clean run bonus, pattern break)
- [ ] Wire particles: TRAIL_CONTINUOUS, CRASH, FINISH_LINE burst
- [ ] Confirm: ghost behaves recognizably like player's style, race completes
- [ ] `✅ PHASE 6 COMPLETE`

### PHASE 7 — CAMERA INTELLIGENCE
- [ ] Implement CameraIntelligence.ts with TensorFlow.js + MediaPipe HandPose
- [ ] Graceful permission request + fallback to mouse
- [ ] Integrate hand gestures into DarkShot aiming
- [ ] Add camera preview window (corner overlay)
- [ ] Confirm: game plays without camera, camera mode enhances but isn't required
- [ ] `✅ PHASE 7 COMPLETE`

### PHASE 8 — ALL SCREENS & TUTORIAL
- [ ] Implement IntroScene (cinematic typewriter narrative)
- [ ] Implement MenuScene (live 3D background, menu options)
- [ ] Implement TutorialScene (5 interactive steps with Ambassador)
- [ ] Implement ResultsScene (fate of Earth cinematic + stats debrief)
- [ ] Full game loop: Boot → Intro → Menu → Tutorial → Game → Results → Menu
- [ ] Confirm: full game plays start-to-finish with narrative coherence
- [ ] `✅ PHASE 8 COMPLETE`

### PHASE 9 — POLISH & FINAL PASS
- [ ] Apply all post-processing: Bloom, ChromaticAberration triggers, Vignette, FXAA
- [ ] Final particle pass: all emitters tuned for visual quality
- [ ] Final audio pass: adaptive music transitions smooth, all SFX timed correctly
- [ ] Accessibility: color-blind mode, reduced motion toggle, camera fallback
- [ ] Performance audit: 60fps stable, no memory leaks, bundle < 5MB
- [ ] Lint: `npm run lint` → 0 warnings, 0 errors
- [ ] Type-check: `npm run typecheck` → 0 errors
- [ ] Cross-browser test: Chrome, Firefox, Edge (no Safari requirement)
- [ ] Deploy: GitHub Actions workflow deploys successfully to GitHub Pages
- [ ] `✅ PHASE 9 COMPLETE — NEXUS ARENA READY FOR SUBMISSION`

---

## ━━━ SECTION 21 — ACCEPTANCE CHECKLIST ━━━

### Theme Integration
- [ ] "Reinventing Competition" is the ENGINE, not a decoration
- [ ] Player's own actions rewrite the rules they must play under
- [ ] Each mini-game presents a fundamentally different definition of "winning"
- [ ] The Flux Engine creates unique rule combinations on every playthrough

### Gameplay Quality
- [ ] Any first-time player understands the goal of each mini-game in under 10 seconds
- [ ] The tutorial is diegetic — it feels like part of the alien world
- [ ] Each mini-game has a climactic "hero moment" (BLIND SHOT, massive knockoff, pattern break)
- [ ] The game is addictive — each loss makes the player want to adapt, not quit

### Technical Quality
- [ ] Zero TypeScript errors, zero ESLint warnings
- [ ] 60fps stable on mid-range hardware during all mini-games
- [ ] No console errors on Chrome or Firefox
- [ ] Camera mode is opt-in and gracefully falls back
- [ ] GitHub Actions CI passes on every push to main
- [ ] GitHub Pages deployment live and playable

### Narrative Coherence
- [ ] The story has a clear beginning (intro), middle (3 rounds), and end (results)
- [ ] The Nexari feel like genuine alien intelligences, not cardboard villains
- [ ] The fate of Earth outcome is emotionally satisfying regardless of win/loss
- [ ] The post-game debrief ("Your Patterns: / Arena Learned:") makes the player reflect

### Asset Consistency
- [ ] All 3D assets share the same bioluminescent-tech aesthetic
- [ ] Color palette from Section 4 is strictly followed (no off-palette magic colors)
- [ ] Orbitron for HUD/title/numbers, Rajdhani for all body text
- [ ] Audio style is consistent: alien electronic, not generic game music

---

## ━━━ SECTION 22 — INTEGRATION WITH PREVIOUS GAMES ━━━

The two previous games in this universe are canonical:
- **BLIND BREAK** (`lvmorap.github.io/BLIND-BREAK/`): The fog-of-war billiards mechanic
  is the direct ancestor of **DarkShot**. NEXUS ARENA should reference it in the narrative:
  "The Nexari first observed humans playing blind pool in 2024. They found the concept
  of 'chosen darkness' fascinating."
- **RuleBreak Arena** (`lvmorap.github.io/RuleBreak-Arena/`): The hybrid mode system and
  Flux Events in FluxArena directly evolve from RuleBreak-Arena's mode-switching mechanic.
  Reference: "The Arena adapts. It learned this from watching humans play."

**Optional Easter Egg**: In the Credits or Results screen, list both games as
"Previous Human Competitions Observed by the Nexari" with links.

---

## ━━━ FINAL NOTE TO COPILOT AGENT ━━━

You are building something that needs to WIN a game jam on the following criteria:
1. **Central Concept & Clarity** — NEXUS ARENA has a single, clear hook: *your play style becomes the rules*
2. **Theme Integration** — "Reinventing Competition" is baked into every mechanic via the FluxEngine
3. **Gameplay & Player Experience** — 3 distinct mini-games with escalating stakes and earned payoffs
4. **Innovation & Creativity** — The GhostRecorder and FluxEngine combination is genuinely novel
5. **Execution & Cohesion** — TypeScript + Babylon.js + Havok = professional, stable, 60fps

Do not cut corners on the FluxEngine. It is what separates this from any other game jam entry.
Do not cut corners on the NexariAdaptiveAI. It must feel like a real opponent, not a script.
Do not cut corners on the narrative. The fate of Earth must feel earned.

**Build phase by phase. After each phase, output `✅ PHASE [N] COMPLETE — [one sentence summary]`.
Do not begin the next phase until the current one passes all its checklist items.**

**ALL CONTENT IN THE REPOSITORY MUST BE IN ENGLISH.**
```
