import { Scene, Color4, Vector3, MeshBuilder, StandardMaterial, Color3, HemisphericLight, ArcRotateCamera, GlowLayer } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Button, StackPanel, Rectangle } from '@babylonjs/gui';
import { Engine } from '../core/Engine';
import { COLORS } from '../constants/Colors';
import { hexToRgb } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export class MenuScene {
  private _scene: Scene;
  private _engine: Engine;
  private _guiTexture!: AdvancedDynamicTexture;
  private _onStart: (() => void) | null = null;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = new Scene(this._engine.babylonEngine);
    this._scene.clearColor = new Color4(0.012, 0.004, 0.03, 1);
  }

  public get scene(): Scene {
    return this._scene;
  }

  public setup(onStart: () => void): void {
    this._onStart = onStart;
    this._buildBackground();
    this._buildUI();
    logger.info('MenuScene setup complete');
  }

  private _buildBackground(): void {
    // Camera
    const camera = new ArcRotateCamera('menuCam', 0, Math.PI / 3, 30, Vector3.Zero(), this._scene);
    camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 30;

    // Auto-rotate
    this._scene.registerBeforeRender(() => {
      camera.alpha += 0.002;
    });

    // Light
    const light = new HemisphericLight('menuLight', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.5;
    light.diffuse = new Color3(0.2, 0.1, 0.4);

    // Glow
    const glow = new GlowLayer('menuGlow', this._scene);
    glow.intensity = 0.8;

    // Rotating octagonal platform preview
    const platformShape: Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * 2 * Math.PI) / 8;
      platformShape.push(new Vector3(Math.cos(angle) * 10, 0, Math.sin(angle) * 10));
    }
    const platform = MeshBuilder.CreatePolygon('menuPlatform', { shape: platformShape, depth: 0.3 }, this._scene);
    platform.position.y = -5;
    const platMat = new StandardMaterial('menuPlatMat', this._scene);
    const floorRgb = hexToRgb(COLORS.ARENA_FLOOR);
    platMat.diffuseColor = new Color3(floorRgb.r, floorRgb.g, floorRgb.b);
    platMat.emissiveColor = new Color3(0.03, 0.06, 0.1);
    platform.material = platMat;

    // Edge glow
    for (let i = 0; i < 8; i++) {
      const a1 = (i * 2 * Math.PI) / 8;
      const a2 = ((i + 1) * 2 * Math.PI) / 8;
      const p1 = new Vector3(Math.cos(a1) * 10, -4.8, Math.sin(a1) * 10);
      const p2 = new Vector3(Math.cos(a2) * 10, -4.8, Math.sin(a2) * 10);
      const edge = MeshBuilder.CreateTube(`menuEdge_${i}`, { path: [p1, p2], radius: 0.1, tessellation: 6 }, this._scene);
      const eMat = new StandardMaterial(`menuEdgeMat_${i}`, this._scene);
      const cyanRgb = hexToRgb(COLORS.NEXARI_CYAN);
      eMat.emissiveColor = new Color3(cyanRgb.r, cyanRgb.g, cyanRgb.b);
      eMat.disableLighting = true;
      edge.material = eMat;
    }

    // Stars
    for (let i = 0; i < 150; i++) {
      const star = MeshBuilder.CreateSphere(`menuStar_${i}`, { diameter: 0.08 + Math.random() * 0.12 }, this._scene);
      star.position = new Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 50 + 10,
        (Math.random() - 0.5) * 80
      );
      const sMat = new StandardMaterial(`menuStarMat_${i}`, this._scene);
      sMat.emissiveColor = new Color3(0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 1);
      sMat.disableLighting = true;
      star.material = sMat;
    }
  }

  private _buildUI(): void {
    this._guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('menuUI', true, this._scene);

    // Container panel
    const panel = new StackPanel('menuPanel');
    panel.width = '500px';
    panel.isVertical = true;
    this._guiTexture.addControl(panel);

    // Title
    const title = new TextBlock('title');
    title.text = 'NEXUS ARENA';
    title.color = COLORS.NEXARI_CYAN;
    title.fontSize = 64;
    title.fontFamily = 'Orbitron, sans-serif';
    title.height = '100px';
    title.shadowColor = COLORS.NEXARI_PURPLE;
    title.shadowOffsetX = 2;
    title.shadowOffsetY = 2;
    panel.addControl(title);

    // Subtitle
    const subtitle = new TextBlock('subtitle');
    subtitle.text = 'THE LAST EARTH SPORT';
    subtitle.color = COLORS.NEXARI_GOLD;
    subtitle.fontSize = 20;
    subtitle.fontFamily = 'Rajdhani, sans-serif';
    subtitle.height = '40px';
    panel.addControl(subtitle);

    // Spacer
    const spacer = new Rectangle('spacer');
    spacer.height = '60px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Enter the Trial button
    const startBtn = this._createMenuButton('ENTER THE TRIAL', COLORS.NEXARI_CYAN);
    startBtn.onPointerUpObservable.add(() => {
      if (this._onStart) this._onStart();
    });
    panel.addControl(startBtn);

    // Theme explanation
    const themeText = new TextBlock('theme');
    themeText.text = '"Your play style becomes the rules.\nThe competition adapts to YOU."';
    themeText.color = COLORS.NEUTRAL;
    themeText.fontSize = 16;
    themeText.fontFamily = 'Rajdhani, sans-serif';
    themeText.height = '60px';
    themeText.alpha = 0.7;
    panel.addControl(themeText);

    // Spacer
    const spacer2 = new Rectangle('spacer2');
    spacer2.height = '30px';
    spacer2.thickness = 0;
    panel.addControl(spacer2);

    // Footer
    const footer = new TextBlock('footer');
    footer.text = "Earth's survival depends on your performance.";
    footer.color = COLORS.NEUTRAL;
    footer.fontSize = 14;
    footer.fontFamily = 'Rajdhani, sans-serif';
    footer.height = '30px';
    footer.alpha = 0.4;
    panel.addControl(footer);

    // Controls info
    const controls = new TextBlock('controls');
    controls.text = 'WASD — Move  |  SPACE/Click — Push  |  Push the Nexari off the arena!';
    controls.color = COLORS.NEXARI_GOLD;
    controls.fontSize = 14;
    controls.fontFamily = 'Rajdhani, sans-serif';
    controls.height = '30px';
    controls.alpha = 0.6;
    panel.addControl(controls);
  }

  private _createMenuButton(text: string, color: string): Button {
    const btn = Button.CreateSimpleButton('btn_' + text, text);
    btn.width = '350px';
    btn.height = '60px';
    btn.color = color;
    btn.fontSize = 24;
    btn.fontFamily = 'Orbitron, sans-serif';
    btn.cornerRadius = 5;
    btn.thickness = 2;
    btn.background = 'transparent';
    btn.hoverCursor = 'pointer';

    btn.onPointerEnterObservable.add(() => {
      btn.background = color + '22';
      btn.thickness = 3;
    });
    btn.onPointerOutObservable.add(() => {
      btn.background = 'transparent';
      btn.thickness = 2;
    });

    return btn;
  }

  public dispose(): void {
    this._guiTexture.dispose();
    this._scene.dispose();
  }
}
