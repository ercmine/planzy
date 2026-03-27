import 'wallet_connector.dart';

class _UnsupportedWalletConnector implements WalletConnector {
  const _UnsupportedWalletConnector();

  @override
  bool get isAvailable => false;

  @override
  List<String> get supportedWalletIds => const <String>[];

  @override
  bool isWalletInstalled(String walletId) => false;

  @override
  Future<String> connectWallet({String? walletId}) async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }

  @override
  Future<int> readChainId({String? walletId}) async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
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
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }

  @override
  Future<String> sendTransaction({required String from, required String to, required String data, String? valueHex}) async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }

  @override
  void attachSessionListeners({
    void Function(String? account)? onAccountChanged,
    void Function(int chainId)? onChainChanged,
    void Function(String reason)? onDisconnected,
  }) {}

  @override
  void detachSessionListeners() {}
}

WalletConnector createWalletConnectorImpl() => const _UnsupportedWalletConnector();
