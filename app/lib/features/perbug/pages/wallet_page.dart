import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../../../core/identity/identity_provider.dart';
import '../chain/perbug_chain_providers.dart';

class PerbugWalletPage extends ConsumerStatefulWidget {
  const PerbugWalletPage({super.key});

  @override
  ConsumerState<PerbugWalletPage> createState() => _PerbugWalletPageState();
}

class _PerbugWalletPageState extends ConsumerState<PerbugWalletPage> {
  final TextEditingController _addressController = TextEditingController();
  String? _message;

  @override
  void initState() {
    super.initState();
    final wallet = ref.read(walletAddressProvider);
    _addressController.text = wallet ?? '';
  }

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletAddressProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Wallet Address',
          subtitle: 'Store a wallet address for identity and tree ownership lookups only. No wallet connect or signing in-app.',
          badge: AppPill(label: 'Address storage only', icon: Icons.badge_outlined),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Saved wallet address', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: '0x... wallet address',
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: _saveWalletAddress,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save address'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _clearWalletAddress,
                    icon: const Icon(Icons.clear_outlined),
                    label: const Text('Clear saved address'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SelectableText('Current value: ${wallet?.trim().isNotEmpty == true ? wallet : 'None saved'}'),
              if (_message != null) ...[
                const SizedBox(height: 8),
                Text(_message!),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _saveWalletAddress() async {
    final value = _addressController.text.trim();
    final store = await ref.read(identityStoreProvider.future);
    await store.setWalletSessionAddress(value.isEmpty ? null : value);
    ref.read(walletAddressProvider.notifier).state = value.isEmpty ? null : value;
    if (!mounted) return;
    setState(() {
      _message = value.isEmpty ? 'Cleared wallet address.' : 'Wallet address saved.';
    });
  }

  Future<void> _clearWalletAddress() async {
    _addressController.clear();
    await _saveWalletAddress();
  }
}
