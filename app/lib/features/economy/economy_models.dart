class EconomyWallet {
  const EconomyWallet({required this.ownerId, required this.balanceAtomic});

  final String ownerId;
  final String balanceAtomic;

  double get balanceDryad => (double.tryParse(balanceAtomic) ?? 0) / 1000000;

  factory EconomyWallet.fromJson(Map<String, dynamic> json) {
    return EconomyWallet(
      ownerId: (json['ownerId'] ?? '').toString(),
      balanceAtomic: (json['balanceAtomic'] ?? '0').toString(),
    );
  }
}

class EconomyQuest {
  const EconomyQuest({
    required this.id,
    required this.title,
    required this.placeId,
    required this.status,
    required this.rewardAtomic,
    required this.endsAt,
    required this.dailyCap,
    required this.totalCap,
  });

  final String id;
  final String title;
  final String placeId;
  final String status;
  final String rewardAtomic;
  final String endsAt;
  final int dailyCap;
  final int totalCap;

  double get rewardDryad => (double.tryParse(rewardAtomic) ?? 0) / 1000000;

  factory EconomyQuest.fromJson(Map<String, dynamic> json) {
    return EconomyQuest(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      rewardAtomic: (json['rewardAtomic'] ?? '0').toString(),
      endsAt: (json['endsAt'] ?? '').toString(),
      dailyCap: (json['dailyCap'] as num?)?.toInt() ?? 0,
      totalCap: (json['totalCap'] as num?)?.toInt() ?? 0,
    );
  }
}

class EconomyCollection {
  const EconomyCollection({required this.id, required this.title, required this.placeIds, required this.completionRewardAtomic, this.sponsoredByBusinessId});

  final String id;
  final String title;
  final List<String> placeIds;
  final String completionRewardAtomic;
  final String? sponsoredByBusinessId;

  double get completionRewardDryad => (double.tryParse(completionRewardAtomic) ?? 0) / 1000000;

  factory EconomyCollection.fromJson(Map<String, dynamic> json) {
    return EconomyCollection(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      placeIds: ((json['placeIds'] as List?) ?? const []).map((entry) => entry.toString()).toList(growable: false),
      completionRewardAtomic: (json['completionRewardAtomic'] ?? '0').toString(),
      sponsoredByBusinessId: json['sponsoredByBusinessId']?.toString(),
    );
  }
}

class EconomyMembership {
  const EconomyMembership({required this.tier, required this.active, required this.expiresAt});

  final String tier;
  final bool active;
  final String expiresAt;

  factory EconomyMembership.fromJson(Map<String, dynamic> json) {
    return EconomyMembership(
      tier: (json['tier'] ?? 'pro').toString(),
      active: json['active'] == true,
      expiresAt: (json['expiresAt'] ?? '').toString(),
    );
  }
}

class EconomyDashboard {
  const EconomyDashboard({
    required this.wallet,
    required this.activeQuests,
    required this.collections,
    required this.redemptions,
    this.membership,
  });

  final EconomyWallet wallet;
  final List<EconomyQuest> activeQuests;
  final List<EconomyCollection> collections;
  final List<Map<String, dynamic>> redemptions;
  final EconomyMembership? membership;

  factory EconomyDashboard.fromJson(Map<String, dynamic> json) {
    return EconomyDashboard(
      wallet: EconomyWallet.fromJson((json['wallet'] as Map?)?.cast<String, dynamic>() ?? const {}),
      activeQuests: ((json['activeQuests'] as List?) ?? const [])
          .whereType<Map>()
          .map((entry) => EconomyQuest.fromJson(entry.cast<String, dynamic>()))
          .toList(growable: false),
      collections: ((json['collections'] as List?) ?? const [])
          .whereType<Map>()
          .map((entry) => EconomyCollection.fromJson(entry.cast<String, dynamic>()))
          .toList(growable: false),
      redemptions: ((json['redemptions'] as List?) ?? const []).whereType<Map<String, dynamic>>().toList(growable: false),
      membership: json['memberships'] is Map<String, dynamic> ? EconomyMembership.fromJson(json['memberships'] as Map<String, dynamic>) : null,
    );
  }
}

class SponsoredPlacement {
  const SponsoredPlacement({required this.placeId, required this.campaignTitle, required this.rewardDryad, required this.sponsoredByBusinessId});

  final String placeId;
  final String campaignTitle;
  final double rewardDryad;
  final String sponsoredByBusinessId;

  factory SponsoredPlacement.fromJson(Map<String, dynamic> json) {
    return SponsoredPlacement(
      placeId: (json['campaign'] as Map?)?['placeId']?.toString() ?? '',
      campaignTitle: (json['campaign'] as Map?)?['title']?.toString() ?? 'Sponsored campaign',
      rewardDryad: ((json['estimatedRewardDryad'] as num?) ?? 0).toDouble(),
      sponsoredByBusinessId: (json['campaign'] as Map?)?['businessId']?.toString() ?? '',
    );
  }
}
