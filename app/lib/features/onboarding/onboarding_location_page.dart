import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../providers/app_providers.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

class OnboardingLocationPage extends ConsumerStatefulWidget {
  const OnboardingLocationPage({super.key});

  @override
  ConsumerState<OnboardingLocationPage> createState() => _OnboardingLocationPageState();
}

class _OnboardingLocationPageState extends ConsumerState<OnboardingLocationPage> {
  final _cityController = TextEditingController();
  final _regionController = TextEditingController();

  @override
  void dispose() {
    _cityController.dispose();
    _regionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final useCurrentLocation = state.useCurrentLocation;

    return OnboardingScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Set your discovery city', style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.s),
          Text('Pick live location or set a city manually so Local + Regional ranking feels relevant from day one.', textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.l),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: true, icon: Icon(Icons.my_location), label: Text('Live location')),
              ButtonSegment(value: false, icon: Icon(Icons.location_city), label: Text('Manual city')),
            ],
            selected: {useCurrentLocation},
            onSelectionChanged: (v) => ref.read(onboardingControllerProvider.notifier).updateLocationMode(v.first),
          ),
          const SizedBox(height: AppSpacing.m),
          if (useCurrentLocation)
            PrimaryButton(
              label: 'Enable location access',
              onPressed: () => ref.read(locationControllerProvider.notifier).requestPermissionAndLoad(),
              icon: const Icon(Icons.near_me_rounded),
            )
          else ...[
            TextField(
              controller: _cityController,
              decoration: const InputDecoration(labelText: 'City'),
              onChanged: ref.read(onboardingControllerProvider.notifier).updateCity,
            ),
            const SizedBox(height: AppSpacing.s),
            TextField(
              controller: _regionController,
              decoration: const InputDecoration(labelText: 'Region / State'),
              onChanged: ref.read(onboardingControllerProvider.notifier).updateRegion,
            ),
          ],
          const Spacer(),
          PrimaryButton(label: 'Continue', onPressed: () => context.go('/onboarding/interests'), icon: const Icon(Icons.arrow_forward_rounded)),
        ],
      ),
    );
  }
}
