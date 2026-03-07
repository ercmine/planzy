import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contacts/contact_models.dart';
import '../../../models/session.dart';
import '../../../models/session_filters.dart';
import '../../../models/session_member.dart';
import '../../../repositories/sessions_repository.dart';

class CreateSessionState {
  const CreateSessionState({
    required this.title,
    required this.radiusMeters,
    required this.categories,
    required this.priceLevelMax,
    required this.openNow,
    required this.timeWindowEnabled,
    this.timeStart,
    this.timeEnd,
    required this.selectedContacts,
    required this.isSaving,
  });

  factory CreateSessionState.initial() => const CreateSessionState(
        title: '',
        radiusMeters: 5000,
        categories: <Category>{},
        priceLevelMax: null,
        openNow: false,
        timeWindowEnabled: false,
        selectedContacts: <AppContact>[],
        isSaving: false,
      );

  final String title;
  final int radiusMeters;
  final Set<Category> categories;
  final int? priceLevelMax;
  final bool openNow;
  final bool timeWindowEnabled;
  final DateTime? timeStart;
  final DateTime? timeEnd;
  final List<AppContact> selectedContacts;
  final bool isSaving;

  bool get canCreate => title.trim().isNotEmpty && !isSaving;

  SessionFilters toFilters() {
    final timeWindow = timeWindowEnabled && timeStart != null && timeEnd != null
        ? SessionTimeWindow(
            startISO: timeStart!.toUtc().toIso8601String(),
            endISO: timeEnd!.toUtc().toIso8601String(),
          )
        : null;

    return SessionFilters(
      radiusMeters: radiusMeters,
      categories: categories.toList(growable: false),
      priceLevelMax: priceLevelMax,
      openNow: openNow,
      timeWindow: timeWindow,
    );
  }

  List<SessionMember> toMembers() {
    return selectedContacts
        .map(
          (contact) => SessionMember(
            id: contact.id,
            displayName: contact.displayName,
            phonesE164: contact.phonesE164,
          ),
        )
        .toList(growable: false);
  }

  CreateSessionState copyWith({
    String? title,
    int? radiusMeters,
    Set<Category>? categories,
    int? priceLevelMax,
    bool clearPriceLevelMax = false,
    bool? openNow,
    bool? timeWindowEnabled,
    DateTime? timeStart,
    DateTime? timeEnd,
    bool clearTimeWindow = false,
    List<AppContact>? selectedContacts,
    bool? isSaving,
  }) {
    return CreateSessionState(
      title: title ?? this.title,
      radiusMeters: radiusMeters ?? this.radiusMeters,
      categories: categories ?? this.categories,
      priceLevelMax: clearPriceLevelMax ? null : (priceLevelMax ?? this.priceLevelMax),
      openNow: openNow ?? this.openNow,
      timeWindowEnabled: timeWindowEnabled ?? this.timeWindowEnabled,
      timeStart: clearTimeWindow ? null : (timeStart ?? this.timeStart),
      timeEnd: clearTimeWindow ? null : (timeEnd ?? this.timeEnd),
      selectedContacts: selectedContacts ?? this.selectedContacts,
      isSaving: isSaving ?? this.isSaving,
    );
  }
}

class CreateSessionController extends StateNotifier<CreateSessionState> {
  CreateSessionController({required SessionsRepository sessionsRepository})
      : _sessionsRepository = sessionsRepository,
        super(CreateSessionState.initial());

  final SessionsRepository _sessionsRepository;

  void setTitle(String value) => state = state.copyWith(title: value);

  void setRadiusMeters(int value) => state = state.copyWith(radiusMeters: value);

  void toggleCategory(Category category) {
    final updated = Set<Category>.from(state.categories);
    if (updated.contains(category)) {
      updated.remove(category);
    } else {
      updated.add(category);
    }
    state = state.copyWith(categories: updated);
  }

  void setPriceLevelMax(int? level) {
    if (level == null) {
      state = state.copyWith(clearPriceLevelMax: true);
      return;
    }
    state = state.copyWith(priceLevelMax: level);
  }

  void setOpenNow(bool value) => state = state.copyWith(openNow: value);

  void setTimeWindowEnabled(bool enabled) {
    state = enabled
        ? state.copyWith(timeWindowEnabled: true)
        : state.copyWith(timeWindowEnabled: false, clearTimeWindow: true);
  }

  void setTimeWindow(DateTime start, DateTime end) {
    state = state.copyWith(timeStart: start, timeEnd: end);
  }

  void setSelectedContacts(List<AppContact> contacts) {
    state = state.copyWith(selectedContacts: contacts);
  }

  Future<Session?> createSession() async {
    if (!state.canCreate) {
      return null;
    }

    state = state.copyWith(isSaving: true);
    try {
      final session = await _sessionsRepository.createLocalSession(
        title: state.title.trim(),
        filters: state.toFilters(),
        members: state.toMembers(),
      );
      state = state.copyWith(isSaving: false);
      return session;
    } catch (_) {
      state = state.copyWith(isSaving: false);
      rethrow;
    }
  }
}
