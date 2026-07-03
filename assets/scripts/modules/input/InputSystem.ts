import { _decorator, Component, EventTouch, Touch, Vec2 as CocosVec2 } from 'cc';
import { GestureResult } from './gestureRecognizer';

const { ccclass, property } = _decorator;

export type GestureCallback = (gesture: GestureResult) => void;

@ccclass('InputSystem')
export class InputSystem extends Component {
  private gestureCallbacks: GestureCallback[] = [];
  private enabled: boolean = true;
  private allowedGestures: Set<string> = new Set(['jump', 'move_left', 'move_right']);

  private touchStartPos: CocosVec2 = new CocosVec2();
  private touchStartTime: number = 0;
  private isTracking: boolean = false;

  onLoad() {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  onDestroy() {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  onGesture(callback: GestureCallback): void {
    this.gestureCallbacks.push(callback);
  }

  setTutorialFilter(allowedGestures: ReadonlySet<string>): void {
    this.allowedGestures = new Set(allowedGestures);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private onTouchStart(event: EventTouch): void {
    if (!this.enabled) return;

    const touch = event.touch!;
    this.touchStartPos = touch.getLocation();
    this.touchStartTime = Date.now();
    this.isTracking = true;
  }

  private onTouchMove(event: EventTouch): void {
    if (!this.enabled || !this.isTracking) return;
  }

  private onTouchEnd(event: EventTouch): void {
    if (!this.enabled || !this.isTracking) return;

    const touch = event.touch!;
    const endPos = touch.getLocation();
    const duration = Date.now() - this.touchStartTime;

    const deltaX = endPos.x - this.touchStartPos.x;
    const deltaY = endPos.y - this.touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const screenWidth = window.innerWidth;
    const isLeftScreen = this.touchStartPos.x < screenWidth / 2;

    const gesture = this.recognizeGesture(deltaX, deltaY, distance, duration, isLeftScreen);

    if (gesture && this.allowedGestures.has(gesture.direction)) {
      this.gestureCallbacks.forEach(cb => cb(gesture));
    }

    this.isTracking = false;
  }

  private onTouchCancel(event: EventTouch): void {
    this.isTracking = false;
  }

  private recognizeGesture(
    deltaX: number,
    deltaY: number,
    distance: number,
    duration: number,
    isLeftScreen: boolean
  ): GestureResult | null {
    const minDistance = 30;
    const maxDuration = 500;

    if (distance < minDistance || duration > maxDuration) {
      return null;
    }

    const angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
    let direction: GestureResult['direction'] = null;
    let screen: 'left' | 'right' = isLeftScreen ? 'left' : 'right';

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
}
