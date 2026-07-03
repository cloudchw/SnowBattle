import { BALANCE } from '@config/balance';

export function calculateComboMultiplier(comboCount: number): number {
  return 1.0 + comboCount * BALANCE.SCORING.COMBO_MULTIPLIER;
}

export function shouldBreakCombo(timeSinceLastDodge: number, threshold: number = 2000): boolean {
  return timeSinceLastDodge > threshold;
}

export function calculateComboScore(baseScore: number, comboCount: number): number {
  const multiplier = calculateComboMultiplier(comboCount);
  return Math.floor(baseScore * multiplier);
}
