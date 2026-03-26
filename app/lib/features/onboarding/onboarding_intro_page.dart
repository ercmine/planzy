import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../dryad/chain/dryad_chain_providers.dart';
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

  @override
  void dispose() {
    _walletController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final config = ref.watch(dryadContractConfigProvider);

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
              label: 'Connect browser wallet',
              onPressed: state.isBusy ? null : ref.read(onboardingControllerProvider.notifier).connectWallet,
              isLoading: state.isBusy,
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
              SecondaryButton(
                label: 'Submit on-chain plant transaction',
                onPressed: state.isBusy ? null : ref.read(onboardingControllerProvider.notifier).mintNft,
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
