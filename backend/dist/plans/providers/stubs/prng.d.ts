export type Rng = () => number;
export declare function xmur3(str: string): () => number;
export declare function mulberry32(seed: number): () => number;
export declare function seededRng(seedStr: string): () => number;
export declare function randInt(rng: Rng, min: number, max: number): number;
export declare function pick<T>(rng: Rng, arr: T[]): T;
export declare function shuffle<T>(rng: Rng, arr: T[]): T[];
