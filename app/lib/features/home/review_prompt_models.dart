class VisitMatchResponse {
  const VisitMatchResponse({
    required this.matched,
    this.canonicalPlaceId,
    this.placeName,
    this.distanceMeters,
    this.confidence,
    this.reason,
  });

  final bool matched;
  final String? canonicalPlaceId;
  final String? placeName;
  final double? distanceMeters;
  final double? confidence;
  final String? reason;

  factory VisitMatchResponse.fromJson(Map<String, dynamic> json) {
    return VisitMatchResponse(
      matched: json['matched'] == true,
      canonicalPlaceId: json['canonicalPlaceId']?.toString(),
      placeName: json['placeName']?.toString(),
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      confidence: (json['confidence'] as num?)?.toDouble(),
      reason: json['reason']?.toString(),
    );
  }
}

class ReviewPromptDecision {
  const ReviewPromptDecision({required this.shouldPrompt, this.match, this.suppressionReason});

  final bool shouldPrompt;
  final VisitMatchResponse? match;
  final String? suppressionReason;
}
