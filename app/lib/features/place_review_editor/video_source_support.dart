import 'package:flutter/foundation.dart';

bool supportsNativeVideoPicker({
  required bool isWeb,
  required TargetPlatform platform,
}) {
  if (isWeb) {
    return false;
  }

  return platform == TargetPlatform.android || platform == TargetPlatform.iOS;
}

String videoSourceUnavailableMessage({required bool isRecording}) {
  return isRecording
      ? 'Video recording is only available on the iOS and Android apps.'
      : 'Video import is only available on the iOS and Android apps.';
}
