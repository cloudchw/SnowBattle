import { _decorator, Component } from 'cc';
import { PowerUpType } from '../../types/powerup';
import { vec2, Vec2, vec2Distance } from '../../utils/math';
import { RNG } from '../../utils/rng';

const { ccclass } = _decorator;

const FALLBACK_VIEW_W = 960;
const FALLBACK_VIEW_H = 640;
const DESPAWN_MARGIN = 160;
const COIN_SPAWN_BASE_SPACING = 150;
const COIN_SPAWN_MIN_SPACING = 100;
const POWERUP_SPAWN_BASE_SPACING = 1200;
const POWERUP_SPAWN_MIN_SPACING = 900;
const MAX_ACTIVE_COINS = 80;
const MAX_ACTIVE_POWERUPS = 12;

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface PowerUp {
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
  private lastCoinSpawnX: number = Number.NEGATIVE_INFINITY;
  private lastPowerupSpawnX: number = Number.NEGATIVE_INFINITY;

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
    this.syncSpawnCursorsToConfiguredItems();
  }

  spawnForEndless(difficulty: number, playerX: number): void {
    const viewWidth = this.viewportWidth();
    const viewHeight = this.viewportHeight();

    if (playerX - this.lastCoinSpawnX >= this.coinSpacing(difficulty)) {
      const x = playerX + viewWidth + 100;
      const y = this.rng.nextFloat(100, Math.max(100, viewHeight - 100));
      this.coins.push({ x, y, collected: false });
      this.lastCoinSpawnX = playerX;
    }

    if (playerX - this.lastPowerupSpawnX >= this.powerupSpacing(difficulty) && this.rng.next() < 0.35) {
      const x = playerX + viewWidth + 200;
      const y = this.rng.nextFloat(100, Math.max(100, viewHeight - 100));
      const types: PowerUpType[] = ['shield', 'speed', 'magnet'];
      const type = types[this.rng.nextInt(0, types.length - 1)] ?? 'shield';
      this.powerups.push({ type, x, y, collected: false });
      this.lastPowerupSpawnX = playerX;
    }

    this.enforceCapacityLimits();
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

    this.pruneCollectedAndExpired(playerPos.x);
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

  getCoins(): ReadonlyArray<Coin> {
    return this.coins;
  }

  getPowerups(): ReadonlyArray<PowerUp> {
    return this.powerups;
  }

  clear(): void {
    this.coins = [];
    this.powerups = [];
    this.lastCoinSpawnX = Number.NEGATIVE_INFINITY;
    this.lastPowerupSpawnX = Number.NEGATIVE_INFINITY;
  }

  private generateCoins(count: number, pattern: string): void {
    for (let i = 0; i < count; i++) {
      const x = 200 + i * 150;
      const y = 150 + Math.sin(i * 0.5) * 50;
      this.coins.push({ x, y, collected: false });
    }
  }

  private pruneCollectedAndExpired(playerX: number): void {
    const cutoffX = playerX - this.viewportWidth() - DESPAWN_MARGIN;
    this.coins = this.coins.filter(coin => !coin.collected && coin.x >= cutoffX);
    this.powerups = this.powerups.filter(powerup => !powerup.collected && powerup.x >= cutoffX);
  }

  private enforceCapacityLimits(): void {
    if (this.coins.length > MAX_ACTIVE_COINS) {
      this.coins = this.coins.slice(this.coins.length - MAX_ACTIVE_COINS);
    }
    if (this.powerups.length > MAX_ACTIVE_POWERUPS) {
      this.powerups = this.powerups.slice(this.powerups.length - MAX_ACTIVE_POWERUPS);
    }
  }

  private syncSpawnCursorsToConfiguredItems(): void {
    const lastCoinX = this.coins.reduce((maxX, coin) => Math.max(maxX, coin.x), Number.NEGATIVE_INFINITY);
    const lastPowerupX = this.powerups.reduce((maxX, powerup) => Math.max(maxX, powerup.x), Number.NEGATIVE_INFINITY);
    this.lastCoinSpawnX = lastCoinX;
    this.lastPowerupSpawnX = lastPowerupX;
  }

  private coinSpacing(difficulty: number): number {
    return Math.max(COIN_SPAWN_MIN_SPACING, COIN_SPAWN_BASE_SPACING - difficulty * 30);
  }

  private powerupSpacing(difficulty: number): number {
    return Math.max(POWERUP_SPAWN_MIN_SPACING, POWERUP_SPAWN_BASE_SPACING - difficulty * 120);
  }

  private viewportWidth(): number {
    return window.innerWidth > 0 ? window.innerWidth : FALLBACK_VIEW_W;
  }

  private viewportHeight(): number {
    return window.innerHeight > 0 ? window.innerHeight : FALLBACK_VIEW_H;
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
