import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/spacing.dart';
import '../../../features/session_create/invite_friends_sheet.dart';
import '../../../providers/app_providers.dart';
import 'widgets/category_picker.dart';
import 'widgets/radius_slider.dart';
import 'widgets/time_window_picker.dart';

class CreateSessionPage extends ConsumerStatefulWidget {
  const CreateSessionPage({super.key});

  @override
  ConsumerState<CreateSessionPage> createState() => _CreateSessionPageState();
}

class _CreateSessionPageState extends ConsumerState<CreateSessionPage> {
  late final TextEditingController _titleController;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createSessionControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Session')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Title',
              hintText: 'Friday night ideas',
            ),
            onChanged: (value) =>
                ref.read(createSessionControllerProvider.notifier).setTitle(value),
          ),
          const SizedBox(height: AppSpacing.m),
          TimeWindowPicker(
            enabled: state.timeWindowEnabled,
            start: state.timeStart,
            end: state.timeEnd,
            onEnabledChanged: (value) => ref
                .read(createSessionControllerProvider.notifier)
                .setTimeWindowEnabled(value),
            onChanged: (start, end) => ref
                .read(createSessionControllerProvider.notifier)
                .setTimeWindow(start, end),
          ),
          const SizedBox(height: AppSpacing.m),
          RadiusSlider(
            radiusMeters: state.radiusMeters,
            onChanged: (value) =>
                ref.read(createSessionControllerProvider.notifier).setRadiusMeters(value),
          ),
          const SizedBox(height: AppSpacing.m),
          Text('Categories', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.s),
          CategoryPicker(
            selected: state.categories,
            onToggle: (category) =>
                ref.read(createSessionControllerProvider.notifier).toggleCategory(category),
          ),
          const SizedBox(height: AppSpacing.m),
          Text('Price level', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.s),
          SegmentedButton<int?>(
            segments: const [
              ButtonSegment<int?>(value: null, label: Text('Any')),
              ButtonSegment<int?>(value: 1, label: Text(r'$')),
              ButtonSegment<int?>(value: 2, label: Text(r'$$')),
              ButtonSegment<int?>(value: 3, label: Text(r'$$$')),
              ButtonSegment<int?>(value: 4, label: Text(r'$$$$')),
            ],
            selected: {state.priceLevelMax},
            onSelectionChanged: (selection) => ref
                .read(createSessionControllerProvider.notifier)
                .setPriceLevelMax(selection.isEmpty ? null : selection.first),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Open now only'),
            value: state.openNow,
            onChanged: (value) =>
                ref.read(createSessionControllerProvider.notifier).setOpenNow(value),
          ),
          const SizedBox(height: AppSpacing.s),
          OutlinedButton.icon(
            onPressed: () async {
              await InviteFriendsSheet.show(
                context,
                inviteLink: 'https://ourplanplan.com/invite/preview',
              );
              if (!mounted) {
                return;
              }
              final contacts = ref.read(contactsControllerProvider).selectedContacts;
              ref
                  .read(createSessionControllerProvider.notifier)
                  .setSelectedContacts(contacts);
            },
            icon: const Icon(Icons.group),
            label: Text('Select friends (${state.selectedContacts.length})'),
          ),
          if (state.selectedContacts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.s),
              child: Wrap(
                spacing: 8,
                children: state.selectedContacts
                    .map((contact) => Chip(label: Text(contact.displayName)))
                    .toList(growable: false),
              ),
            ),
          const SizedBox(height: AppSpacing.l),
          FilledButton(
            onPressed: state.canCreate && !state.isSaving
                ? () => _onCreatePressed(context, ref)
                : null,
            child: state.isSaving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create Session'),
          ),
        ],
      ),
    );
  }

  Future<void> _onCreatePressed(BuildContext context, WidgetRef ref) async {
    final session =
        await ref.read(createSessionControllerProvider.notifier).createSession();
    if (session == null || !context.mounted) {
      return;
    }

    await ref.read(sessionsControllerProvider.notifier).loadSessions();

    if (!context.mounted) {
      return;
    }
    context.go('/sessions/${session.sessionId}');
    await _showInviteNowSheet(context, ref, session.sessionId);
  }

  Future<void> _showInviteNowSheet(
    BuildContext context,
    WidgetRef ref,
    String sessionId,
  ) {
    final link = 'https://ourplanplan.com/invite/$sessionId';
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Invite friends now?', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.s),
              Text(link),
              const SizedBox(height: AppSpacing.m),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await ref.read(shareServiceProvider).copyToClipboard(link);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Invite link copied')),
                          );
                        }
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Copy'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        ref.read(shareServiceProvider).shareText(
                              'Join my OurPlanPlan session: $link',
                              subject: 'Join my OurPlanPlan session',
                            );
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
