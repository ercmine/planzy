import 'dart:convert';

class NftArtwork {
  const NftArtwork({
    required this.name,
    required this.description,
    required this.imageSource,
    required this.svgMarkup,
    required this.attributes,
  });

  final String? name;
  final String? description;
  final String? imageSource;
  final String? svgMarkup;
  final List<Map<String, dynamic>> attributes;

  bool get hasRenderableArtwork => svgMarkup != null || imageSource != null;
}

NftArtwork parseNftArtworkFromTokenUri(String tokenUri) {
  final trimmed = tokenUri.trim();
  if (trimmed.startsWith('<svg')) {
    return NftArtwork(name: null, description: null, imageSource: null, svgMarkup: trimmed, attributes: const []);
  }

  final decodedTokenUri = _decodeDataPayload(trimmed);
  final metadataRaw = decodedTokenUri ?? trimmed;

  if (metadataRaw.trim().startsWith('<svg')) {
    return NftArtwork(name: null, description: null, imageSource: null, svgMarkup: metadataRaw, attributes: const []);
  }

  final metadata = jsonDecode(metadataRaw) as Map<String, dynamic>;
  final imageCandidate = metadata['image_data']?.toString() ?? metadata['image']?.toString();
  final svgFromImage = _decodeSvg(imageCandidate);

  return NftArtwork(
    name: metadata['name']?.toString(),
    description: metadata['description']?.toString(),
    imageSource: imageCandidate,
    svgMarkup: svgFromImage,
    attributes: ((metadata['attributes'] as List?) ?? const <dynamic>[])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList(growable: false),
  );
}

String? _decodeDataPayload(String input) {
  if (!input.startsWith('data:')) return null;
  final comma = input.indexOf(',');
  if (comma <= 0) return null;

  final meta = input.substring(0, comma).toLowerCase();
  final payload = input.substring(comma + 1);

  if (meta.contains(';base64')) {
    return utf8.decode(base64.decode(payload));
  }
  return Uri.decodeComponent(payload);
}

String? _decodeSvg(String? imageCandidate) {
  if (imageCandidate == null || imageCandidate.trim().isEmpty) return null;
  final value = imageCandidate.trim();
  if (value.startsWith('<svg')) return value;

  if (value.startsWith('data:image/svg+xml')) {
    final decoded = _decodeDataPayload(value);
    if (decoded != null && decoded.trim().startsWith('<svg')) {
      return decoded;
    }
  }

  return null;
}
