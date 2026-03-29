import { describe, expect, it } from "vitest";
import { InMemoryPlaceStore, PlaceNormalizationService, findPlaceMatch, foursquareAdapter, googlePlacesAdapter, normalizePhone, normalizeUrl } from "../index.js";
describe("provider adapters", () => {
    it("normalizes google payload", () => {
        const normalized = googlePlacesAdapter.normalizeProviderPlace({
            id: "g-1",
            displayName: { text: "Cafe Luna" },
            location: { latitude: 37.77, longitude: -122.42 },
            formattedAddress: "100 Main St, SF",
            types: ["cafe"],
            nationalPhoneNumber: "(555) 444-5555",
            websiteUri: "https://cafeluna.com/",
            regularOpeningHours: { weekdayDescriptions: ["Mon 8-5"] }
        }, {});
        expect(normalized.providerPlaceId).toBe("g-1");
        expect(normalized.phone).toBe("+15554445555");
        expect(normalized.websiteUrl).toBe("https://cafeluna.com/");
    });
    it("normalizes foursquare payload", () => {
        const normalized = foursquareAdapter.normalizeProviderPlace({
            fsq_id: "f-1",
            name: "Cafe Luna",
            geocodes: { main: { latitude: 37.77002, longitude: -122.4201 } },
            location: { formatted_address: "100 Main Street, SF", country: "us" },
            categories: [{ name: "Coffee Shop" }]
        }, {});
        expect(normalized.provider).toBe("foursquare");
        expect(normalized.countryCode).toBe("US");
    });
});
describe("normalization helpers", () => {
    it("normalizes phones and urls", () => {
        expect(normalizePhone("+1 (415) 555-1212")).toBe("+14155551212");
        expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
    });
});
describe("matching + merge + idempotency", () => {
    it("auto matches same place across providers", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        const googleImport = service.importProviderPlace({
            provider: "google_places",
            rawPayload: {
                id: "g-22",
                displayName: { text: "Blue Bottle Coffee" },
                location: { latitude: 37.77, longitude: -122.42 },
                formattedAddress: "300 Market St, San Francisco, CA",
                types: ["coffee_shop"],
                nationalPhoneNumber: "+1 415-333-1111",
                websiteUri: "https://bluebottlecoffee.com"
            }
        });
        const fsqImport = service.importProviderPlace({
            provider: "foursquare",
            rawPayload: {
                fsq_id: "f-22",
                name: "Blue Bottle Coffee",
                geocodes: { main: { latitude: 37.77001, longitude: -122.42003 } },
                location: {
                    formatted_address: "300 Market Street, San Francisco, CA",
                    address: "300 Market Street",
                    locality: "San Francisco",
                    region: "CA",
                    postcode: "94105",
                    country: "US"
                },
                categories: [{ name: "Coffee Shop" }],
                tel: "+1 415-333-1111"
            }
        });
        expect(googleImport.canonicalPlaceId).toBe(fsqImport.canonicalPlaceId);
        const place = service.getCanonicalPlace(googleImport.canonicalPlaceId);
        expect(place?.sourceLinks).toHaveLength(2);
        expect(place?.fieldAttribution.some((entry) => entry.field === "phone")).toBe(true);
    });
    it("prevents chain false merge on distant locations", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        service.importProviderPlace({
            provider: "generic",
            rawPayload: {
                providerPlaceId: "a",
                name: "Starbucks",
                latitude: 37.78,
                longitude: -122.42,
                providerCategories: ["coffee_shop"]
            }
        });
        const normalized = service.normalizeProviderPlace("generic", {
            providerPlaceId: "b",
            name: "Starbucks",
            latitude: 37.70,
            longitude: -122.2,
            providerCategories: ["coffee_shop"]
        });
        const match = findPlaceMatch(normalized, store.listCanonicalPlaces());
        expect(match.outcome).toBe("no_match");
    });
    it("same name far away does not match", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        service.importProviderPlace({
            provider: "generic",
            rawPayload: {
                providerPlaceId: "c1",
                name: "River Park",
                latitude: 40.0,
                longitude: -74.0,
                providerCategories: ["park"]
            }
        });
        const match = findPlaceMatch(service.normalizeProviderPlace("generic", {
            providerPlaceId: "c2",
            name: "River Park",
            latitude: 34.0,
            longitude: -118.0,
            providerCategories: ["park"]
        }), store.listCanonicalPlaces());
        expect(match.outcome).toBe("no_match");
    });
    it("idempotent import returns unchanged", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        const payload = {
            providerPlaceId: "idempotent-1",
            name: "Corner Bistro",
            latitude: 37.77,
            longitude: -122.41,
            providerCategories: ["restaurant"],
            phone: "415-555-1000"
        };
        const first = service.importProviderPlace({ provider: "generic", rawPayload: payload });
        const second = service.importProviderPlace({ provider: "generic", rawPayload: payload });
        expect(first.status).toBe("created");
        expect(second.status).toBe("unchanged");
        expect(store.listSourceRecords()).toHaveLength(1);
    });
    it("provider update with hours and photos updates source version", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        service.importProviderPlace({
            provider: "google_places",
            rawPayload: {
                id: "hours-1",
                displayName: { text: "Evening Lounge" },
                location: { latitude: 37.77, longitude: -122.43 },
                photos: [{ name: "photoA", widthPx: 300, heightPx: 200 }]
            }
        });
        const update = service.importProviderPlace({
            provider: "google_places",
            rawPayload: {
                id: "hours-1",
                displayName: { text: "Evening Lounge" },
                location: { latitude: 37.77, longitude: -122.43 },
                regularOpeningHours: { weekdayDescriptions: ["Mon 5PM-11PM"] },
                photos: [
                    { name: "photoA", widthPx: 300, heightPx: 200 },
                    { name: "photoB", widthPx: 1280, heightPx: 720 }
                ]
            }
        });
        expect(update.status).toBe("updated");
        const place = service.getCanonicalPlace(update.canonicalPlaceId);
        expect(place?.photoGallery.length).toBe(2);
        expect(place?.rawHoursText).toContain("Mon 5PM-11PM");
    });
    it("merges multi-source galleries with stable primary selection", () => {
        const store = new InMemoryPlaceStore();
        const service = new PlaceNormalizationService(store);
        const first = service.importProviderPlace({
            provider: "google_places",
            rawPayload: {
                id: "gallery-1",
                displayName: { text: "Gallery Cafe" },
                location: { latitude: 37.77, longitude: -122.42 },
                photos: [
                    { name: "hero", widthPx: 1280, heightPx: 720 },
                    { name: "inside", widthPx: 1000, heightPx: 700 }
                ]
            }
        });
        service.importProviderPlace({
            provider: "foursquare",
            rawPayload: {
                fsq_id: "fsq-gallery-1",
                name: "Gallery Cafe",
                geocodes: { main: { latitude: 37.77001, longitude: -122.42003 } },
                location: { formatted_address: "300 Market Street, San Francisco, CA", country: "US" },
                photos: [
                    { id: "hero", prefix: "https://img/", suffix: ".jpg", width: 900, height: 600 },
                    { id: "patio", prefix: "https://img/", suffix: "2.jpg", width: 1600, height: 1000 }
                ]
            }
        });
        const place = service.getCanonicalPlace(first.canonicalPlaceId);
        expect(place?.photoGallery.length).toBeGreaterThanOrEqual(3);
        expect(place?.photoGallery[0]?.isPrimary).toBe(true);
        const beforePrimary = place?.primaryPhoto?.canonicalPhotoId;
        service.rebuildCanonicalPlace(first.canonicalPlaceId);
        const rebuilt = service.getCanonicalPlace(first.canonicalPlaceId);
        expect(rebuilt?.primaryPhoto?.canonicalPhotoId).toBe(beforePrimary);
    });
});
