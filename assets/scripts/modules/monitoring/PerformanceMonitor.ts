import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 性能监控（Cocos Component）。
 * 每秒采样 FPS 与 JS 堆内存，低于阈值时输出告警。
 */
@ccclass('PerformanceMonitor')
export class PerformanceMonitor extends Component {
  @property
  targetFPS: number = 60;

  @property
  maxMemoryUsage: number = 100; // MB

  private currentFPS: number = 0;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private memoryUsage: number = 0;

  start() {
    this.lastTime = Date.now();
  }

  update(_deltaTime: number) {
    this.frameCount++;
    const elapsed = Date.now() - this.lastTime;
    if (elapsed >= 1000) {
      this.currentFPS = this.frameCount / (elapsed / 1000);
      this.frameCount = 0;
      this.lastTime = Date.now();
      this.checkPerformance();
    }
  }

  private checkPerformance(): void {
    if (this.currentFPS < this.targetFPS * 0.9) {
      console.warn('[Perf] FPS below target:', this.currentFPS.toFixed(1), 'target:', this.targetFPS);
    }
    this.memoryUsage = this.readMemoryUsage();
    if (this.memoryUsage > this.maxMemoryUsage) {
      console.warn('[Perf] Memory too high:', this.memoryUsage.toFixed(1), 'MB');
    }
  }

  private readMemoryUsage(): number {
    if (typeof wx !== 'undefined' && (wx as any).getPerformance) {
      const memory = (wx as any).getPerformance().memory;
      if (memory) {
        return memory.usedJSHeapSize / 1024 / 1024; // -> MB
      }
    }
    return 0;
  }

  getCurrentFPS(): number { return this.currentFPS; }
  getMemoryUsageMB(): number { return this.memoryUsage; }
  isPerformanceGood(): boolean {
    return this.currentFPS >= this.targetFPS * 0.9 &&
      this.memoryUsage <= this.maxMemoryUsage;
  }
}
