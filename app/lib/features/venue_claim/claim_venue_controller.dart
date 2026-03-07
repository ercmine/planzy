import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/validation/email.dart';
import '../../models/plan.dart';
import '../../models/venue_claim.dart';
import '../../repositories/venue_claim_repository.dart';
import 'claim_venue_state.dart';

class ClaimVenueController extends StateNotifier<ClaimVenueState> {
  ClaimVenueController({required VenueClaimRepository? repository})
      : _repository = repository,
        super(ClaimVenueState.initial());

  final VenueClaimRepository? _repository;

  Future<void> submitClaim({
    required Plan plan,
    required String email,
    String? message,
  }) async {
    final normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      state = state.copyWith(
        status: ClaimVenueStatus.error,
        errorMessage: 'Please enter a valid email address.',
      );
      return;
    }

    if (_repository == null) {
      state = state.copyWith(
        status: ClaimVenueStatus.error,
        errorMessage: 'Venue claims are not available right now.',
      );
      return;
    }

    state = state.copyWith(
      status: ClaimVenueStatus.submitting,
      clearError: true,
    );

    final hasSource = plan.source.trim().isNotEmpty;
    final hasSourceId = plan.sourceId.trim().isNotEmpty;
    final venueId = hasSource && hasSourceId ? '${plan.source}:${plan.sourceId}' : plan.id;

    try {
      final response = await _repository!.createClaim(
        CreateVenueClaimRequest(
          venueId: venueId,
          contactEmail: normalizedEmail,
          message: (message ?? '').trim().isEmpty ? null : message!.trim(),
          planId: plan.id,
          provider: plan.source,
        ),
      );

      state = state.copyWith(
        status: ClaimVenueStatus.success,
        clearError: true,
        lastClaimId: response.claimId,
        maskedEmail: maskEmail(normalizedEmail),
      );
    } catch (error) {
      state = state.copyWith(
        status: ClaimVenueStatus.error,
        errorMessage: 'Unable to submit your claim. Please try again.',
      );
    }
  }

  void reset() {
    state = ClaimVenueState.initial();
  }
}
