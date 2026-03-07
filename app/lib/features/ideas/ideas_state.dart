import '../../models/idea.dart';

class IdeasState {
  const IdeasState({
    required this.sessionId,
    this.isLoading = false,
    this.isSubmitting = false,
    this.errorMessage,
    this.ideas = const <IdeaItem>[],
    this.nextCursor,
    this.hasMore = false,
    this.lastRefreshAt,
  });

  factory IdeasState.initial(String sessionId) => IdeasState(sessionId: sessionId);

  final String sessionId;
  final bool isLoading;
  final bool isSubmitting;
  final String? errorMessage;
  final List<IdeaItem> ideas;
  final String? nextCursor;
  final bool hasMore;
  final DateTime? lastRefreshAt;

  IdeasState copyWith({
    String? sessionId,
    bool? isLoading,
    bool? isSubmitting,
    String? errorMessage,
    bool clearErrorMessage = false,
    List<IdeaItem>? ideas,
    String? nextCursor,
    bool clearNextCursor = false,
    bool? hasMore,
    DateTime? lastRefreshAt,
    bool clearLastRefreshAt = false,
  }) {
    return IdeasState(
      sessionId: sessionId ?? this.sessionId,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
      ideas: ideas ?? this.ideas,
      nextCursor: clearNextCursor ? null : (nextCursor ?? this.nextCursor),
      hasMore: hasMore ?? this.hasMore,
      lastRefreshAt: clearLastRefreshAt ? null : (lastRefreshAt ?? this.lastRefreshAt),
    );
  }
}
