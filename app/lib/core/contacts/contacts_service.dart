// iOS Info.plist note: NSContactsUsageDescription is required.
import 'package:flutter_contacts/flutter_contacts.dart';

import '../permissions/permission_service.dart';
import '../permissions/permission_state.dart';
import 'contact_models.dart';
import 'phone_normalize.dart';

class ContactsService {
  ContactsService({required PermissionService permissionService})
      : _permissionService = permissionService;

  final PermissionService _permissionService;

  Future<PermissionState> requestPermission() {
    return _permissionService.requestContacts();
  }

  Future<List<AppContact>> loadContacts() async {
    final hasPermission = await FlutterContacts.requestPermission(readonly: true);
    if (!hasPermission) {
      return const <AppContact>[];
    }

    final contacts = await FlutterContacts.getContacts(
      withProperties: true,
      withPhoto: false,
    );

    return contacts.map((contact) {
      final phones = <String>{};
      for (final phone in contact.phones) {
        final normalized = normalizePhoneToE164(phone.number);
        if (normalized != null) {
          phones.add(normalized);
        }
      }

      final name = [contact.name.first, contact.name.last]
          .where((part) => part.trim().isNotEmpty)
          .join(' ')
          .trim();

      return AppContact(
        id: contact.id,
        displayName: name.isEmpty ? (contact.displayName) : name,
        phonesE164: phones.toList(growable: false),
      );
    }).toList(growable: false);
  }
}
