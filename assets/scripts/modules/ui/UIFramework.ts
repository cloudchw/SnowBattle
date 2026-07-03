import { _decorator, Component, Label, Node, Color } from 'cc';
import { LevelState } from '@modules/level/levelReducer';
import { ScoringState } from '@modules/scoring/scoreReducer';
import { WeatherType } from '@types/weather';
import { PowerUpType } from '@types/powerup';

const { ccclass, property } = _decorator;

@ccclass('UIFramework')
export class UIFramework extends Component {
  @property(Label) countdownLabel: Label = null!;
  @property(Label) coinsLabel: Label = null!;
  @property(Label) scoreLabel: Label = null!;
  @property(Label) comboLabel: Label = null!;
  @property(Label) hpLabel: Label = null!;
  @property(Label) weatherLabel: Label = null!;
  @property(Label) distanceLabel: Label = null!;

  setCountdown(ms: number): void {
    if (this.countdownLabel) {
      const seconds = Math.ceil(ms / 1000);
      this.countdownLabel.string = `${seconds}s`;
    }
  }

  setCoins(count: number): void {
    if (this.coinsLabel) {
      this.coinsLabel.string = `🪙 ${count}`;
    }
  }

  setScore(score: number): void {
    if (this.scoreLabel) {
      this.scoreLabel.string = `⭐ ${score}`;
    }
  }

  setCombo(combo: number): void {
    if (this.comboLabel) {
      if (combo > 0) {
        this.comboLabel.string = `🔥 ${combo}x`;
        this.comboLabel.node.active = true;
      } else {
        this.comboLabel.node.active = false;
      }
    }
  }

  setHP(hp: number): void {
    if (this.hpLabel) {
      this.hpLabel.string = `❤️ ${hp}`;
    }
  }

  setWeather(type: WeatherType): void {
    if (this.weatherLabel) {
      const weatherNames: Record<WeatherType, string> = {
        clear: '☀️ 晴天',
        light_snow: '🌨️ 小雪',
        blizzard: '❄️ 暴风雪',
        fog: '🌫️ 大雾',
        night: '🌙 夜间',
        wind: '💨 狂风',
      };
      this.weatherLabel.string = weatherNames[type];
    }
  }

  setDistance(meters: number): void {
    if (this.distanceLabel) {
      this.distanceLabel.string = `${Math.floor(meters)}m`;
    }
  }

  updateHUD(levelState: LevelState, scoringState: ScoringState): void {
    this.setCountdown(levelState.countdownMs);
    this.setCoins(levelState.coinsCollected);
    this.setScore(scoringState.score);
    this.setCombo(scoringState.comboCount);
  }

  showGameOver(stars: number, score: number): void {
    console.log(`Game Over: ${stars} stars, ${score} score`);
  }

  showLevelComplete(stars: number, score: number): void {
    console.log(`Level Complete: ${stars} stars, ${score} score`);
  }
}
