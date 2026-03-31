import 'package:perbug/core/platform/perbug_platform.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('prioritizes iOS first, Android second, web third', () {
    const ios = PerbugPlatformSnapshot(
      target: TargetPlatform.iOS,
      web: false,
      walletAvailable: true,
      locationApiSupported: true,
    );
    const android = PerbugPlatformSnapshot(
      target: TargetPlatform.android,
      web: false,
      walletAvailable: true,
      locationApiSupported: true,
    );
    const web = PerbugPlatformSnapshot(
      target: TargetPlatform.android,
      web: true,
      walletAvailable: false,
      locationApiSupported: false,
    );

    expect(ios.platformPriority, 1);
    expect(android.platformPriority, 2);
    expect(web.platformPriority, 3);
  });

  test('mode labels reflect mobile-first strategy', () {
    const ios = PerbugPlatformSnapshot(
      target: TargetPlatform.iOS,
      web: false,
      walletAvailable: true,
      locationApiSupported: true,
    );
    const web = PerbugPlatformSnapshot(
      target: TargetPlatform.iOS,
      web: true,
      walletAvailable: false,
      locationApiSupported: false,
    );

    expect(ios.modeLabel, 'mobile-first');
    expect(ios.isPrimaryMobileTarget, isTrue);
    expect(web.modeLabel, 'web-secondary');
    expect(web.isPrimaryMobileTarget, isFalse);
  });
}
