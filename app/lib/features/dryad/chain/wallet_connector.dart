import 'wallet_connector_stub.dart' if (dart.library.html) 'wallet_connector_web.dart';

abstract class WalletConnector {
  bool get isAvailable;

  Future<String> connectWallet();

  Future<int> readChainId();

  Future<String> sendTransaction({
    required String from,
    required String to,
    required String data,
    String? valueHex,
  });
}

WalletConnector createWalletConnector() => createWalletConnectorImpl();
