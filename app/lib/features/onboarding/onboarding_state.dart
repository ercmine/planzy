import '../dryad/chain/grove_nft_service.dart';

enum OnboardingFlowStatus {
  initial,
  walletDisconnected,
  walletConnected,
  wrongNetwork,
  readyToFetchNft,
  nftFound,
  nftNotMinted,
  mintInProgress,
  mintSucceeded,
  onboardingCompleted,
  onboardingFailed,
}

class OnboardingState {
  const OnboardingState({
    required this.status,
    required this.walletAddress,
    required this.isBusy,
    required this.hasCompleted,
    this.snapshot,
    this.errorMessage,
    this.txHash,
  });

  factory OnboardingState.initial() => const OnboardingState(
        status: OnboardingFlowStatus.initial,
        walletAddress: '',
        isBusy: false,
        hasCompleted: false,
      );

  final OnboardingFlowStatus status;
  final String walletAddress;
  final bool isBusy;
  final bool hasCompleted;
  final GroveNftSnapshot? snapshot;
  final String? errorMessage;
  final String? txHash;

  OnboardingState copyWith({
    OnboardingFlowStatus? status,
    String? walletAddress,
    bool? isBusy,
    bool? hasCompleted,
    GroveNftSnapshot? snapshot,
    String? errorMessage,
    String? txHash,
    bool clearError = false,
  }) {
    return OnboardingState(
      status: status ?? this.status,
      walletAddress: walletAddress ?? this.walletAddress,
      isBusy: isBusy ?? this.isBusy,
      hasCompleted: hasCompleted ?? this.hasCompleted,
      snapshot: snapshot ?? this.snapshot,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      txHash: txHash ?? this.txHash,
    );
  }
}
