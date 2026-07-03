import { _decorator, Component } from 'cc';
import { PowerUpType } from '@types/powerup';
import { vec2, Vec2, vec2Distance } from '@utils/math';
import { RNG } from '@utils/rng';
import { BALANCE } from '@config/balance';

const { ccclass, property } = _decorator;

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  collected: boolean;
}

@ccclass('CollectibleSystem')
export class CollectibleSystem extends Component {
  private coins: Coin[] = [];
  private powerups: PowerUp[] = [];
  private rng: RNG = new RNG(54321);

  initFromConfig(config: { coins: { count: number; pattern: string }; powerups: Array<{ type: PowerUpType; position: [number, number] }> }): void {
    this.clear();
    this.generateCoins(config.coins.count, config.coins.pattern);
    config.powerups.forEach(p => {
      this.powerups.push({
        type: p.type,
        x: p.position[0],
        y: p.position[1],
        collected: false,
      });
    });
  }

  spawnForEndless(difficulty: number, playerX: number): void {
    if (Math.random() < 0.1) {
      const x = playerX + window.innerWidth + 100;
      const y = 100 + Math.random() * (window.innerHeight - 200);
      this.coins.push({ x, y, collected: false });
    }

    if (Math.random() < 0.02) {
      const x = playerX + window.innerWidth + 200;
      const y = 100 + Math.random() * (window.innerHeight - 200);
      const types: PowerUpType[] = ['shield', 'speed', 'magnet'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.powerups.push({ type, x, y, collected: false });
    }
  }

  tick(dt: number, playerPos: Vec2, hasMagnet: boolean): void {
    if (hasMagnet) {
      this.coins.forEach(coin => {
        if (!coin.collected) {
          const dist = vec2Distance(playerPos, vec2(coin.x, coin.y));
          if (dist < 200) {
            const dx = (playerPos.x - coin.x) * 0.1;
            const dy = (playerPos.y - coin.y) * 0.1;
            coin.x += dx;
            coin.y += dy;
          }
        }
      });
    }
  }

  checkCollection(playerBounds: { x: number; y: number; width: number; height: number }): { coins: number; powerup: PowerUpType | null } {
    let coins = 0;
    let powerup: PowerUpType | null = null;

    this.coins.forEach(coin => {
      if (!coin.collected && this.isInBounds(coin.x, coin.y, playerBounds)) {
        coin.collected = true;
        coins++;
      }
    });

    this.powerups.forEach(pu => {
      if (!pu.collected && this.isInBounds(pu.x, pu.y, playerBounds)) {
        pu.collected = true;
        powerup = pu.type;
      }
    });

    return { coins, powerup };
  }

  clear(): void {
    this.coins = [];
    this.powerups = [];
  }

  private generateCoins(count: number, pattern: string): void {
    for (let i = 0; i < count; i++) {
      const x = 200 + i * 150;
      const y = 150 + Math.sin(i * 0.5) * 50;
      this.coins.push({ x, y, collected: false });
    }
  }

  private isInBounds(x: number, y: number, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
