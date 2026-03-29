export function encodeOffsetCursor(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64url");
}
export function decodeOffsetCursor(cursor) {
    if (!cursor)
        return 0;
    const parsed = Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10);
    if (!Number.isFinite(parsed) || parsed < 0)
        throw new Error("invalid cursor");
    return parsed;
}
