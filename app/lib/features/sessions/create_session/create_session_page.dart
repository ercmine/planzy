import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/spacing.dart';
import '../../../app/theme/widgets.dart';
import '../../../features/session_create/invite_friends_sheet.dart';
import '../../../providers/app_providers.dart';
import 'widgets/category_picker.dart';
import 'widgets/radius_slider.dart';
import 'widgets/time_window_picker.dart';
import '../../../core/widgets/app_back_button.dart';

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

    return AppScaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Create Session')),
      body: ListView(
        children: [
          const AppSectionHeader(title: 'Session details', subtitle: 'Name your plan and tune preferences.'),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: TextField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Title', hintText: 'Friday night ideas'),
              onChanged: (value) => ref.read(createSessionControllerProvider.notifier).setTitle(value),
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: TimeWindowPicker(
              enabled: state.timeWindowEnabled,
              start: state.timeStart,
              end: state.timeEnd,
              onEnabledChanged: (value) => ref.read(createSessionControllerProvider.notifier).setTimeWindowEnabled(value),
              onChanged: (start, end) => ref.read(createSessionControllerProvider.notifier).setTimeWindow(start, end),
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: RadiusSlider(
              radiusMeters: state.radiusMeters,
              onChanged: (value) => ref.read(createSessionControllerProvider.notifier).setRadiusMeters(value),
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Categories', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.s),
                CategoryPicker(
                  selected: state.categories,
                  onToggle: (category) => ref.read(createSessionControllerProvider.notifier).toggleCategory(category),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Budget', style: Theme.of(context).textTheme.titleMedium),
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
                  onSelectionChanged: (selection) => ref.read(createSessionControllerProvider.notifier).setPriceLevelMax(selection.isEmpty ? null : selection.first),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Open now only'),
                  value: state.openNow,
                  onChanged: (value) => ref.read(createSessionControllerProvider.notifier).setOpenNow(value),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Friends', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.s),
                SecondaryButton(
                  onPressed: () async {
                    await InviteFriendsSheet.show(context, inviteLink: 'https://perbug.com/invite/preview');
                    if (!mounted) {
                      return;
                    }
                    final contacts = ref.read(contactsControllerProvider).selectedContacts;
                    ref.read(createSessionControllerProvider.notifier).setSelectedContacts(contacts);
                  },
                  icon: const Icon(Icons.group),
                  label: 'Select friends (${state.selectedContacts.length})',
                ),
                if (state.selectedContacts.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.s),
                    child: Wrap(
                      spacing: AppSpacing.s,
                      children: state.selectedContacts.map((c) => Chip(label: Text(c.displayName))).toList(growable: false),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            onPressed: state.canCreate && !state.isSaving ? () => _onCreatePressed(context, ref) : null,
            isLoading: state.isSaving,
            label: 'Create Session',
          ),
        ],
      ),
    );
  }

  Future<void> _onCreatePressed(BuildContext context, WidgetRef ref) async {
    final session = await ref.read(createSessionControllerProvider.notifier).createSession();
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

  Future<void> _showInviteNowSheet(BuildContext context, WidgetRef ref, String sessionId) {
    final link = 'https://perbug.com/invite/$sessionId';
    return showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Invite now?', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.s),
              Text(link),
              const SizedBox(height: AppSpacing.m),
              Row(
                children: [
                  Expanded(
                    child: SecondaryButton(
                      onPressed: () async {
                        await ref.read(shareServiceProvider).copyToClipboard(link);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite link copied')));
                        }
                      },
                      icon: const Icon(Icons.copy),
                      label: 'Copy',
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s),
                  Expanded(
                    child: PrimaryButton(
                      onPressed: () {
                        ref.read(shareServiceProvider).shareText(
                              'Join my Perbug session: $link',
                              subject: 'Join my Perbug session',
                            );
                      },
                      icon: const Icon(Icons.share),
                      label: 'Share',
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
