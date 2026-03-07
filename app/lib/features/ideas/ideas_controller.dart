import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/logging/log.dart';
import '../../models/idea.dart';
import '../../repositories/ideas_repository.dart';
import 'ideas_state.dart';

class IdeasController extends StateNotifier<IdeasState> {
  IdeasController({
    required String sessionId,
    required Future<IdeasRepository> Function() repositoryResolver,
  })  : _repositoryResolver = repositoryResolver,
        super(IdeasState.initial(sessionId));

  static const int _defaultPageSize = 50;

  final Future<IdeasRepository> Function() _repositoryResolver;

  Future<void> initLoad() async {
    if (state.ideas.isNotEmpty || state.isLoading) {
      return;
    }
    await refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);

    try {
      final repository = await _repositoryResolver();
      final response = await repository.listIdeas(
        state.sessionId,
        limit: _defaultPageSize,
      );
      state = state.copyWith(
        isLoading: false,
        ideas: response.ideas,
        nextCursor: response.nextCursor,
        hasMore: response.nextCursor?.isNotEmpty ?? false,
        lastRefreshAt: DateTime.now(),
      );
    } catch (error, stackTrace) {
      Log.error('Failed to load ideas', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load ideas. Please try again.',
      );
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore || state.nextCursor == null) {
      return;
    }

    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      final repository = await _repositoryResolver();
      final response = await repository.listIdeas(
        state.sessionId,
        cursor: state.nextCursor,
        limit: _defaultPageSize,
      );
      final merged = <IdeaItem>[...state.ideas, ...response.ideas]
          .fold<List<IdeaItem>>(<IdeaItem>[], (acc, item) {
        final exists = acc.any((existing) => existing.ideaId == item.ideaId);
        if (!exists) {
          acc.add(item);
        }
        return acc;
      });

      state = state.copyWith(
        isLoading: false,
        ideas: merged,
        nextCursor: response.nextCursor,
        hasMore: response.nextCursor?.isNotEmpty ?? false,
      );
    } catch (error, stackTrace) {
      Log.error('Failed to load more ideas', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load more ideas. Please try again.',
      );
    }
  }

  Future<bool> createIdea(CreateIdeaRequest request) async {
    if (state.isSubmitting) {
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearErrorMessage: true);
    try {
      final repository = await _repositoryResolver();
      await repository.createIdea(state.sessionId, request);
      state = state.copyWith(isSubmitting: false);
      await refresh();
      return true;
    } catch (error, stackTrace) {
      Log.error('Failed to create idea', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Could not create idea. Please try again.',
      );
      return false;
    }
  }

  Future<void> deleteIdea(String ideaId) async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      final repository = await _repositoryResolver();
      await repository.deleteIdea(state.sessionId, ideaId);
      await refresh();
    } catch (error, stackTrace) {
      Log.error('Failed to delete idea', error: error, stackTrace: stackTrace);
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not delete idea. Please try again.',
      );
    }
  }
}
