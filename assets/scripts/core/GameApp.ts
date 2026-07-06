import { _decorator, Component, director, Node, profiler } from 'cc';
import { eventBus, GameEvent } from './EventBus';
import { scheduler } from './Scheduler';
import { LevelSystem } from '../modules/level/LevelSystem';
import { PlayerSystem } from '../modules/player/PlayerSystem';
import { ObstacleSystem } from '../modules/obstacle/ObstacleSystem';
import { WeatherSystem } from '../modules/weather/WeatherSystem';
import { CollectibleSystem } from '../modules/collectible/CollectibleSystem';
import { PowerUpSystem } from '../modules/powerup/PowerUpSystem';
import { ScoringSystem } from '../modules/scoring/ScoringSystem';
import { CharacterSystem } from '../modules/character/CharacterSystem';
import { InputSystem } from '../modules/input/InputSystem';
import { UIFramework } from '../modules/ui/UIFramework';
import { AudioManager } from '../modules/audio/AudioManager';
import { GameRenderer } from '../modules/render/GameRenderer';
import { cloudBridge } from '../modules/cloud/CloudBridge';
import { analyticsService } from '../modules/analytics/AnalyticsService';
import { adSystem } from '../modules/ads/AdSystem';
import { iapSystem } from '../modules/economy/IAPSystem';
import { shareSystem } from '../modules/social/ShareSystem';
import { detectDeviceTier } from '../utils/perf';
import { BALANCE } from '../config/balance';

const { ccclass, property } = _decorator;

@ccclass('GameApp')
export class GameApp extends Component {
  @property(LevelSystem) levelSystem: LevelSystem = null!;
  @property(PlayerSystem) playerSystem: PlayerSystem = null!;
  @property(ObstacleSystem) obstacleSystem: ObstacleSystem = null!;
  @property(WeatherSystem) weatherSystem: WeatherSystem = null!;
  @property(CollectibleSystem) collectibleSystem: CollectibleSystem = null!;
  @property(PowerUpSystem) powerupSystem: PowerUpSystem = null!;
  @property(ScoringSystem) scoringSystem: ScoringSystem = null!;
  @property(CharacterSystem) characterSystem: CharacterSystem = null!;
  @property(InputSystem) inputSystem: InputSystem = null!;
  @property(UIFramework) uiFramework: UIFramework = null!;
  @property(AudioManager) audioManager: AudioManager = null!;
  @property(GameRenderer) renderer: GameRenderer = null!;

  private deviceTier = detectDeviceTier();
  private isPlaying: boolean = false;
  private distanceTraveled: number = 0;
  private comboTimer: number = 0;

  async onLoad() {
    console.log('GameApp loaded, device tier:', this.deviceTier);

    await cloudBridge.login();
    analyticsService.funnel('launch');

    profiler.hideStats();
    this.setupExternalServices();
    this.setupEventListeners();
    this.setupInputHandlers();

    scheduler.setFixedStep(1000 / 60);
    scheduler.onUpdate(this.gameLoop.bind(this));
  }

  /**
   * 初始化商业化 / 社交单例服务，并启动背景音乐。
   * wx 不可用时各服务内部 fallback，不会阻塞浏览器预览。
   */
  private setupExternalServices(): void {
    adSystem.configure({
      rewardedAdUnitId: '',      // TODO: 上线前填入真实激励视频广告位 ID
      interstitialAdUnitId: '',  // TODO: 上线前填入真实插屏广告位 ID
    });
    iapSystem.setProducts([]);   // TODO: 上线前填入商品列表
    shareSystem.configure({ title: '滑雪大冒险', imageUrl: '' });
    shareSystem.setupShareMenu();

    this.audioManager?.playBackgroundMusic();
  }

  start() {
    this.startLevel('Lv_001');
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.PLAYER_HIT, this.onPlayerHit.bind(this));
    eventBus.on(GameEvent.PLAYER_DEAD, this.onPlayerDead.bind(this));
    eventBus.on(GameEvent.COIN_COLLECTED, this.onCoinCollected.bind(this));
    eventBus.on(GameEvent.LEVEL_COMPLETE, this.onLevelComplete.bind(this));
    eventBus.on(GameEvent.LEVEL_FAIL, this.onLevelFail.bind(this));
  }

  private setupInputHandlers(): void {
    this.inputSystem.onGesture((gesture) => {
      if (!this.isPlaying) return;

      switch (gesture.direction) {
        case 'up':
          this.playerSystem.applyInput({ type: 'JUMP' });
          this.audioManager?.playJumpSound();
          break;
        case 'down':
          this.playerSystem.applyInput({ type: 'DIVE' });
          this.audioManager?.playDiveSound();
          break;
        case 'left':
          this.playerSystem.applyInput({ type: 'MOVE_LEFT' });
          break;
        case 'right':
          this.playerSystem.applyInput({ type: 'MOVE_RIGHT' });
          break;
      }
    });
  }

  async startLevel(levelId: string): Promise<void> {
    this.isPlaying = false;
    this.distanceTraveled = 0;
    this.comboTimer = 0;

    this.playerSystem.init(this.characterSystem.getCurrentCharacter());
    this.scoringSystem.reset();
    this.powerupSystem.reset();

    try {
      await this.levelSystem.startLevel(levelId);
      console.log('[GameApp] levelSystem.startLevel 完成');
    } catch (e) {
      console.error('[GameApp] levelSystem.startLevel 失败:', e);
    }

    const levelState = this.levelSystem.getState();
    if (levelState) {
      this.obstacleSystem.initFromConfig(levelState.config.obstacles);
      this.collectibleSystem.initFromConfig(levelState.config.collectibles);
      this.weatherSystem.init(levelState.config.weather);
      this.levelSystem.resume();
    } else {
      console.warn('[GameApp] levelState=null，关卡数据未加载，靠 endless 生成');
    }

    this.isPlaying = true;
    scheduler.start();
    console.log('[GameApp] startLevel 完成, isPlaying=true, renderer绑定=' + (!!this.renderer));
  }

  startEndless(): void {
    this.isPlaying = false;
    this.distanceTraveled = 0;
    this.comboTimer = 0;

    this.playerSystem.init(this.characterSystem.getCurrentCharacter());
    this.scoringSystem.reset();
    this.powerupSystem.reset();

    this.levelSystem.startEndless();
    this.levelSystem.resume();
    this.obstacleSystem.clear();
    this.collectibleSystem.clear();

    this.isPlaying = true;
    scheduler.start();
  }

  /** Cocos 每帧生命周期回调：驱动固定步长调度器（dt 秒 → 毫秒）*/
  update(dt: number): void {
    scheduler.tick(dt * 1000);
  }

  private gameLoop(dt: number): void {
    if (!this.isPlaying) return;

    this.levelSystem.tick(dt);
    this.playerSystem.tick(dt);
    this.weatherSystem.tick(dt);
    this.powerupSystem.tick(dt);
    this.scoringSystem.onDistanceTick(0.1);

    const playerState = this.playerSystem.getState();
    this.distanceTraveled += playerState.speed * (dt / 1000);

    const playerX = this.distanceTraveled;
    const playerY = playerState.y;

    this.obstacleSystem.spawnForEndless(this.distanceTraveled / 10000, playerX);
    this.obstacleSystem.tick(dt, playerX);

    this.collectibleSystem.spawnForEndless(this.distanceTraveled / 10000, playerX);
    this.collectibleSystem.tick(dt, { x: playerX, y: playerY }, this.powerupSystem.hasActive('magnet'));

    const playerBounds = {
      x: playerX - 20,
      y: playerY - 40,
      width: 40,
      height: 80,
    };

    const hitObstacle = this.obstacleSystem.checkAllCollisions(playerBounds);
    if (hitObstacle) {
      if (hitObstacle.isFatal) {
        // TODO: 碰撞坐标系(玩家y=高度 vs 障碍y=DOM)不一致，临时禁用致命碰撞以便观察漂移
        // this.levelSystem.onPlayerDead('obstacle_hit');
      } else {
        this.levelSystem.onPlayerHit(1);
        this.playerSystem.onCollisionResponse('hit');
      }
    }

    const collectionResult = this.collectibleSystem.checkCollection(playerBounds);
    if (collectionResult.coins > 0) {
      this.levelSystem.onCoinCollected(collectionResult.coins);
    }
    if (collectionResult.powerup) {
      this.powerupSystem.collect(collectionResult.powerup);
      this.scoringSystem.onPowerUpUsed();
      this.audioManager?.playPowerUpSound();
    }

    this.comboTimer += dt;
    if (this.comboTimer > 2000 && this.scoringSystem.getCombo() > 0) {
      this.scoringSystem.onComboBreak();
      this.comboTimer = 0;
    }

    this.uiFramework.updateHUD(this.levelSystem.getState()!, this.scoringSystem.getState());
    this.uiFramework.setDistance(this.distanceTraveled);
    this.uiFramework.setWeather(this.weatherSystem.current().type);

    // 视觉层：把玩家/障碍/金币/道具画到屏幕
    this.renderer?.render(
      playerX,
      playerY,
      this.obstacleSystem.getObstacles(),
      this.collectibleSystem.getCoins(),
      this.collectibleSystem.getPowerups(),
    );
  }

  private onPlayerHit(damage: number): void {
    console.log('Player hit:', damage);
    this.audioManager?.playCollisionSound();
  }

  private onPlayerDead(cause: string): void {
    this.isPlaying = false;
    scheduler.stop();
    this.uiFramework.showGameOver(0, this.scoringSystem.getScore());
  }

  private onCoinCollected(count: number, total: number): void {
    this.comboTimer = 0;
    this.audioManager?.playCoinSound();
  }

  private onLevelComplete(result: any): void {
    this.isPlaying = false;
    scheduler.stop();
    this.uiFramework.showLevelComplete(result.stars, this.scoringSystem.getScore());
    analyticsService.track({
      name: 'level_complete',
      ts: Date.now(),
      levelId: result.levelId,
      stars: result.stars,
      timeUsedMs: result.timeUsedMs,
      coinsCollected: result.coinsCollected,
    });
  }

  private onLevelFail(result: any): void {
    this.isPlaying = false;
    scheduler.stop();
    this.uiFramework.showGameOver(0, this.scoringSystem.getScore());
  }
}
