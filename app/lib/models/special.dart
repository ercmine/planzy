class Special {
  const Special({
    required this.headline,
    this.details,
    this.couponCode,
    this.bookingLink,
    this.startsAtISO,
    this.endsAtISO,
  });

  factory Special.fromJson(Map<String, dynamic> json) {
    return Special(
      headline: json['headline']?.toString() ?? 'Special offer',
      details: json['details']?.toString(),
      couponCode: json['couponCode']?.toString(),
      bookingLink: json['bookingLink']?.toString(),
      startsAtISO: json['startsAtISO']?.toString(),
      endsAtISO: json['endsAtISO']?.toString(),
    );
  }

  final String headline;
  final String? details;
  final String? couponCode;
  final String? bookingLink;
  final String? startsAtISO;
  final String? endsAtISO;

  Map<String, dynamic> toJson() => {
        'headline': headline,
        'details': details,
        'couponCode': couponCode,
        'bookingLink': bookingLink,
        'startsAtISO': startsAtISO,
        'endsAtISO': endsAtISO,
      };

  static List<Special> fromPlanMetadata(Map<String, dynamic>? metadata) {
    final specialsRaw = metadata?['specials'];
    if (specialsRaw is! List) {
      return const <Special>[];
    }

    return specialsRaw
        .whereType<Map>()
        .map((item) => Special.fromJson(item.cast<String, dynamic>()))
        .toList(growable: false);
  }
}
