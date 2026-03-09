class EntitlementSummary {
  const EntitlementSummary({
    required this.planCode,
    required this.adsEnabled,
  });

  final String planCode;
  final bool adsEnabled;

  factory EntitlementSummary.fromJson(Map<String, dynamic> json) {
    final context = json['context'];
    final plan = context is Map<String, dynamic> ? context['plan'] : null;
    final ads = json['ads'];

    return EntitlementSummary(
      planCode: plan is Map<String, dynamic> ? (plan['code'] ?? 'free').toString() : 'free',
      adsEnabled: ads is Map<String, dynamic> ? ads['adsEnabled'] == true : true,
    );
  }
}
