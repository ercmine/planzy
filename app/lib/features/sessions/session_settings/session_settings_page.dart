import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/theme/spacing.dart';
import '../../../../models/session_filters.dart';
import '../../../../providers/app_providers.dart';
import '../create_session/widgets/category_picker.dart';
import '../create_session/widgets/radius_slider.dart';

class SessionSettingsPage extends ConsumerStatefulWidget {
  const SessionSettingsPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<SessionSettingsPage> createState() => _SessionSettingsPageState();
}

class _SessionSettingsPageState extends ConsumerState<SessionSettingsPage> {
  late SessionFilters _draftFilters;
  bool _draftReady = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionSettingsControllerProvider(widget.sessionId));
    final controller = ref.read(sessionSettingsControllerProvider(widget.sessionId).notifier);

    if (!_draftReady && state.session != null) {
      _draftFilters = state.session!.filters;
      _draftReady = true;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Session Settings')),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.session == null
              ? const Center(child: Text('Session not found'))
              : ListView(
                  padding: const EdgeInsets.all(AppSpacing.m),
                  children: [
                    Text('Filters', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: AppSpacing.s),
                    RadiusSlider(
                      radiusMeters: _draftFilters.radiusMeters,
                      onChanged: (value) {
                        setState(() {
                          _draftFilters = _draftFilters.copyWith(radiusMeters: value);
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.s),
                    CategoryPicker(
                      selected: _draftFilters.categories.toSet(),
                      onToggle: (category) {
                        final updated = _draftFilters.categories.toSet();
                        if (updated.contains(category)) {
                          updated.remove(category);
                        } else {
                          updated.add(category);
                        }
                        setState(() {
                          _draftFilters =
                              _draftFilters.copyWith(categories: updated.toList());
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.s),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Open now only'),
                      value: _draftFilters.openNow,
                      onChanged: (value) =>
                          setState(() => _draftFilters = _draftFilters.copyWith(openNow: value)),
                    ),
                    const SizedBox(height: AppSpacing.s),
                    SegmentedButton<int?>(
                      segments: const [
                        ButtonSegment<int?>(value: null, label: Text('Any')),
                        ButtonSegment<int?>(value: 1, label: Text(r'$')),
                        ButtonSegment<int?>(value: 2, label: Text(r'$$')),
                        ButtonSegment<int?>(value: 3, label: Text(r'$$$')),
                        ButtonSegment<int?>(value: 4, label: Text(r'$$$$')),
                      ],
                      selected: {_draftFilters.priceLevelMax},
                      onSelectionChanged: (selection) {
                        setState(() {
                          _draftFilters =
                              _draftFilters.copyWith(priceLevelMax: selection.first);
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.m),
                    FilledButton(
                      onPressed: state.isSaving
                          ? null
                          : () async {
                              await controller.updateFilters(_draftFilters);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Saved settings')),
                                );
                              }
                            },
                      child: const Text('Save filters'),
                    ),
                    const Divider(height: AppSpacing.xl),
                    Text('Members', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: AppSpacing.s),
                    ...state.session!.members.map(
                      (member) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.person),
                        title: Text(member.displayName),
                        subtitle:
                            member.phonesE164.isNotEmpty ? Text(member.phonesE164.first) : null,
                      ),
                    ),
                    if (state.session!.members.isEmpty)
                      const Text('No members yet.'),
                    const Divider(height: AppSpacing.xl),
                    OutlinedButton(
                      onPressed: () async {
                        await controller.leaveSession();
                        await ref.read(sessionsControllerProvider.notifier).loadSessions();
                        if (context.mounted) {
                          context.go('/sessions');
                        }
                      },
                      child: const Text('Leave session'),
                    ),
                    const SizedBox(height: AppSpacing.s),
                    FilledButton.tonal(
                      onPressed: () async {
                        await controller.deleteSession();
                        await ref.read(sessionsControllerProvider.notifier).loadSessions();
                        if (context.mounted) {
                          context.go('/sessions');
                        }
                      },
                      child: const Text('Delete local session'),
                    ),
                  ],
                ),
    );
  }
}
