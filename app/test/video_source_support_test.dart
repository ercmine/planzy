import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/place_review_editor/video_source_support.dart';

void main() {
  group('supportsNativeVideoPicker', () {
    test('returns true for Android and iOS mobile targets', () {
      expect(
        supportsNativeVideoPicker(
          isWeb: false,
          platform: TargetPlatform.android,
        ),
        isTrue,
      );
      expect(
        supportsNativeVideoPicker(isWeb: false, platform: TargetPlatform.iOS),
        isTrue,
      );
    });

    test('returns false for web and unsupported desktop targets', () {
      expect(
        supportsNativeVideoPicker(
          isWeb: true,
          platform: TargetPlatform.android,
        ),
        isFalse,
      );
      expect(
        supportsNativeVideoPicker(isWeb: false, platform: TargetPlatform.macOS),
        isFalse,
      );
      expect(
        supportsNativeVideoPicker(isWeb: false, platform: TargetPlatform.linux),
        isFalse,
      );
      expect(
        supportsNativeVideoPicker(
          isWeb: false,
          platform: TargetPlatform.windows,
        ),
        isFalse,
      );
    });
  });

  group('videoSourceUnavailableMessage', () {
    test('returns recording-specific copy', () {
      expect(
        videoSourceUnavailableMessage(isRecording: true),
        'Video recording is only available on the iOS and Android apps.',
      );
    });

    test('returns import-specific copy', () {
      expect(
        videoSourceUnavailableMessage(isRecording: false),
        'Video import is only available on the iOS and Android apps.',
      );
    });
  });
}
