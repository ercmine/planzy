import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../providers/app_providers.dart';
import 'widgets/add_idea_sheet.dart';
import 'widgets/idea_list_tile.dart';

class IdeasPage extends ConsumerStatefulWidget {
  const IdeasPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<IdeasPage> createState() => _IdeasPageState();
}

class _IdeasPageState extends ConsumerState<IdeasPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(
      () => ref.read(ideasControllerProvider(widget.sessionId).notifier).initLoad(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ideasControllerProvider(widget.sessionId));
    final controller = ref.read(ideasControllerProvider(widget.sessionId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Ideas')),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: Builder(
          builder: (context) {
            if (state.isLoading && state.ideas.isEmpty) {
              return ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.m),
                itemBuilder: (_, __) => const _IdeaSkeletonTile(),
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
                itemCount: 6,
              );
            }

            if (state.errorMessage != null && state.ideas.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.m),
                children: [
                  Text(state.errorMessage!),
                  const SizedBox(height: AppSpacing.s),
                  FilledButton(
                    onPressed: controller.refresh,
                    child: const Text('Retry'),
                  ),
                ],
              );
            }

            if (state.ideas.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.m),
                children: const [
                  SizedBox(height: AppSpacing.xl),
                  Center(child: Text('No ideas yet. Add one to get started.')),
                ],
              );
            }

            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppSpacing.m),
              itemCount: state.ideas.length + (state.hasMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
              itemBuilder: (context, index) {
                if (index == state.ideas.length) {
                  return OutlinedButton(
                    onPressed: state.isLoading ? null : controller.loadMore,
                    child: const Text('Load more'),
                  );
                }
                final idea = state.ideas[index];
                return Card(
                  child: IdeaListTile(
                    idea: idea,
                    onDelete: () => _confirmDelete(context, idea.ideaId),
                  ),
                );
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddIdeaSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Add Idea'),
      ),
    );
  }

  Future<void> _openAddIdeaSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AddIdeaSheet(sessionId: widget.sessionId),
    );
  }

  Future<void> _confirmDelete(BuildContext context, String ideaId) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete this idea?'),
          content: const Text('This action cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (shouldDelete == true && mounted) {
      await ref.read(ideasControllerProvider(widget.sessionId).notifier).deleteIdea(ideaId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Idea deleted')),
        );
      }
    }
  }
}

class _IdeaSkeletonTile extends StatelessWidget {
  const _IdeaSkeletonTile();

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Container(
      height: 76,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}
