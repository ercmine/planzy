import type { IncomingMessage, ServerResponse } from "node:http";

import { ProfileType } from "../accounts/types.js";
import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { SavedService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export interface SavedHttpHandlers {
  savePlace(req: IncomingMessage, res: ServerResponse): Promise<void>;
  unsavePlace(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
  listSaved(req: IncomingMessage, res: ServerResponse): Promise<void>;
  createList(req: IncomingMessage, res: ServerResponse): Promise<void>;
  updateList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
  getList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
  addPlaceToList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
  removePlaceFromList(req: IncomingMessage, res: ServerResponse, listId: string, placeId: string): Promise<void>;
  listPublicByUser(req: IncomingMessage, res: ServerResponse, userId: string): Promise<void>;
}

export function createSavedHttpHandlers(service: SavedService): SavedHttpHandlers {
  async function savePlace(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = requireUserId(req);
    const body = await parseJsonBody(req);
    const placeId = String((body as { placeId?: unknown })?.placeId ?? "").trim();
    if (!placeId) throw new ValidationError(["placeId is required"]);

    const result = await service.savePlace({ userId, profileType: ProfileType.PERSONAL, profileId: userId, placeId, source: String((body as { source?: unknown })?.source ?? "") || undefined });
    if ("error" in result) {
      sendJson(res, 403, result);
      return;
    }
    sendJson(res, 200, result);
  }

  async function unsavePlace(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void> {
    await service.unsavePlace(requireUserId(req), placeId);
    sendJson(res, 200, { ok: true });
  }

  async function listSaved(req: IncomingMessage, res: ServerResponse): Promise<void> {
    sendJson(res, 200, await service.listSaved(requireUserId(req)));
  }

  async function createList(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = requireUserId(req);
    const body = await parseJsonBody(req) as { title?: string; description?: string; visibility?: "private" | "public" };
    if (!body?.title?.trim()) throw new ValidationError(["title is required"]);
    const result = await service.createList({
      userId,
      profileType: ProfileType.PERSONAL,
      profileId: userId,
      title: body.title.trim(),
      description: body.description,
      visibility: body.visibility ?? "private"
    });
    if ("error" in result) {
      sendJson(res, 403, result);
      return;
    }
    sendJson(res, 201, result);
  }

  async function updateList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void> {
    const userId = requireUserId(req);
    const body = await parseJsonBody(req) as { title?: string; description?: string; visibility?: "private" | "public"; status?: "active" | "archived" };
    const result = await service.updateList(userId, listId, body);
    if ("error" in result) {
      sendJson(res, 404, result);
      return;
    }
    sendJson(res, 200, result);
  }

  async function getList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void> {
    const viewer = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
    const result = await service.getList(viewer, listId);
    if (!result) {
      sendJson(res, 404, { error: "list_not_found" });
      return;
    }
    sendJson(res, 200, result);
  }

  async function addPlaceToList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void> {
    const userId = requireUserId(req);
    const body = await parseJsonBody(req) as { placeId?: string };
    if (!body?.placeId?.trim()) throw new ValidationError(["placeId is required"]);
    const result = await service.addToList({ userId, listId, placeId: body.placeId.trim(), addedBy: userId });
    if ("error" in result) {
      sendJson(res, result.error === "list_not_found" ? 404 : 403, result);
      return;
    }
    sendJson(res, 200, result);
  }

  async function removePlaceFromList(req: IncomingMessage, res: ServerResponse, listId: string, placeId: string): Promise<void> {
    const result = await service.removeFromList(requireUserId(req), listId, placeId);
    if ("error" in result) {
      sendJson(res, 404, result);
      return;
    }
    sendJson(res, 200, result);
  }

  async function listPublicByUser(_req: IncomingMessage, res: ServerResponse, userId: string): Promise<void> {
    sendJson(res, 200, { lists: await service.listPublicByUser(userId) });
  }

  return { savePlace, unsavePlace, listSaved, createList, updateList, getList, addPlaceToList, removePlaceFromList, listPublicByUser };
}
