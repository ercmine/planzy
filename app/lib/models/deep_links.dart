import 'package:freezed_annotation/freezed_annotation.dart';

part 'deep_links.freezed.dart';
part 'deep_links.g.dart';

@freezed
class DeepLinks with _$DeepLinks {
  const factory DeepLinks({
    String? mapsLink,
    String? websiteLink,
    String? callLink,
    String? bookingLink,
    String? ticketLink,
  }) = _DeepLinks;

  factory DeepLinks.fromJson(Map<String, dynamic> json) =>
      _$DeepLinksFromJson(json);
}
