import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/logging/log.dart';
import '../../models/idea.dart';
import '../../repositories/ideas_repository.dart';
import 'ideas_state.dart';

class IdeasController extends StateNotifier<IdeasState> {
  IdeasController({
    required String sessionId,
    required IdeasRepository ideasRepository,
  })  : _ideasRepository = ideasRepository,
        super(IdeasState.initial(sessionId)) {
    Future<void>.microtask(initLoad);
  }

  final IdeasRepository _ideasRepository;

  static const int _pageSize = 50;

  Future<void> initLoad() async {
    await refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearCursor: true,
      hasMore: false,
    );

    try {
      final response = await _ideasRepository.listIdeas(
        state.sessionId,
        cursor: null,
        limit: _pageSize,
      );
      state = state.copyWith(
        isLoading: false,
        ideas: response.ideas,
        nextCursor: response.nextCursor,
        hasMore: response.nextCursor != null,
        lastRefreshAt: DateTime.now(),
      );
    } catch (error, stackTrace) {
      Log.error('Failed to refresh ideas', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isSubmitting || !state.hasMore || state.nextCursor == null) {
      return;
    }

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final response = await _ideasRepository.listIdeas(
        state.sessionId,
        cursor: state.nextCursor,
        limit: _pageSize,
      );

      final merged = [...state.ideas, ...response.ideas];
      final deduped = <String, IdeaItem>{for (final idea in merged) idea.ideaId: idea}
          .values
          .toList(growable: false);

      state = state.copyWith(
        isLoading: false,
        ideas: deduped,
        nextCursor: response.nextCursor,
        hasMore: response.nextCursor != null,
      );
    } catch (error, stackTrace) {
      Log.error('Failed to load more ideas', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<bool> createIdea(CreateIdeaRequest request) async {
    if (state.isSubmitting) {
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ideasRepository.createIdea(state.sessionId, request);
      state = state.copyWith(isSubmitting: false);
      await refresh();
      return true;
    } catch (error, stackTrace) {
      Log.error('Failed to create idea', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  Future<void> deleteIdea(String ideaId) async {
    state = state.copyWith(clearError: true);

    try {
      await _ideasRepository.deleteIdea(state.sessionId, ideaId);
      await refresh();
    } catch (error, stackTrace) {
      Log.error('Failed to delete idea', error: error, stackTrace: stackTrace);
      state = state.copyWith(errorMessage: error.toString());
    }
  }
}
