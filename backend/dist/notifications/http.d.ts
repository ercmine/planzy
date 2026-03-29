import type { IncomingMessage, ServerResponse } from "node:http";
import type { NotificationCategory } from "./types.js";
import type { NotificationService } from "./service.js";
export declare function createNotificationHttpHandlers(service: NotificationService): {
    list: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    unreadCount: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    markRead: (req: IncomingMessage, res: ServerResponse, notificationId: string) => Promise<void>;
    markAllRead: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    getPreferences: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    updatePreference: (req: IncomingMessage, res: ServerResponse, category: NotificationCategory) => Promise<void>;
    registerDeviceToken: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    unregisterDeviceToken: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    listDeviceTokens: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    metrics: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
