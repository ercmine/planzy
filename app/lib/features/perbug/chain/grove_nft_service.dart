import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../config/perbug_chain_config.dart';
import 'evm_abi.dart';
import 'nft_metadata.dart';

class GroveNftSnapshot {
  const GroveNftSnapshot({
    required this.chainId,
    required this.wallet,
    required this.ownedBalance,
    required this.tokens,
  });

  final int chainId;
  final String wallet;
  final BigInt ownedBalance;
  final List<GroveNftTokenSnapshot> tokens;

  BigInt? get tokenId => tokens.isEmpty ? null : tokens.first.tokenId;
  String? get tokenUri => tokens.isEmpty ? null : tokens.first.tokenUri;
  NftArtwork? get artwork => tokens.isEmpty ? null : tokens.first.artwork;

  bool get hasMultipleNfts => tokens.length > 1;

  bool get hasNft => ownedBalance > BigInt.zero && tokens.isNotEmpty;
}

class GroveNftTokenSnapshot {
  const GroveNftTokenSnapshot({required this.tokenId, required this.tokenUri, required this.artwork});

  final BigInt tokenId;
  final String tokenUri;
  final NftArtwork? artwork;
}

class GroveNftService {
  const GroveNftService({required this.httpClient, required this.config});

  final http.Client httpClient;
  final PerbugContractConfig config;

  Future<int> readChainId() async {
    final response = await _postRpc('eth_chainId', const []);
    final value = (response['result'] ?? '0x0').toString();
    return int.parse(value.replaceFirst('0x', ''), radix: 16);
  }

  Future<GroveNftSnapshot> fetchWalletSnapshot(String walletAddress) async {
    final chainId = await readChainId();
    final balanceRaw = await _ethCall(
      to: config.groveNftAddress,
      data: encodeAddressCall('balanceOf(address)', walletAddress),
    );
    final balance = decodeUint256(balanceRaw);

    if (balance == BigInt.zero) {
      return GroveNftSnapshot(
        chainId: chainId,
        wallet: walletAddress,
        ownedBalance: balance,
        tokens: const <GroveNftTokenSnapshot>[],
      );
    }

    final nftCount = balance.toInt();
    final tokens = <GroveNftTokenSnapshot>[];
    for (var index = 0; index < nftCount; index += 1) {
      final tokenIdRaw = await _ethCall(
        to: config.groveNftAddress,
        data: encodeAddressUintCall('tokenOfOwnerByIndex(address,uint256)', walletAddress, BigInt.from(index)),
      );
      final tokenId = decodeUint256(tokenIdRaw);

      final tokenUriRaw = await _ethCall(
        to: config.groveNftAddress,
        data: encodeUintCall('tokenURI(uint256)', tokenId),
      );

      final tokenUri = decodeString(tokenUriRaw);
      final artwork = parseNftArtworkFromTokenUri(tokenUri);
      tokens.add(GroveNftTokenSnapshot(tokenId: tokenId, tokenUri: tokenUri, artwork: artwork));
    }

    return GroveNftSnapshot(
      chainId: chainId,
      wallet: walletAddress,
      ownedBalance: balance,
      tokens: tokens,
    );
  }

  Future<String> mint({required String walletAddress, required String methodSignature, required String seedInput}) async {
    final data = encodeWriteCall(methodSignature, walletAddress: walletAddress, seedInput: seedInput);
    final response = await _postRpc('eth_sendTransaction', [
      {
        'from': walletAddress,
        'to': config.groveNftAddress,
        'data': data,
      }
    ]);

    final txHash = response['result']?.toString();
    if (txHash == null || txHash.isEmpty) {
      throw StateError('Mint transaction hash was empty');
    }
    return txHash;
  }

  Future<String> _ethCall({required String to, required String data}) async {
    final response = await _postRpc('eth_call', [
      {
        'to': to,
        'data': data,
      },
      'latest',
    ]);

    final result = response['result']?.toString();
    if (result == null) {
      throw StateError('Missing eth_call result for $to');
    }
    return result;
  }

  Future<Map<String, dynamic>> _postRpc(String method, List<Object?> params) async {
    final body = {
      'jsonrpc': '2.0',
      'id': DateTime.now().microsecondsSinceEpoch,
      'method': method,
      'params': params,
    };

    final response = await httpClient.post(
      Uri.parse(config.rpcUrl),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode(body),
    );

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400 || json['error'] != null) {
      throw StateError('RPC $method failed: ${json['error'] ?? response.body}');
    }
    return json;
  }
}
