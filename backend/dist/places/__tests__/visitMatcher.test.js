import { describe, expect, it } from 'vitest';
import { matchVisitToCanonicalPlace } from '../visitMatcher.js';
const basePlace = (overrides) => ({
    canonicalPlaceId: 'p-1',
    slug: 'p-1',
    status: 'active',
    primaryDisplayName: 'Cafe One',
    alternateNames: [],
    latitude: 30.2672,
    longitude: -97.7431,
    geohash: 'x',
    canonicalCategory: 'coffee',
    providerCategories: [],
    tags: [],
    cuisineTags: [],
    vibeTags: [],
    socialLinks: {},
    descriptionStatus: 'fallback',
    descriptionConfidence: 0.7,
    descriptionVersion: 1,
    alternateDescriptions: [],
    descriptionProvenance: [],
    aiGeneratedDescription: false,
    editorialDescription: false,
    descriptionCandidates: [],
    photoGallery: [],
    providerPhotoRefs: [],
    normalizedHours: {},
    rawHoursText: [],
    dataCompletenessScore: 84,
    mergeConfidence: 0.8,
    categoryConfidence: 0.8,
    geocodeConfidence: 0.8,
    permanentlyClosed: false,
    temporarilyClosed: false,
    sourceLinks: [],
    sourceRecordIds: [],
    fieldAttribution: [],
    manualOverrides: {},
    firstSeenAt: '2024-01-01T00:00:00.000Z',
    lastSeenAt: '2024-01-01T00:00:00.000Z',
    lastNormalizedAt: '2024-01-01T00:00:00.000Z',
    lastMergedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
});
describe('matchVisitToCanonicalPlace', () => {
    it('matches when user is clearly near one place', () => {
        const result = matchVisitToCanonicalPlace([basePlace({ canonicalPlaceId: 'p-10' })], { lat: 30.26721, lng: -97.74309 });
        expect(result.matched).toBe(true);
        expect(result.canonicalPlaceId).toBe('p-10');
    });
    it('suppresses in dense ambiguous clusters', () => {
        const result = matchVisitToCanonicalPlace([
            basePlace({ canonicalPlaceId: 'p-a', latitude: 30.2672, longitude: -97.7431 }),
            basePlace({ canonicalPlaceId: 'p-b', latitude: 30.26725, longitude: -97.74308 }),
        ], { lat: 30.26723, lng: -97.74309 });
        expect(result.matched).toBe(false);
        expect(result.reason).toBe('ambiguous_dense_area');
    });
    it('suppresses when already reviewed', () => {
        const result = matchVisitToCanonicalPlace([basePlace({ canonicalPlaceId: 'p-22' })], {
            lat: 30.2672,
            lng: -97.7431,
            reviewedPlaceIds: ['p-22'],
        });
        expect(result.matched).toBe(false);
        expect(result.reason).toBe('already_reviewed');
    });
});
