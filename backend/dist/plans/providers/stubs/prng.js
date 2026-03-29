export function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let index = 0; index < str.length; index += 1) {
        h = Math.imul(h ^ str.charCodeAt(index), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
    };
}
export function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
export function seededRng(seedStr) {
    const seedFactory = xmur3(seedStr);
    return mulberry32(seedFactory());
}
export function randInt(rng, min, max) {
    const minInt = Math.ceil(min);
    const maxInt = Math.floor(max);
    if (maxInt < minInt) {
        return minInt;
    }
    return Math.floor(rng() * (maxInt - minInt + 1)) + minInt;
}
export function pick(rng, arr) {
    if (arr.length === 0) {
        throw new Error("pick() cannot select from empty array");
    }
    return arr[randInt(rng, 0, arr.length - 1)];
}
export function shuffle(rng, arr) {
    const result = [...arr];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = randInt(rng, 0, index);
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}
