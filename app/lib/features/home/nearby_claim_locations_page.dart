import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_models.dart';
import '../perbug/chain/perbug_chain_providers.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';

class NearbyClaimLocationsPage extends ConsumerWidget {
  const NearbyClaimLocationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    final controller = ref.read(locationClaimControllerProvider.notifier);
    final walletAddress = ref.watch(walletAddressProvider);
    final maskedWallet = walletAddress == null || walletAddress.isEmpty
        ? null
        : '${walletAddress.substring(0, walletAddress.length > 7 ? 7 : walletAddress.length)}…${walletAddress.substring(walletAddress.length > 4 ? walletAddress.length - 4 : 0)}';

    return Scaffold(
      appBar: AppBar(title: const Text('Nearby claimable locations')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              _locationStatusText(state.permissionStatus),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              maskedWallet == null
                  ? 'Add your Perbug wallet address to claim payouts.'
                  : 'Claim payouts will be sent to: $maskedWallet',
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: state.claimables.length,
              itemBuilder: (context, index) {
                final item = state.claimables[index];
                return Card(
                  child: ListTile(
                    title: Text(item.location.displayName),
                    subtitle: Text(
                      '${item.location.category} • ${item.distanceMeters.round()}m away • '
                      'claim radius ${item.location.claimRadiusMeters.round()}m • '
                      'Reward: ${item.currentReward.toStringAsFixed(6)} Perbug to wallet',
                    ),
                    trailing: _ClaimActionButton(item: item, controller: controller, hasWalletAddress: maskedWallet != null),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _locationStatusText(LocationStatus status) => switch (status) {
        LocationStatus.loading => 'Finding your location…',
        LocationStatus.ready => 'Nearby locations sorted by distance',
        LocationStatus.permissionDenied => 'Permission denied',
        LocationStatus.serviceDisabled => 'Location services disabled',
        LocationStatus.error => 'Location unavailable',
      };
}

class _ClaimActionButton extends StatelessWidget {
  const _ClaimActionButton({required this.item, required this.controller, required this.hasWalletAddress});

  final ClaimableLocationView item;
  final LocationClaimController controller;
  final bool hasWalletAddress;

  @override
  Widget build(BuildContext context) {
    final cooldownLabel = item.cooldownUntil == null
        ? null
        : _formatRemaining(item.cooldownUntil!);
    return switch (item.flowState) {
      ClaimFlowState.visited || ClaimFlowState.claimReady => FilledButton(
          onPressed: hasWalletAddress ? () => controller.claimInstantly(item.location.id) : null,
          child: Text(hasWalletAddress ? 'Claim Perbug to Wallet' : 'Add Wallet Address to Claim'),
        ),
      ClaimFlowState.cooldown => Chip(label: Text(cooldownLabel == null ? 'Cooldown' : 'Cooldown $cooldownLabel')),
      ClaimFlowState.claimSuccess => const Chip(label: Text('Payout Submitted')),
      _ => Chip(label: Text('Move within ${item.location.claimRadiusMeters.round()}m')),
    };
  }

  String _formatRemaining(DateTime cooldownUntil) {
    final remaining = cooldownUntil.difference(DateTime.now().toUtc());
    if (remaining.isNegative) return 'done';
    final h = remaining.inHours;
    final m = remaining.inMinutes.remainder(60);
    return '${h}h ${m}m';
  }
}
