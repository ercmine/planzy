import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../dryad/chain/seed_codec.dart';
import 'onboarding_controller.dart';
import 'onboarding_state.dart';
import 'onboarding_widgets.dart';

class OnboardingIntroPage extends ConsumerStatefulWidget {
  const OnboardingIntroPage({super.key});

  @override
  ConsumerState<OnboardingIntroPage> createState() => _OnboardingIntroPageState();
}

class _OnboardingIntroPageState extends ConsumerState<OnboardingIntroPage> {
  final _walletController = TextEditingController();
  final _seedController = TextEditingController();
  bool _seedTouched = false;

  @override
  void dispose() {
    _walletController.dispose();
    _seedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final config = ref.watch(dryadContractConfigProvider);
    final seedValidation = validatePlantSeed(_seedController.text);
    final showSeedError = _seedTouched && !seedValidation.isValid;

    if (_walletController.text != state.walletAddress) {
      _walletController.value = _walletController.value.copyWith(
        text: state.walletAddress,
        selection: TextSelection.collapsed(offset: state.walletAddress.length),
      );
    }

    if (state.hasCompleted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/');
      });
    }

    return OnboardingScaffold(
      showBackButton: false,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Welcome to Dryad', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.s),
            Text(
              'Connect your Ethereum wallet first, verify mainnet, and load your real on-chain Grove NFT artwork. You can skip for now if needed.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.m),
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Network: ${config.networkName} (${config.chainId})'),
                const SizedBox(height: 4),
                SelectableText('Contract: ${config.groveNftAddress}'),
              ]),
            ),
            const SizedBox(height: AppSpacing.m),
            PrimaryButton(
              label: 'Connect MetaMask',
              onPressed: state.isBusy ? null : () => _connectWallet('metamask'),
              isLoading: state.isBusy,
            ),
            const SizedBox(height: AppSpacing.s),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SecondaryButton(label: 'Connect Phantom (EVM)', onPressed: state.isBusy ? null : () => _connectWallet('phantom')),
                SecondaryButton(
                  label: 'Connect Coinbase Wallet',
                  onPressed: state.isBusy ? null : () => _connectWallet('coinbase'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s),
            const Text('or paste an address manually'),
            const SizedBox(height: AppSpacing.s),
            TextField(
              controller: _walletController,
              decoration: const InputDecoration(
                labelText: 'Wallet address',
                hintText: '0x...',
              ),
              onChanged: ref.read(onboardingControllerProvider.notifier).setWalletAddress,
            ),
            const SizedBox(height: AppSpacing.s),
            PrimaryButton(
              label: 'Check wallet and NFT',
              onPressed: state.isBusy ? null : ref.read(onboardingControllerProvider.notifier).refreshNftStatus,
              isLoading: state.isBusy,
            ),
            if (state.status == OnboardingFlowStatus.nftNotMinted) ...[
              const SizedBox(height: AppSpacing.s),
              AppCard(
                tone: AppCardTone.featured,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Plant seed', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.xs),
                    const Text(
                      'Your seed is submitted on-chain to plant(bytes32). Enter up to 32 UTF-8 bytes, or paste a 0x-prefixed bytes32 value.',
                    ),
                    const SizedBox(height: AppSpacing.s),
                    TextField(
                      controller: _seedController,
                      decoration: const InputDecoration(
                        labelText: 'Seed',
                        hintText: 'e.g. solstice-grove-01 or 0x…64 hex chars',
                      ),
                      onChanged: (_) {
                        setState(() {
                          _seedTouched = true;
                        });
                      },
                    ),
                    if (showSeedError) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(seedValidation.errorMessage ?? 'Invalid seed.', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.s),
              SecondaryButton(
                label: 'Submit on-chain plant transaction',
                onPressed: state.isBusy || !seedValidation.isValid
                    ? null
                    : () => ref.read(onboardingControllerProvider.notifier).mintNft(seedInput: _seedController.text),
              ),
            ],
            if (state.errorMessage != null) ...[
              const SizedBox(height: AppSpacing.s),
              Text(state.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: AppSpacing.m),
            if (state.snapshot?.artwork != null)
              _ArtworkCard(svg: state.snapshot?.artwork?.svgMarkup, imageSource: state.snapshot?.artwork?.imageSource)
            else
              const AppCard(child: Text('No NFT artwork loaded yet.')),
            const SizedBox(height: AppSpacing.m),
            PrimaryButton(
              label: 'Continue with connected wallet',
              onPressed: state.walletAddress.isEmpty || state.isBusy
                  ? null
                  : () async {
                      await ref.read(onboardingControllerProvider.notifier).completeOnboarding();
                      if (mounted) context.go('/');
                    },
            ),
            const SizedBox(height: AppSpacing.s),
            SecondaryButton(
              label: 'Skip and continue',
              onPressed: state.isBusy
                  ? null
                  : () async {
                      await ref.read(onboardingControllerProvider.notifier).completeOnboarding();
                      if (mounted) context.go('/');
                    },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _connectWallet(String walletId) async {
    final connector = ref.read(walletConnectorProvider);
    final controller = ref.read(onboardingControllerProvider.notifier);
    if (!connector.isAvailable) {
      controller.state = controller.state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        errorMessage: _missingWalletMessage(),
      );
      return;
    }

    if (!connector.isWalletInstalled(walletId)) {
      controller.state = controller.state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        errorMessage: _walletNotDetectedMessage(walletId),
      );
      return;
    }

    controller.state = controller.state.copyWith(isBusy: true, clearError: true);
    try {
      final account = await connector.connectWallet(walletId: walletId);
      controller.setWalletAddress(account);
      controller.state = controller.state.copyWith(isBusy: false, status: OnboardingFlowStatus.walletConnected);
    } catch (error) {
      controller.state = controller.state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage: 'Wallet connection failed: $error',
      );
    }
  }

  String _missingWalletMessage() {
    if (kIsWeb) {
      return 'No wallet provider detected in this browser. Install MetaMask, Phantom EVM, or Coinbase Wallet extension.';
    }
    return 'No wallet app detected on this phone. Install/open MetaMask, Phantom, or Coinbase Wallet and try again.';
  }

  String _walletNotDetectedMessage(String walletId) {
    if (kIsWeb) {
      return '$walletId is not installed in this browser.';
    }
    return '$walletId app is not detected on this phone.';
  }
}

class _ArtworkCard extends StatelessWidget {
  const _ArtworkCard({required this.svg, required this.imageSource});

  final String? svg;
  final String? imageSource;

  @override
  Widget build(BuildContext context) {
    Widget preview;
    if (svg != null) {
      preview = SvgPicture.string(svg!, height: 220);
    } else if ((imageSource ?? '').startsWith('data:image/')) {
      final payload = imageSource!.split(',').last;
      preview = Image.memory(base64.decode(payload), height: 220, fit: BoxFit.contain);
    } else {
      preview = const Text('NFT metadata did not include renderable SVG.');
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Live contract artwork', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.s),
          Center(child: preview),
        ],
      ),
    );
  }
}
