class CreateIdeaRequest {
  const CreateIdeaRequest({
    required this.title,
    this.description,
    this.category,
    this.priceLevel,
    this.websiteLink,
    this.callLink,
  });

  final String title;
  final String? description;
  final String? category;
  final int? priceLevel;
  final String? websiteLink;
  final String? callLink;

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'category': category,
        'priceLevel': priceLevel,
        'websiteLink': websiteLink,
        'callLink': callLink,
      };

  factory CreateIdeaRequest.fromJson(Map<String, dynamic> json) => CreateIdeaRequest(
        title: (json['title'] ?? '').toString(),
        description: json['description']?.toString(),
        category: json['category']?.toString(),
        priceLevel: json['priceLevel'] is num ? (json['priceLevel'] as num).toInt() : null,
        websiteLink: json['websiteLink']?.toString(),
        callLink: json['callLink']?.toString(),
      );
}

class CreateIdeaResponse {
  const CreateIdeaResponse({required this.ideaId, required this.createdAtISO});

  final String ideaId;
  final String createdAtISO;

  factory CreateIdeaResponse.fromJson(Map<String, dynamic> json) => CreateIdeaResponse(
        ideaId: (json['ideaId'] ?? json['id'] ?? '').toString(),
        createdAtISO: (json['createdAtISO'] ?? json['createdAt'] ?? '').toString(),
      );
}

class IdeaItem {
  const IdeaItem({
    required this.ideaId,
    required this.title,
    required this.createdAtISO,
    this.description,
    this.category,
    this.priceLevel,
    this.websiteLink,
    this.callLink,
    this.createdByUserId,
  });

  final String ideaId;
  final String title;
  final String? description;
  final String? category;
  final int? priceLevel;
  final String? websiteLink;
  final String? callLink;
  final String createdAtISO;
  final String? createdByUserId;

  factory IdeaItem.fromJson(Map<String, dynamic> json) => IdeaItem(
        ideaId: (json['ideaId'] ?? json['id'] ?? '').toString(),
        title: (json['title'] ?? json['name'] ?? '').toString(),
        description: json['description']?.toString(),
        category: json['category']?.toString(),
        priceLevel: json['priceLevel'] is num ? (json['priceLevel'] as num).toInt() : null,
        websiteLink: json['websiteLink']?.toString(),
        callLink: json['callLink']?.toString(),
        createdAtISO: (json['createdAtISO'] ?? json['createdAt'] ?? '').toString(),
        createdByUserId: json['createdByUserId']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'ideaId': ideaId,
        'title': title,
        'description': description,
        'category': category,
        'priceLevel': priceLevel,
        'websiteLink': websiteLink,
        'callLink': callLink,
        'createdAtISO': createdAtISO,
        'createdByUserId': createdByUserId,
      };
}

extension IdeaItemCompatX on IdeaItem {
  String get id => ideaId;
}

class ListIdeasResponse {
  const ListIdeasResponse({required this.sessionId, this.ideas = const <IdeaItem>[], this.nextCursor});

  final String sessionId;
  final List<IdeaItem> ideas;
  final String? nextCursor;

  factory ListIdeasResponse.fromJson(Map<String, dynamic> json) => ListIdeasResponse(
        sessionId: (json['sessionId'] ?? '').toString(),
        ideas: (json['ideas'] as List? ?? const [])
            .whereType<Map>()
            .map((item) => IdeaItem.fromJson(item.map((k, v) => MapEntry(k.toString(), v))))
            .toList(growable: false),
        nextCursor: json['nextCursor']?.toString(),
      );
}
