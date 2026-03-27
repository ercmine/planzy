import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

enum _OnboardingStep { briefing, location }

class OnboardingIntroPage extends ConsumerStatefulWidget {
  const OnboardingIntroPage({super.key});

  @override
  ConsumerState<OnboardingIntroPage> createState() => _OnboardingIntroPageState();
}

class _OnboardingIntroPageState extends ConsumerState<OnboardingIntroPage> {
  _OnboardingStep _step = _OnboardingStep.briefing;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final locationState = ref.watch(locationControllerProvider);

    if (state.hasCompleted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/');
      });
    }

    return OnboardingScaffold(
      showBackButton: _step == _OnboardingStep.location,
      onBackPressed: _step == _OnboardingStep.location ? () => setState(() => _step = _OnboardingStep.briefing) : null,
      child: SingleChildScrollView(
        child: _step == _OnboardingStep.briefing
            ? _buildBriefing(context)
            : _buildLocationStep(context, locationState, state.isBusy),
      ),
    );
  }

  Widget _buildBriefing(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Welcome to Perbug', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.s),
        const Text(
          'Perbug is a real-world exploration game. You hop between real location nodes, spend energy, and progress across regions.',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.m),
        const PermissionInfoCard(
          icon: Icons.public,
          title: 'Real geography board',
          description: 'Nodes are derived from real map data so each jump is grounded in actual places.',
        ),
        const SizedBox(height: AppSpacing.s),
        const PermissionInfoCard(
          icon: Icons.bolt,
          title: 'Energy drives progression',
          description: 'Energy is earned through gameplay loops and spent to jump to new nearby nodes.',
        ),
        const SizedBox(height: AppSpacing.s),
        const PermissionInfoCard(
          icon: Icons.extension,
          title: 'Puzzle-ready nodes',
          description: 'Challenges and puzzles plug into node states later without changing your progression map.',
        ),
        const SizedBox(height: AppSpacing.m),
        PrimaryButton(label: 'Start expedition', onPressed: () => setState(() => _step = _OnboardingStep.location)),
      ],
    );
  }

  Widget _buildLocationStep(BuildContext context, LocationControllerState locationState, bool busy) {
    final isLoading = locationState.status == LocationStatus.loading;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Enable location anchor', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.s),
        const Text(
          'We use your location as your starting anchor to fetch nearby real nodes with geocoding data.',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.m),
        PrimaryButton(
          label: 'Allow location',
          isLoading: isLoading,
          onPressed: isLoading ? null : () => ref.read(locationControllerProvider.notifier).requestPermissionAndRefresh(),
        ),
        if (locationState.effectiveLocation case final AppLocation effective) ...[
          const SizedBox(height: AppSpacing.s),
          Text(
            'Anchor ready: ${effective.lat.toStringAsFixed(4)}, ${effective.lng.toStringAsFixed(4)}',
            textAlign: TextAlign.center,
          ),
        ],
        if (locationState.errorMessage != null) ...[
          const SizedBox(height: AppSpacing.s),
          Text(locationState.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        const SizedBox(height: AppSpacing.m),
        PrimaryButton(
          label: 'Enter Perbug world',
          isLoading: busy,
          onPressed: busy ? null : () => ref.read(onboardingControllerProvider.notifier).completeOnboarding(),
        ),
      ],
    );
  }
}
