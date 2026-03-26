import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';

class RoleHubPage extends StatelessWidget {
  const RoleHubPage({required this.family, this.entitlementFamily, super.key});

  final String family;
  final String? entitlementFamily;

  @override
  Widget build(BuildContext context) {
    final normalized = family.toUpperCase();

    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: Text(normalized == 'ADMIN' ? 'Creator Community' : '$family Hub'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          const AppSectionHeader(
            title: 'Create freely on Dryad',
            subtitle: 'Every signed-in user can post reviews, upload media, build guides, and follow creators.',
          ),
          const SizedBox(height: AppSpacing.m),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Creator-first capabilities'),
                SizedBox(height: AppSpacing.s),
                ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.rate_review_outlined), title: Text('Write text reviews'), subtitle: Text('Post trusted local reviews without tier limits.')),
                ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.photo_camera_back_outlined), title: Text('Upload photo and video reviews'), subtitle: Text('Share visual proof from real visits.')),
                ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.collections_bookmark_outlined), title: Text('Build guides and collections'), subtitle: Text('Curate and publish shareable local lists.')),
                ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.groups_2_outlined), title: Text('Grow your audience'), subtitle: Text('Follow creators and get followed in feed surfaces.')),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          const AppCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.campaign_outlined),
              title: Text('Discovery monetization'),
              subtitle: Text('Ads are enabled for everyone and appear every 10 cards with graceful no-inventory fallback.'),
            ),
          ),
        ],
      ),
    );
  }
}
