import 'package:flutter/material.dart';

import '../../api/client.dart';
import 'claim_venue_sheet.dart';

class PlanViewModel {
  final String id;
  final String title;
  final String sourceId;
  final String provider;
  final String? kind;
  final String? address;
  final Map<String, String> deepLinks;

  PlanViewModel({
    required this.id,
    required this.title,
    required this.sourceId,
    required this.provider,
    this.kind,
    this.address,
    this.deepLinks = const {},
  });
}

class PlanDetailsPage extends StatelessWidget {
  final PlanViewModel plan;
  final ApiClient apiClient;

  const PlanDetailsPage({
    super.key,
    required this.plan,
    required this.apiClient,
  });

  bool get _isVenueLike {
    final providerLower = plan.provider.toLowerCase();
    if (providerLower == 'google' || providerLower == 'yelp') {
      return true;
    }
    if ((plan.kind ?? '').toLowerCase() == 'theater') {
      return true;
    }
    return (plan.address ?? '').trim().isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plan details')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(plan.title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text('Provider: ${plan.provider}'),
          Text('Source ID: ${plan.sourceId}'),
          if (plan.address != null) Text('Address: ${plan.address}'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: plan.deepLinks.entries
                .map(
                  (entry) => OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.open_in_new),
                    label: Text(entry.key),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),
          if (_isVenueLike)
            ElevatedButton.icon(
              onPressed: () {
                showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => ClaimVenueSheet(
                    apiClient: apiClient,
                    venueId: plan.sourceId,
                    provider: plan.provider,
                    planId: plan.id,
                  ),
                );
              },
              icon: const Icon(Icons.verified_user_outlined),
              label: const Text('Claim this venue'),
            ),
        ],
      ),
    );
  }
}
