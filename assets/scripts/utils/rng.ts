export class RNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: ReadonlyArray<T>): T {
    const idx = this.nextInt(0, array.length - 1);
    return array[idx] as T;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const a = result[i];
      const b = result[j];
      if (a !== undefined && b !== undefined) {
        result[i] = b;
        result[j] = a;
      }
    }
    return result;
  }

  reset(seed?: number): void {
    this.seed = seed ?? Date.now();
  }
}
