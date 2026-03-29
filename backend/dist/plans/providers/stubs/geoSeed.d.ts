import type { SearchPlansInputNormalized } from "../../validation.js";
import type { Rng } from "./prng.js";
export declare function seedFromSearch(input: SearchPlansInputNormalized, provider: string): string;
export declare function jitterLocation(rng: Rng, lat: number, lng: number, maxMeters: number): {
    lat: number;
    lng: number;
};
export declare function fakeAddress(rng: Rng): string;
export declare function fakePhone(rng: Rng): string;
export declare function fakeWebsite(_rng: Rng, nameSlug: string): string;
export declare function fakePhotoUrl(rng: Rng, kind: string): string;
