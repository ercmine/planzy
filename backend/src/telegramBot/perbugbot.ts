interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface PerbugBotConfig {
  token: string;
  miniAppUrl: string;
  displayName: string;
}

export function loadPerbugBotConfig(env: NodeJS.ProcessEnv = process.env): PerbugBotConfig {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const miniAppUrl = env.PERBUG_MINI_APP_URL?.trim();

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN. Configure it in server environment variables.");
  }

  if (!miniAppUrl || !/^https:\/\//.test(miniAppUrl)) {
    throw new Error("Missing or invalid PERBUG_MINI_APP_URL. Telegram Mini Apps require an https:// URL.");
  }

  return {
    token,
    miniAppUrl,
    displayName: env.PERBUG_BOT_DISPLAY_NAME?.trim() || "Perbugbot"
  };
}

export function buildLaunchKeyboard(miniAppUrl: string, displayName: string): Record<string, unknown> {
  return {
    inline_keyboard: [[{ text: `Open ${displayName}`, web_app: { url: miniAppUrl } }]]
  };
}

export function buildWelcomeText(displayName: string): string {
  return `${displayName} is ready. Tap below to open the Perbug Mini App.`;
}

async function callTelegram<T>(config: PerbugBotConfig, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Telegram API request failed with HTTP ${response.status} for ${method}.`);
  }

  const data = (await response.json()) as TelegramApiResponse<T>;
  if (!data.ok) {
    throw new Error(data.description || `Telegram API returned a failure for ${method}.`);
  }

  return data.result;
}

async function setMenuButton(config: PerbugBotConfig): Promise<void> {
  await callTelegram<boolean>(config, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: `Open ${config.displayName}`,
      web_app: { url: config.miniAppUrl }
    }
  });
}

async function sendLaunchMessage(config: PerbugBotConfig, chatId: number): Promise<void> {
  await callTelegram(config, "sendMessage", {
    chat_id: chatId,
    text: buildWelcomeText(config.displayName),
    reply_markup: buildLaunchKeyboard(config.miniAppUrl, config.displayName)
  });
}

function isLaunchCommand(message: TelegramMessage): boolean {
  const text = message.text?.trim().toLowerCase() || "";
  return text.startsWith("/start") || text === "/app" || text === "/open";
}

async function processUpdate(config: PerbugBotConfig, update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message) {
    return;
  }

  if (isLaunchCommand(message)) {
    await sendLaunchMessage(config, message.chat.id);
  }
}

export async function runPerbugBot(config: PerbugBotConfig): Promise<void> {
  await setMenuButton(config);

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const updates = await callTelegram<TelegramUpdate[]>(config, "getUpdates", {
      timeout: 25,
      offset,
      allowed_updates: ["message"]
    });

    for (const update of updates) {
      offset = update.update_id + 1;
      await processUpdate(config, update);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadPerbugBotConfig();
  runPerbugBot(config).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[perbugbot] fatal: ${message}`);
    process.exitCode = 1;
  });
}
