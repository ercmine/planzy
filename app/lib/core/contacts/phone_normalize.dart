String? normalizePhoneToE164(String input) {
  final digitsOnly = input.replaceAll(RegExp(r'\D'), '');

  if (digitsOnly.length == 10) {
    return '+1$digitsOnly';
  }

  if (digitsOnly.length == 11 && digitsOnly.startsWith('1')) {
    return '+$digitsOnly';
  }

  return null;
}
