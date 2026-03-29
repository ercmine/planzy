import type { NotificationStore } from "./store.js";
export declare class NotificationDedupeService {
    private readonly store;
    constructor(store: NotificationStore);
    isDuplicate(input: {
        recipientUserId: string;
        dedupeKey?: string;
        type: string;
        createdAt: string;
    }): Promise<boolean>;
}
