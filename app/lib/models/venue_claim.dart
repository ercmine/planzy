class CreateVenueClaimRequest {
  const CreateVenueClaimRequest({
    required this.venueId,
    required this.contactEmail,
    this.message,
    this.planId,
    this.provider,
  });

  final String venueId;
  final String contactEmail;
  final String? message;
  final String? planId;
  final String? provider;

  Map<String, dynamic> toJson() => {
        'venueId': venueId,
        'contactEmail': contactEmail,
        'message': message,
        'planId': planId,
        'provider': provider,
      };
}

class CreateVenueClaimResponse {
  const CreateVenueClaimResponse({
    required this.claimId,
    required this.verificationStatus,
    required this.createdAtISO,
  });

  factory CreateVenueClaimResponse.fromJson(Map<String, dynamic> json) {
    return CreateVenueClaimResponse(
      claimId: json['claimId']?.toString() ?? '',
      verificationStatus: json['verificationStatus']?.toString() ?? 'pending',
      createdAtISO: json['createdAtISO']?.toString() ?? '',
    );
  }

  final String claimId;
  final String verificationStatus;
  final String createdAtISO;
}
