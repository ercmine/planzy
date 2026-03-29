import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("collaboration routes", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("invalid address");
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    });
    it("supports invite, accept, campaign linkage and featured listing", async () => {
        const bizUser = "biz-route-1";
        const creatorUser = "creator-route-1";
        const bizRes = await fetch(`${baseUrl}/v1/profiles/business`, {
            method: "POST",
            headers: { "x-user-id": bizUser, "content-type": "application/json" },
            body: JSON.stringify({ businessName: "Biz Route", slug: "biz-route" })
        });
        expect(bizRes.status).toBe(201);
        const biz = await bizRes.json();
        const creatorRes = await fetch(`${baseUrl}/v1/profiles/creator`, {
            method: "POST",
            headers: { "x-user-id": creatorUser, "content-type": "application/json" },
            body: JSON.stringify({ creatorName: "Creator Route" })
        });
        expect(creatorRes.status).toBe(201);
        const creator = await creatorRes.json();
        const claimDraft = await fetch(`${baseUrl}/v1/business-claims`, {
            method: "POST",
            headers: { "x-user-id": bizUser, "content-type": "application/json" },
            body: JSON.stringify({ placeId: "place-route-1", contactEmail: "owner@bizroute.com", claimType: "sole_owner", requestedRole: "owner", claimantBusinessProfileId: biz.profile.id })
        });
        expect(claimDraft.status).toBe(201);
        const claim = await claimDraft.json();
        const submit = await fetch(`${baseUrl}/v1/business-claims/${encodeURIComponent(claim.id)}/submit`, {
            method: "POST",
            headers: { "x-user-id": bizUser }
        });
        expect(submit.status).toBe(200);
        process.env.ADMIN_API_KEY = "test-admin-key";
        const review = await fetch(`${baseUrl}/v1/admin/business-claims/${encodeURIComponent(claim.id)}/review`, {
            method: "POST",
            headers: { "x-user-id": "admin", "x-admin-key": "test-admin-key", "content-type": "application/json" },
            body: JSON.stringify({ decision: "approve", reasonCode: "ok" })
        });
        expect(review.status).toBe(200);
        const subRes = await fetch(`${baseUrl}/v1/subscription/change`, {
            method: "POST",
            headers: { "x-user-id": biz.profile.id, "x-account-type": "BUSINESS", "content-type": "application/json" },
            body: JSON.stringify({ targetPlanId: "business-plus" })
        });
        expect(subRes.status).toBe(200);
        const premiumRes = await fetch(`${baseUrl}/v1/businesses/${encodeURIComponent(biz.profile.id)}/premium`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tier: "pro" })
        });
        expect(premiumRes.status).toBe(200);
        const inviteRes = await fetch(`${baseUrl}/v1/collaboration/invites`, {
            method: "POST",
            headers: {
                "x-user-id": bizUser,
                "x-acting-profile-type": "BUSINESS",
                "x-acting-profile-id": biz.profile.id,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                businessProfileId: biz.profile.id,
                creatorProfileId: creator.profile.id,
                title: "Campaign Route",
                targetPlaceIds: ["place-route-1"],
                disclosureExpectation: "partnered",
                highlightedContentPermissionMode: "campaign_opt_in"
            })
        });
        expect(inviteRes.status).toBe(201);
        const invite = await inviteRes.json();
        const acceptRes = await fetch(`${baseUrl}/v1/collaboration/invites/${encodeURIComponent(invite.invite.id)}/respond`, {
            method: "POST",
            headers: {
                "x-user-id": creatorUser,
                "x-acting-profile-type": "CREATOR",
                "x-acting-profile-id": creator.profile.id,
                "content-type": "application/json"
            },
            body: JSON.stringify({ decision: "accept" })
        });
        expect(acceptRes.status).toBe(200);
        const businessInvites = await fetch(`${baseUrl}/v1/business/${encodeURIComponent(biz.profile.id)}/collaboration/invites`, {
            headers: { "x-user-id": bizUser, "x-acting-profile-type": "BUSINESS", "x-acting-profile-id": biz.profile.id }
        });
        expect(businessInvites.status).toBe(200);
        const listed = await businessInvites.json();
        const campaignId = listed.invites[0]?.campaignId;
        expect(campaignId).toBeTruthy();
        const linkRes = await fetch(`${baseUrl}/v1/collaboration/campaign-content-links`, {
            method: "POST",
            headers: {
                "x-user-id": creatorUser,
                "x-acting-profile-type": "CREATOR",
                "x-acting-profile-id": creator.profile.id,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                campaignId,
                creatorProfileId: creator.profile.id,
                contentType: "video_review",
                contentId: "review-xyz",
                disclosureLabel: "partnered",
                creatorApprovedForFeaturing: true
            })
        });
        expect(linkRes.status).toBe(201);
        const link = await linkRes.json();
        const featureRes = await fetch(`${baseUrl}/v1/collaboration/featured-content`, {
            method: "POST",
            headers: {
                "x-user-id": bizUser,
                "x-acting-profile-type": "BUSINESS",
                "x-acting-profile-id": biz.profile.id,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                businessProfileId: biz.profile.id,
                placeId: "place-route-1",
                creatorProfileId: creator.profile.id,
                contentType: "video_review",
                contentId: "review-xyz",
                sourceCampaignId: campaignId,
                sourceCampaignContentLinkId: link.link.id,
                sortOrder: 1,
                approvedByCreator: true,
                disclosureLabel: "partnered"
            })
        });
        expect(featureRes.status).toBe(201);
        const publicFeatured = await fetch(`${baseUrl}/v1/places/place-route-1/featured-creator-content`);
        expect(publicFeatured.status).toBe(200);
        await expect(publicFeatured.json()).resolves.toMatchObject({ placements: [expect.objectContaining({ contentId: "review-xyz" })] });
    });
});
