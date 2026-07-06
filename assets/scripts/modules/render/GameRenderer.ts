import { _decorator, Camera, Color, Component, Graphics, Node, UITransform, view } from 'cc';
import { ObstacleRuntime, ObstacleType } from '../../types/obstacle';
import { Coin, PowerUp } from '../collectible/CollectibleSystem';
import { PowerUpType } from '../../types/powerup';

const { ccclass } = _decorator;

const FALLBACK_VIEW_W = 960;
const FALLBACK_VIEW_H = 640;
const CAMERA_Z = 1000;

@ccclass('GameRenderer')
export class GameRenderer extends Component {
  private gfx!: Graphics;
  private cam: Camera | null = null;
  private drawNode!: Node;
  private drawTransform!: UITransform;
  private viewportWidth: number = FALLBACK_VIEW_W;
  private viewportHeight: number = FALLBACK_VIEW_H;

  onLoad(): void {
    this.alignRendererRoot();

    this.drawNode = new Node('Draw');
    this.drawNode.parent = this.node;
    this.drawNode.setPosition(0, 0, 0);
    this.drawTransform = this.drawNode.addComponent(UITransform);
    this.gfx = this.drawNode.addComponent(Graphics);

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

    g.fillColor = new Color(224, 238, 252, 255);
    g.rect(-this.viewportWidth / 2, -this.viewportHeight / 2, this.viewportWidth, this.viewportHeight);
    g.fill();

    for (const obs of obstacles) {
      const x = this.sx(obs.x, playerX);
      const y = this.syScreen(obs.y);
      g.fillColor = this.obstacleColor(obs.type);
      g.rect(x - obs.width / 2, y - obs.height / 2, obs.width, obs.height);
      g.fill();
    }

    g.fillColor = new Color(255, 220, 0, 255);
    for (const coin of coins) {
      if (coin.collected) continue;
      g.circle(this.sx(coin.x, playerX), this.syScreen(coin.y), 12);
      g.fill();
    }

    for (const powerup of powerups) {
      if (powerup.collected) continue;
      g.fillColor = this.powerupColor(powerup.type);
      g.circle(this.sx(powerup.x, playerX), this.syScreen(powerup.y), 14);
      g.fill();
    }

    g.fillColor = new Color(255, 230, 0, 255);
    g.circle(this.playerScreenX(), this.syPlayer(playerY), 30);
    g.fill();
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

  private syPlayer(y: number): number {
    return y - this.viewportHeight * 0.4;
  }

  private syScreen(y: number): number {
    return this.viewportHeight / 2 - y;
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
