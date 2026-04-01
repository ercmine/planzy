import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/rpg_bar.dart';
import '../../app/theme/widgets.dart';
import '../../core/identity/identity_provider.dart';
import '../../providers/app_providers.dart';
import '../perbug/chain/perbug_chain_providers.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';
import 'perbug_economy_models.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugNodeDetailsPage extends ConsumerWidget {
  const PerbugNodeDetailsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final node = state.currentNode;
    final controller = ref.read(perbugGameControllerProvider.notifier);

    return _PerbugGameShell(
      title: 'Node Intel',
      subtitle: 'Map-native mission dossier',
      body: node == null
          ? const _EmptyInfo(message: 'No node selected. Open the map and pick a destination first.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatStrip(items: [
                  _StatItem('Type', node.nodeType.name.toUpperCase()),
                  _StatItem('Difficulty', 'T${node.difficulty}'),
                  _StatItem('Travel', '${node.movementCost}⚡'),
                ]),
                const SizedBox(height: 12),
                _LorePanel(
                  title: node.label,
                  subtitle: '${node.neighborhood}, ${node.city}',
                  body: 'District signal confirms ${node.nodeType.name} activity. Deploy to resolve and recover node rewards.',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    RpgBarButton(
                      onPressed: () {
                        controller.launchEncounter();
                        context.go(AppRoutes.encounter);
                      },
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: 'Enter Encounter',
                    ),
                    RpgBarButton(
                      onPressed: () => context.go(AppRoutes.liveMap),
                      icon: const Icon(Icons.map_outlined),
                      label: 'Back to World',
                      variant: RpgButtonVariant.secondary,
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class PerbugEncounterPage extends ConsumerWidget {
  const PerbugEncounterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final encounter = state.activeEncounter;
    return _PerbugGameShell(
      title: 'Encounter Relay',
      subtitle: 'Resolve tactical outcomes',
      body: encounter == null
          ? const _EmptyInfo(message: 'No active encounter. Launch one from Node Intel.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatStrip(items: [
                  _StatItem('Type', encounter.type.name),
                  _StatItem('Tier', encounter.difficultyTier),
                  _StatItem('Status', encounter.status.name),
                ]),
                const SizedBox(height: 12),
                _LorePanel(
                  title: 'Combat Feed',
                  subtitle: 'Live tactical packet',
                  body: 'Resolve the operation to claim XP, Perbug currency, and progression boosts.',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    RpgBarButton(
                      onPressed: () {
                        controller.resolveEncounter(succeeded: true);
                        context.go(AppRoutes.progression);
                      },
                      label: 'Claim Reward',
                    ),
                    RpgBarButton(
                      onPressed: () {
                        controller.resolveEncounter(succeeded: false);
                        context.go(AppRoutes.liveMap);
                      },
                      label: 'Retreat',
                      variant: RpgButtonVariant.secondary,
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class PerbugSquadPage extends ConsumerStatefulWidget {
  const PerbugSquadPage({super.key});

  @override
  ConsumerState<PerbugSquadPage> createState() => _PerbugSquadPageState();
}

class _PerbugSquadPageState extends ConsumerState<PerbugSquadPage> {
  static const _addressRequiredMessage = 'Enter a Perbug wallet address before saving.';
  static const _addressInvalidMessage = 'Enter a valid Perbug wallet address (pb1... or 0x...).';

  final _walletController = TextEditingController();
  bool _saving = false;
  bool _sending = false;
  String? _statusMessage;
  String? _fieldMessage;
  String? _txid;

  @override
  void initState() {
    super.initState();
    final walletAddress = ref.read(walletAddressProvider);
    if (walletAddress != null && walletAddress.trim().isNotEmpty) {
      _walletController.text = walletAddress;
    }
    unawaited(_loadPayoutAddress());
  }

  @override
  void dispose() {
    _walletController.dispose();
    super.dispose();
  }

  bool _isValidPerbugAddress(String value) {
    final candidate = value.trim();
    if (candidate.startsWith('pb1') && candidate.length >= 20) return true;
    return RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(candidate);
  }

  String? _validateWalletAddress(String value) {
    final candidate = value.trim();
    if (candidate.isEmpty) return _addressRequiredMessage;
    if (!_isValidPerbugAddress(candidate)) return _addressInvalidMessage;
    return null;
  }

  Future<void> _loadPayoutAddress() async {
    try {
      final apiClient = await ref.read(apiClientProvider.future);
      final payload = await apiClient.getJson('/v1/perbug-economy/me');
      final payoutProfile = (payload['payoutProfile'] as Map?)?.cast<String, dynamic>();
      final payoutAddress = payoutProfile?['payoutAddress']?.toString().trim();
      if (payoutAddress == null || payoutAddress.isEmpty || !mounted) {
        return;
      }
      setState(() => _walletController.text = payoutAddress);
      final store = await ref.read(identityStoreProvider.future);
      await store.setWalletSessionAddress(payoutAddress);
      ref.read(walletAddressProvider.notifier).state = payoutAddress;
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(walletAddress: payoutAddress);
    } catch (_) {
      // Best-effort hydration from backend payout profile.
    }
  }

  Future<void> _saveWalletAddress() async {
    final walletAddress = _walletController.text.trim();
    final validationMessage = _validateWalletAddress(walletAddress);
    if (validationMessage != null) {
      setState(() {
        _fieldMessage = validationMessage;
        _statusMessage = null;
      });
      return;
    }

    setState(() {
      _saving = true;
      _statusMessage = null;
      _fieldMessage = null;
    });

    try {
      final store = await ref.read(identityStoreProvider.future);
      await store.setWalletSessionAddress(walletAddress);
      ref.read(walletAddressProvider.notifier).state = walletAddress;
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(walletAddress: walletAddress);

      final apiClient = await ref.read(apiClientProvider.future);
      await apiClient.putJson('/v1/perbug-economy/payout-address', body: {'payoutAddress': walletAddress});

      if (!mounted) return;
      setState(() => _statusMessage = 'Perbug wallet address saved.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Saving wallet address failed: $error');
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _sendClaimedPerbug({required double claimBalance}) async {
    final destination = _walletController.text.trim();
    if (destination.isEmpty) {
      setState(() => _statusMessage = 'Save your Perbug wallet address first.');
      return;
    }
    if (claimBalance <= 0) {
      setState(() => _statusMessage = 'No claimed Perbug available to send.');
      return;
    }

    setState(() {
      _sending = true;
      _statusMessage = null;
      _txid = null;
    });

    try {
      final apiClient = await ref.read(apiClientProvider.future);
      final response = await apiClient.postJson('/v1/perbug-economy/withdraw', body: {
        'toAddress': destination,
        'amountPerbug': claimBalance,
        'idempotencyKey': 'send_claimed_${DateTime.now().microsecondsSinceEpoch}',
      });
      final withdrawal = (response['withdrawal'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      final txid = withdrawal['txid'] as String?;

      if (!mounted) return;
      setState(() {
        _txid = txid;
        _statusMessage = txid == null
            ? 'Claimed Perbug send requested to $destination.'
            : 'Claimed Perbug sent to $destination.';
      });
      unawaited(ref.read(postActionAdCoordinatorProvider).onWithdrawSuccess());
    } catch (error) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Sending claimed Perbug failed: $error');
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(locationClaimControllerProvider);
    final savedAddress = ref.watch(walletAddressProvider)?.trim();
    final hasSavedAddress = savedAddress != null && savedAddress.isNotEmpty;
    final canSave = !_saving && _validateWalletAddress(_walletController.text) == null;

    return _PerbugGameShell(
      title: 'Perbug Wallet',
      subtitle: 'Save payout destination and send claimed Perbug',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StatStrip(items: [
            _StatItem('Claimed', '${state.balance.toStringAsFixed(6)} Ⓟ'),
            _StatItem('Payouts', '${state.claimHistory.length}'),
            _StatItem('Pool Left', state.globalPool.remainingClaimableSupply.toStringAsFixed(2)),
          ]),
          const SizedBox(height: 12),
          _LorePanel(
            title: 'Saved Perbug Wallet Address',
            subtitle: hasSavedAddress ? 'Current: ${_prettyAddress(savedAddress)}' : 'Address required before sending',
            body: 'Save the wallet where claimed Perbug should be sent. This is the destination used when you tap Send to Wallet.',
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _walletController,
                  onChanged: (_) => setState(() => _fieldMessage = null),
                  decoration: InputDecoration(
                    labelText: 'Perbug wallet address',
                    hintText: 'Paste pb1... or 0x... address',
                    border: const OutlineInputBorder(),
                    errorText: _fieldMessage,
                  ),
                ),
                const SizedBox(height: 10),
                RpgBarButton(
                  onPressed: canSave ? _saveWalletAddress : null,
                  label: _saving ? 'Saving...' : 'Save Wallet Address',
                ),
              ],
            ),
          ),
          _LorePanel(
            title: 'Claimed Perbug Payout',
            subtitle: hasSavedAddress ? 'Destination ${_prettyAddress(savedAddress!)}' : 'Save wallet address first',
            body: 'Move your currently claimed Perbug balance to the saved wallet destination.',
            trailing: RpgBarButton(
              onPressed: _sending || !hasSavedAddress ? null : () => _sendClaimedPerbug(claimBalance: state.balance),
              label: _sending ? 'Sending...' : 'Send to Wallet',
            ),
          ),
          if (_statusMessage != null) ...[
            const SizedBox(height: 8),
            Text(_statusMessage!, style: Theme.of(context).textTheme.bodySmall),
          ],
          if (_txid != null) ...[
            const SizedBox(height: 6),
            SelectableText('txid: $_txid'),
          ],
        ],
      ),
    );
  }

  String _prettyAddress(String address) {
    if (address.length <= 16) return address;
    return '${address.substring(0, 8)}…${address.substring(address.length - 8)}';
  }
}

class PerbugInventoryPage extends ConsumerWidget {
  const PerbugInventoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    return _PerbugGameShell(
      title: 'Wallet Payout History',
      subtitle: 'Real Perbug payouts sent to wallet addresses',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Visited', '${state.claimables.where((e) => e.flowState == ClaimFlowState.visited || e.flowState == ClaimFlowState.cooldown).length}'),
            _StatItem('Payouts', '${state.claimHistory.length}'),
            _StatItem('Balance', '${state.balance}Ⓟ'),
          ]),
          const SizedBox(height: 12),
          for (final entry in state.claimHistory)
            _LorePanel(
              title: '${entry.reward.toStringAsFixed(6)} Perbug sent',
              subtitle: '${entry.locationName} • ${entry.createdAt.toLocal().toIso8601String().replaceFirst('T', ' ').substring(0, 16)}',
              body: 'To ${entry.destinationAddress} • Status ${entry.payoutStatus}${entry.txid == null ? '' : ' • txid ${entry.txid}'}',
            ),
        ],
      ),
    );
  }
}

class PerbugCraftingPage extends ConsumerWidget {
  const PerbugCraftingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);

    return _PerbugGameShell(
      title: 'Forge & Crafting',
      subtitle: 'Convert resources into power',
      body: Column(
        children: [
          for (final recipe in perbugCraftingRecipes)
            _LorePanel(
              title: recipe.label,
              subtitle: 'Unlock L${recipe.unlockLevel}',
              body: 'Cost ${recipe.perbugCost}Ⓟ + ${recipe.energyCost}⚡',
              trailing: RpgBarButton(
                height: 42,
                onPressed: state.progression.level >= recipe.unlockLevel ? () => controller.craftRecipe(recipe.id) : null,
                label: 'Craft',
              ),
            ),
        ],
      ),
    );
  }
}

class PerbugMarketplacePage extends ConsumerWidget {
  const PerbugMarketplacePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugGameShell(
      title: 'Marketplace Ledger',
      subtitle: 'Economy and transaction history',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Balance', '${state.economy.wallet.balance}Ⓟ'),
            _StatItem('Wallet', state.economy.walletLink.isConnected ? 'Connected' : 'Not linked'),
            _StatItem('Tx', '${state.economy.wallet.transactions.length}'),
          ]),
          const SizedBox(height: 12),
          for (final tx in state.economy.wallet.transactions.take(10))
            _LorePanel(
              title: tx.type.name,
              subtitle: tx.actionId ?? tx.id,
              body: '${tx.amount >= 0 ? '+' : ''}${tx.amount}Ⓟ • ${tx.createdAt.toIso8601String().replaceFirst('T', ' ').substring(0, 16)}',
            ),
        ],
      ),
    );
  }
}

class PerbugProgressionPage extends ConsumerWidget {
  const PerbugProgressionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    return _PerbugGameShell(
      title: 'Global Emission Pool',
      subtitle: '400,000,000 lifetime global cap',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Cap', '${state.globalPool.totalClaimableSupply.toStringAsFixed(0)}'),
            _StatItem('Claimed', '${state.globalPool.totalClaimedSupply.toStringAsFixed(6)}'),
            _StatItem('Remaining', '${state.globalPool.remainingClaimableSupply.toStringAsFixed(6)}'),
          ]),
          const SizedBox(height: 12),
          _LorePanel(
            title: 'Global supply accounting',
            subtitle: 'Deterministic lifetime pool',
            body: 'Single global cap 400,000,000. Every successful location claim debits remaining supply while local rewards keep halving per location.',
          ),
        ],
      ),
    );
  }
}

class PerbugWalletPage extends ConsumerStatefulWidget {
  const PerbugWalletPage({super.key});

  @override
  ConsumerState<PerbugWalletPage> createState() => _PerbugWalletPageState();
}

class _PerbugWalletPageState extends ConsumerState<PerbugWalletPage> {
  static const _addressRequiredMessage = 'Enter a Perbug wallet address before saving.';
  static const _addressInvalidMessage = 'Enter a valid Perbug wallet address (pb1... or 0x...).';

  final _walletLinkController = TextEditingController();
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();

  bool _withdrawing = false;
  bool _savingAddress = false;
  String? _statusMessage;
  String? _fieldMessage;
  String? _txid;

  @override
  void initState() {
    super.initState();
    final walletAddress = ref.read(walletAddressProvider);
    if (walletAddress != null && walletAddress.trim().isNotEmpty) {
      _walletLinkController.text = walletAddress;
      _addressController.text = walletAddress;
    }
    unawaited(_loadPayoutAddress());
  }

  @override
  void dispose() {
    _walletLinkController.dispose();
    _addressController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  bool _isValidPerbugAddress(String value) {
    final candidate = value.trim();
    if (candidate.startsWith('pb1') && candidate.length >= 20) return true;
    return RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(candidate);
  }

  String? _validateWalletAddress(String value) {
    final candidate = value.trim();
    if (candidate.isEmpty) return _addressRequiredMessage;
    if (!_isValidPerbugAddress(candidate)) return _addressInvalidMessage;
    return null;
  }

  Future<void> _loadPayoutAddress() async {
    try {
      final apiClient = await ref.read(apiClientProvider.future);
      final payload = await apiClient.getJson('/v1/perbug-economy/me');
      final payoutProfile = (payload['payoutProfile'] as Map?)?.cast<String, dynamic>();
      final payoutAddress = payoutProfile?['payoutAddress']?.toString().trim();
      if (payoutAddress == null || payoutAddress.isEmpty || !mounted) {
        return;
      }
      setState(() {
        _walletLinkController.text = payoutAddress;
        _addressController.text = payoutAddress;
      });
      final store = await ref.read(identityStoreProvider.future);
      await store.setWalletSessionAddress(payoutAddress);
      ref.read(walletAddressProvider.notifier).state = payoutAddress;
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(walletAddress: payoutAddress);
    } catch (_) {
      // Best-effort hydration from backend payout profile.
    }
  }

  Future<void> _saveWalletAddress() async {
    final walletAddress = _walletLinkController.text.trim();
    final validationMessage = _validateWalletAddress(walletAddress);
    if (validationMessage != null) {
      setState(() {
        _fieldMessage = validationMessage;
        _statusMessage = null;
      });
      return;
    }

    setState(() {
      _savingAddress = true;
      _statusMessage = null;
      _fieldMessage = null;
    });

    try {
      final store = await ref.read(identityStoreProvider.future);
      await store.setWalletSessionAddress(walletAddress);
      ref.read(walletAddressProvider.notifier).state = walletAddress;
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(walletAddress: walletAddress);

      final apiClient = await ref.read(apiClientProvider.future);
      await apiClient.putJson('/v1/perbug-economy/payout-address', body: {'payoutAddress': walletAddress});
      _addressController.text = walletAddress;

      if (!mounted) return;
      setState(() {
        _statusMessage = 'Payout wallet address saved. Future claims and withdrawals will be sent here.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Saving payout address failed: $error');
    } finally {
      if (mounted) {
        setState(() => _savingAddress = false);
      }
    }
  }

  Future<void> _withdraw({required int balance}) async {
    final toAddress = _addressController.text.trim();
    final requestedAmount = int.tryParse(_amountController.text.trim()) ?? balance;
    if (toAddress.isEmpty) {
      setState(() => _statusMessage = 'Set and save a payout wallet before withdrawing Perbug.');
      return;
    }
    if (requestedAmount <= 0 || balance <= 0) {
      setState(() => _statusMessage = 'No Perbug balance available to withdraw.');
      return;
    }
    if (requestedAmount > balance) {
      setState(() => _statusMessage = 'Amount exceeds your available balance.');
      return;
    }

    setState(() {
      _withdrawing = true;
      _statusMessage = null;
      _txid = null;
    });

    try {
      final apiClient = await ref.read(apiClientProvider.future);
      final response = await apiClient.postJson('/v1/perbug-economy/withdraw', body: {
        'toAddress': toAddress,
        'amountPerbug': requestedAmount,
        'idempotencyKey': 'wd_${DateTime.now().microsecondsSinceEpoch}',
      });
      final withdrawal = (response['withdrawal'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      final txid = withdrawal['txid'] as String?;
      if (!mounted) return;
      setState(() {
        _txid = txid;
        _statusMessage = txid == null
            ? 'Withdrawal submitted. Destination wallet: $toAddress.'
            : 'Withdrawal completed. Destination wallet: $toAddress.';
      });
      unawaited(ref.read(postActionAdCoordinatorProvider).onWithdrawSuccess());
    } catch (error) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Withdrawal failed: $error');
    } finally {
      if (mounted) {
        setState(() => _withdrawing = false);
      }
    }
  }

  Future<void> _copyAddress(String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    setState(() => _statusMessage = 'Copied payout wallet address.');
  }

  @override
  Widget build(BuildContext context) {
    final economy = ref.watch(perbugGameControllerProvider).economy;
    final savedAddress = ref.watch(walletAddressProvider)?.trim();
    final hasSavedAddress = savedAddress != null && savedAddress.isNotEmpty;
    final saveCandidate = _walletLinkController.text.trim();
    final canSave = !_savingAddress && _validateWalletAddress(saveCandidate) == null;

    return _PerbugGameShell(
      title: 'Perbug Payout Wallet',
      subtitle: 'Set where claims and withdrawals are sent',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            key: const Key('wallet-address-primary-card'),
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Perbug Wallet Address', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(
                  'Enter the Perbug wallet address where your rewards should be sent. Claims and withdrawals send real Perbug to this address. This app is not a wallet and does not hold your private keys.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const Key('wallet-address-input'),
                  controller: _walletLinkController,
                  minLines: 1,
                  maxLines: 2,
                  onChanged: (_) => setState(() => _fieldMessage = null),
                  decoration: InputDecoration(
                    labelText: 'Payout wallet address',
                    hintText: 'Paste pb1... or 0x... address',
                    border: const OutlineInputBorder(),
                    errorText: _fieldMessage,
                    helperText: hasSavedAddress
                        ? 'Current destination is shown below. Update this before your next claim/withdraw.'
                        : 'Required before claiming or withdrawing Perbug.',
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    RpgBarButton(
                      key: const Key('wallet-save-button'),
                      onPressed: canSave ? _saveWalletAddress : null,
                      label: _savingAddress ? 'Saving...' : hasSavedAddress ? 'Update Address' : 'Save Address',
                    ),
                    if (hasSavedAddress)
                      OutlinedButton.icon(
                        onPressed: () => _copyAddress(savedAddress),
                        icon: const Icon(Icons.copy_rounded),
                        label: const Text('Copy Current Address'),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                if (hasSavedAddress)
                  SelectableText(
                    'Current claim/withdraw destination: ${_prettyAddress(savedAddress)}',
                    key: const Key('wallet-current-destination'),
                  )
                else
                  const Text(
                    'Setup required: add your payout wallet address to enable claims and withdrawals.',
                    key: Key('wallet-empty-state-message'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _LorePanel(
            key: const Key('wallet-claim-withdraw-panel'),
            title: 'Claim and Withdraw to Destination Wallet',
            subtitle: hasSavedAddress ? 'Destination: ${_prettyAddress(savedAddress!)}' : 'Address required before payout actions',
            body: hasSavedAddress
                ? 'Claimed Perbug and withdrawals will be sent to your saved payout address. Changing it updates future payouts only.'
                : 'Add and save a payout wallet address above first. Claim and withdraw controls remain secondary until setup is complete.',
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Available balance: ${economy.wallet.balance} PERBUG'),
                const SizedBox(height: 8),
                TextField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Amount to withdraw',
                    hintText: '${economy.wallet.balance}',
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                RpgBarButton(
                  key: const Key('wallet-withdraw-button'),
                  onPressed: _withdrawing || !hasSavedAddress ? null : () => _withdraw(balance: economy.wallet.balance),
                  label: _withdrawing ? 'Withdrawing...' : 'Withdraw Perbug',
                ),
                if (_statusMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(_statusMessage!, style: Theme.of(context).textTheme.bodySmall),
                ],
                if (_txid != null) ...[
                  const SizedBox(height: 6),
                  SelectableText('txid: $_txid'),
                ],
              ],
            ),
          ),
          _LorePanel(
            key: const Key('wallet-history-panel'),
            title: 'Recent Perbug Activity',
            subtitle: 'Secondary activity history',
            body: 'Use this for quick status checks after setting your payout destination above.',
            trailing: economy.wallet.transactions.isEmpty
                ? const Text('No Perbug transactions yet.')
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: economy.wallet.transactions.take(5).map((tx) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('${tx.type.name.toUpperCase()} ${tx.amount} • ${tx.createdAt.toIso8601String()}'),
                      );
                    }).toList(growable: false),
                  ),
          ),
          const SizedBox(height: 8),
          RpgBarButton(
            onPressed: () => context.go(AppRoutes.liveMap),
            label: 'Return to World Map',
            variant: RpgButtonVariant.secondary,
          ),
        ],
      ),
    );
  }

  String _prettyAddress(String address) {
    if (address.length <= 16) return address;
    return '${address.substring(0, 8)}…${address.substring(address.length - 8)}';
  }
}

class _PerbugGameShell extends StatelessWidget {
  const _PerbugGameShell({required this.title, required this.subtitle, required this.body});

  final String title;
  final String subtitle;
  final Widget body;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.liveMap),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PremiumHeader(
            title: title,
            subtitle: subtitle,
            badge: const AppPill(label: 'Perbug RPG Ops', icon: Icons.auto_awesome),
          ),
          const SizedBox(height: 12),
          body,
        ],
      ),
    );
  }
}

class _LorePanel extends StatelessWidget {
  const _LorePanel({
    super.key,
    required this.title,
    required this.subtitle,
    required this.body,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String body;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      tone: AppCardTone.muted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
          const SizedBox(height: 6),
          Text(body),
          if (trailing != null) ...[
            const SizedBox(height: 10),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class _EmptyInfo extends StatelessWidget {
  const _EmptyInfo({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.collection,
      child: Text(message, style: Theme.of(context).textTheme.bodyLarge),
    );
  }
}

class _StatStrip extends StatelessWidget {
  const _StatStrip({required this.items});

  final List<_StatItem> items;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final item in items)
          Expanded(
            child: AppCard(
              margin: const EdgeInsets.only(right: 8),
              tone: AppCardTone.kpi,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text(item.value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _StatItem {
  const _StatItem(this.label, this.value);

  final String label;
  final String value;
}
