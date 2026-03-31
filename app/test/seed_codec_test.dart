import 'package:perbug/features/perbug/chain/seed_codec.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('accepts bytes32 hex seed unchanged', () {
    const seed = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    final result = validatePlantSeed(seed);
    expect(result.isValid, isTrue);
    expect(result.normalizedSeedHex, seed);
  });

  test('encodes short text seed to bytes32 padded hex', () {
    final result = validatePlantSeed('tree');
    expect(result.isValid, isTrue);
    expect(result.normalizedSeedHex, startsWith('0x74726565'));
    expect(result.normalizedSeedHex?.length, 66);
  });

  test('rejects empty seed input', () {
    final result = validatePlantSeed('   ');
    expect(result.isValid, isFalse);
    expect(result.errorMessage, contains('Enter a seed'));
  });
}

