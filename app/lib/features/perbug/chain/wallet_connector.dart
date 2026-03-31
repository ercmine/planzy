import 'wallet_connector_stub.dart' if (dart.library.html) 'wallet_connector_web.dart';

abstract class WalletConnector {
  bool get isAvailable;

  bool get isMobileBrowser;

  List<String> get supportedWalletIds;

  bool isWalletInstalled(String walletId);

  Future<bool> launchWalletApp({
    required String walletId,
    required Uri dappUri,
  });

  Future<String> connectWallet({String? walletId});

  Future<int> readChainId({String? walletId});

  Future<bool> switchChain({
    required int chainId,
    String? rpcUrl,
    String? chainName,
    String? nativeCurrencySymbol,
    String? explorerUrl,
    String? walletId,
  });

  Future<String> sendTransaction({
    required String from,
    required String to,
    required String data,
    String? valueHex,
  });

  void attachSessionListeners({
    void Function(String? account)? onAccountChanged,
    void Function(int chainId)? onChainChanged,
    void Function(String reason)? onDisconnected,
  });

  void detachSessionListeners();
}

WalletConnector createWalletConnector() => createWalletConnectorImpl();
