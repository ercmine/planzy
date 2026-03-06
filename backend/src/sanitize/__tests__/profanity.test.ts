import { describe, expect, it } from "vitest";

import { ValidationError } from "../../plans/errors.js";
import { checkProfanity, enforceProfanity, maskProfanity } from "../profanity.js";

describe("profanity", () => {
  it("detects mild profanity", () => {
    const result = checkProfanity("this is shit");
    expect(result.severity).toBe("mild");
    expect(result.hasProfanity).toBe(true);
  });

  it("detects severe profanity and blocks", () => {
    const result = checkProfanity("I will kill you");
    expect(result.severity).toBe("severe");
    expect(() => enforceProfanity("kill yourself")).toThrow(ValidationError);
    expect(() => enforceProfanity("kill yourself")).toThrow("Input contains abusive content.");
  });

  it("masks mild words only", () => {
    const result = maskProfanity("what the hell, this is crap");
    expect(result.cleanedText).toBe("what the ****, this is ****");
    expect(maskProfanity("friendly text").cleanedText).toBe("friendly text");
  });
});
