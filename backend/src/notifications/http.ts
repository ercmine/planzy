import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { NotificationCategory } from "./types.js";
import { NOTIFICATION_CATEGORIES } from "./types.js";
import type { NotificationService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header required"]);
  return userId;
}

export function createNotificationHttpHandlers(service: NotificationService) {
  return {
    list: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const base = `http://${req.headers.host ?? "localhost"}`;
      const url = new URL(req.url ?? "/", base);
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const cursor = url.searchParams.get("cursor");
      const category = url.searchParams.get("category") as NotificationCategory | null;
      const categorySafe = category && NOTIFICATION_CATEGORIES.includes(category) ? category : undefined;
      const result = await service.list(userId, { limit: Number.isFinite(limit) ? limit : 20, cursor, category: categorySafe });
      sendJson(res, 200, result);
    },
    unreadCount: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      sendJson(res, 200, { unreadCount: await service.unreadCount(userId) });
    },
    markRead: async (req: IncomingMessage, res: ServerResponse, notificationId: string) => {
      const userId = requireUserId(req);
      const updated = await service.markRead(userId, notificationId);
      if (!updated) {
        sendJson(res, 404, { error: "Notification not found" });
        return;
      }
      sendJson(res, 200, updated);
    },
    markAllRead: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      sendJson(res, 200, { updated: await service.markAllRead(userId) });
    },
    getPreferences: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      sendJson(res, 200, { preferences: await service.getPreferences(userId) });
    },
    updatePreference: async (req: IncomingMessage, res: ServerResponse, category: NotificationCategory) => {
      const userId = requireUserId(req);
      if (!NOTIFICATION_CATEGORIES.includes(category)) throw new ValidationError(["invalid notification category"]);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const updated = await service.updatePreference(userId, category, {
        inAppEnabled: typeof payload.inAppEnabled === "boolean" ? payload.inAppEnabled : undefined,
        pushEnabled: typeof payload.pushEnabled === "boolean" ? payload.pushEnabled : undefined,
        emailEnabled: typeof payload.emailEnabled === "boolean" ? payload.emailEnabled : undefined,
        frequency: payload.frequency === "instant" || payload.frequency === "daily_digest" || payload.frequency === "weekly_digest" ? payload.frequency : undefined
      });
      sendJson(res, 200, updated);
    },
    registerDeviceToken: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const token = String(payload.token ?? "").trim();
      const platformRaw = String(payload.platform ?? "").trim();
      if (!token) throw new ValidationError(["token is required"]);
      if (!["ios", "android", "web"].includes(platformRaw)) throw new ValidationError(["platform must be ios|android|web"]);
      const registration = await service.registerDeviceToken({
        userId,
        token,
        platform: platformRaw as "ios" | "android" | "web",
        appVersion: payload.appVersion == null ? undefined : String(payload.appVersion),
        locale: payload.locale == null ? undefined : String(payload.locale),
        pushEnabled: typeof payload.pushEnabled === "boolean" ? payload.pushEnabled : undefined
      });
      sendJson(res, 201, { registration });
    },
    unregisterDeviceToken: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const token = String(payload.token ?? "").trim();
      if (!token) throw new ValidationError(["token is required"]);
      const ok = await service.unregisterDeviceToken(userId, token);
      sendJson(res, ok ? 200 : 404, { ok });
    },
    listDeviceTokens: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      sendJson(res, 200, { tokens: await service.listActiveDeviceTokens(userId) });
    },
    metrics: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { metrics: service.getMetricsSnapshot() });
    }
  };
}
