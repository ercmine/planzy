import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/video_platform/video_models.dart';

void main() {
  test('parses feed item dto with canonical place linkage', () {
    final item = PlaceVideoFeedItem.fromJson({
      'videoId': 'vid_1',
      'placeId': 'place_abc',
      'placeName': 'Sushi Spot',
      'placeCategory': 'Restaurant',
      'regionLabel': 'Austin, TX',
      'creatorName': 'Mia',
      'creatorHandle': '@mia',
      'caption': 'Worth the wait',
      'videoUrl': 'https://cdn/vid.mp4',
      'rating': 5,
    }, FeedScope.local);

    expect(item.placeId, 'place_abc');
    expect(item.scope, FeedScope.local);
    expect(item.caption, 'Worth the wait');
  });

  test('parses studio status payload safely', () {
    final video = StudioVideo.fromJson({
      'videoId': 'vid_2',
      'placeId': 'place_abc',
      'placeName': 'Sushi Spot',
      'title': 'Night sushi review',
      'status': 'processing',
    });

    expect(video.status, StudioVideoStatus.processing);
  });
}
