export interface CreateReviewInput {
  placeId: string;
  userId: string;
  actingProfileType?: "PERSONAL" | "CREATOR" | "BUSINESS";
  actingProfileId?: string;
  displayName: string;
  rating: number;
  text: string;
  anonymous: boolean;
  createdAt?: Date;
}

export interface PlaceReview {
  id: string;
  placeId: string;
  userId: string;
  actingProfileType: "PERSONAL" | "CREATOR" | "BUSINESS";
  actingProfileId: string;
  displayName: string;
  rating: number;
  text: string;
  createdAt: string;
  anonymous: boolean;
}

export interface ReviewsStore {
  listByPlace(placeId: string): Promise<PlaceReview[]>;
  create(input: CreateReviewInput): Promise<PlaceReview>;
}
