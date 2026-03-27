import 'dart:js_interop';
import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import '../../../core/logging/log.dart';
import 'wallet_connector.dart';

class _BrowserWalletConnector implements WalletConnector {
  _BrowserWalletConnector();

  static const String _metaMask = 'metamask';
  static const String _phantom = 'phantom';
  static const String _coinbase = 'coinbase';

  Object? _activeProvider;
  JSFunction? _accountsChangedHandler;
  JSFunction? _chainChangedHandler;
  JSFunction? _disconnectHandler;

  @override
  List<String> get supportedWalletIds => const <String>[_metaMask, _phantom, _coinbase];

  @override
  bool get isAvailable => _resolveDefaultProvider() != null;

  Object? get _ethereum {
    final candidate = js_util.getProperty(web.window, 'ethereum');
    if (candidate != null) return candidate;

    final phantomRoot = js_util.getProperty(web.window, 'phantom');
    if (phantomRoot != null) {
      final phantomEthereum = js_util.getProperty(phantomRoot, 'ethereum');
      if (phantomEthereum != null) return phantomEthereum;
    }
    return null;
  }

  @override
  bool isWalletInstalled(String walletId) => _resolveProvider(walletId) != null;

  @override
  Future<String> connectWallet({String? walletId}) async {
    final provider = _resolveProvider(walletId) ?? _resolveDefaultProvider();
    if (provider == null) {
      throw StateError('No injected wallet found. Install MetaMask, Phantom (EVM), or Coinbase Wallet in this browser.');
    }

    _activeProvider = provider;

    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        provider,
        'request',
        [js_util.jsify({'method': 'eth_requestAccounts'})],
      ),
    );

    final accounts = _asStringList(js_util.dartify(result));
    if (accounts.isEmpty) throw StateError('Wallet connection returned no accounts.');
    return accounts.first;
  }

  @override
  Future<int> readChainId({String? walletId}) async {
    final provider = _resolveProvider(walletId) ?? _activeProvider ?? _resolveDefaultProvider();
    if (provider == null) throw StateError('No injected wallet found.');
    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        provider,
        'request',
        [js_util.jsify({'method': 'eth_chainId'})],
      ),
    );
    return _parseChainId(result);
  }

  @override
  Future<bool> switchChain({
    required int chainId,
    String? rpcUrl,
    String? chainName,
    String? nativeCurrencySymbol,
    String? explorerUrl,
    String? walletId,
  }) async {
    final provider = _resolveProvider(walletId) ?? _activeProvider ?? _resolveDefaultProvider();
    if (provider == null) return false;
    final chainHex = '0x${chainId.toRadixString(16)}';
    try {
      await js_util.promiseToFuture<Object?>(
        js_util.callMethod(provider, 'request', [js_util.jsify({'method': 'wallet_switchEthereumChain', 'params': [
          {'chainId': chainHex}
        ]})]),
      );
      return true;
    } catch (error) {
      final code = _extractErrorCode(error);
      if (code != 4902 || rpcUrl == null || chainName == null || nativeCurrencySymbol == null) {
        return false;
      }

      final addParams = {
        'chainId': chainHex,
        'chainName': chainName,
        'rpcUrls': [rpcUrl],
        'nativeCurrency': {
          'name': nativeCurrencySymbol,
          'symbol': nativeCurrencySymbol,
          'decimals': 18,
        },
        if (explorerUrl != null && explorerUrl.isNotEmpty) 'blockExplorerUrls': [explorerUrl],
      };

      await js_util.promiseToFuture<Object?>(
        js_util.callMethod(provider, 'request', [js_util.jsify({'method': 'wallet_addEthereumChain', 'params': [addParams]})]),
      );
      return true;
    }
  }

  @override
  Future<String> sendTransaction({required String from, required String to, required String data, String? valueHex}) async {
    final provider = _activeProvider ?? _resolveDefaultProvider();
    if (provider == null) throw StateError('No injected wallet found.');

    final tx = <String, String>{
      'from': from,
      'to': to,
      'data': data,
      if (valueHex != null) 'value': valueHex,
    };

    final result = await js_util.promiseToFuture<Object?>(
      js_util.callMethod(
        provider,
        'request',
        [js_util.jsify({'method': 'eth_sendTransaction', 'params': [tx]})],
      ),
    );

    final txHash = (result ?? '').toString();
    if (txHash.isEmpty) throw StateError('Wallet did not return a transaction hash.');
    return txHash;
  }

  @override
  void attachSessionListeners({
    void Function(String? account)? onAccountChanged,
    void Function(int chainId)? onChainChanged,
    void Function(String reason)? onDisconnected,
  }) {
    final provider = _activeProvider ?? _resolveDefaultProvider();
    if (provider == null) return;
    detachSessionListeners();

    final accountHandler = ((JSAny? accounts) {
      final parsed = _asStringList(js_util.dartify(accounts));
      onAccountChanged?.call(parsed.isEmpty ? null : parsed.first);
      Log.d('wallet.accountsChanged count=${parsed.length}');
    }).toJS;

    final chainHandler = ((JSAny? chainId) {
      final parsed = _parseChainId(chainId);
      onChainChanged?.call(parsed);
      Log.d('wallet.chainChanged chainId=$parsed');
    }).toJS;

    final disconnectHandler = ((JSAny? payload) {
      final reason = payload?.toString() ?? 'Wallet disconnected';
      onDisconnected?.call(reason);
      Log.warn('wallet.disconnect payload=$reason');
    }).toJS;

    js_util.callMethod(provider, 'on', ['accountsChanged', accountHandler]);
    js_util.callMethod(provider, 'on', ['chainChanged', chainHandler]);
    js_util.callMethod(provider, 'on', ['disconnect', disconnectHandler]);

    _accountsChangedHandler = accountHandler;
    _chainChangedHandler = chainHandler;
    _disconnectHandler = disconnectHandler;
  }

  @override
  void detachSessionListeners() {
    final provider = _activeProvider ?? _resolveDefaultProvider();
    if (provider == null) return;

    try {
      if (_accountsChangedHandler != null) {
        js_util.callMethod(provider, 'removeListener', ['accountsChanged', _accountsChangedHandler]);
      }
      if (_chainChangedHandler != null) {
        js_util.callMethod(provider, 'removeListener', ['chainChanged', _chainChangedHandler]);
      }
      if (_disconnectHandler != null) {
        js_util.callMethod(provider, 'removeListener', ['disconnect', _disconnectHandler]);
      }
    } catch (_) {}

    _accountsChangedHandler = null;
    _chainChangedHandler = null;
    _disconnectHandler = null;
  }

  Object? _resolveDefaultProvider() {
    for (final walletId in supportedWalletIds) {
      final provider = _resolveProvider(walletId);
      if (provider != null) return provider;
    }
    return _ethereum;
  }

  Object? _resolveProvider(String? walletId) {
    final ethereum = _ethereum;
    if (ethereum == null) return null;

    final providers = _collectProviders(ethereum);
    final normalized = walletId?.toLowerCase();

    if (normalized == null || normalized.isEmpty) return providers.isEmpty ? ethereum : providers.first;

    for (final provider in providers) {
      if (normalized == _metaMask && _providerFlag(provider, 'isMetaMask')) return provider;
      if (normalized == _coinbase && _providerFlag(provider, 'isCoinbaseWallet')) return provider;
      if (normalized == _phantom && (_providerFlag(provider, 'isPhantom') || _providerFlag(provider, 'isPhantomEthereum'))) {
        return provider;
      }
    }

    if (normalized == _phantom) {
      final phantomRoot = js_util.getProperty(web.window, 'phantom');
      if (phantomRoot != null) {
        final phantomEthereum = js_util.getProperty(phantomRoot, 'ethereum');
        if (phantomEthereum != null) return phantomEthereum;
      }
    }

    return null;
  }

  List<Object> _collectProviders(Object ethereum) {
    final candidates = <Object>[];
    final injectedProviders = js_util.getProperty(ethereum, 'providers');

    if (injectedProviders != null) {
      final providerList = js_util.dartify(injectedProviders);
      if (providerList is List) {
        for (final item in providerList) {
          if (item != null) candidates.add(item);
        }
      }
    }

    if (candidates.isEmpty) {
      candidates.add(ethereum);
    }
    return candidates;
  }

  bool _providerFlag(Object provider, String flag) {
    try {
      final value = js_util.getProperty(provider, flag);
      return value == true;
    } catch (_) {
      return false;
    }
  }

  int _extractErrorCode(Object error) {
    try {
      final code = js_util.getProperty(error, 'code');
      if (code is int) return code;
      return int.tryParse(code.toString()) ?? -1;
    } catch (_) {
      return -1;
    }
  }

  int _parseChainId(Object? value) {
    final raw = (value ?? '0x0').toString();
    if (raw.startsWith('0x')) {
      return int.tryParse(raw.replaceFirst('0x', ''), radix: 16) ?? 0;
    }
    return int.tryParse(raw) ?? 0;
  }

  List<String> _asStringList(Object? value) {
    if (value is List) return value.map((item) => item.toString()).toList(growable: false);
    if (value == null) return const [];
    return [value.toString()];
  }
}

WalletConnector createWalletConnectorImpl() => _BrowserWalletConnector();
