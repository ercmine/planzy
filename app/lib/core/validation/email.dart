bool isValidEmail(String s) {
  final value = s.trim();
  if (value.isEmpty) {
    return false;
  }

  final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  return regex.hasMatch(value);
}

String maskEmail(String s) {
  final value = s.trim();
  final parts = value.split('@');
  if (parts.length != 2 || parts.first.isEmpty || parts.last.isEmpty) {
    return '***';
  }

  final local = parts.first;
  final domain = parts.last;
  final domainParts = domain.split('.');
  final domainName = domainParts.first;
  final domainSuffix = domainParts.length > 1 ? '.${domainParts.sublist(1).join('.')}' : '';

  final maskedLocal =
      local.length <= 4 ? '${local.substring(0, 1)}***' : '${local.substring(0, 4)}***';
  final maskedDomain = domainName.isEmpty ? '***' : '${domainName.substring(0, 1)}***';

  return '$maskedLocal@$maskedDomain$domainSuffix';
}
