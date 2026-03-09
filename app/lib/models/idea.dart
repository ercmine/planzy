import 'package:freezed_annotation/freezed_annotation.dart';

part 'idea.freezed.dart';
part 'idea.g.dart';

@freezed
class CreateIdeaRequest with _$CreateIdeaRequest {
  const factory CreateIdeaRequest({
    required String title,
    String? description,
    String? category,
    int? priceLevel,
    String? websiteLink,
    String? callLink,
  }) = _CreateIdeaRequest;

  factory CreateIdeaRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateIdeaRequestFromJson(json);
}

@freezed
class CreateIdeaResponse with _$CreateIdeaResponse {
  const factory CreateIdeaResponse({
    required String ideaId,
    required String createdAtISO,
  }) = _CreateIdeaResponse;

  factory CreateIdeaResponse.fromJson(Map<String, dynamic> json) =>
      _$CreateIdeaResponseFromJson(json);
}

@freezed
class IdeaItem with _$IdeaItem {
  const factory IdeaItem({
    required String ideaId,
    required String title,
    String? description,
    String? category,
    int? priceLevel,
    String? websiteLink,
    String? callLink,
    required String createdAtISO,
    String? createdByUserId,
  }) = _IdeaItem;

  factory IdeaItem.fromJson(Map<String, dynamic> json) =>
      _$IdeaItemFromJson(<String, dynamic>{
        ...json,
        'ideaId': json['ideaId'] ?? json['id'],
      });
}

extension IdeaItemCompatX on IdeaItem {
  String get id => ideaId;
}

@freezed
class ListIdeasResponse with _$ListIdeasResponse {
  const factory ListIdeasResponse({
    required String sessionId,
    @Default(<IdeaItem>[]) List<IdeaItem> ideas,
    String? nextCursor,
  }) = _ListIdeasResponse;

  factory ListIdeasResponse.fromJson(Map<String, dynamic> json) =>
      _$ListIdeasResponseFromJson(json);
}
