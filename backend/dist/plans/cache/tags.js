function parseCell(cell) {
    const parts = cell.split(":");
    if (parts.length !== 4 || parts[0] !== "cell") {
        return null;
    }
    const precision = Number(parts[1]);
    const lat = Number(parts[2]);
    const lng = Number(parts[3]);
    if ((precision !== 3 && precision !== 4 && precision !== 5) || Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
    }
    return { precision, lat, lng };
}
function coarsenCell(cell, precision) {
    const parsed = parseCell(cell);
    if (!parsed) {
        return null;
    }
    return `cell:${precision}:${parsed.lat.toFixed(precision)}:${parsed.lng.toFixed(precision)}`;
}
export function cellPrefixTags(cell) {
    const parsed = parseCell(cell);
    if (!parsed) {
        return [];
    }
    if (parsed.precision === 5) {
        return [coarsenCell(cell, 4), coarsenCell(cell, 3)].filter((v) => Boolean(v));
    }
    if (parsed.precision === 4) {
        return [coarsenCell(cell, 3)].filter((v) => Boolean(v));
    }
    return [];
}
export function makeTags(parts) {
    const tags = new Set();
    tags.add(`provider:${parts.provider ?? "router"}`);
    tags.add(`cell:${parts.cell}`);
    for (const coarserCell of cellPrefixTags(parts.cell)) {
        tags.add(`cellp:${coarserCell}`);
    }
    for (const category of parts.categories ?? []) {
        tags.add(`cat:${category}`);
    }
    tags.add(`openNow:${parts.openNow ? 1 : 0}`);
    if (parts.sessionId) {
        tags.add(`session:${parts.sessionId}`);
    }
    return [...tags];
}
