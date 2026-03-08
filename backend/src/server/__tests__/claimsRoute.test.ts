import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

const serversToClose: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    serversToClose.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        })
    )
  );
});

describe("venue claim routes", () => {
  it("POST creates claim, GET lists for user, PATCH updates status", async () => {
    const server = createServer();
    serversToClose.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

    const address = server.address();
    if (!address || typeof address === "string") throw new Error("expected tcp server address");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const createResponse = await fetch(`${baseUrl}/v1/venue-claims`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({ venueId: "venue-1", contactEmail: "owner@example.com" })
    });

    expect(createResponse.status).toBe(201);
    const createBody = (await createResponse.json()) as { claimId: string; verificationStatus: string };
    expect(createBody.verificationStatus).toBe("pending");

    const listResponse = await fetch(`${baseUrl}/v1/venue-claims`, { headers: { "x-user-id": "user-1" } });
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { claims: Array<{ contactEmail: string }> };
    expect(listBody.claims).toHaveLength(1);

    const patchResponse = await fetch(`${baseUrl}/v1/venue-claims/${createBody.claimId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "verified" })
    });
    expect(patchResponse.status).toBe(200);
  });

  it("business claim flow supports draft, submit, evidence, and owner management state", async () => {
    process.env.ADMIN_API_KEY = "test-admin";
    const server = createServer();
    serversToClose.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("expected tcp server address");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const create = await fetch(`${baseUrl}/v1/business-claims`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({ placeId: "place-1", claimType: "sole_owner", requestedRole: "owner", contactEmail: "owner@example.com", verificationMethodSelection: ["email_domain"] })
    });
    expect(create.status).toBe(201);
    const claim = (await create.json()) as { id: string };

    const submit = await fetch(`${baseUrl}/v1/business-claims/${claim.id}/submit`, { method: "POST", headers: { "x-user-id": "user-1" } });
    expect(submit.status).toBe(200);

    const evidence = await fetch(`${baseUrl}/v1/business-claims/${claim.id}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({ evidenceType: "document", storageRef: "s3://proof" })
    });
    expect(evidence.status).toBe(201);

    const review = await fetch(`${baseUrl}/v1/admin/business-claims/${claim.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "admin-1", "x-admin-key": "test-admin" },
      body: JSON.stringify({ decision: "approve", reasonCode: "ok" })
    });
    expect(review.status).toBe(200);

    const state = await fetch(`${baseUrl}/v1/places/place-1/business-management`, { headers: { "x-user-id": "user-1" } });
    expect(state.status).toBe(200);
    const stateBody = (await state.json()) as { canManage: boolean; ownership: Array<{ id: string }> };
    expect(stateBody.canManage).toBe(true);
    expect(stateBody.ownership).toHaveLength(1);
  });
});
