import 'package:flutter/material.dart';

import 'api/client.dart';
import 'features/plan_details/plan_details_page.dart';

void main() {
  runApp(const PlanzyApp());
}

class PlanzyApp extends StatelessWidget {
  const PlanzyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:8080',
      userId: 'demo-user-1',
    );

    final samplePlan = PlanViewModel(
      id: 'plan-venue-1',
      title: 'Downtown Theater Night',
      sourceId: 'google:venue:123',
      provider: 'google',
      kind: 'theater',
      address: '123 Main St, Springfield',
      deepLinks: const {
        'maps': 'https://maps.google.com',
        'website': 'https://example.com',
        'booking': 'https://example.com/booking',
      },
    );

    return MaterialApp(
      title: 'Planzy Demo',
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      routes: {
        '/': (_) => PlanDetailsPage(plan: samplePlan, apiClient: apiClient),
      },
    );
  }
}
