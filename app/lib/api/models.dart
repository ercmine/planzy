import '../core/json_parsers.dart';

class ClaimVenueResponse {
  final String claimId;
  final String verificationStatus;
  final DateTime createdAt;

  ClaimVenueResponse({
    required this.claimId,
    required this.verificationStatus,
    required this.createdAt,
  });

  factory ClaimVenueResponse.fromJson(Map<String, dynamic> json) {
    return ClaimVenueResponse(
      claimId: json['claimId'] as String,
      verificationStatus: json['verificationStatus'] as String,
      createdAt: DateTime.parse(json['createdAtISO'] as String),
    );
  }
}

class PlanApiModel {
  PlanApiModel({
    required this.id,
    required this.title,
    required this.category,
    this.source,
    this.placeId,
    this.address,
    this.lat,
    this.lng,
    this.rating,
    this.userRatingCount,
    this.priceLevel,
    this.googleMapsUri,
    this.websiteUri,
    this.photo,
  });

  final String id;
  final String title;
  final String category;
  final String? source;
  final String? placeId;
  final String? address;
  final double? lat;
  final double? lng;
  final double? rating;
  final int? userRatingCount;
  final int? priceLevel;
  final String? googleMapsUri;
  final String? websiteUri;
  final String? photo;

  factory PlanApiModel.fromJson(Map<String, dynamic> json) {
    return PlanApiModel(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      source: json['source']?.toString(),
      placeId: json['placeId']?.toString(),
      address: json['address']?.toString(),
      lat: parseDouble(json['lat']),
      lng: parseDouble(json['lng']),
      rating: parseDouble(json['rating']),
      userRatingCount: parseInt(json['userRatingCount']),
      priceLevel: parseInt(json['priceLevel']),
      googleMapsUri: json['googleMapsUri']?.toString(),
      websiteUri: json['websiteUri']?.toString(),
      photo: json['photo']?.toString(),
    );
  }
}

class LiveResultItem {
  LiveResultItem({
    required this.sessionId,
    required this.topPlanId,
    required this.topPlanTitle,
    required this.score,
  });

  final String sessionId;
  final String topPlanId;
  final String topPlanTitle;
  final double score;

  factory LiveResultItem.fromJson(Map<String, dynamic> json) {
    return LiveResultItem(
      sessionId: (json['sessionId'] ?? '').toString(),
      topPlanId: (json['topPlanId'] ?? '').toString(),
      topPlanTitle: (json['topPlanTitle'] ?? '').toString(),
      score: parseDouble(json['score']) ?? 0,
    );
  }
}

class LiveResultsSummary {
  LiveResultsSummary({
    required this.activeSessions,
    required this.generatedAt,
  });

  final int activeSessions;
  final String generatedAt;

  factory LiveResultsSummary.fromJson(Map<String, dynamic> json) {
    return LiveResultsSummary(
      activeSessions: parseInt(json['activeSessions']) ?? 0,
      generatedAt: (json['generatedAt'] ?? '').toString(),
    );
  }
}

class LiveResultsResponse {
  LiveResultsResponse({
    required this.results,
    required this.summary,
  });

  final List<LiveResultItem> results;
  final LiveResultsSummary summary;

  factory LiveResultsResponse.fromJson(Map<String, dynamic> json) {
    final rawResults = json['results'];
    final rawSummary = json['summary'];
    if (rawResults is! List) {
      throw const FormatException('Expected "results" to be a JSON list');
    }
    if (rawSummary is! Map<String, dynamic>) {
      throw const FormatException('Expected "summary" to be a JSON object');
    }

    return LiveResultsResponse(
      results: rawResults
          .whereType<Map<String, dynamic>>()
          .map(LiveResultItem.fromJson)
          .toList(growable: false),
      summary: LiveResultsSummary.fromJson(rawSummary),
    );
  }
}

