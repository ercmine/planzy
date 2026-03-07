import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../permissions/permission_state.dart';
import 'contact_models.dart';
import 'contacts_service.dart';

class ContactsState {
  const ContactsState({
    required this.isLoading,
    required this.permissionState,
    required this.contacts,
    required this.selectedIds,
    this.errorMessage,
  });

  factory ContactsState.initial() {
    return const ContactsState(
      isLoading: false,
      permissionState: PermissionState.unknown,
      contacts: <AppContact>[],
      selectedIds: <String>{},
    );
  }

  final bool isLoading;
  final PermissionState permissionState;
  final List<AppContact> contacts;
  final Set<String> selectedIds;
  final String? errorMessage;

  List<AppContact> get selectedContacts {
    return contacts.where((c) => selectedIds.contains(c.id)).toList(growable: false);
  }

  ContactsState copyWith({
    bool? isLoading,
    PermissionState? permissionState,
    List<AppContact>? contacts,
    Set<String>? selectedIds,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ContactsState(
      isLoading: isLoading ?? this.isLoading,
      permissionState: permissionState ?? this.permissionState,
      contacts: contacts ?? this.contacts,
      selectedIds: selectedIds ?? this.selectedIds,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class ContactsController extends StateNotifier<ContactsState> {
  ContactsController({required ContactsService contactsService})
      : _contactsService = contactsService,
        super(ContactsState.initial());

  final ContactsService _contactsService;

  Future<void> requestAndLoad() async {
    state = state.copyWith(isLoading: true, clearError: true);

    final permission = await _contactsService.requestPermission();
    if (permission != PermissionState.granted &&
        permission != PermissionState.limited) {
      state = state.copyWith(
        isLoading: false,
        permissionState: permission,
      );
      return;
    }

    try {
      final contacts = await _contactsService.loadContacts();
      state = state.copyWith(
        isLoading: false,
        permissionState: permission,
        contacts: contacts,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        permissionState: permission,
        errorMessage: error.toString(),
      );
    }
  }

  void toggleSelected(String contactId) {
    final updated = Set<String>.from(state.selectedIds);
    if (updated.contains(contactId)) {
      updated.remove(contactId);
    } else {
      updated.add(contactId);
    }
    state = state.copyWith(selectedIds: updated);
  }

  void clearSelection() {
    state = state.copyWith(selectedIds: <String>{});
  }
}
