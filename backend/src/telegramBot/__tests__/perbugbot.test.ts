import { describe, expect, test } from "vitest";

import { buildLaunchKeyboard, buildWelcomeText, loadPerbugBotConfig } from "../perbugbot.js";

describe("perbugbot config", () => {
  test("requires TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadPerbugBotConfig({ PERBUG_MINI_APP_URL: "https://app.perbug.com" })).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  test("requires https mini app url", () => {
    expect(() => loadPerbugBotConfig({ TELEGRAM_BOT_TOKEN: "token", PERBUG_MINI_APP_URL: "http://localhost:8080" })).toThrow(/https:\/\//);
  });

  test("uses Perbugbot as default display name", () => {
    const config = loadPerbugBotConfig({ TELEGRAM_BOT_TOKEN: "token", PERBUG_MINI_APP_URL: "https://app.perbug.com" });
    expect(config.displayName).toBe("Perbugbot");
  });
});

describe("perbugbot payloads", () => {
  test("builds launch keyboard with web_app url", () => {
    expect(buildLaunchKeyboard("https://app.perbug.com", "Perbugbot")).toEqual({
      inline_keyboard: [[{ text: "Open Perbugbot", web_app: { url: "https://app.perbug.com" } }]]
    });
  });

  test("builds welcome text", () => {
    expect(buildWelcomeText("Perbugbot")).toContain("Perbugbot");
  });
});
