export type TelemetryEventName =
  | "deck_loaded"
  | "card_viewed"
  | "card_opened"
  | "swipe"
  | "outbound_link_clicked";

export type SwipeAction = "yes" | "no" | "maybe";

export interface TelemetryEventBase {
  event: TelemetryEventName;
  sessionId: string;
  planId?: string;
  clientAtISO?: string;
  deckKey?: string;
  cursor?: string | null;
  position?: number;
  source?: string;
}

export interface DeckLoadedEvent extends TelemetryEventBase {
  event: "deck_loaded";
  batchSize: number;
  returned: number;
  nextCursorPresent: boolean;
  planSourceCounts?: Record<string, number>;
}

export interface CardViewedEvent extends TelemetryEventBase {
  event: "card_viewed";
  planId: string;
  viewMs?: number;
}

export interface CardOpenedEvent extends TelemetryEventBase {
  event: "card_opened";
  planId: string;
  section?: "details" | "links" | "photos";
}

export interface SwipeEvent extends TelemetryEventBase {
  event: "swipe";
  planId: string;
  action: SwipeAction;
}

export interface OutboundLinkClickedEvent extends TelemetryEventBase {
  event: "outbound_link_clicked";
  planId: string;
  linkType: "maps" | "website" | "call" | "booking" | "ticket";
  affiliate?: boolean;
}

export type TelemetryEventInput =
  | DeckLoadedEvent
  | CardViewedEvent
  | CardOpenedEvent
  | SwipeEvent
  | OutboundLinkClickedEvent;

export interface TelemetryRecord {
  telemetryId: string;
  sessionId: string;
  event: TelemetryEventName;
  userId?: string;
  requestId?: string;
  serverAtISO: string;
  clientAtISO?: string;
  payload: TelemetryEventInput;
}

export interface IngestResult {
  accepted: number;
  rejected: number;
  errors?: Array<{ index: number; reason: string }>;
}
