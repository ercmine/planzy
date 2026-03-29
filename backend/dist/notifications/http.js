import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { NOTIFICATION_CATEGORIES } from "./types.js";
function requireUserId(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id header required"]);
    return userId;
}
export function createNotificationHttpHandlers(service) {
    return {
        list: async (req, res) => {
            const userId = requireUserId(req);
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const limit = Number(url.searchParams.get("limit") ?? "20");
            const cursor = url.searchParams.get("cursor");
            const category = url.searchParams.get("category");
            const categorySafe = category && NOTIFICATION_CATEGORIES.includes(category) ? category : undefined;
            const result = await service.list(userId, { limit: Number.isFinite(limit) ? limit : 20, cursor, category: categorySafe });
            sendJson(res, 200, result);
        },
        unreadCount: async (req, res) => {
            const userId = requireUserId(req);
            sendJson(res, 200, { unreadCount: await service.unreadCount(userId) });
        },
        markRead: async (req, res, notificationId) => {
            const userId = requireUserId(req);
            const updated = await service.markRead(userId, notificationId);
            if (!updated) {
                sendJson(res, 404, { error: "Notification not found" });
                return;
            }
            sendJson(res, 200, updated);
        },
        markAllRead: async (req, res) => {
            const userId = requireUserId(req);
            sendJson(res, 200, { updated: await service.markAllRead(userId) });
        },
        getPreferences: async (req, res) => {
            const userId = requireUserId(req);
            sendJson(res, 200, { preferences: await service.getPreferences(userId) });
        },
        updatePreference: async (req, res, category) => {
            const userId = requireUserId(req);
            if (!NOTIFICATION_CATEGORIES.includes(category))
                throw new ValidationError(["invalid notification category"]);
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const updated = await service.updatePreference(userId, category, {
                inAppEnabled: typeof payload.inAppEnabled === "boolean" ? payload.inAppEnabled : undefined,
                pushEnabled: typeof payload.pushEnabled === "boolean" ? payload.pushEnabled : undefined,
                emailEnabled: typeof payload.emailEnabled === "boolean" ? payload.emailEnabled : undefined,
                frequency: payload.frequency === "instant" || payload.frequency === "daily_digest" || payload.frequency === "weekly_digest" ? payload.frequency : undefined
            });
            sendJson(res, 200, updated);
        },
        registerDeviceToken: async (req, res) => {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const token = String(payload.token ?? "").trim();
            const platformRaw = String(payload.platform ?? "").trim();
            if (!token)
                throw new ValidationError(["token is required"]);
            if (!["ios", "android", "web"].includes(platformRaw))
                throw new ValidationError(["platform must be ios|android|web"]);
            const registration = await service.registerDeviceToken({
                userId,
                token,
                platform: platformRaw,
                appVersion: payload.appVersion == null ? undefined : String(payload.appVersion),
                locale: payload.locale == null ? undefined : String(payload.locale),
                pushEnabled: typeof payload.pushEnabled === "boolean" ? payload.pushEnabled : undefined
            });
            sendJson(res, 201, { registration });
        },
        unregisterDeviceToken: async (req, res) => {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const token = String(payload.token ?? "").trim();
            if (!token)
                throw new ValidationError(["token is required"]);
            const ok = await service.unregisterDeviceToken(userId, token);
            sendJson(res, ok ? 200 : 404, { ok });
        },
        listDeviceTokens: async (req, res) => {
            const userId = requireUserId(req);
            sendJson(res, 200, { tokens: await service.listActiveDeviceTokens(userId) });
        },
        metrics: async (_req, res) => {
            sendJson(res, 200, { metrics: service.getMetricsSnapshot() });
        }
    };
}
