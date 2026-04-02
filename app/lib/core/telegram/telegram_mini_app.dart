class TelegramMiniAppUser {
  const TelegramMiniAppUser({
    required this.id,
    required this.firstName,
    this.lastName,
    this.username,
    this.languageCode,
    this.isPremium,
  });

  final int id;
  final String firstName;
  final String? lastName;
  final String? username;
  final String? languageCode;
  final bool? isPremium;
}

class TelegramMiniAppContext {
  const TelegramMiniAppContext({
    required this.isTelegramMiniApp,
    required this.initData,
    required this.initDataUnsafe,
    required this.user,
    required this.themeParams,
    required this.colorScheme,
    required this.viewportHeight,
    required this.viewportStableHeight,
    required this.isExpanded,
    required this.platform,
    required this.version,
    required this.startParam,
  });

  const TelegramMiniAppContext.browser()
      : isTelegramMiniApp = false,
        initData = null,
        initDataUnsafe = const <String, Object?>{},
        user = null,
        themeParams = const <String, String>{},
        colorScheme = null,
        viewportHeight = null,
        viewportStableHeight = null,
        isExpanded = false,
        platform = null,
        version = null,
        startParam = null;

  final bool isTelegramMiniApp;
  final String? initData;
  final Map<String, Object?> initDataUnsafe;
  final TelegramMiniAppUser? user;
  final Map<String, String> themeParams;
  final String? colorScheme;
  final double? viewportHeight;
  final double? viewportStableHeight;
  final bool isExpanded;
  final String? platform;
  final String? version;
  final String? startParam;

  bool get hasInitData => (initData ?? '').isNotEmpty;
}
