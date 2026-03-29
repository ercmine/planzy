export function encodeOffsetCursor(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64");
}
export function decodeOffsetCursor(cursor) {
    if (!cursor)
        return 0;
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = Number.parseInt(decoded, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error("invalid cursor");
    }
    return parsed;
}
