import 'wallet_connector.dart';

class _UnsupportedWalletConnector implements WalletConnector {
  const _UnsupportedWalletConnector();

  @override
  bool get isAvailable => false;

  @override
  Future<String> connectWallet() async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }

  @override
  Future<int> readChainId() async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }

  @override
  Future<String> sendTransaction({required String from, required String to, required String data, String? valueHex}) async {
    throw UnsupportedError('Browser wallet connection is only available on Flutter Web with an injected wallet provider.');
  }
}

WalletConnector createWalletConnectorImpl() => const _UnsupportedWalletConnector();
