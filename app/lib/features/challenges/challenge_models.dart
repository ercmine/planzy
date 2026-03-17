class ChallengeSummary {
  ChallengeSummary({
    required this.totalAvailable,
    required this.inProgress,
    required this.completed,
    required this.featuredLocales,
  });

  final int totalAvailable;
  final int inProgress;
  final int completed;
  final List<String> featuredLocales;

  factory ChallengeSummary.fromJson(Map<String, dynamic> json) {
    return ChallengeSummary(
      totalAvailable: (json['totalAvailable'] as num?)?.toInt() ?? 0,
      inProgress: (json['inProgress'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      featuredLocales: (json['featuredLocales'] as List?)?.map((item) => item.toString()).where((item) => item.isNotEmpty).toList(growable: false) ?? const <String>[],
    );
  }
}
