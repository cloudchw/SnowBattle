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
    while (this.accumulator >= this.fixedStep) {
      this.updateCallback(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
  }
}

export const scheduler = Scheduler.getInstance();
