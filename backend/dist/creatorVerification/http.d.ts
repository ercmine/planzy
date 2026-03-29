import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreatorVerificationService } from "./service.js";
export declare function createCreatorVerificationHttpHandlers(service: CreatorVerificationService): {
    status(req: IncomingMessage, res: ServerResponse): Promise<void>;
    eligibility(req: IncomingMessage, res: ServerResponse): Promise<void>;
    saveDraft(req: IncomingMessage, res: ServerResponse): Promise<void>;
    submit(req: IncomingMessage, res: ServerResponse): Promise<void>;
    adminList(req: IncomingMessage, res: ServerResponse): Promise<void>;
    adminDetail(_req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void>;
    adminUnderReview(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void>;
    adminNeedsMoreInfo(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void>;
    adminApprove(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void>;
    adminReject(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void>;
    adminRevoke(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
};
