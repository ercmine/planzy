class DeepLinks {
  const DeepLinks({
    required this.invitePath,
    required this.sessionPath,
  });

  final String invitePath;
  final String sessionPath;

  factory DeepLinks.fromInviteCode(String code) {
    return DeepLinks(
      invitePath: '/invite/$code',
      sessionPath: '/sessions',
    );
  }
}
