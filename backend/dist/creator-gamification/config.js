export const DEFAULT_CREATOR_GAMIFICATION_CONFIG = {
    dailyStreakGraceDays: 1,
    weeklyStreakGraceWeeks: 0,
    minQualityScoreForQualifyingPublish: 0.65,
    minEngagementScoreForQualityPublish: 0.5,
    maxQualifyingPublishesPerDay: 2,
    repeatedPlaceCooldownDays: 7,
    repeatedPlaceDailyCap: 1,
    trustedMilestoneMinTrust: "trusted",
    showcaseSlots: 3,
    milestones: [
        { id: "creator_daily_streak_7", family: "streak", title: "7-day publishing streak", threshold: 7, metric: "daily_streak" },
        { id: "creator_daily_streak_30", family: "streak", title: "30-day publishing streak", threshold: 30, metric: "daily_streak", minTrustTier: "developing" },
        { id: "creator_quality_10", family: "quality", title: "10 meaningful reviews", threshold: 10, metric: "quality_publishes" },
        { id: "creator_quality_25", family: "quality", title: "25 quality place reviews", threshold: 25, metric: "quality_publishes" },
        { id: "trusted_reviewer_20", family: "trusted", title: "Trusted reviewer", threshold: 20, metric: "trusted_reviews", minTrustTier: "trusted" },
        { id: "verified_local_voice", family: "trusted", title: "Verified local voice", threshold: 14, metric: "trusted_clean_days", minTrustTier: "high" },
        { id: "city_minneapolis_10_places", family: "city", title: "Minneapolis place specialist", threshold: 10, metric: "city_distinct_places", cityId: "minneapolis" },
        { id: "city_minneapolis_5_neighborhoods", family: "city", title: "Minneapolis neighborhood specialist", threshold: 5, metric: "city_neighborhoods", cityId: "minneapolis" },
        { id: "category_coffee_12", family: "category", title: "Coffee scene creator", threshold: 12, metric: "category_distinct_places", categoryId: "coffee" },
        { id: "district_nightlife_5", family: "district", title: "Nightlife district chronicler", threshold: 5, metric: "district_distinct_places", districtId: "nightlife_downtown" }
    ],
    showcases: [
        { id: "showcase_trusted_voice", title: "Trusted Voice", family: "trusted", milestoneIds: ["trusted_reviewer_20", "verified_local_voice"], trustedOnly: true },
        { id: "showcase_city_specialist", title: "City Specialist", family: "city", milestoneIds: ["city_minneapolis_10_places", "city_minneapolis_5_neighborhoods"] },
        { id: "showcase_quality_archivist", title: "Quality Archivist", family: "quality", milestoneIds: ["creator_quality_25"] },
        { id: "showcase_streak", title: "Consistency Mark", family: "streak", milestoneIds: ["creator_daily_streak_30"] }
    ]
};
