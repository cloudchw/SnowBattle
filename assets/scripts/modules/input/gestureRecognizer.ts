export interface TouchSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export interface GestureResult {
  readonly direction: 'up' | 'down' | 'left' | 'right' | 'down_right' | 'up_right' | null;
  readonly length: number;
  readonly duration: number;
  readonly screen: 'left' | 'right';
}

export function recognizeGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  startTime: number,
  endTime: number,
  screenWidth: number,
): GestureResult | null {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const duration = endTime - startTime;

  const minDistance = 30;
  const maxDuration = 500;

  if (distance < minDistance || duration > maxDuration) {
    return null;
  }

  const angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
  const isLeftScreen = startX < screenWidth / 2;
  let direction: GestureResult['direction'] = null;
  const screen: 'left' | 'right' = isLeftScreen ? 'left' : 'right';

  if (isLeftScreen) {
    if (angle > 45 && angle < 135) {
      direction = 'up';
    } else if (angle < -45 && angle > -135) {
      direction = 'down';
    }
  } else {
    if (angle > -45 && angle < 45) {
      direction = 'right';
    } else if (angle > 135 || angle < -135) {
      direction = 'left';
    } else if (angle < -45 && angle > -135) {
      direction = 'down';
    } else if (angle > 45 && angle < 135) {
      direction = 'up';
    }
  }

  if (!direction) return null;

  return {
    direction,
    length: distance,
    duration,
    screen,
  };
}
