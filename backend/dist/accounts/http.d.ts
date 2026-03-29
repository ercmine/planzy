import type { IncomingMessage, ServerResponse } from "node:http";
import type { AccountsService } from "./service.js";
export declare function createAccountsHttpHandlers(accounts: AccountsService): {
    getCurrentIdentity(req: IncomingMessage, res: ServerResponse): Promise<void>;
    getActingContexts(req: IncomingMessage, res: ServerResponse): Promise<void>;
    switchContext(req: IncomingMessage, res: ServerResponse): Promise<void>;
    createCreatorProfile(req: IncomingMessage, res: ServerResponse): Promise<void>;
    createBusinessProfile(req: IncomingMessage, res: ServerResponse): Promise<void>;
    getPermissions(req: IncomingMessage, res: ServerResponse): Promise<void>;
    inviteBusinessMember(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void>;
    listBusinessMembers(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void>;
};
