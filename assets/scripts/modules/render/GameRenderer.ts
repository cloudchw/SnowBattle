import { _decorator, Component, Node, Graphics, Color, UITransform, Camera } from 'cc';
import { ObstacleRuntime, ObstacleType } from '../../types/obstacle';
import { Coin, PowerUp } from '../collectible/CollectibleSystem';
import { PowerUpType } from '../../types/powerup';

const { ccclass, property } = _decorator;

const DESIGN_W = 960;
const DESIGN_H = 640;
const PLAYER_SCREEN_X = -DESIGN_W / 4;

@ccclass('GameRenderer')
export class GameRenderer extends Component {
  private gfx!: Graphics;
  private cam: Camera | null = null;

  onLoad() {
    // 抵消 Canvas 位置偏移
    const canvas = this.node.parent!.parent!;
    this.node.setPosition(-canvas.position.x, -canvas.position.y, 0);

    // 先创建 gfx，确保 render 一定可用
    const draw = new Node('Draw');
    draw.parent = this.node;
    const ut = draw.addComponent(UITransform);
    ut.setContentSize(DESIGN_W, DESIGN_H);
    this.gfx = draw.addComponent(Graphics);

    // 修正相机配置（场景相机被错误配成 ortho=10、位置偏离），用 try-catch 保护
    try {
      const cams = this.node.scene!.getComponentsInChildren(Camera);
      if (cams.length > 0) {
        this.cam = cams[0];
        this.cam.orthoHeight = DESIGN_H / 2;
        this.cam.node.setPosition(0, 0, 10);
        console.log('[GameRenderer] 相机已修正: ortho=' + this.cam.orthoHeight);
      } else {
        console.warn('[GameRenderer] 未找到相机');
      }
    } catch (e) {
      console.warn('[GameRenderer] 相机修正失败:', e);
    }
  }

  render(
    playerX: number,
    playerY: number,
    obstacles: ReadonlyArray<ObstacleRuntime>,
    coins: ReadonlyArray<Coin>,
    powerups: ReadonlyArray<PowerUp>,
  ): void {
    // 每帧固定相机 + 抵消 Canvas
    if (this.cam) this.cam.node.setPosition(0, 0, 10);
    const canvas = this.node.parent!.parent!;
    this.node.setPosition(-canvas.position.x, -canvas.position.y, 0);

    const g = this.gfx;
    if (!g) return;
    g.clear();

    // 背景
    g.fillColor = new Color(224, 238, 252, 255);
    g.rect(-DESIGN_W / 2, -DESIGN_H / 2, DESIGN_W, DESIGN_H);
    g.fill();

    // 障碍
    for (const obs of obstacles) {
      const x = this.sx(obs.x, playerX);
      const y = this.syScreen(obs.y);
      g.fillColor = this.obstacleColor(obs.type);
      g.rect(x - obs.width / 2, y - obs.height / 2, obs.width, obs.height);
      g.fill();
    }

    // 金币
    g.fillColor = new Color(255, 220, 0, 255);
    for (const c of coins) {
      if (c.collected) continue;
      g.circle(this.sx(c.x, playerX), this.syScreen(c.y), 12);
      g.fill();
    }

    // 道具
    for (const p of powerups) {
      if (p.collected) continue;
      g.fillColor = this.powerupColor(p.type);
      g.circle(this.sx(p.x, playerX), this.syScreen(p.y), 14);
      g.fill();
    }

    // 玩家（临时用亮黄色大圆，便于和红色道具区分）
    g.fillColor = new Color(255, 230, 0, 255);
    g.circle(PLAYER_SCREEN_X, this.syPlayer(playerY), 30);
    g.fill();
  }

  private sx(worldX: number, playerX: number): number { return worldX - playerX + PLAYER_SCREEN_X; }
  private syPlayer(y: number): number { return y - DESIGN_H * 0.4; }
  private syScreen(y: number): number { return DESIGN_H / 2 - y; }

  private obstacleColor(type: ObstacleType): Color {
    switch (type) {
      case 'tree':      return new Color(30, 110, 50, 255);
      case 'rock':      return new Color(120, 120, 128, 255);
      case 'cliff':     return new Color(110, 70, 35, 255);
      case 'ice':       return new Color(170, 220, 240, 255);
      case 'snow_pile': return new Color(245, 250, 255, 255);
    }
  }

  private powerupColor(type: PowerUpType): Color {
    switch (type) {
      case 'shield': return new Color(60, 120, 220, 255);
      case 'speed':  return new Color(220, 60, 60, 255);
      case 'magnet': return new Color(170, 70, 200, 255);
    }
  }
}
