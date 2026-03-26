import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../dryad/chain/evm_abi.dart';
import '../dryad/chain/grove_nft_service.dart';
import 'onboarding_state.dart';

class OnboardingController extends Notifier<OnboardingState> {
  @override
  OnboardingState build() {
    _load();
    return OnboardingState.initial();
  }

  Future<void> _load() async {
    final identity = await ref.read(identityStoreProvider.future);
    final completed = await identity.isOnboardingCompleted();
    if (completed) {
      state = state.copyWith(status: OnboardingFlowStatus.onboardingCompleted, hasCompleted: true);
      return;
    }
    state = state.copyWith(status: OnboardingFlowStatus.walletDisconnected);
  }

  void setWalletAddress(String value) {
    state = state.copyWith(
      walletAddress: value.trim(),
      status: value.trim().isEmpty ? OnboardingFlowStatus.walletDisconnected : OnboardingFlowStatus.walletConnected,
      clearError: true,
    );
    ref.read(walletAddressProvider.notifier).state = value.trim().isEmpty ? null : value.trim();
  }


  Future<void> connectWallet() async {
    final connector = ref.read(walletConnectorProvider);
    if (!connector.isAvailable) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        errorMessage: 'No browser wallet detected. Install MetaMask (or compatible wallet) in Flutter Web, or paste your wallet manually.',
      );
      return;
    }

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final account = await connector.connectWallet();
      setWalletAddress(account);
      state = state.copyWith(isBusy: false, status: OnboardingFlowStatus.walletConnected);
    } catch (error) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage: 'Wallet connection failed: $error',
      );
    }
  }

  Future<void> refreshNftStatus() async {
    if (state.walletAddress.isEmpty) {
      state = state.copyWith(status: OnboardingFlowStatus.walletDisconnected, errorMessage: 'Connect a wallet address first.');
      return;
    }

    state = state.copyWith(status: OnboardingFlowStatus.readyToFetchNft, isBusy: true, clearError: true);
    try {
      final service = ref.read(groveNftServiceProvider);
      final snapshot = await service.fetchWalletSnapshot(state.walletAddress);
      final expectedChain = ref.read(dryadContractConfigProvider).chainId;
      final connector = ref.read(walletConnectorProvider);
      final activeWalletChain = connector.isAvailable ? await connector.readChainId() : snapshot.chainId;
      if (activeWalletChain != expectedChain) {
        state = state.copyWith(
          status: OnboardingFlowStatus.wrongNetwork,
          isBusy: false,
          snapshot: snapshot,
          errorMessage: 'Wrong network. Expected chain ID $expectedChain but connected wallet is on $activeWalletChain.',
        );
        return;
      }
      state = state.copyWith(
        status: snapshot.hasNft ? OnboardingFlowStatus.nftFound : OnboardingFlowStatus.nftNotMinted,
        isBusy: false,
        snapshot: snapshot,
      );
    } catch (error) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage: 'Unable to load NFT from chain: $error',
      );
    }
  }

  Future<void> mintNft() async {
    final service = ref.read(groveNftServiceProvider);
    final config = ref.read(dryadContractConfigProvider);
    final connector = ref.read(walletConnectorProvider);
    state = state.copyWith(status: OnboardingFlowStatus.mintInProgress, isBusy: true, clearError: true);

    try {
      final txHash = connector.isAvailable
          ? await connector.sendTransaction(
              from: state.walletAddress,
              to: config.groveNftAddress,
              data: encodeWriteCall(config.mintMethodSignature, walletAddress: state.walletAddress),
            )
          : await service.mint(walletAddress: state.walletAddress, methodSignature: config.mintMethodSignature);
      state = state.copyWith(status: OnboardingFlowStatus.mintSucceeded, isBusy: false, txHash: txHash);
      await refreshNftStatus();
    } catch (error) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage:
            'On-chain transaction failed. Connect a browser wallet and approve the request, or provide a wallet-enabled RPC. Error: $error',
      );
    }
  }

  Future<void> completeOnboarding() async {
    final identity = await ref.read(identityStoreProvider.future);
    await identity.setOnboardingCompleted(true);
    ref.invalidate(onboardingCompletedProvider);
    state = state.copyWith(status: OnboardingFlowStatus.onboardingCompleted, hasCompleted: true);
  }
}

final onboardingControllerProvider = NotifierProvider<OnboardingController, OnboardingState>(() {
  return OnboardingController();
});
