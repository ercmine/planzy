import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'wallet_connector.dart';

class _BrowserWalletConnector implements WalletConnector {
  const _BrowserWalletConnector();

  Object? get _ethereum {
    final candidate = js_util.getProperty(web.window, 'ethereum');
    return candidate;
  }

  @override
  bool get isAvailable => _ethereum != null;

  @override
  Future<String> connectWallet() async {
    final ethereum = _ethereum;
    if (ethereum == null) throw StateError('No injected wallet found. Install MetaMask or another EVM wallet in this browser.');
    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        ethereum,
        'request',
        [js_util.jsify({'method': 'eth_requestAccounts'})],
      ),
    );

    final accounts = _asStringList(js_util.dartify(result));
    if (accounts.isEmpty) throw StateError('Wallet connection returned no accounts.');
    return accounts.first;
  }

  @override
  Future<int> readChainId() async {
    final ethereum = _ethereum;
    if (ethereum == null) throw StateError('No injected wallet found.');
    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        ethereum,
        'request',
        [js_util.jsify({'method': 'eth_chainId'})],
      ),
    );
    final value = (result ?? '0x0').toString();
    return int.parse(value.replaceFirst('0x', ''), radix: 16);
  }

  @override
  Future<String> sendTransaction({required String from, required String to, required String data, String? valueHex}) async {
    final ethereum = _ethereum;
    if (ethereum == null) throw StateError('No injected wallet found.');

    final tx = <String, String>{
      'from': from,
      'to': to,
      'data': data,
      if (valueHex != null) 'value': valueHex,
    };

    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        ethereum,
        'request',
        [js_util.jsify({'method': 'eth_sendTransaction', 'params': [tx]})],
      ),
    );

    final txHash = (result ?? '').toString();
    if (txHash.isEmpty) throw StateError('Wallet did not return a transaction hash.');
    return txHash;
  }

  List<String> _asStringList(Object? value) {
    if (value is List) return value.map((item) => item.toString()).toList(growable: false);
    if (value == null) return const [];
    return [value.toString()];
  }
}

WalletConnector createWalletConnectorImpl() => const _BrowserWalletConnector();
