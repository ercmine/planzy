import 'dart:convert';

enum WalletSyncPhase { idle, headers, scanning, ready, degraded }

enum WalletConnectionHealth { online, unstable, offline }

enum WalletBackupStatus { notStarted, reminded, confirmed, imported }

enum WalletLockState { locked, unlocked }

enum SendPriority { economy, normal, fast }

class PerbugWalletBalance {
  const PerbugWalletBalance({
    required this.confirmedAtomic,
    required this.pendingAtomic,
  });

  factory PerbugWalletBalance.zero() => const PerbugWalletBalance(
        confirmedAtomic: '0',
        pendingAtomic: '0',
      );

  final String confirmedAtomic;
  final String pendingAtomic;

  Map<String, dynamic> toJson() => {
        'confirmedAtomic': confirmedAtomic,
        'pendingAtomic': pendingAtomic,
      };

  factory PerbugWalletBalance.fromJson(Map<String, dynamic> json) =>
      PerbugWalletBalance(
        confirmedAtomic: json['confirmedAtomic']?.toString() ?? '0',
        pendingAtomic: json['pendingAtomic']?.toString() ?? '0',
      );
}

class PerbugWalletTxItem {
  const PerbugWalletTxItem({
    required this.txId,
    required this.amountAtomic,
    required this.confirmed,
    required this.timestamp,
    this.confirmations = 0,
    this.direction,
    this.counterparty,
    this.memo,
    this.feeAtomic,
  });

  final String txId;
  final String amountAtomic;
  final bool confirmed;
  final DateTime timestamp;
  final int confirmations;
  final String? direction;
  final String? counterparty;
  final String? memo;
  final String? feeAtomic;

  Map<String, dynamic> toJson() => {
        'txId': txId,
        'amountAtomic': amountAtomic,
        'confirmed': confirmed,
        'timestamp': timestamp.toIso8601String(),
        'confirmations': confirmations,
        'direction': direction,
        'counterparty': counterparty,
        'memo': memo,
        'feeAtomic': feeAtomic,
      };

  factory PerbugWalletTxItem.fromJson(Map<String, dynamic> json) =>
      PerbugWalletTxItem(
        txId: json['txId']?.toString() ?? '',
        amountAtomic: json['amountAtomic']?.toString() ?? '0',
        confirmed: json['confirmed'] == true,
        timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        confirmations: (json['confirmations'] as num?)?.toInt() ?? 0,
        direction: json['direction']?.toString(),
        counterparty: json['counterparty']?.toString(),
        memo: json['memo']?.toString(),
        feeAtomic: json['feeAtomic']?.toString(),
      );
}

class WalletReceiveState {
  const WalletReceiveState({
    required this.currentAddress,
    this.lastCopiedAt,
    this.qrPayload,
  });

  factory WalletReceiveState.initial() => const WalletReceiveState(
        currentAddress: '',
      );

  final String currentAddress;
  final DateTime? lastCopiedAt;
  final String? qrPayload;

  Map<String, dynamic> toJson() => {
        'currentAddress': currentAddress,
        'lastCopiedAt': lastCopiedAt?.toIso8601String(),
        'qrPayload': qrPayload,
      };

  factory WalletReceiveState.fromJson(Map<String, dynamic> json) =>
      WalletReceiveState(
        currentAddress: json['currentAddress']?.toString() ?? '',
        lastCopiedAt: DateTime.tryParse(json['lastCopiedAt']?.toString() ?? ''),
        qrPayload: json['qrPayload']?.toString(),
      );
}

class WalletSendFormState {
  const WalletSendFormState({
    required this.toAddress,
    required this.amountAtomic,
    required this.priority,
    this.memo,
    this.estimatedFeeAtomic,
    this.validationError,
    this.submitting = false,
  });

  factory WalletSendFormState.initial() => const WalletSendFormState(
        toAddress: '',
        amountAtomic: '',
        priority: SendPriority.normal,
      );

  final String toAddress;
  final String amountAtomic;
  final SendPriority priority;
  final String? memo;
  final String? estimatedFeeAtomic;
  final String? validationError;
  final bool submitting;

  Map<String, dynamic> toJson() => {
        'toAddress': toAddress,
        'amountAtomic': amountAtomic,
        'priority': priority.name,
        'memo': memo,
        'estimatedFeeAtomic': estimatedFeeAtomic,
        'validationError': validationError,
        'submitting': submitting,
      };

  factory WalletSendFormState.fromJson(Map<String, dynamic> json) =>
      WalletSendFormState(
        toAddress: json['toAddress']?.toString() ?? '',
        amountAtomic: json['amountAtomic']?.toString() ?? '',
        priority: SendPriority.values.firstWhere(
          (value) => value.name == json['priority']?.toString(),
          orElse: () => SendPriority.normal,
        ),
        memo: json['memo']?.toString(),
        estimatedFeeAtomic: json['estimatedFeeAtomic']?.toString(),
        validationError: json['validationError']?.toString(),
        submitting: json['submitting'] == true,
      );
}

class PerbugLightWalletState {
  const PerbugLightWalletState({
    required this.accountId,
    required this.externalAddresses,
    required this.changeAddress,
    required this.balance,
    required this.transactions,
    required this.syncPhase,
    required this.connectionHealth,
    required this.backupStatus,
    required this.lockState,
    required this.sendForm,
    required this.receive,
    required this.feeEstimateAtomic,
    required this.serverHeight,
    required this.walletHeight,
    this.lastSyncAt,
    this.lastError,
  });

  factory PerbugLightWalletState.initial({required String accountId}) =>
      PerbugLightWalletState(
        accountId: accountId,
        externalAddresses: const [],
        changeAddress: '',
        balance: PerbugWalletBalance.zero(),
        transactions: const [],
        syncPhase: WalletSyncPhase.idle,
        connectionHealth: WalletConnectionHealth.offline,
        backupStatus: WalletBackupStatus.notStarted,
        lockState: WalletLockState.locked,
        sendForm: WalletSendFormState.initial(),
        receive: WalletReceiveState.initial(),
        feeEstimateAtomic: const {
          SendPriority.economy: '0',
          SendPriority.normal: '0',
          SendPriority.fast: '0',
        },
        serverHeight: 0,
        walletHeight: 0,
      );

  final String accountId;
  final List<String> externalAddresses;
  final String changeAddress;
  final PerbugWalletBalance balance;
  final List<PerbugWalletTxItem> transactions;
  final WalletSyncPhase syncPhase;
  final WalletConnectionHealth connectionHealth;
  final WalletBackupStatus backupStatus;
  final WalletLockState lockState;
  final WalletSendFormState sendForm;
  final WalletReceiveState receive;
  final Map<SendPriority, String> feeEstimateAtomic;
  final int serverHeight;
  final int walletHeight;
  final DateTime? lastSyncAt;
  final String? lastError;

  bool get isSynced =>
      syncPhase == WalletSyncPhase.ready &&
      connectionHealth == WalletConnectionHealth.online &&
      serverHeight <= walletHeight + 1;

  bool get hasUsableAddress => externalAddresses.isNotEmpty;

  PerbugLightWalletState copyWith({
    List<String>? externalAddresses,
    String? changeAddress,
    PerbugWalletBalance? balance,
    List<PerbugWalletTxItem>? transactions,
    WalletSyncPhase? syncPhase,
    WalletConnectionHealth? connectionHealth,
    WalletBackupStatus? backupStatus,
    WalletLockState? lockState,
    WalletSendFormState? sendForm,
    WalletReceiveState? receive,
    Map<SendPriority, String>? feeEstimateAtomic,
    int? serverHeight,
    int? walletHeight,
    DateTime? lastSyncAt,
    String? lastError,
  }) {
    return PerbugLightWalletState(
      accountId: accountId,
      externalAddresses: externalAddresses ?? this.externalAddresses,
      changeAddress: changeAddress ?? this.changeAddress,
      balance: balance ?? this.balance,
      transactions: transactions ?? this.transactions,
      syncPhase: syncPhase ?? this.syncPhase,
      connectionHealth: connectionHealth ?? this.connectionHealth,
      backupStatus: backupStatus ?? this.backupStatus,
      lockState: lockState ?? this.lockState,
      sendForm: sendForm ?? this.sendForm,
      receive: receive ?? this.receive,
      feeEstimateAtomic: feeEstimateAtomic ?? this.feeEstimateAtomic,
      serverHeight: serverHeight ?? this.serverHeight,
      walletHeight: walletHeight ?? this.walletHeight,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      lastError: lastError ?? this.lastError,
    );
  }

  Map<String, dynamic> toJson() => {
        'accountId': accountId,
        'externalAddresses': externalAddresses,
        'changeAddress': changeAddress,
        'balance': balance.toJson(),
        'transactions': transactions.map((tx) => tx.toJson()).toList(growable: false),
        'syncPhase': syncPhase.name,
        'connectionHealth': connectionHealth.name,
        'backupStatus': backupStatus.name,
        'lockState': lockState.name,
        'sendForm': sendForm.toJson(),
        'receive': receive.toJson(),
        'feeEstimateAtomic': {
          for (final item in feeEstimateAtomic.entries) item.key.name: item.value,
        },
        'serverHeight': serverHeight,
        'walletHeight': walletHeight,
        'lastSyncAt': lastSyncAt?.toIso8601String(),
        'lastError': lastError,
      };

  String toEncoded() => jsonEncode(toJson());

  factory PerbugLightWalletState.fromJson(Map<String, dynamic> json) {
    final feeRaw = (json['feeEstimateAtomic'] as Map?)?.cast<String, dynamic>() ??
        const <String, dynamic>{};
    return PerbugLightWalletState(
      accountId: json['accountId']?.toString() ?? '',
      externalAddresses: ((json['externalAddresses'] as List?) ?? const [])
          .map((entry) => entry.toString())
          .toList(growable: false),
      changeAddress: json['changeAddress']?.toString() ?? '',
      balance: PerbugWalletBalance.fromJson(
        (json['balance'] as Map?)?.cast<String, dynamic>() ??
            const <String, dynamic>{},
      ),
      transactions: ((json['transactions'] as List?) ?? const [])
          .whereType<Map>()
          .map((entry) =>
              PerbugWalletTxItem.fromJson(entry.cast<String, dynamic>()))
          .toList(growable: false),
      syncPhase: WalletSyncPhase.values.firstWhere(
        (value) => value.name == json['syncPhase']?.toString(),
        orElse: () => WalletSyncPhase.idle,
      ),
      connectionHealth: WalletConnectionHealth.values.firstWhere(
        (value) => value.name == json['connectionHealth']?.toString(),
        orElse: () => WalletConnectionHealth.offline,
      ),
      backupStatus: WalletBackupStatus.values.firstWhere(
        (value) => value.name == json['backupStatus']?.toString(),
        orElse: () => WalletBackupStatus.notStarted,
      ),
      lockState: WalletLockState.values.firstWhere(
        (value) => value.name == json['lockState']?.toString(),
        orElse: () => WalletLockState.locked,
      ),
      sendForm: WalletSendFormState.fromJson(
        (json['sendForm'] as Map?)?.cast<String, dynamic>() ??
            const <String, dynamic>{},
      ),
      receive: WalletReceiveState.fromJson(
        (json['receive'] as Map?)?.cast<String, dynamic>() ??
            const <String, dynamic>{},
      ),
      feeEstimateAtomic: {
        for (final priority in SendPriority.values)
          priority: feeRaw[priority.name]?.toString() ?? '0',
      },
      serverHeight: (json['serverHeight'] as num?)?.toInt() ?? 0,
      walletHeight: (json['walletHeight'] as num?)?.toInt() ?? 0,
      lastSyncAt: DateTime.tryParse(json['lastSyncAt']?.toString() ?? ''),
      lastError: json['lastError']?.toString(),
    );
  }

  factory PerbugLightWalletState.fromEncoded(String raw) {
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return PerbugLightWalletState.fromJson(decoded);
  }
}
