import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("business review responses", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        process.env.ADMIN_API_KEY = "test-admin-key";
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("invalid address");
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        delete process.env.ADMIN_API_KEY;
    });
    it("enforces verified ownership and exposes only public business response payload", async () => {
        const ownerHeaders = { "x-user-id": "biz-owner", "content-type": "application/json" };
        const bizRes = await fetch(`${baseUrl}/v1/profiles/business`, {
            method: "POST",
            headers: ownerHeaders,
            body: JSON.stringify({ businessName: "Cafe Biz", slug: "cafe-biz" })
        });
        const biz = await bizRes.json();
        const reviewRes = await fetch(`${baseUrl}/places/place-1/reviews`, {
            method: "POST",
            headers: { "x-user-id": "review-user", "content-type": "application/json" },
            body: JSON.stringify({ rating: 5, text: "Excellent service", displayName: "Reviewer" })
        });
        const reviewBody = await reviewRes.json();
        const blockedBeforeClaim = await fetch(`${baseUrl}/v1/reviews/${encodeURIComponent(reviewBody.review.id)}/business-response`, {
            method: "POST",
            headers: {
                "x-user-id": "biz-owner",
                "x-acting-profile-id": biz.profile.id,
                "x-acting-profile-type": "BUSINESS",
                "content-type": "application/json"
            },
            body: JSON.stringify({ content: "Thanks for your review" })
        });
        expect(blockedBeforeClaim.status).toBe(400);
        const claimRes = await fetch(`${baseUrl}/v1/business-claims`, {
            method: "POST",
            headers: ownerHeaders,
            body: JSON.stringify({
                placeId: "place-1",
                claimType: "sole_owner",
                requestedRole: "owner",
                contactEmail: "owner@example.com",
                claimantBusinessProfileId: biz.profile.id
            })
        });
        const claim = await claimRes.json();
        const submitRes = await fetch(`${baseUrl}/v1/business-claims/${encodeURIComponent(claim.id)}/submit`, {
            method: "POST",
            headers: { "x-user-id": "biz-owner" }
        });
        expect(submitRes.status).toBe(200);
        const approveRes = await fetch(`${baseUrl}/v1/admin/business-claims/${encodeURIComponent(claim.id)}/review`, {
            method: "POST",
            headers: { "x-admin-key": "test-admin-key", "x-user-id": "admin-user", "content-type": "application/json" },
            body: JSON.stringify({ decision: "approve", reasonCode: "verified" })
        });
        expect(approveRes.status).toBe(200);
        const trialRes = await fetch(`${baseUrl}/v1/subscription/start-trial`, {
            method: "POST",
            headers: { "x-user-id": biz.profile.id, "x-account-type": "BUSINESS", "content-type": "application/json" },
            body: JSON.stringify({ planId: "business-plus" })
        });
        expect(trialRes.status).toBe(200);
        const createResponseRes = await fetch(`${baseUrl}/v1/reviews/${encodeURIComponent(reviewBody.review.id)}/business-response`, {
            method: "POST",
            headers: {
                "x-user-id": "biz-owner",
                "x-acting-profile-id": biz.profile.id,
                "x-acting-profile-type": "BUSINESS",
                "content-type": "application/json"
            },
            body: JSON.stringify({ content: "<b>Thanks</b> for your review." })
        });
        expect(createResponseRes.status).toBe(201);
        const responsePayload = await createResponseRes.json();
        expect(responsePayload.response.visibilityStatus).toBe("public");
        const placeReviewsRes = await fetch(`${baseUrl}/places/place-1/reviews`, { headers: { "x-user-id": "random-viewer" } });
        const placeReviews = await placeReviewsRes.json();
        expect(placeReviews.reviews[0]?.businessResponse).toMatchObject({
            content: "Thanks for your review.",
            attributionLabel: "Response from the business"
        });
        expect(placeReviews.reviews[0]?.businessResponse).not.toHaveProperty("moderationStatus");
    });
});
