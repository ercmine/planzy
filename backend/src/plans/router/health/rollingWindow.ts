import type { ProviderCallOutcome } from "./healthTypes.js";

export class RollingWindow {
  private readonly buffer: Array<ProviderCallOutcome | undefined>;
  private nextIndex = 0;
  private length = 0;

  constructor(private readonly size: number) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error("RollingWindow size must be a positive integer");
    }

    this.buffer = new Array<ProviderCallOutcome | undefined>(size);
  }

  public push(x: ProviderCallOutcome): void {
    this.buffer[this.nextIndex] = x;
    this.nextIndex = (this.nextIndex + 1) % this.size;
    this.length = Math.min(this.length + 1, this.size);
  }

  public values(): ProviderCallOutcome[] {
    if (this.length === 0) {
      return [];
    }

    const startIndex = this.length < this.size ? 0 : this.nextIndex;
    const values = new Array<ProviderCallOutcome>(this.length);

    for (let i = 0; i < this.length; i += 1) {
      const idx = (startIndex + i) % this.size;
      const value = this.buffer[idx];
      if (!value) {
        throw new Error("RollingWindow invariant violated: missing value");
      }
      values[i] = value;
    }

    return values;
  }

  public count(): number {
    return this.length;
  }
}
