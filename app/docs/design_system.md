# Perbug design system foundations

This document defines the shared UI foundation used across Flutter surfaces.

## Design tokens

Core token files:

- `lib/app/theme/color_scheme.dart` — semantic color schemes for light/dark modes.
- `lib/app/theme/spacing.dart` — spacing scale and base radii.
- `lib/app/theme/typography.dart` — typography hierarchy.
- `lib/app/theme/tokens.dart` — reusable radius, icon, motion, and elevation tokens.

### Token usage rules

1. Prefer token constants over ad hoc doubles/colors in widgets.
2. Use semantic colors via `Theme.of(context).colorScheme`.
3. For motion, use `AppMotion` instead of inline durations.
4. Use shared radius and icon sizes from `AppRadius`/`AppIconSize`.

## Shared components

Current reusable primitives:

- `PrimaryButton`, `SecondaryButton`, `AppCard`, `AppPill`, `AppIconButton` in `lib/app/theme/widgets.dart`.
- `AppSectionCard` in `lib/core/widgets/section_card.dart` for title+icon card sections.
- `AppStatePanel`, `AppErrorPanel`, `AppLoadingCardList` in `lib/core/widgets/state_panels.dart`.

Use these before introducing one-off versions in feature folders.

## Formatting and naming conventions

- Geo/search labels should use `lib/core/format/formatters.dart` (`formatDistanceMeters`, `formatSourceLabel`, `formatReviewCount`).
- Keep model/view-model naming explicit (`PlaceCardViewModel`, `ResultFeedItem`, etc.).
- Use `*Preferences*` suffix for settings/preference sheets.

## Placement guidance

- Add new tokens only under `lib/app/theme/`.
- Add app-wide reusable widgets under `lib/core/widgets/`.
- Keep feature-specific adapters inside their feature module.
- Promote duplicated feature widgets/helpers to shared modules once reused by 2+ features.
