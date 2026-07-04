/**
 * 固定步长调度器（被动）：外部每帧调用 tick(deltaMs) 推进，
 * 累积时间达到一个步长就触发一次 updateCallback。
 * 驱动由 GameApp.update(dt) 每帧调用本单例完成。
 */
export class Scheduler {
  private static instance: Scheduler;
  private fixedStep: number = 1000 / 60;
  private accumulator: number = 0;
  private updateCallback: (dt: number) => void = () => {};
  private isRunning: boolean = false;

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  setFixedStep(ms: number): void {
    this.fixedStep = ms;
  }

  onUpdate(callback: (dt: number) => void): void {
    this.updateCallback = callback;
  }

  start(): void {
    this.isRunning = true;
    this.accumulator = 0;
  }

  stop(): void {
    this.isRunning = false;
  }

  tick(deltaMs: number): void {
    if (!this.isRunning) return;

    this.accumulator += deltaMs;
    // 固定步长推进，加 safety 上限防止卡顿后追帧风暴
    let safety = 0;
    while (this.accumulator >= this.fixedStep && safety++ < 10) {
      this.updateCallback(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
  }
}

export const scheduler = Scheduler.getInstance();
