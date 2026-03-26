import 'package:dryad/features/dryad/chain/evm_abi.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:web3dart/crypto.dart' as web3_crypto;

void main() {
  test('decodeString decodes ABI encoded single string return payload', () {
    final value = 'ipfs://tree-metadata';
    final dataBytes = value.codeUnits;
    final paddedLength = ((dataBytes.length + 31) ~/ 32) * 32;
    final encodedData = <int>[
      ...List<int>.filled(31, 0),
      32,
      ...List<int>.filled(31, 0),
      dataBytes.length,
      ...dataBytes,
      ...List<int>.filled(paddedLength - dataBytes.length, 0),
    ];
    final encodedHex = web3_crypto.bytesToHex(encodedData, include0x: true);

    expect(decodeString(encodedHex), value);
  });
}
