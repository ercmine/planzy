import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/contacts/contacts_controller.dart';
import '../../providers/app_providers.dart';

class InviteFriendsSheet extends ConsumerStatefulWidget {
  const InviteFriendsSheet({
    required this.inviteLink,
    super.key,
  });

  final String inviteLink;

  static Future<void> show(BuildContext context, {required String inviteLink}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => InviteFriendsSheet(inviteLink: inviteLink),
    );
  }

  @override
  ConsumerState<InviteFriendsSheet> createState() => _InviteFriendsSheetState();
}

class _InviteFriendsSheetState extends ConsumerState<InviteFriendsSheet> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(contactsControllerProvider.notifier).requestAndLoad();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final contactsState = ref.watch(contactsControllerProvider);
    final query = _searchController.text.trim().toLowerCase();
    final filtered = contactsState.contacts.where((contact) {
      if (query.isEmpty) {
        return true;
      }
      return contact.displayName.toLowerCase().contains(query);
    }).toList(growable: false);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Invite friends', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search contacts',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            Text('Selected: ${contactsState.selectedIds.length}'),
            const SizedBox(height: 8),
            Expanded(
              child: contactsState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final contact = filtered[index];
                        final selected = contactsState.selectedIds.contains(contact.id);

                        return CheckboxListTile(
                          value: selected,
                          title: Text(contact.displayName),
                          subtitle: contact.phonesE164.isNotEmpty
                              ? Text(contact.phonesE164.first)
                              : const Text('No normalized phone'),
                          onChanged: (_) {
                            ref
                                .read(contactsControllerProvider.notifier)
                                .toggleSelected(contact.id);
                          },
                        );
                      },
                    ),
            ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await ref
                          .read(shareServiceProvider)
                          .copyToClipboard(widget.inviteLink);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Invite link copied')),
                        );
                      }
                    },
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy link'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      ref.read(shareServiceProvider).shareText(
                            'Join my Dryad session: ${widget.inviteLink}',
                            subject: 'Dryad invite',
                          );
                    },
                    icon: const Icon(Icons.share),
                    label: const Text('Invite via link'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
