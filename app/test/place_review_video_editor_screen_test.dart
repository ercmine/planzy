import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:perbug/api/api_client.dart';
import 'package:perbug/app/theme/app_theme.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/cache/local_store.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/features/place_review_editor/data/place_review_draft_store.dart';
import 'package:perbug/features/place_review_editor/place_review_editor_controller.dart';
import 'package:perbug/features/place_review_editor/place_review_video_editor_screen.dart';
import 'package:perbug/features/place_review_editor/services/place_review_upload_service.dart';
import 'package:perbug/features/video_platform/video_models.dart';
import 'package:perbug/features/video_platform/video_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

Finder _textFieldByLabel(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.labelText == label,
    description: 'TextField(labelText: $label)',
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late PlaceReviewDraftStore draftStore;
  late PlaceReviewUploadService uploadService;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    draftStore = PlaceReviewDraftStore(LocalStore(prefs));
    uploadService = PlaceReviewUploadService(
      videoRepository: VideoRepository(
        apiClient: ApiClient(
          httpClient: http.Client(),
          envConfig: EnvConfig(
            flavor: EnvFlavor.dev,
            apiBaseUrl: 'https://api.perbug.test',
            enableDebugLogs: false,
            associatedDomain: 'perbug.test',
            adsConfig: AdsConfig.disabled(),
            fsqApiKey: null,
          ),
          userIdResolver: () async => 'test-user',
        ),
      ),
    );
  });

  Widget buildSubject({PlaceSearchResult? initialPlace}) {
    return ProviderScope(
      overrides: [
        placeReviewDraftStoreProvider.overrideWith((ref) async => draftStore),
        placeReviewUploadServiceProvider.overrideWith((ref) async => uploadService),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: PlaceReviewVideoEditorScreen(initialPlace: initialPlace),
      ),
    );
  }

  testWidgets('single-line review detail fields stay single-line while editing', (tester) async {
    await tester.pumpWidget(buildSubject());
    await tester.pumpAndSettle();

    final titleField = _textFieldByLabel('Review title');
    expect(titleField, findsOneWidget);

    await tester.enterText(titleField, 'O\nr\nb\ni\nt');
    await tester.pump();

    expect(find.text('Orbit'), findsOneWidget);

    final titleTextField = tester.widget<TextField>(titleField);
    expect(titleTextField.controller!.text, 'Orbit');

    final whatToOrderField = _textFieldByLabel('What to order');
    await tester.enterText(whatToOrderField, 'Fries\nand\nshake');
    await tester.pump();

    final whatToOrderTextField = tester.widget<TextField>(whatToOrderField);
    expect(whatToOrderTextField.controller!.text, 'Friesandshake');
  });

  testWidgets('attached place details hide empty separators on create review screen', (tester) async {
    await tester.pumpWidget(
      buildSubject(
        initialPlace: const PlaceSearchResult(
          placeId: 'place-1',
          name: 'Cafe Orbit',
          category: '',
          regionLabel: 'Downtown',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Cafe Orbit'), findsOneWidget);
    expect(find.text('Downtown'), findsOneWidget);
    expect(find.textContaining('•'), findsNothing);
  });
}
