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
