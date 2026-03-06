import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors.js";
import { decodeCursor, encodeCursor, validateCursor, type RouterCursorV2 } from "../router/pagination/cursor.js";

const NOW_MS = 1_700_000_000_000;

describe("router cursor v2", () => {
  it("encodes and decodes a cursor round trip", () => {
    const cursor: RouterCursorV2 = {
      v: 2,
      offset: 10,
      batchSize: 25,
      deckKey: "deck-1",
      createdAtMs: NOW_MS
    };

    const encoded = encodeCursor(cursor);
    expect(typeof encoded).toBe("string");
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("rejects expired cursor", () => {
    expect(() =>
      validateCursor(
        {
          v: 2,
          offset: 0,
          batchSize: 10,
          createdAtMs: NOW_MS - 31 * 60 * 1000
        },
        NOW_MS
      )
    ).toThrowError(ValidationError);
  });

  it("rejects negative offset", () => {
    expect(() =>
      validateCursor(
        {
          v: 2,
          offset: -1,
          batchSize: 10,
          createdAtMs: NOW_MS
        },
        NOW_MS
      )
    ).toThrowError(ValidationError);
  });

  it("rejects too-large batchSize", () => {
    expect(() =>
      validateCursor(
        {
          v: 2,
          offset: 0,
          batchSize: 101,
          createdAtMs: NOW_MS
        },
        NOW_MS
      )
    ).toThrowError(ValidationError);
  });

  it("rejects too-large deckKey", () => {
    expect(() =>
      validateCursor(
        {
          v: 2,
          offset: 0,
          batchSize: 50,
          deckKey: "x".repeat(121),
          createdAtMs: NOW_MS
        },
        NOW_MS
      )
    ).toThrowError(ValidationError);
  });
});
