import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../config/dryad_chain_config.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../providers/app_providers.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../dryad/chain/seed_codec.dart';
import 'onboarding_controller.dart';
import 'onboarding_state.dart';
import 'onboarding_widgets.dart';

enum _OnboardingStep { wallet, location }

class OnboardingIntroPage extends ConsumerStatefulWidget {
  const OnboardingIntroPage({super.key});

  @override
  ConsumerState<OnboardingIntroPage> createState() => _OnboardingIntroPageState();
}

class _OnboardingIntroPageState extends ConsumerState<OnboardingIntroPage> {
  final _walletController = TextEditingController();
  final _seedController = TextEditingController();
  bool _seedTouched = false;
  _OnboardingStep _step = _OnboardingStep.wallet;

  @override
  void dispose() {
    _walletController.dispose();
    _seedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final locationState = ref.watch(locationControllerProvider);
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
        child: _step == _OnboardingStep.wallet
            ? _buildWalletStep(context, state, config, seedValidation, showSeedError)
            : _buildLocationStep(context, locationState),
      ),
    );
  }

  Widget _buildWalletStep(
    BuildContext context,
    OnboardingState state,
    DryadContractConfig config,
    SeedValidationResult seedValidation,
    bool showSeedError,
  ) {
    return Column(
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
          label: 'Continue',
          onPressed: state.isBusy ? null : () => setState(() => _step = _OnboardingStep.location),
        ),
      ],
    );
  }

  Widget _buildLocationStep(BuildContext context, LocationControllerState locationState) {
    final isLoading = locationState.status == LocationStatus.loading;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Enable location', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.s),
        const Text(
          'Location helps us discover nearby plans and personalize your map. You can change this later in Settings.',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.m),
        const PermissionInfoCard(
          icon: Icons.my_location,
          title: 'Nearby recommendations',
          description: 'Allow While Using App to see places and plans that match where you are.',
        ),
        const SizedBox(height: AppSpacing.s),
        const PermissionInfoCard(
          icon: Icons.lock_outline,
          title: 'You stay in control',
          description: 'You can revoke permission anytime in iOS/Android settings.',
        ),
        if (locationState.errorMessage != null) ...[
          const SizedBox(height: AppSpacing.s),
          Text(locationState.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        if (locationState.effectiveLocation != null) ...[
          const SizedBox(height: AppSpacing.s),
          Text(
            'Location ready: ${locationState.effectiveLocation!.lat.toStringAsFixed(4)}, ${locationState.effectiveLocation!.lng.toStringAsFixed(4)}',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
        const SizedBox(height: AppSpacing.m),
        PrimaryButton(
          label: 'Enable location',
          onPressed: isLoading ? null : _requestLocation,
          isLoading: isLoading,
        ),
        const SizedBox(height: AppSpacing.s),
        if (locationState.lastPermissionResult?.canOpenAppSettings == true)
          SecondaryButton(
            label: 'Open app settings',
            onPressed: _openAppSettings,
          )
        else if (locationState.lastPermissionResult?.canOpenLocationSettings == true)
          SecondaryButton(
            label: 'Open location settings',
            onPressed: _openLocationSettings,
          ),
        const SizedBox(height: AppSpacing.s),
        SecondaryButton(
          label: 'Back',
          onPressed: () => setState(() => _step = _OnboardingStep.wallet),
        ),
        const SizedBox(height: AppSpacing.s),
        PrimaryButton(
          label: 'Finish onboarding',
          onPressed: () async {
            await ref.read(onboardingControllerProvider.notifier).completeOnboarding();
            if (mounted) context.go('/');
          },
        ),
      ],
    );
  }

  Future<void> _requestLocation() {
    return ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
  }

  Future<void> _openAppSettings() async {
    await ref.read(locationPermissionServiceProvider).openAppSettings();
  }

  Future<void> _openLocationSettings() async {
    await ref.read(locationPermissionServiceProvider).openLocationSettings();
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
