# Upstream feature license notices

Required Notice: Copyright 2026 JPTER78 (https://github.com/JPTER78/pokesurvivor)

The touch-control positioning, fixed/floating joystick and banner-centering
changes imported/adapted from upstream commit
`4de8495` are under **PolyForm Noncommercial License 1.0.0**.
The complete, unmodified license is in [LICENSE-NONCOMMERCIAL.md](LICENSE-NONCOMMERCIAL.md).
These notices apply to those portions in source, generated JavaScript bundles,
HTML/CSS distributions and Docker images containing them. Retain this notice
and the license when redistributing those distributions.

Code published by upstream through `b297089` retains its original MIT license;
the MIT notice in LICENSE does not relicense the later imported portions.
Third-party assets retain their separate existing licenses and credits.

## Fork adaptations

- Shared HUD geometry and safe-area bounds instead of landscape-only editor sizes.
- Separate portrait/landscape local profiles; equipment can be placed independently.
- Controller-compatible selectors and position sliders, using existing UI focus.
- NAS authentication, account/save storage and network transport are unchanged.

The mobile editor is based on the upstream placement feature; the official-cloud
hostname guard and unrelated upstream changes were not imported.

## Multi-device and emergency-update adaptations (0.8.0)

The multi-device synchronization approach from upstream `bd7f3dd` and the
emergency-update concept from `5bbc3b2` were reviewed and adapted for the NAS
backend. These adapted portions retain PolyForm Noncommercial 1.0.0 and the
Required Notice above in source and distributions.

- `js/core/save-merge.js`, `server/save-merge.cjs`, `server/store.cjs` and
  `js/net/nas.js`: trusted NAS revision bases and atomic economy audit instead
  of Firebase per-device balances; parallel economic edits remain conflicts.
- `js/core/updater.js`, `server/operations.cjs`, `server/app.cjs` and
  `js/ui/server-controls.js`: authenticated admin emergency signal, cancellable
  countdown, normal run settlement and confirmed save flush before reload.

No upstream Firebase blocking functions, official TURN removal or unconditional
forced-reload behavior were imported. Existing NAS relay fallback remains.
