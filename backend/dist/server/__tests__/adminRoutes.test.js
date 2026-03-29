import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("admin operations routes", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        process.env.ADMIN_API_KEY = "admin-secret";
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("failed to bind server");
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        delete process.env.ADMIN_API_KEY;
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    });
    it("returns overview, moderation queue, and audit trail", async () => {
        const createReview = await fetch(`${baseUrl}/places/place-admin-1/reviews`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-user-id": "author-admin-1" },
            body: JSON.stringify({ text: "spam spam dm me on telegram for discount", rating: 1, displayName: "User A" })
        });
        expect(createReview.status).toBe(201);
        const reviewPayload = await createReview.json();
        const reviewId = reviewPayload.review.id;
        const report = await fetch(`${baseUrl}/v1/moderation/reports`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-user-id": "reporter-admin-1" },
            body: JSON.stringify({ targetType: "review", targetId: reviewId, reasonCode: "spam" })
        });
        expect(report.status).toBe(202);
        const overview = await fetch(`${baseUrl}/v1/admin/overview`, { headers: { "x-admin-key": "admin-secret", "x-user-id": "admin-1" } });
        expect(overview.status).toBe(200);
        const overviewJson = await overview.json();
        expect(overviewJson.moderation.openReports).toBeGreaterThan(0);
        expect(overviewJson.sourceHealth).toBeDefined();
        const queue = await fetch(`${baseUrl}/v1/admin/moderation/queue`, { headers: { "x-admin-key": "admin-secret" } });
        expect(queue.status).toBe(200);
        const queueJson = await queue.json();
        expect(Array.isArray(queueJson.queue)).toBe(true);
        const action = await fetch(`${baseUrl}/v1/admin/moderation/actions`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-1" },
            body: JSON.stringify({ target: { targetType: "review", targetId: reviewId, reviewId }, decisionType: "hide", reasonCode: "policy_violation", notes: "confirmed spam" })
        });
        expect(action.status).toBe(200);
        const audit = await fetch(`${baseUrl}/v1/admin/audit`, { headers: { "x-admin-key": "admin-secret" } });
        expect(audit.status).toBe(200);
        const auditJson = await audit.json();
        expect(auditJson.items.length).toBeGreaterThan(0);
    });
    it("exposes place quality monitoring endpoints and audits status actions", async () => {
        const ingest = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
            body: JSON.stringify({
                provider: "foursquare",
                rawPayload: {
                    fsq_id: "missing-media-1",
                    name: "No Media Cafe",
                    geocodes: { main: { latitude: 37.77, longitude: -122.41 } },
                    categories: [{ name: "Coffee Shop" }],
                    description: "No description available"
                },
                fetchedAt: "2025-01-01T00:00:00.000Z"
            })
        });
        expect(ingest.status).toBe(201);
        const overview = await fetch(`${baseUrl}/v1/admin/place-quality/overview`, { headers: { "x-admin-key": "admin-secret" } });
        expect(overview.status).toBe(200);
        const overviewJson = await overview.json();
        expect(overviewJson.totalOpen).toBeGreaterThan(0);
        const issues = await fetch(`${baseUrl}/v1/admin/place-quality/issues?issueType=missing_photos`, { headers: { "x-admin-key": "admin-secret" } });
        expect(issues.status).toBe(200);
        const issuesJson = await issues.json();
        expect(issuesJson.total).toBeGreaterThan(0);
        const issueId = issuesJson.items[0].id;
        const detail = await fetch(`${baseUrl}/v1/admin/place-quality/issues/${encodeURIComponent(issueId)}`, { headers: { "x-admin-key": "admin-secret" } });
        expect(detail.status).toBe(200);
        const patch = await fetch(`${baseUrl}/v1/admin/place-quality/issues/${encodeURIComponent(issueId)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-3" },
            body: JSON.stringify({ status: "resolved", note: "fixed through resync" })
        });
        expect(patch.status).toBe(200);
        const patchJson = await patch.json();
        expect(patchJson.status).toBe("resolved");
        const placeSummary = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(issuesJson.items[0].placeId)}/quality`, { headers: { "x-admin-key": "admin-secret" } });
        expect(placeSummary.status).toBe(200);
        const providerSummary = await fetch(`${baseUrl}/v1/admin/place-quality/providers`, { headers: { "x-admin-key": "admin-secret" } });
        expect(providerSummary.status).toBe(200);
        const audit = await fetch(`${baseUrl}/v1/admin/audit`, { headers: { "x-admin-key": "admin-secret" } });
        const auditJson = await audit.json();
        expect(auditJson.items.some((item) => item.actionType === "place_quality.resolved")).toBe(true);
    });
    it("supports duplicate review, merge, correction, and maintenance audit endpoints", async () => {
        const payloadA = {
            provider: "foursquare",
            rawPayload: {
                fsq_id: "dup-a",
                name: "Union Cafe",
                geocodes: { main: { latitude: 37.775, longitude: -122.414 } },
                categories: [{ name: "Coffee Shop" }],
                location: { formatted_address: "100 Market St, San Francisco" },
                tel: "+14155550111"
            }
        };
        const payloadB = {
            provider: "google",
            rawPayload: {
                id: "dup-b",
                displayName: { text: "Pier Gift Shop" },
                location: { latitude: 37.80, longitude: -122.40 },
                formattedAddress: "20 Pier Ave, San Francisco, CA",
                types: ["store"]
            }
        };
        const ingestA = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
            body: JSON.stringify(payloadA)
        });
        const ingestB = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
            body: JSON.stringify(payloadB)
        });
        expect(ingestA.status).toBe(201);
        expect(ingestB.status).toBe(201);
        const ingestAJson = await ingestA.json();
        const ingestBJson = await ingestB.json();
        const alignSecond = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(ingestBJson.canonicalPlaceId)}/corrections`, {
            method: "PATCH",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
            body: JSON.stringify({
                reason: "prep_duplicate_review",
                updates: {
                    primaryDisplayName: "Union Cafe SF",
                    canonicalCategory: "coffee_shop",
                    latitude: 37.77501,
                    longitude: -122.41401
                }
            })
        });
        expect(alignSecond.status).toBe(200);
        const detect = await fetch(`${baseUrl}/v1/admin/places/duplicates:detect`, {
            method: "POST",
            headers: { "x-admin-key": "admin-secret" }
        });
        expect(detect.status).toBe(200);
        const candidates = await fetch(`${baseUrl}/v1/admin/places/duplicates`, { headers: { "x-admin-key": "admin-secret" } });
        const candidatesJson = await candidates.json();
        expect(candidatesJson.items.length).toBeGreaterThan(0);
        const candidateId = candidatesJson.items[0].id;
        const approve = await fetch(`${baseUrl}/v1/admin/places/duplicates/${encodeURIComponent(candidateId)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
            body: JSON.stringify({ status: "approved", note: "same storefront" })
        });
        expect(approve.status).toBe(200);
        const placeIds = [ingestAJson.canonicalPlaceId, ingestBJson.canonicalPlaceId];
        const merge = await fetch(`${baseUrl}/v1/admin/places:merge`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
            body: JSON.stringify({ targetPlaceId: placeIds[0], sourcePlaceIds: [placeIds[1]], reason: "duplicate" })
        });
        expect(merge.status).toBe(200);
        const correction = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(placeIds[0])}/corrections`, {
            method: "PATCH",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
            body: JSON.stringify({ reason: "taxonomy_fix", updates: { canonicalCategory: "coffee_shop", primaryDisplayName: "Union Coffee" } })
        });
        expect(correction.status).toBe(200);
        const audits = await fetch(`${baseUrl}/v1/admin/places/maintenance/audit?placeId=${encodeURIComponent(placeIds[0])}`, { headers: { "x-admin-key": "admin-secret" } });
        expect(audits.status).toBe(200);
        const auditsJson = await audits.json();
        expect(auditsJson.items.some((item) => item.actionType === "merge")).toBe(true);
        expect(auditsJson.items.some((item) => item.actionType === "correction")).toBe(true);
    });
    it("supports curation, boosts, source health review, launch readiness, preview, and insights", async () => {
        const featuredCreator = await fetch(`${baseUrl}/v1/admin/curation/featured-creators`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({
                creatorId: "creator-launch-1",
                status: "active",
                priority: 100,
                weight: 2,
                context: { type: "city", city: "San Francisco", categoryId: "coffee_shop" },
                reason: "launch_spotlight"
            })
        });
        expect(featuredCreator.status).toBe(200);
        const featuredCreatorJson = await featuredCreator.json();
        const featuredPlace = await fetch(`${baseUrl}/v1/admin/curation/featured-places`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({
                canonicalPlaceId: "place-launch-1",
                status: "active",
                priority: 90,
                weight: 1.5,
                context: { type: "city", city: "San Francisco", categoryId: "coffee_shop" },
                reason: "launch_spotlight"
            })
        });
        expect(featuredPlace.status).toBe(200);
        const featuredCity = await fetch(`${baseUrl}/v1/admin/curation/featured-cities`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({
                city: "San Francisco",
                status: "active",
                launchReadiness: "ready_for_promotion",
                priority: 120,
                reason: "city_launch_ready",
                readinessMetadata: { creatorDensity: 12, contentDensity: 28, moderationRisk: "low" }
            })
        });
        expect(featuredCity.status).toBe(200);
        const boost = await fetch(`${baseUrl}/v1/admin/curation/boosts`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({
                targetType: "place",
                targetId: "place-launch-1",
                scope: { type: "city", city: "San Francisco" },
                status: "active",
                mode: "boost",
                priority: 80,
                weight: 1.4,
                reason: "launch_campaign"
            })
        });
        expect(boost.status).toBe(200);
        const collection = await fetch(`${baseUrl}/v1/admin/curation/launch-collections`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({
                name: "SF Launch Starter Pack",
                city: "San Francisco",
                status: "active",
                visibility: "internal",
                reason: "launch_seed"
            })
        });
        expect(collection.status).toBe(200);
        const collectionJson = await collection.json();
        const addCollectionItem = await fetch(`${baseUrl}/v1/admin/curation/launch-collections/${encodeURIComponent(collectionJson.id)}/items`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({ itemType: "creator", itemId: "creator-launch-1", order: 1 })
        });
        expect(addCollectionItem.status).toBe(200);
        const sourceReview = await fetch(`${baseUrl}/v1/admin/source-health/reviews`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-2" },
            body: JSON.stringify({ city: "San Francisco", provider: "foursquare", issueType: "missing_photos", severity: "high", status: "open", note: "launch city gap" })
        });
        expect(sourceReview.status).toBe(200);
        const listCreators = await fetch(`${baseUrl}/v1/admin/curation/featured-creators?activeNow=true&city=San%20Francisco`, { headers: { "x-admin-key": "admin-secret" } });
        const listCreatorsJson = await listCreators.json();
        expect(listCreatorsJson.items.length).toBeGreaterThan(0);
        const launchReadiness = await fetch(`${baseUrl}/v1/admin/launch-readiness?city=San%20Francisco`, { headers: { "x-admin-key": "admin-secret" } });
        expect(launchReadiness.status).toBe(200);
        const launchReadinessJson = await launchReadiness.json();
        expect(launchReadinessJson.items[0].city).toBe("San Francisco");
        const preview = await fetch(`${baseUrl}/v1/admin/curation/preview?city=San%20Francisco`, { headers: { "x-admin-key": "admin-secret" } });
        expect(preview.status).toBe(200);
        const previewJson = await preview.json();
        expect(previewJson.featuredCreators.length).toBeGreaterThan(0);
        const insights = await fetch(`${baseUrl}/v1/admin/curation/insights`, { headers: { "x-admin-key": "admin-secret" } });
        expect(insights.status).toBe(200);
        const insightsJson = await insights.json();
        expect(insightsJson.activeBoosts).toBeGreaterThan(0);
        const removeCreator = await fetch(`${baseUrl}/v1/admin/curation/featured-creators/${encodeURIComponent(featuredCreatorJson.id)}`, {
            method: "DELETE",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-ops-1" },
            body: JSON.stringify({ reason: "rotation" })
        });
        expect(removeCreator.status).toBe(200);
        const audit = await fetch(`${baseUrl}/v1/admin/audit`, { headers: { "x-admin-key": "admin-secret" } });
        const auditJson = await audit.json();
        expect(auditJson.items.some((item) => item.actionType === "curation.featured_creator.created")).toBe(true);
        expect(auditJson.items.some((item) => item.actionType === "curation.launch_collection.item_added")).toBe(true);
    });
    it("supports user suspension workflow", async () => {
        const suspend = await fetch(`${baseUrl}/v1/admin/users/user-to-suspend/suspend`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-2" },
            body: JSON.stringify({ reasonCode: "fraud_risk" })
        });
        expect(suspend.status).toBe(200);
        const users = await fetch(`${baseUrl}/v1/admin/users?search=user-to-suspend`, { headers: { "x-admin-key": "admin-secret" } });
        const usersJson = await users.json();
        expect(usersJson.items[0].status).toBe("SUSPENDED");
        const reinstate = await fetch(`${baseUrl}/v1/admin/users/user-to-suspend/reinstate`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-2" },
            body: JSON.stringify({ reasonCode: "appeal_upheld" })
        });
        expect(reinstate.status).toBe(200);
    });
});
