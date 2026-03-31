import 'dart:convert';

class SeedValidationResult {
  const SeedValidationResult({required this.isValid, this.errorMessage, this.normalizedSeedHex});

  final bool isValid;
  final String? errorMessage;
  final String? normalizedSeedHex;
}

final RegExp _bytes32HexPattern = RegExp(r'^0x[0-9a-fA-F]{64}$');

SeedValidationResult validatePlantSeed(String seedInput) {
  final trimmed = seedInput.trim();
  if (trimmed.isEmpty) {
    return const SeedValidationResult(isValid: false, errorMessage: 'Enter a seed to plant your tree.');
  }

  if (_bytes32HexPattern.hasMatch(trimmed)) {
    return SeedValidationResult(isValid: true, normalizedSeedHex: trimmed.toLowerCase());
  }

  final bytes = utf8.encode(trimmed);
  if (bytes.length > 32) {
    return const SeedValidationResult(
      isValid: false,
      errorMessage: 'Seed text must be 32 UTF-8 bytes or fewer, or use a 0x-prefixed 64-hex bytes32 value.',
    );
  }

  final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join().padRight(64, '0');
  return SeedValidationResult(isValid: true, normalizedSeedHex: '0x$hex');
}

