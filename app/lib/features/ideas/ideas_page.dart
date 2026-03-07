import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/retry_view.dart';
import '../../providers/app_providers.dart';
import 'ideas_controller.dart';
import 'widgets/add_idea_sheet.dart';
import 'widgets/idea_list_tile.dart';

class IdeasPage extends ConsumerWidget {
  const IdeasPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ideasControllerProvider(sessionId));
    final controller = ref.read(ideasControllerProvider(sessionId).notifier);

    return AppScaffold(
      appBar: AppBar(title: const Text('Ideas')),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: Builder(
          builder: (context) {
            if (state.isLoading && state.ideas.isEmpty) {
              return ListView.builder(
                padding: const EdgeInsets.all(AppSpacing.m),
                itemCount: 6,
                itemBuilder: (_, __) => const DeckSkeletonTile(),
              );
            }

            if (state.errorMessage != null && state.ideas.isEmpty) {
              return RetryView(
                title: 'Ideas unavailable',
                message: state.errorMessage!,
                onRetry: controller.refresh,
              );
            }

            return ListView(
              children: [
                const AppSectionHeader(title: 'Shared ideas', subtitle: 'Collect options before swiping.'),
                const SizedBox(height: AppSpacing.m),
                for (final idea in state.ideas)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.s),
                    child: Dismissible(
                      key: ValueKey(idea.ideaId),
                      direction: DismissDirection.endToStart,
                      confirmDismiss: (_) => _confirmDelete(context),
                      onDismissed: (_) => controller.deleteIdea(idea.ideaId),
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.m),
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: const Icon(Icons.delete_outline),
                      ),
                      child: IdeaListTile(
                        idea: idea,
                        onDelete: () => _deleteWithConfirm(context, controller, idea.ideaId),
                      ),
                    ),
                  ),
                if (state.ideas.isEmpty) const Padding(padding: EdgeInsets.only(top: 120), child: Center(child: Text('No ideas yet. Add one.'))),
                if (state.hasMore) ...[
                  const SizedBox(height: AppSpacing.m),
                  FilledButton.tonal(
                    onPressed: state.isLoading ? null : controller.loadMore,
                    child: state.isLoading
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Load more'),
                  ),
                ],
                if (state.errorMessage != null && state.ideas.isNotEmpty) Padding(padding: const EdgeInsets.only(top: AppSpacing.s), child: Text(state.errorMessage!)),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            builder: (_) => AddIdeaSheet(sessionId: sessionId),
          );
        },
        icon: const Icon(Icons.lightbulb_outline),
        label: const Text('Add Idea'),
      ),
    );
  }

  Future<bool?> _confirmDelete(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this idea?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Delete')),
        ],
      ),
    );
  }

  Future<void> _deleteWithConfirm(BuildContext context, IdeasController controller, String ideaId) async {
    final confirmed = await _confirmDelete(context) ?? false;
    if (confirmed) {
      await controller.deleteIdea(ideaId);
    }
  }
}

class DeckSkeletonTile extends StatelessWidget {
  const DeckSkeletonTile({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(bottom: AppSpacing.s),
      child: AppCard(
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          title: SizedBox(height: 16, child: ColoredBox(color: Colors.black12)),
          subtitle: Padding(
            padding: EdgeInsets.only(top: 8),
            child: SizedBox(height: 14, child: ColoredBox(color: Colors.black12)),
          ),
        ),
      ),
    );
  }
}
