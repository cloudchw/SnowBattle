import {
  _decorator,
  Camera,
  Color,
  Component,
  Graphics,
  ImageAsset,
  Node,
  resources,
  Sprite,
  SpriteFrame,
  Texture2D,
  UITransform,
  view,
} from 'cc';
import { ObstacleRuntime, ObstacleType } from '../../types/obstacle';
import { Coin, PowerUp } from '../collectible/CollectibleSystem';
import { PowerUpType } from '../../types/powerup';

const { ccclass } = _decorator;

const FALLBACK_VIEW_W = 960;
const FALLBACK_VIEW_H = 640;
const CAMERA_Z = 1000;

type SpriteKey =
  | 'background'
  | 'trackGuides'
  | 'playerSki'
  | 'playerJump'
  | 'coin'
  | 'shield'
  | 'icePick'
  | 'tree'
  | 'snowPile'
  | 'cliff'
  | 'ice'
  | 'rock'
  | 'skier'
  | 'warningOverlay'
  | 'dangerOverlay'
  | 'skiTrail';

interface RenderSize {
  readonly width: number;
  readonly height: number;
}

const RUNTIME_TEXTURE_PATHS: Readonly<Record<SpriteKey, string>> = {
  background: 'textures/terrain/bg_ch1_beginner_slope',
  trackGuides: 'textures/terrain/terrain_track_guides',
  playerSki: 'textures/characters/player_xiaoming_ski',
  playerJump: 'textures/characters/player_xiaoming_jump',
  coin: 'textures/collectibles/coin_gold_snowflake',
  shield: 'textures/powerups/powerup_shield_ice',
  icePick: 'textures/powerups/powerup_ice_pick',
  tree: 'textures/obstacles/obstacle_tree_snow_pine',
  snowPile: 'textures/obstacles/obstacle_snow_pile_soft',
  cliff: 'textures/obstacles/obstacle_cliff_gap',
  ice: 'textures/obstacles/obstacle_ice_patch',
  rock: 'textures/obstacles/obstacle_rockfall_snow',
  skier: 'textures/characters/npc_skier_forest',
  warningOverlay: 'textures/fx/fx_obstacle_warning_overlay',
  dangerOverlay: 'textures/fx/fx_obstacle_danger_overlay',
  skiTrail: 'textures/fx/fx_ski_trail_basic',
};

@ccclass('GameRenderer')
export class GameRenderer extends Component {
  private gfx!: Graphics;
  private cam: Camera | null = null;
  private backgroundNode!: Node;
  private backgroundSprite!: Sprite;
  private backgroundTransform!: UITransform;
  private drawNode!: Node;
  private drawTransform!: UITransform;
  private spriteLayer!: Node;
  private spriteFrames: Map<SpriteKey, SpriteFrame> = new Map();
  private spritePools: Map<SpriteKey, Node[]> = new Map();
  private activeSpriteCounts: Map<SpriteKey, number> = new Map();
  private preloadPromise: Promise<void> | null = null;
  private viewportWidth: number = FALLBACK_VIEW_W;
  private viewportHeight: number = FALLBACK_VIEW_H;

  onLoad(): void {
    this.alignRendererRoot();

    this.backgroundNode = new Node('Background');
    this.backgroundNode.parent = this.node;
    this.backgroundNode.setPosition(0, 0, 0);
    this.backgroundTransform = this.backgroundNode.addComponent(UITransform);
    this.backgroundSprite = this.backgroundNode.addComponent(Sprite);
    this.backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.backgroundNode.active = false;

    this.drawNode = new Node('FallbackDraw');
    this.drawNode.parent = this.node;
    this.drawNode.setPosition(0, 0, 0);
    this.drawTransform = this.drawNode.addComponent(UITransform);
    this.gfx = this.drawNode.addComponent(Graphics);

    this.spriteLayer = new Node('RuntimeSprites');
    this.spriteLayer.parent = this.node;
    this.spriteLayer.setPosition(0, 0, 0);
    this.spriteLayer.addComponent(UITransform);

    void this.preload();

    try {
      const cameras = this.node.scene!.getComponentsInChildren(Camera);
      this.cam = cameras[0] ?? null;
      this.syncViewportAndCamera();
      if (!this.cam) {
        console.warn('[GameRenderer] camera not found');
      }
    } catch (error) {
      console.warn('[GameRenderer] failed to configure camera:', error);
    }
  }

  preload(): Promise<void> {
    if (!this.preloadPromise) {
      this.preloadPromise = this.loadRuntimeTextures();
    }
    return this.preloadPromise;
  }

  render(
    playerX: number,
    playerY: number,
    obstacles: ReadonlyArray<ObstacleRuntime>,
    coins: ReadonlyArray<Coin>,
    powerups: ReadonlyArray<PowerUp>,
  ): void {
    this.syncViewportAndCamera();

    const g = this.gfx;
    if (!g) return;
    g.clear();
    this.beginSpriteFrame();

    if (!this.renderBackground()) {
      g.fillColor = new Color(224, 238, 252, 255);
      g.rect(-this.viewportWidth / 2, -this.viewportHeight / 2, this.viewportWidth, this.viewportHeight);
      g.fill();
    }

    this.renderTrackGuides(playerX);
    this.drawSprite('skiTrail', this.playerScreenX() - 46, this.syWorld(playerY) - 20, 132, 56);

    for (const obs of obstacles) {
      const x = this.sx(obs.x, playerX);
      const y = this.syWorld(obs.y);
      const size = this.obstacleRenderSize(obs);
      if (!this.isWithinViewport(x, y, size.width, size.height, 180)) {
        continue;
      }

      const spriteKey = this.obstacleSpriteKey(obs.type);
      const drewSprite = spriteKey ? this.drawSprite(spriteKey, x, y, size.width, size.height) : false;
      if (!drewSprite) {
        this.drawFallbackObstacle(g, obs, x, y);
      }

      if (obs.state === 'warning') {
        this.drawSprite('warningOverlay', x, y, Math.max(size.width, 96), Math.max(size.height, 96), 210);
      } else if (obs.state === 'danger') {
        this.drawSprite('dangerOverlay', x, y, Math.max(size.width, 112), Math.max(size.height, 112), 220);
      }
    }

    for (const coin of coins) {
      if (coin.collected) continue;
      const x = this.sx(coin.x, playerX);
      const y = this.syWorld(coin.y);
      if (!this.isWithinViewport(x, y, 44, 44, 120)) {
        continue;
      }

      if (!this.drawSprite('coin', x, y, 44, 44)) {
        this.drawFallbackCoin(g, x, y);
      }
    }

    for (const powerup of powerups) {
      if (powerup.collected) continue;
      const x = this.sx(powerup.x, playerX);
      const y = this.syWorld(powerup.y);
      if (!this.isWithinViewport(x, y, 56, 56, 120)) {
        continue;
      }

      const powerupKey = this.powerupSpriteKey(powerup.type);
      const drewSprite = powerupKey ? this.drawSprite(powerupKey, x, y, 56, 56) : false;
      if (!drewSprite) {
        this.drawFallbackPowerup(g, powerup.type, x, y);
      }
    }

    const playerKey: SpriteKey = playerY > 8 ? 'playerJump' : 'playerSki';
    if (!this.drawSprite(playerKey, this.playerScreenX(), this.syWorld(playerY), 96, 128)) {
      this.drawFallbackPlayer(g, playerY);
    }

    this.endSpriteFrame();
  }

  private syncViewportAndCamera(): void {
    const visibleSize = view.getVisibleSize();
    this.viewportWidth = visibleSize.width > 0 ? visibleSize.width : FALLBACK_VIEW_W;
    this.viewportHeight = visibleSize.height > 0 ? visibleSize.height : FALLBACK_VIEW_H;

    this.alignRendererRoot();
    if (this.drawNode) {
      this.drawNode.setPosition(0, 0, 0);
      this.drawNode.setRotationFromEuler(0, 0, 0);
      this.drawNode.setScale(1, 1, 1);
    }
    if (this.backgroundNode) {
      this.backgroundNode.setPosition(0, 0, 0);
      this.backgroundNode.setRotationFromEuler(0, 0, 0);
      this.backgroundNode.setScale(1, 1, 1);
    }
    if (this.spriteLayer) {
      this.spriteLayer.setPosition(0, 0, 0);
      this.spriteLayer.setRotationFromEuler(0, 0, 0);
      this.spriteLayer.setScale(1, 1, 1);
    }
    if (this.backgroundTransform) {
      this.backgroundTransform.setContentSize(this.viewportWidth, this.viewportHeight);
    }
    if (this.drawTransform) {
      this.drawTransform.setContentSize(this.viewportWidth, this.viewportHeight);
    }

    if (!this.cam) return;

    this.cam.projection = Camera.ProjectionType.ORTHO;
    this.cam.orthoHeight = this.viewportHeight / 2;
    this.cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    this.cam.clearColor = new Color(224, 238, 252, 255);
    this.cam.near = 1;
    this.cam.far = CAMERA_Z + 100;
    this.cam.node.setPosition(0, 0, CAMERA_Z);
    this.cam.node.setRotationFromEuler(0, 0, 0);
    this.cam.node.setScale(1, 1, 1);
  }

  private async loadRuntimeTextures(): Promise<void> {
    const keys = Object.keys(RUNTIME_TEXTURE_PATHS) as SpriteKey[];
    await Promise.all(keys.map((key) => this.loadSpriteFrame(key, RUNTIME_TEXTURE_PATHS[key])));
  }

  private loadSpriteFrame(key: SpriteKey, path: string): Promise<void> {
    return new Promise((resolve) => {
      resources.load(path, ImageAsset, (err: Error | null, image: ImageAsset | null) => {
        if (err || !image) {
          console.warn(`[GameRenderer] failed to load texture ${path}`, err);
          resolve();
          return;
        }

        const texture = new Texture2D();
        texture.image = image;

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;
        this.spriteFrames.set(key, spriteFrame);
        resolve();
      });
    });
  }

  private renderBackground(): boolean {
    const frame = this.spriteFrames.get('background');
    if (!frame) {
      this.backgroundNode.active = false;
      return false;
    }

    this.backgroundNode.active = true;
    this.backgroundSprite.spriteFrame = frame;
    this.backgroundTransform.setContentSize(this.viewportWidth, this.viewportHeight);
    return true;
  }

  private renderTrackGuides(playerX: number): void {
    if (!this.spriteFrames.has('trackGuides')) return;

    const spacing = 520;
    const offset = playerX % spacing;
    const startX = this.playerScreenX() + 180 - offset;
    const y = this.syWorld(-24);
    for (let i = 0; i < 4; i++) {
      this.drawSprite('trackGuides', startX + i * spacing, y, 380, 120, 120);
    }
  }

  private beginSpriteFrame(): void {
    this.activeSpriteCounts.clear();
  }

  private endSpriteFrame(): void {
    this.spritePools.forEach((pool, key) => {
      const used = this.activeSpriteCounts.get(key) ?? 0;
      for (let i = used; i < pool.length; i++) {
        const node = pool[i];
        if (node) {
          node.active = false;
        }
      }
    });
  }

  private drawSprite(key: SpriteKey, x: number, y: number, width: number, height: number, alpha: number = 255): boolean {
    const frame = this.spriteFrames.get(key);
    if (!frame) return false;

    const node = this.nextSpriteNode(key);
    const sprite = node.getComponent(Sprite);
    const transform = node.getComponent(UITransform);
    if (!sprite || !transform) return false;

    node.active = true;
    node.setPosition(x, y, 0);
    transform.setContentSize(width, height);
    sprite.spriteFrame = frame;
    sprite.color = new Color(255, 255, 255, alpha);
    return true;
  }

  private nextSpriteNode(key: SpriteKey): Node {
    let pool = this.spritePools.get(key);
    if (!pool) {
      pool = [];
      this.spritePools.set(key, pool);
    }

    const index = this.activeSpriteCounts.get(key) ?? 0;
    this.activeSpriteCounts.set(key, index + 1);

    const existing = pool[index];
    if (existing) return existing;

    const node = new Node(`${key}_${index}`);
    node.parent = this.spriteLayer;
    node.addComponent(UITransform);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    pool.push(node);
    return node;
  }

  private obstacleSpriteKey(type: ObstacleType): SpriteKey | null {
    switch (type) {
      case 'tree': return 'tree';
      case 'snow_pile': return 'snowPile';
      case 'cliff': return 'cliff';
      case 'ice': return 'ice';
      case 'rock': return 'rock';
      case 'skier': return 'skier';
      case 'hill':
      case 'hot_spring':
        return null;
    }
  }

  private powerupSpriteKey(type: PowerUpType): SpriteKey | null {
    switch (type) {
      case 'shield': return 'shield';
      case 'ice_pick': return 'icePick';
      case 'speed':
      case 'magnet':
      case 'parachute':
      case 'flare':
      case 'snow_plow':
        return null;
    }
  }

  private obstacleRenderSize(obs: ObstacleRuntime): RenderSize {
    switch (obs.type) {
      case 'tree': return { width: 88, height: 132 };
      case 'snow_pile': return { width: 112, height: 64 };
      case 'cliff': return { width: 190, height: 96 };
      case 'ice': return { width: 190, height: 72 };
      case 'rock': return { width: 88, height: 88 };
      case 'skier': return { width: 88, height: 112 };
      case 'hill': return { width: Math.max(obs.width, 120), height: Math.max(obs.height, 56) };
      case 'hot_spring': return { width: Math.max(obs.width, 96), height: Math.max(obs.height, 96) };
    }
  }

  private isWithinViewport(x: number, y: number, width: number, height: number, margin: number): boolean {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const minX = -this.viewportWidth / 2 - margin;
    const maxX = this.viewportWidth / 2 + margin;
    const minY = -this.viewportHeight / 2 - margin;
    const maxY = this.viewportHeight / 2 + margin;
    return x + halfWidth >= minX && x - halfWidth <= maxX && y + halfHeight >= minY && y - halfHeight <= maxY;
  }

  private drawFallbackObstacle(g: Graphics, obs: ObstacleRuntime, x: number, y: number): void {
    g.fillColor = this.obstacleColor(obs.type);
    g.rect(x - obs.width / 2, y - obs.height / 2, obs.width, obs.height);
    g.fill();
  }

  private drawFallbackCoin(g: Graphics, x: number, y: number): void {
    g.fillColor = new Color(255, 220, 0, 255);
    g.circle(x, y, 12);
    g.fill();
  }

  private drawFallbackPowerup(g: Graphics, type: PowerUpType, x: number, y: number): void {
    g.fillColor = this.powerupColor(type);
    g.circle(x, y, 14);
    g.fill();
  }

  private drawFallbackPlayer(g: Graphics, playerY: number): void {
    g.fillColor = new Color(255, 230, 0, 255);
    g.circle(this.playerScreenX(), this.syWorld(playerY), 30);
    g.fill();
  }

  private alignRendererRoot(): void {
    const canvas = this.node.parent?.parent;
    if (canvas) {
      this.node.setPosition(-canvas.position.x, -canvas.position.y, 0);
      this.node.setRotationFromEuler(0, 0, 0);
      this.node.setScale(1, 1, 1);
      return;
    }
    this.node.setPosition(0, 0, 0);
    this.node.setRotationFromEuler(0, 0, 0);
    this.node.setScale(1, 1, 1);
  }

  private playerScreenX(): number {
    return -this.viewportWidth * 0.25;
  }

  private sx(worldX: number, playerX: number): number {
    return worldX - playerX + this.playerScreenX();
  }

  private syWorld(y: number): number {
    return y - this.viewportHeight * 0.4;
  }

  private obstacleColor(type: ObstacleType): Color {
    switch (type) {
      case 'tree': return new Color(30, 110, 50, 255);
      case 'rock': return new Color(120, 120, 128, 255);
      case 'cliff': return new Color(110, 70, 35, 255);
      case 'ice': return new Color(170, 220, 240, 255);
      case 'snow_pile': return new Color(245, 250, 255, 255);
      case 'hill': return new Color(225, 245, 255, 255);
      case 'skier': return new Color(230, 90, 90, 255);
      case 'hot_spring': return new Color(80, 190, 210, 255);
    }
  }

  private powerupColor(type: PowerUpType): Color {
    switch (type) {
      case 'shield': return new Color(60, 120, 220, 255);
      case 'speed': return new Color(220, 60, 60, 255);
      case 'magnet': return new Color(170, 70, 200, 255);
      case 'ice_pick': return new Color(120, 210, 240, 255);
      case 'parachute': return new Color(240, 170, 70, 255);
      case 'flare': return new Color(255, 120, 40, 255);
      case 'snow_plow': return new Color(210, 210, 220, 255);
    }
  }
}
