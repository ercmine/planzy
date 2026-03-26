String methodSelector(String signature) {
  switch (signature) {
    case 'balanceOf(address)':
      return '0x70a08231';
    case 'tokenOfOwnerByIndex(address,uint256)':
      return '0x2f745c59';
    case 'tokenURI(uint256)':
      return '0xc87b56dd';
    case 'mint()':
      return '0x1249c58b';
    default:
      throw UnsupportedError('Unsupported method signature: $signature');
  }
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

String encodeNoArgCall(String signature) {
  if (signature.startsWith('0x') && signature.length == 10) {
    return signature.toLowerCase();
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
  if (bytes.length < 96) {
    throw const FormatException('Malformed ABI string return payload');
  }

  final length = _readWordAsInt(bytes, 64);
  final start = 96;
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
