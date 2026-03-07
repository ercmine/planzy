class ApiEndpoints {
  const ApiEndpoints._();

  static String sessionDeck(String sessionId) => '/sessions/$sessionId/deck';
  static String ideas(String sessionId) => '/sessions/$sessionId/ideas';
  static String ideaById(String sessionId, String ideaId) => '/sessions/$sessionId/ideas/$ideaId';
  static String telemetry(String sessionId) => '/sessions/$sessionId/telemetry';
}
