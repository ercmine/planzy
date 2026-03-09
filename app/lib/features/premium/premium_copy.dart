import 'premium_models.dart';

const premiumFeatureLabels = <String, String>{
  'feature.ai_itinerary_generation': 'AI outing planner',
  'feature.reviews.video_upload': 'Video reviews',
  'feature.saved_lists.unlimited': 'Unlimited saved lists',
  'feature.creator.analytics': 'Creator analytics',
  'feature.business.analytics': 'Business analytics',
};

LockedFeatureContext contextForLockedFeature(String key) {
  switch (key) {
    case 'feature.creator.analytics':
      return const LockedFeatureContext(
        featureKey: 'feature.creator.analytics',
        title: 'Creator analytics is locked',
        description: 'Unlock creator insights, audience trends, and growth snapshots.',
        recommendedFamily: 'CREATOR',
      );
    case 'feature.business.analytics':
      return const LockedFeatureContext(
        featureKey: 'feature.business.analytics',
        title: 'Business analytics is locked',
        description: 'Access traffic trends, campaign results, and operational insights.',
        recommendedFamily: 'BUSINESS',
      );
    default:
      return const LockedFeatureContext(
        featureKey: 'feature.ai_itinerary_generation',
        title: 'Premium feature locked',
        description: 'Upgrade to unlock additional premium capabilities and higher limits.',
        recommendedFamily: 'USER',
      );
  }
}
