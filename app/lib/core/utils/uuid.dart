import 'dart:math';

class Uuid {
  const Uuid._();

  static final Random _random = Random();

  static String v4() {
    final values = List<int>.generate(16, (_) => _random.nextInt(256));
    values[6] = (values[6] & 0x0F) | 0x40;
    values[8] = (values[8] & 0x3F) | 0x80;

    String twoDigits(int n) => n.toRadixString(16).padLeft(2, '0');

    return '${twoDigits(values[0])}${twoDigits(values[1])}${twoDigits(values[2])}${twoDigits(values[3])}-'
        '${twoDigits(values[4])}${twoDigits(values[5])}-'
        '${twoDigits(values[6])}${twoDigits(values[7])}-'
        '${twoDigits(values[8])}${twoDigits(values[9])}-'
        '${twoDigits(values[10])}${twoDigits(values[11])}${twoDigits(values[12])}${twoDigits(values[13])}${twoDigits(values[14])}${twoDigits(values[15])}';
  }
}
