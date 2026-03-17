class AccomplishmentSummary {
  AccomplishmentSummary({
    required this.earnedCount,
    required this.featured,
    required this.nextMilestones,
  });

  final int earnedCount;
  final List<String> featured;
  final List<String> nextMilestones;

  factory AccomplishmentSummary.fromJson(Map<String, dynamic> json) {
    final earned = (json['earned'] as List?)?.whereType<Map<String, dynamic>>().toList(growable: false) ?? const [];
    final featured = (json['featured'] as List?)?.whereType<Map<String, dynamic>>().map((item) => (item['name'] ?? '').toString()).where((item) => item.isNotEmpty).toList(growable: false) ?? const [];
    final progress = (json['progress'] as List?)?.whereType<Map<String, dynamic>>().toList(growable: false) ?? const [];

    final next = progress
        .where((item) => (item['earned'] as bool?) != true)
        .take(3)
        .map((item) => (item['definitionId'] ?? '').toString())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);

    return AccomplishmentSummary(
      earnedCount: earned.length,
      featured: featured,
      nextMilestones: next,
    );
  }
}
