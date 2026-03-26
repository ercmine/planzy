import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/features/results/results_mapper.dart';
import 'package:dryad/features/results/results_state.dart';
import 'package:dryad/models/plan.dart';

void main() {
  test('mapper builds fallback description and rating metadata', () {
    final plan = Plan(
      id: '1',
      source: 'foursquare',
      sourceId: 'src-1',
      title: 'Sample',
      category: 'coffee shop',
      description: '',
      location: const PlanLocation(lat: 1, lng: 2, address: 'Uptown, Minneapolis'),
      rating: 4.4,
      reviewCount: 120,
      distanceMeters: 850,
      photos: const [PlanPhoto(url: 'https://image.test/1.jpg')],
      metadata: const {'tags': ['espresso', 'pastries']},
    );

    final vm = mapPlanToCardViewModel(
      PlanScoreView(plan: plan, score: 3.5, yesCount: 4, maybeCount: 1),
    );

    expect(vm.description, contains('coffee shop'));
    expect(vm.ratingText, '4.4');
    expect(vm.reviewCountText, '120 reviews');
    expect(vm.distanceText, '850 m');
    expect(vm.primaryPhotoUrl, isNotNull);
  });
}
