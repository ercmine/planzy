import 'package:flutter/material.dart';

import '../../core/widgets/app_back_button.dart';
import '../theme/spacing.dart';
import '../theme/widgets.dart';
import 'logo.dart';

class AppIconPreviewPage extends StatelessWidget {
  const AppIconPreviewPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Dryad Logo QA'),
      ),
      body: ListView(
        children: const [
          AppSectionHeader(
            title: 'Mark + wordmark',
            subtitle: 'Preview across light and dark surfaces.',
          ),
          SizedBox(height: AppSpacing.m),
          _PreviewTile(size: 24),
          _PreviewTile(size: 48),
          _PreviewTile(size: 96),
          _PreviewTile(size: 192),
        ],
      ),
    );
  }
}

class _PreviewTile extends StatelessWidget {
  const _PreviewTile({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.m),
      child: AppCard(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            DryadLogo(size: size, variant: DryadLogoVariant.markOnly),
            DryadLogo(size: size * 0.75, variant: DryadLogoVariant.withWordmark),
          ],
        ),
      ),
    );
  }
}
