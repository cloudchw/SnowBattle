import { LevelConfig } from '../../types/level';

export function rateStars(
  config: LevelConfig,
  elapsedMs: number,
  coinsCollected: number,
  _totalMs: number,
): 0 | 1 | 2 | 3 {
  const timeThreshold3 = config.stars_threshold.time_3star * 1000;
  const timeThreshold2 = config.stars_threshold.time_2star * 1000;
  const coinsThreshold3 = config.stars_threshold.coins_3star;
  const coinsThreshold2 = config.stars_threshold.coins_2star;

  const timeUsed = elapsedMs;
  const coins = coinsCollected;

  if (timeUsed <= timeThreshold3 && coins >= coinsThreshold3) {
    return 3;
  }

  if (timeUsed <= timeThreshold2 && coins >= coinsThreshold2) {
    return 2;
  }

  return 1;
}
