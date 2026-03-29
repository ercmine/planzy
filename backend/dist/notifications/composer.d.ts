import type { Notification, NotificationEvent, NotificationType } from "./types.js";
export declare const TYPE_TO_CATEGORY: Record<NotificationType, Notification["category"]>;
export interface ComposedNotification {
    type: NotificationType;
    title: string;
    body: string;
    category: Notification["category"];
    objectType?: string;
    objectId?: string;
    parentObjectType?: string;
    parentObjectId?: string;
    route?: Notification["route"];
    metadata: Record<string, unknown>;
    dedupeKey?: string;
    batchKey?: string;
    priority: Notification["priority"];
}
export declare class NotificationComposer {
    compose(event: NotificationEvent): ComposedNotification;
    private assertNever;
}
