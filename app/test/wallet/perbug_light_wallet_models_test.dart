import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/wallet/perbug_light_wallet_models.dart';

void main() {
  group('PerbugLightWalletState', () {
    test('initial includes locked and offline defaults', () {
      final state = PerbugLightWalletState.initial(accountId: 'user_1');

      expect(state.accountId, 'user_1');
      expect(state.lockState, WalletLockState.locked);
      expect(state.connectionHealth, WalletConnectionHealth.offline);
      expect(state.syncPhase, WalletSyncPhase.idle);
      expect(state.feeEstimateAtomic[SendPriority.normal], '0');
      expect(state.isSynced, isFalse);
    });

    test('serializes and restores full wallet payload', () {
      final original = PerbugLightWalletState.initial(accountId: 'user_2').copyWith(
        externalAddresses: const ['PBgTestAddr1', 'PBgTestAddr2'],
        changeAddress: 'PBgChangeAddr1',
        balance: const PerbugWalletBalance(
          confirmedAtomic: '120000000',
          pendingAtomic: '50000',
        ),
        transactions: [
          PerbugWalletTxItem(
            txId: 'tx_abc',
            amountAtomic: '1000',
            confirmed: false,
            confirmations: 0,
            timestamp: DateTime.utc(2026, 3, 30),
            direction: 'out',
            counterparty: 'PBgReceiver1',
            feeAtomic: '12',
            memo: 'crafting escrow',
          ),
        ],
        syncPhase: WalletSyncPhase.ready,
        connectionHealth: WalletConnectionHealth.online,
        backupStatus: WalletBackupStatus.confirmed,
        lockState: WalletLockState.unlocked,
        sendForm: const WalletSendFormState(
          toAddress: 'PBgReceiver1',
          amountAtomic: '3400',
          priority: SendPriority.fast,
          memo: 'market purchase',
          estimatedFeeAtomic: '22',
          submitting: true,
        ),
        receive: WalletReceiveState(
          currentAddress: 'PBgReceive1',
          lastCopiedAt: DateTime.utc(2026, 3, 30, 10, 0),
          qrPayload: 'perbug:PBgReceive1?amount=1000',
        ),
        feeEstimateAtomic: const {
          SendPriority.economy: '8',
          SendPriority.normal: '12',
          SendPriority.fast: '24',
        },
        serverHeight: 1337,
        walletHeight: 1337,
        lastSyncAt: DateTime.utc(2026, 3, 30, 11, 0),
      );

      final restored = PerbugLightWalletState.fromEncoded(original.toEncoded());

      expect(restored.accountId, original.accountId);
      expect(restored.externalAddresses, original.externalAddresses);
      expect(restored.changeAddress, 'PBgChangeAddr1');
      expect(restored.balance.confirmedAtomic, '120000000');
      expect(restored.transactions.single.txId, 'tx_abc');
      expect(restored.sendForm.priority, SendPriority.fast);
      expect(restored.receive.currentAddress, 'PBgReceive1');
      expect(restored.feeEstimateAtomic[SendPriority.fast], '24');
      expect(restored.isSynced, isTrue);
    });
  });
}
