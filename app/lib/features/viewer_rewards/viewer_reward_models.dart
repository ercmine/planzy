class ViewerRewardHint {
  const ViewerRewardHint({
    this.isEligible = false,
    this.watchRewardDryad,
    this.ratingBonusDryad,
    this.commentBonusDryad,
    this.watchThresholdPercent,
    this.sponsorName,
    this.fundingLabel,
    this.alreadyRewarded = false,
  });

  final bool isEligible;
  final double? watchRewardDryad;
  final double? ratingBonusDryad;
  final double? commentBonusDryad;
  final int? watchThresholdPercent;
  final String? sponsorName;
  final String? fundingLabel;
  final bool alreadyRewarded;

  bool get hasSponsoredFunding => (fundingLabel ?? '').toLowerCase().contains('sponsor') || (sponsorName?.isNotEmpty == true);

  factory ViewerRewardHint.fromJson(Map<String, dynamic> json) {
    return ViewerRewardHint(
      isEligible: json['isEligible'] == true,
      watchRewardDryad: (json['watchRewardDryad'] as num?)?.toDouble() ?? (json['watchReward'] as num?)?.toDouble(),
      ratingBonusDryad: (json['ratingBonusDryad'] as num?)?.toDouble(),
      commentBonusDryad: (json['commentBonusDryad'] as num?)?.toDouble(),
      watchThresholdPercent: (json['watchThresholdPercent'] as num?)?.toInt(),
      sponsorName: json['sponsorName']?.toString(),
      fundingLabel: json['fundingLabel']?.toString(),
      alreadyRewarded: json['alreadyRewarded'] == true,
    );
  }
}

enum ViewerRewardStatusType { started, eligibleSoon, earned, pending, denied, alreadyRewarded, capReached, suspicious, insufficientWatchTime, notRewardable }

class ViewerRewardVideoStatus {
  const ViewerRewardVideoStatus({
    required this.videoId,
    required this.status,
    required this.progressPercent,
    required this.remainingSeconds,
    this.watchRewardDryad,
    this.ratingRewardDryad,
    this.commentRewardDryad,
    this.reason,
    this.sponsorName,
    this.fundingLabel,
  });

  final String videoId;
  final ViewerRewardStatusType status;
  final double progressPercent;
  final int remainingSeconds;
  final double? watchRewardDryad;
  final double? ratingRewardDryad;
  final double? commentRewardDryad;
  final String? reason;
  final String? sponsorName;
  final String? fundingLabel;

  bool get hasSponsoredFunding => (fundingLabel ?? '').toLowerCase().contains('sponsor') || (sponsorName?.isNotEmpty == true);

  String get statusLabel {
    switch (status) {
      case ViewerRewardStatusType.started:
        return 'Started';
      case ViewerRewardStatusType.eligibleSoon:
        return 'Eligible soon';
      case ViewerRewardStatusType.earned:
        return 'Reward earned';
      case ViewerRewardStatusType.pending:
        return 'Pending validation';
      case ViewerRewardStatusType.denied:
        return 'Reward denied';
      case ViewerRewardStatusType.alreadyRewarded:
        return 'Already rewarded';
      case ViewerRewardStatusType.capReached:
        return 'Daily cap reached';
      case ViewerRewardStatusType.suspicious:
        return 'In review';
      case ViewerRewardStatusType.insufficientWatchTime:
        return 'Need more watch time';
      case ViewerRewardStatusType.notRewardable:
        return 'Not rewardable';
    }
  }

  factory ViewerRewardVideoStatus.fromJson(Map<String, dynamic> json) {
    final raw = (json['status'] ?? 'started').toString();
    final status = switch (raw) {
      'eligible_soon' => ViewerRewardStatusType.eligibleSoon,
      'earned' => ViewerRewardStatusType.earned,
      'pending' => ViewerRewardStatusType.pending,
      'denied' => ViewerRewardStatusType.denied,
      'already_rewarded' => ViewerRewardStatusType.alreadyRewarded,
      'cap_reached' => ViewerRewardStatusType.capReached,
      'suspicious' => ViewerRewardStatusType.suspicious,
      'insufficient_watch_time' => ViewerRewardStatusType.insufficientWatchTime,
      'not_rewardable' => ViewerRewardStatusType.notRewardable,
      _ => ViewerRewardStatusType.started,
    };

    return ViewerRewardVideoStatus(
      videoId: (json['videoId'] ?? '').toString(),
      status: status,
      progressPercent: ((json['progressPercent'] as num?)?.toDouble() ?? 0).clamp(0, 100),
      remainingSeconds: (json['remainingSeconds'] as num?)?.toInt() ?? 0,
      watchRewardDryad: (json['watchRewardDryad'] as num?)?.toDouble(),
      ratingRewardDryad: (json['ratingRewardDryad'] as num?)?.toDouble(),
      commentRewardDryad: (json['commentRewardDryad'] as num?)?.toDouble(),
      reason: json['reason']?.toString(),
      sponsorName: json['sponsorName']?.toString(),
      fundingLabel: json['fundingLabel']?.toString(),
    );
  }
}

class ViewerRewardSummary {
  const ViewerRewardSummary({
    required this.watchEarned,
    required this.ratingEarned,
    required this.commentEarned,
    required this.pending,
    required this.denied,
    required this.dailyCapRemaining,
    this.dailyCap,
    this.weeklyEarned,
    this.monthlyEarned,
    this.notifications = const [],
  });

  final double watchEarned;
  final double ratingEarned;
  final double commentEarned;
  final double pending;
  final double denied;
  final int dailyCapRemaining;
  final int? dailyCap;
  final double? weeklyEarned;
  final double? monthlyEarned;
  final List<String> notifications;

  double get totalEarned => watchEarned + ratingEarned + commentEarned;

  factory ViewerRewardSummary.fromJson(Map<String, dynamic> json) {
    return ViewerRewardSummary(
      watchEarned: (json['watchEarned'] as num?)?.toDouble() ?? 0,
      ratingEarned: (json['ratingEarned'] as num?)?.toDouble() ?? 0,
      commentEarned: (json['commentEarned'] as num?)?.toDouble() ?? 0,
      pending: (json['pending'] as num?)?.toDouble() ?? 0,
      denied: (json['denied'] as num?)?.toDouble() ?? 0,
      dailyCapRemaining: (json['dailyCapRemaining'] as num?)?.toInt() ?? 0,
      dailyCap: (json['dailyCap'] as num?)?.toInt(),
      weeklyEarned: (json['weeklyEarned'] as num?)?.toDouble(),
      monthlyEarned: (json['monthlyEarned'] as num?)?.toDouble(),
      notifications: (json['notifications'] as List?)?.map((e) => e.toString()).toList(growable: false) ?? const [],
    );
  }
}

class ViewerRewardHistoryItem {
  const ViewerRewardHistoryItem({
    required this.id,
    required this.videoTitle,
    required this.action,
    required this.dryad,
    required this.status,
    required this.occurredAt,
    this.videoId,
    this.placeName,
    this.campaignLabel,
    this.reason,
  });

  final String id;
  final String? videoId;
  final String videoTitle;
  final String action;
  final double dryad;
  final ViewerRewardStatusType status;
  final DateTime occurredAt;
  final String? placeName;
  final String? campaignLabel;
  final String? reason;

  factory ViewerRewardHistoryItem.fromJson(Map<String, dynamic> json) {
    return ViewerRewardHistoryItem(
      id: (json['id'] ?? '').toString(),
      videoId: json['videoId']?.toString(),
      videoTitle: (json['videoTitle'] ?? 'Video engagement').toString(),
      action: (json['action'] ?? 'watch').toString(),
      dryad: (json['dryad'] as num?)?.toDouble() ?? 0,
      status: ViewerRewardVideoStatus.fromJson({'status': json['status']}).status,
      occurredAt: DateTime.tryParse((json['occurredAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      placeName: json['placeName']?.toString(),
      campaignLabel: json['campaignLabel']?.toString(),
      reason: json['reason']?.toString(),
    );
  }
}
