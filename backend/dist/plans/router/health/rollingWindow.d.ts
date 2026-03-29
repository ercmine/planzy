import type { ProviderCallOutcome } from "./healthTypes.js";
export declare class RollingWindow {
    private readonly size;
    private readonly buffer;
    private nextIndex;
    private length;
    constructor(size: number);
    push(x: ProviderCallOutcome): void;
    values(): ProviderCallOutcome[];
    count(): number;
}
