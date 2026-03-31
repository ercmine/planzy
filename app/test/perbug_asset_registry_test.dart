import 'package:perbug/features/home/perbug_asset_registry.dart';
import 'package:perbug/features/home/perbug_game_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PerbugAssetRegistry', () {
    test('covers all node types with icon/tile references', () {
      for (final type in PerbugNodeType.values) {
        final visual = PerbugAssetRegistry.nodeVisual(type);
        expect(visual.label, isNotEmpty);
        expect(visual.iconRef.id, isNotEmpty);
        expect(visual.tileRef.id, isNotEmpty);
        expect(visual.iconRef.sheet, 'perbug_node_icon_sheet');
        expect(visual.tileRef.sheet, 'perbug_node_tiles_sheet');
        expect(visual.iconRef.assetPath, isNotEmpty);
        expect(visual.tileRef.assetPath, isNotEmpty);
      }
    });

    test('covers all unit roles with portrait references', () {
      for (final role in UnitRole.values) {
        final visual = PerbugAssetRegistry.roleVisual(role);
        expect(visual.label, isNotEmpty);
        expect(visual.sheetRef.sheet, isNotEmpty);
        expect(visual.portraitRef.sheet, 'perbug_portrait_sheet');
        expect(visual.sheetRef.assetPath, isNotEmpty);
        expect(visual.portraitRef.assetPath, isNotEmpty);
      }
    });
  });
}
