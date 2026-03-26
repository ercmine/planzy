import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/dryad/chain/nft_metadata.dart';

void main() {
  test('parses base64 JSON tokenURI with image_data SVG', () {
    final jsonMetadata = jsonEncode({
      'name': 'Tree #1',
      'image_data': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    });

    final tokenUri = 'data:application/json;base64,${base64.encode(utf8.encode(jsonMetadata))}';
    final artwork = parseNftArtworkFromTokenUri(tokenUri);

    expect(artwork.name, 'Tree #1');
    expect(artwork.svgMarkup, contains('<svg'));
  });

  test('parses image field as data:image/svg+xml;base64 URI', () {
    final svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    final metadata = jsonEncode({
      'name': 'Tree #2',
      'image': 'data:image/svg+xml;base64,${base64.encode(utf8.encode(svg))}',
    });

    final artwork = parseNftArtworkFromTokenUri(metadata);
    expect(artwork.svgMarkup, contains('<rect'));
  });
}
