class AppContact {
  const AppContact({
    required this.id,
    required this.displayName,
    required this.phonesE164,
  });

  final String id;
  final String displayName;
  final List<String> phonesE164;
}
