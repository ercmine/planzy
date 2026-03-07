import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/identity/identity_provider.dart';
import '../providers/app_providers.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class OurPlanPlanApp extends ConsumerWidget {
  const OurPlanPlanApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(localStoreProvider);
    ref.watch(userIdProvider);
    ref.watch(onboardingCompletedProvider);

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'OurPlanPlan',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
