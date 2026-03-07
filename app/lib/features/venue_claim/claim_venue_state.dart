enum ClaimVenueStatus { idle, submitting, success, error }

class ClaimVenueState {
  const ClaimVenueState({
    this.status = ClaimVenueStatus.idle,
    this.errorMessage,
    this.lastClaimId,
    this.maskedEmail,
  });

  factory ClaimVenueState.initial() => const ClaimVenueState();

  final ClaimVenueStatus status;
  final String? errorMessage;
  final String? lastClaimId;
  final String? maskedEmail;

  ClaimVenueState copyWith({
    ClaimVenueStatus? status,
    String? errorMessage,
    bool clearError = false,
    String? lastClaimId,
    String? maskedEmail,
  }) {
    return ClaimVenueState(
      status: status ?? this.status,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      lastClaimId: lastClaimId ?? this.lastClaimId,
      maskedEmail: maskedEmail ?? this.maskedEmail,
    );
  }
}
