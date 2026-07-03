import { _decorator, Component } from 'cc';
import { PowerUpType, POWERUP_SPECS } from '@types/powerup';
import { PowerUpState, ActivePowerUp, powerupReducer, PowerUpAction } from './powerupReducer';

const { ccclass, property } = _decorator;

const initialState: PowerUpState = {
  active: [],
};

@ccclass('PowerUpSystem')
export class PowerUpSystem extends Component {
  private state: PowerUpState = { ...initialState };

  reset(): void {
    this.state = { ...initialState };
  }

  getState(): Readonly<PowerUpState> {
    return this.state;
  }

  collect(powerupType: PowerUpType): void {
    this.state = powerupReducer(this.state, { type: 'ACTIVATE', powerupType });
  }

  tick(dt: number): void {
    this.state = powerupReducer(this.state, { type: 'TICK', dtMs: dt });
  }

  useCharge(type: PowerUpType): boolean {
    const active = this.state.active.find(a => a.type === type);
    if (active && active.charges > 0) {
      this.state = powerupReducer(this.state, { type: 'USE_CHARGE', powerupType: type });
      return true;
    }
    return false;
  }

  hasActive(type: PowerUpType): boolean {
    return this.state.active.some(a => a.type === type && a.charges > 0);
  }

  getActiveList(): ReadonlyArray<ActivePowerUp> {
    return this.state.active;
  }
}
