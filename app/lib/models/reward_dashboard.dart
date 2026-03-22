import '../core/json_parsers.dart';

class RewardPlaceSummary {
  RewardPlaceSummary({required this.name});
  final String name;
  factory RewardPlaceSummary.fromJson(Map<String, dynamic> json) => RewardPlaceSummary(name: (json['name'] ?? '').toString());
}

class RewardClaimSummary {
  RewardClaimSummary({this.explorerUrl, this.transactionSignature});
  final String? explorerUrl;
  final String? transactionSignature;
  factory RewardClaimSummary.fromJson(Map<String, dynamic> json) => RewardClaimSummary(explorerUrl: json['explorerUrl']?.toString(), transactionSignature: json['transactionSignature']?.toString());
}

class RewardReviewSummary {
  RewardReviewSummary({required this.id, required this.rewardStatus, this.finalRewardAmount, this.rewardPosition});
  final String id;
  final String rewardStatus;
  final String? finalRewardAmount;
  final int? rewardPosition;

  factory RewardReviewSummary.fromJson(Map<String, dynamic> json) {
    final reward = (json['reward'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    return RewardReviewSummary(
      id: (json['id'] ?? '').toString(),
      rewardStatus: (reward['status'] ?? json['rewardStatus'] ?? '').toString(),
      finalRewardAmount: reward['finalAmountAtomic']?.toString() ?? json['finalRewardAmount']?.toString(),
      rewardPosition: parseInt(reward['rewardPosition'] ?? json['rewardPosition']),
    );
  }
}

class RewardOverviewItem {
  RewardOverviewItem({required this.review, required this.place, this.claim});
  final RewardReviewSummary review;
  final RewardPlaceSummary place;
  final RewardClaimSummary? claim;
  factory RewardOverviewItem.fromJson(Map<String, dynamic> json) => RewardOverviewItem(
    review: RewardReviewSummary.fromJson((json['review'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{}),
    place: RewardPlaceSummary.fromJson((json['place'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{}),
    claim: json['claim'] is Map<String, dynamic> ? RewardClaimSummary.fromJson(json['claim'] as Map<String, dynamic>) : null,
  );
}

class RewardDashboard {
  RewardDashboard({required this.claimable, required this.history, required this.claimableDisplay, required this.claimedDisplay, required this.pendingCount, this.walletPublicKey});
  final List<RewardOverviewItem> claimable;
  final List<RewardOverviewItem> history;
  final String claimableDisplay;
  final String claimedDisplay;
  final int pendingCount;
  final String? walletPublicKey;

  factory RewardDashboard.fromJson(Map<String, dynamic> json) {
    final totals = (json['totals'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    return RewardDashboard(
      claimable: ((json['claimable'] as List?) ?? const []).whereType<Map<String, dynamic>>().map(RewardOverviewItem.fromJson).toList(growable: false),
      history: ((json['history'] as List?) ?? const []).whereType<Map<String, dynamic>>().map(RewardOverviewItem.fromJson).toList(growable: false),
      claimableDisplay: (totals['claimableDisplay'] ?? '0').toString(),
      claimedDisplay: (totals['claimedDisplay'] ?? '0').toString(),
      pendingCount: parseInt(totals['pendingCount']) ?? 0,
      walletPublicKey: (json['wallet'] as Map?)?['publicKey']?.toString(),
    );
  }
}
