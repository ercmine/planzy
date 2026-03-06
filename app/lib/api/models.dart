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
