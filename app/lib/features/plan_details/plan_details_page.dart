import 'package:flutter/material.dart';

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

  const PlanDetailsPage({
    super.key,
    required this.plan,
  });

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
        ],
      ),
    );
  }
}
