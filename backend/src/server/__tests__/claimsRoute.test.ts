import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

const serversToClose: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    serversToClose.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe("venue claim routes", () => {
  it("POST creates claim, GET lists with email, PATCH updates status", async () => {
    const server = createServer();
    serversToClose.push(server);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected tcp server address");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const createResponse = await fetch(`${baseUrl}/v1/venue-claims`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "user-1"
      },
      body: JSON.stringify({
        venueId: "venue-1",
        contactEmail: "owner@example.com"
      })
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("content-type")).toContain("application/json");

    const createBody = (await createResponse.json()) as {
      claimId: string;
      verificationStatus: string;
      contactEmail?: string;
    };

    expect(createBody.claimId).toBeTruthy();
    expect(createBody.verificationStatus).toBe("pending");
    expect(createBody.contactEmail).toBeUndefined();

    const listResponse = await fetch(`${baseUrl}/v1/venue-claims`);
    expect(listResponse.status).toBe(200);

    const listBody = (await listResponse.json()) as {
      claims: Array<{ contactEmail: string; claimId: string; verificationStatus: string }>;
    };

    expect(listBody.claims).toHaveLength(1);
    expect(listBody.claims[0]?.contactEmail).toBe("owner@example.com");

    const patchResponse = await fetch(`${baseUrl}/v1/venue-claims/${createBody.claimId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ status: "verified" })
    });

    expect(patchResponse.status).toBe(200);

    const verifiedListResponse = await fetch(`${baseUrl}/v1/venue-claims?status=verified`);
    const verifiedListBody = (await verifiedListResponse.json()) as {
      claims: Array<{ claimId: string; verificationStatus: string }>;
    };

    expect(verifiedListBody.claims).toHaveLength(1);
    expect(verifiedListBody.claims[0]?.verificationStatus).toBe("verified");
  });
});
