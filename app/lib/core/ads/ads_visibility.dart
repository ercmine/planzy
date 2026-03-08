import 'ads_config.dart';

class AdsVisibility {
  const AdsVisibility({
    required AdsConfig config,
    this.isAdFreeUser = false,
    this.placementsEnabled = const <String>{},
  }) : _config = config;

  final AdsConfig _config;
  final bool isAdFreeUser;
  final Set<String> placementsEnabled;

  bool canShow(String placementName) {
    if (!_config.isUsable || isAdFreeUser) {
      return false;
    }
    if (placementsEnabled.isEmpty) {
      return true;
    }
    return placementsEnabled.contains(placementName);
  }
}
