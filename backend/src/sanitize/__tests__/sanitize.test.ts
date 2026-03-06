import { describe, expect, it } from "vitest";

import { normalizeWhitespace, sanitizeText, truncate } from "../text.js";
import { stripHtml } from "../html.js";

describe("sanitize text", () => {
  it("strips html/script/style blocks", () => {
    expect(stripHtml("<b>Hello</b><script>alert(1)</script><style>p{}</style>")).toBe(" Hello   ");
    expect(
      sanitizeText("<b>Hello</b><script>alert(1)</script>", {
        source: "provider",
        maxLen: 140,
        allowNewlines: false
      })
    ).toBe("Hello");
  });

  it("decodes supported entities", () => {
    expect(
      sanitizeText("Fish &amp; Chips &lt;3", {
        source: "provider",
        maxLen: 100,
        allowNewlines: false
      })
    ).toBe("Fish & Chips 3");
  });

  it("collapses whitespace for multiline or single line", () => {
    expect(normalizeWhitespace("hello\r\n\tworld", false)).toBe("hello world");
    expect(normalizeWhitespace("a   b\n\n\n\n c", true)).toBe("a b\n\n\nc");
  });

  it("truncates with ellipsis", () => {
    expect(truncate("abcdefgh", 5, true)).toBe("abcd…");
  });

  it("does not mask provider profanity by default", () => {
    expect(
      sanitizeText("this is shit", {
        source: "provider",
        maxLen: 50,
        allowNewlines: false
      })
    ).toBe("this is shit");
  });

  it("masks user mild profanity", () => {
    expect(
      sanitizeText("this is shit", {
        source: "user",
        maxLen: 50,
        allowNewlines: false,
        profanityMode: "mask"
      })
    ).toBe("this is ****");
  });
});
