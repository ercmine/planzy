export const DEFAULT_PROGRESSION_CONFIG = {
    xpByAction: {
        explorer_place_saved_first: 20,
        explorer_place_open_meaningful: 8,
        explorer_review_submitted: 45,
        explorer_new_category: 30,
        explorer_new_city: 35,
        explorer_daily_active: 15,
        creator_draft_created: 10,
        creator_metadata_completed: 15,
        creator_video_published: 70,
        creator_review_published: 40,
        creator_quality_engagement: 30,
        creator_new_coverage: 35,
        creator_daily_publish: 25
    },
    explorerLevelThresholds: [0, 80, 180, 320, 520, 800, 1180, 1680, 2360, 3280],
    creatorLevelThresholds: [0, 100, 240, 420, 680, 1020, 1460, 2020, 2720, 3600],
    actionDailyCaps: {
        explorer_place_open_meaningful: 60,
        explorer_daily_active: 30,
        creator_draft_created: 30,
        creator_quality_engagement: 120,
        creator_daily_publish: 50
    },
    actionCooldownMs: {
        explorer_place_open_meaningful: 30 * 60 * 1000,
        explorer_daily_active: 20 * 60 * 60 * 1000,
        creator_draft_created: 20 * 60 * 1000,
        creator_daily_publish: 20 * 60 * 60 * 1000
    },
    milestones: [
        { id: "first_video", track: "creator", metric: "published_videos", threshold: 1, title: "First place video" },
        { id: "saved_25", track: "explorer", metric: "saved_places", threshold: 25, title: "Saved 25 places" },
        { id: "review_10", track: "explorer", metric: "reviews_submitted", threshold: 10, title: "10 thoughtful reviews" },
        { id: "explorer_streak_7", track: "explorer", metric: "explorer_streak", threshold: 7, title: "7-day explorer streak" },
        { id: "creator_streak_5", track: "creator", metric: "creator_streak", threshold: 5, title: "5-day creator consistency" },
        { id: "creator_10_uploads", track: "creator", metric: "published_videos", threshold: 10, title: "10 videos published" }
    ],
    trustMultipliers: {
        low: 0.2,
        developing: 0.6,
        trusted: 1,
        high: 1.1
    },
    rewardFeedback: {
        microMinXp: 10,
        majorLevelStep: 1,
        celebrationCooldownMs: 15_000,
        maxFeaturedTrophies: 4,
        contextPriority: ["post_publish", "post_review", "post_save", "creator_studio", "profile", "discovery_home", "collection_hub", "quest_hub", "city_page"]
    },
};
