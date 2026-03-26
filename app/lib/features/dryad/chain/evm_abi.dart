import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:web3dart/crypto.dart' as web3_crypto;

String methodSelector(String signature) {
  if (signature.startsWith('0x') && signature.length == 10) return signature.toLowerCase();
  final digest = web3_crypto.keccakUtf8(signature);
  final selector = web3_crypto.bytesToHex(digest.sublist(0, 4), include0x: true);
  return selector;
}

String encodeAddressCall(String signature, String address) {
  final clean = _strip0x(address).toLowerCase();
  if (clean.length != 40) {
    throw FormatException('Invalid address length for $address');
  }
  return '${methodSelector(signature)}${clean.padLeft(64, '0')}';
}

String encodeAddressUintCall(String signature, String address, BigInt value) {
  final clean = _strip0x(address).toLowerCase();
  if (clean.length != 40) {
    throw FormatException('Invalid address length for $address');
  }
  final encodedValue = value.toRadixString(16).padLeft(64, '0');
  return '${methodSelector(signature)}${clean.padLeft(64, '0')}$encodedValue';
}

String encodeUintCall(String signature, BigInt value) {
  final encodedValue = value.toRadixString(16).padLeft(64, '0');
  return '${methodSelector(signature)}$encodedValue';
}

String encodeBytes32Call(String signature, List<int> bytes32) {
  if (bytes32.length != 32) {
    throw FormatException('bytes32 requires exactly 32 bytes');
  }
  final encoded = bytes32.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  return '${methodSelector(signature)}$encoded';
}

String encodeWriteCall(String signature, {required String walletAddress}) {
  if (signature == 'plant(bytes32)') {
    final digest = sha256.convert(utf8.encode('$walletAddress:${DateTime.now().microsecondsSinceEpoch}'));
    return encodeBytes32Call(signature, digest.bytes);
  }

  if (signature == 'water(uint256)') {
    return encodeUintCall(signature, BigInt.one);
  }

  return methodSelector(signature);
}

BigInt decodeUint256(String hexData) {
  final clean = _strip0x(hexData);
  if (clean.isEmpty) return BigInt.zero;
  return BigInt.parse(clean, radix: 16);
}

String decodeString(String hexData) {
  final bytes = _hexToBytes(_strip0x(hexData));
  if (bytes.length < 64) {
    throw const FormatException('Malformed ABI string return payload');
  }

  final dynamicOffset = _readWordAsInt(bytes, 0);
  if (dynamicOffset < 0 || dynamicOffset + 32 > bytes.length) {
    throw const FormatException('Malformed ABI string return payload');
  }

  final length = _readWordAsInt(bytes, dynamicOffset);
  final start = dynamicOffset + 32;
  final end = start + length;
  if (end > bytes.length) {
    throw const FormatException('Malformed ABI string payload length');
  }
  return String.fromCharCodes(bytes.sublist(start, end));
}

String _strip0x(String value) => value.startsWith('0x') ? value.substring(2) : value;

List<int> _hexToBytes(String value) {
  final normalized = value.length.isOdd ? '0$value' : value;
  return List<int>.generate(
    normalized.length ~/ 2,
    (i) => int.parse(normalized.substring(i * 2, i * 2 + 2), radix: 16),
    growable: false,
  );
}

int _readWordAsInt(List<int> bytes, int offset) {
  final slice = bytes.sublist(offset, offset + 32);
  return int.parse(slice.map((v) => v.toRadixString(16).padLeft(2, '0')).join(), radix: 16);
}
