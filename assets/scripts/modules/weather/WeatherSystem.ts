import { _decorator, Component } from 'cc';
import { WeatherType, WeatherConfig, WEATHER_CONFIGS } from '../../types/weather';
import { eventBus, GameEvent } from '../../core/EventBus';

const { ccclass, property } = _decorator;

@ccclass('WeatherSystem')
export class WeatherSystem extends Component {
  private currentConfig: WeatherConfig = WEATHER_CONFIGS.clear;
  private changeTimer: number = 0;
  private changeInterval: number = 30000;
  private stormMode: boolean = false;

  init(config: WeatherConfig): void {
    this.currentConfig = config;
    this.changeTimer = 0;
    this.changeInterval = 30000 + Math.random() * 30000;
  }

  current(): WeatherConfig {
    return this.currentConfig;
  }

  changeWeather(type: WeatherType, duration?: number): void {
    this.currentConfig = WEATHER_CONFIGS[type];
    eventBus.emit(GameEvent.WEATHER_CHANGE, type);
  }

  enableStormMode(): void {
    this.stormMode = true;
    this.changeWeather('blizzard');
  }

  tick(dt: number): void {
    if (this.stormMode) return;

    this.changeTimer += dt;
    if (this.changeTimer >= this.changeInterval) {
      this.changeTimer = 0;
      this.changeInterval = 30000 + Math.random() * 30000;

      const types: WeatherType[] = ['clear', 'light_snow', 'fog', 'night', 'wind'];
      const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
      const roll = Math.random();
      let cumulative = 0;
      for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) {
          this.changeWeather(types[i]);
          break;
        }
      }
    }
  }

  getSpeedModifier(): number {
    return this.currentConfig.speedMod;
  }

  getControlModifier(): number {
    return this.currentConfig.controlMod;
  }

  getVisibility(): number {
    return this.currentConfig.visibility;
  }

  getWindForce(): number {
    return this.currentConfig.windForce;
  }

  getWindDir(): number {
    return this.currentConfig.windDir;
  }
}
