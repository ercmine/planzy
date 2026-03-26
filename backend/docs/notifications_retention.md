# Dryad Notifications + Retention Loop Design

This subsystem uses in-app notifications as the source of truth and layers push delivery readiness on top.

## Core model
- Structured notification entity with recipient, actor, canonical place/creator references, deep-link route payload, read/unread status, dedupe keys, delivery status, and typed metadata.
- Notification categories cover social graph, creator studio lifecycle, saved place activity, local discovery, moderation, and guides.
- Event-driven `NotificationEvent` union maps product events into render-ready notifications.

## Retention loops implemented
1. **Creator publish loop**
   - `video.processing.finished`, `video.published`, `video.processing.failed`, `video.moderation.changed`
   - Deep-links to studio video management.
2. **Follow loop**
   - `creator.followed.posted` for followed creator uploads.
   - Routes to feed video context.
3. **Saved place loop**
   - `saved.place.new_videos` coalesces repeated updates by place/day.
4. **Local discovery loop**
   - `discovery.local.highlights` routes users back into Local feed scope.
5. **Draft recovery loop**
   - `studio.draft.reminder` bounded to daily frequency with dedupe.

## Push-ready foundations
- Device token registration/unregistration/list APIs.
- Per-category preference controls for in-app, push, and email flags.
- Delivery attempts modeled per channel, in-app delivery recorded immediately.

## API additions
- `POST /v1/notifications/device-tokens`
- `DELETE /v1/notifications/device-tokens`
- `GET /v1/notifications/device-tokens`
- `GET /v1/notifications/metrics`

## Observability and analytics
- In-memory counters track generated, delivered, and suppressed notifications by type/category.
- Dedupe throttle windows reduce spam for discovery/saved place/followed creator/draft reminders.
