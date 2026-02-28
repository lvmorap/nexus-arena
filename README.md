# NEXUS ARENA: The Last Earth Sport

🏆 Game Jam Entry — Theme: "Reinventing Competition"

## 🎮 Play Now

[Play on GitHub Pages](https://lvmorap.github.io/nexus-arena/)

## 🌍 Concept

Earth has been contacted by the Nexari — an alien civilization that refuses war. Their offer: a three-round trial called the Nexus Arena. Win, and humanity earns the right to exist in the shared star system. The twist: the Nexari designed the sports by studying human games and then broke every rule. Your play style rewrites the rules — competition is no longer about who executes best under fixed conditions, it's about who adapts fastest when the conditions are designed to defeat them.

## 🕹️ How to Play

**Controls:**
- **WASD** — Move
- **SPACE / Click** — Push (FluxArena) / Shoot (DarkShot)
- **Click & Drag** — Aim cue orb (DarkShot)
- **A/D or ←/→** — Steer (MirrorRace)
- **C** — Toggle colorblind mode
- **H** — Toggle high contrast
- **Q** — Toggle Depth of Field
- **F3** — Toggle performance overlay (dev)
- **?** — Show/hide rule card

**Three Rounds:**

1. **DARK SHOT** — 3D zero-gravity billiards in darkness. Your shot is your only light. Pocket orbs through dimensional portals. Blind shots score more!
2. **FLUX ARENA** — Push the Nexari AI off an octagonal platform. Every 20 seconds a Flux Event mutates the rules. Gravity flips, controls invert, the arena shrinks.
3. **MIRROR RACE** — Race through a neon tunnel against your own ghost — a behavioral model built from how you played Rounds 1 & 2. Break your own patterns to win.

## 🤖 AI Features

- **Nexari Adaptive AI** — 4-state machine (Aggressive, Defensive, Mirror, Flux Exploit) that reads your patterns and adapts
- **Ghost Recorder** — Records your inputs across all rounds, builds a behavioral model with lane bias, reaction delay, and speed variance
- **Flux Engine** — Your performance in each round mutates the rules for the next. Blind shot master? You earn Shadow Step. Reckless? The arena shrinks.

## 🔥 The Flux Engine

Your mastery rewrites the rules. Score through precision? The next round punishes precision. Dominate through chaos? The chaos becomes the weapon against you.

## 🛠️ Tech Stack

| Library | Purpose |
|---------|---------|
| Babylon.js 7.x | 3D rendering engine (WebGL2) |
| @babylonjs/gui | 2D GUI overlay system |
| TypeScript 5.x | Strict mode, type safety |
| Vite 5.x | Fast dev server + production build |
| Web Audio API | Synthetic audio (SFX + ambient music) |
| ESLint 9.x | Linting with @typescript-eslint |
| Prettier 3.x | Code formatting |

## 🏃 Run Locally

```bash
npm install
npm run dev
```

## 📦 Build

```bash
npm run build
```

## ♿ Accessibility

- **Colorblind mode** — Press `C` to toggle shape overlays on game objects
- **Reduced motion** — Respects `prefers-reduced-motion` media query
- **High contrast** — Press `H` to toggle enhanced contrast
- **Rule cards** — Press `?` to view current game rules at any time
- **Mouse-only play** — Game is fully playable without camera mode

## 🌐 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 90+ | ✅ Full support | Primary development target, WebGL2 + Web Audio API |
| Firefox 90+ | ✅ Full support | WebGL2 via OpenGL backend, Web Audio API supported |
| Edge 90+ | ✅ Full support | Chromium-based, same support as Chrome |

**Requirements:**
- WebGL2 capable GPU
- Web Audio API support
- ES2022 JavaScript support
- `font-display: swap` for self-hosted fonts (all modern browsers)

**Known Considerations:**
- GPUParticleSystem auto-detects support; falls back to CPU particles on unsupported hardware
- Havok WASM physics requires `vite-plugin-wasm` + `vite-plugin-top-level-await` for bundling
- `AudioContext` may require a user gesture to resume on all browsers

## 📄 Credits

- **Engine**: [Babylon.js](https://www.babylonjs.com/)
- **Audio**: Web Audio API (synthetic/procedural)
- **Fonts**: Orbitron, Rajdhani (Google Fonts)
- **Narrative**: The Three Lords of Cosmic Chaos — D'Anielor Kasthellanox, Xebasthiaan Du'Qae, Ithalokk Kapas'SOX

## 📜 License

MIT

---

## 🗺️ ROADMAP — Remaining Features for Future Agents

### Camera Intelligence — TensorFlow.js Upgrade

- [ ] Replace brightest-point tracking with TensorFlow.js + MediaPipe HandPose for accurate finger detection
- [ ] Map individual finger landmarks (index finger tip = aim, thumb+index pinch = fire)

### Havok Physics Integration

- [ ] Replace manual frame-by-frame physics with Havok physics plugin
- [ ] PhysicsBody with sphere colliders for DarkShot orbs
- [ ] PhysicsBody with capsule colliders for FluxArena players
- [ ] Proper collision callbacks instead of distance checks

### Audio Enhancement

- [ ] Replace Web Audio synthesis with real audio files (CC0 from freemusicarchive.org/opengameart.org)
