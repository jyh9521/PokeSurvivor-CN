# 0.13.0: compact controls, starting builds, mixed collection and local music

## Battle controls and mobile upgrades

Desktop controls use a 224 × 102 CSS-pixel frame. Coarse-pointer/touch controls use a distinct compact 164 × 104 frame and retain explicit C/R3 switch and V/L3 activation labels. Phone layouts now have a Special forms control alongside attacks/item/pause/stick. Dragging or sliders save normalized coordinates independently for portrait/landscape, clamped to safe areas. Cancel/reset retain the existing draft transaction. Settings remain device-local, not account/save data.

Level-up dialogs now have an explicit viewport-bounded width and non-shrinking, wrapping cards. The old stylesheet reproducibly changes dialog width between short and long card descriptions at a 320-pixel viewport; the accepted tests cover 320/390/844 widths with both descriptions. Long cards scroll vertically instead of changing modal width.

## Starting skills and class labels

The canonical `G.startMoveOf` now also applies the new selector to personality starters; the old starter table is only a preference, not an unconditional bypass. Candidates come from the actual species pool. A 15% physical/special advantage determines the preferred class; native moves, STAB, original starter preference and practical cooldown further rank candidates. Counter/decoy/buff and special-only moves are excluded as opening attacks. Mixed attackers retain their native/STAB and starter preferences instead of forcing one class. Candidate availability controls fallback; arbitrary moves outside the pool are never granted.

Level-up new/upgrade/evolution cards, initial collection move details and starter preview use the canonical move. Attack cards identify physical/Attack or special/Special Attack scaling. Existing move IDs, ownership, permanent upgrades and learned moves do not migrate.

## Mixed-region gacha

The Mixed regions banner has `gen=0` and its own `pity[0]`. Rarity is rolled first with unchanged weights, then a species is selected uniformly from the eligible rarity across all regions. It does not first roll an equally weighted region. Existing region counters remain untouched. Ticket costs, ten-pull guarantee, shiny availability, fragments and no-repeat legendary eligibility use the existing logic. No save schema or account migration is required.

## Optional original CC0 soundtrack

Settings → Sound → Random BGM is OFF by default. OFF preserves the original synthesized scene soundtrack. ON shuffles three local menu, four ordinary battle and two boss loops by hyperpixel. Songs play to completion and rotate; refill avoids immediate repeats. Scene changes and toggles cancel stale loads and cross-fade. Only two decoded buffers are cached; only the current/next selected file is requested. Load/decode failure returns to the original scene soundtrack. Music gain/mute and sound effects retain their original buses.

These are original instrumental chiptunes, not Pokémon OST recordings. The author's page declares CC0: https://hyperpixel.itch.io/33-free-chiptune-loops . Original titles, source URLs and immutable SHA-256 are recorded in `assets/music/credits.json`. Reimport: `python tools/fetch-bgm.py`; existing hashes are validated. The browser test decodes all nine files and measures non-silent samples; runtime does not eagerly decode all files.

## Event acknowledgement and WebRTC diagnosis

Batched cumulative ACKs are scheduled in a microtask after current-message delivery instead of waiting for the network interval. Existing contiguous ordering, duplicate suppression, room binding, 256-event limit and retry fallback remain. Retries are capped at four per peer/tick with an 800–4000 ms interval adapting to un-retransmitted acknowledgement RTT. No important event is discarded to mask delay.

A controlled replay with three events and no receiver timer reproduces the supplied log's `pendingEvents=3, oldestEventMs=6549` on 0.12.1. The modified path drains all three after the microtask without the timer. This is a timer-stall reproduction, not proof that every source of latency in the original public-network session has disappeared.

RTCPeerConnection capability is resolved dynamically, with Firefox/WebKit aliases where available. The app does not change browser preferences. Diagnostics distinguish interface presence, secure context, constructor failure category, incoming queue count and ACK RTT; no ICE addresses, account IDs or secrets are exported. Format 4 exports the actual application version instead of the old hardcoded 0.10.0.

The user's Floorp preference is already true; that does not identify why that page reported a missing API. Actual local Chrome data-channel round trips and NAS relay/RTC integrations are acceptance evidence. The downloaded Playwright Firefox executable was rejected by this host (`spawn UNKNOWN`, unsigned executable); this is retained in `artifacts/comfort-release/firefox-launch-failed.log`, not represented as a Firefox/Floorp pass. The new version's diagnostics support further verification on the user's actual Floorp session without guessing or changing privacy settings.

## Verification

- `node --test tests/*.test.cjs`
- `node tests/comfort-browser.cjs` (Chrome touch and desktop, real saves/audio/RTC)
- `PS_BROWSER=firefox node tests/comfort-browser.cjs` (optional compatible Firefox host)
- `PS_BASELINE_CSS=1 node tests/comfort-browser.cjs` (expected old-width regression)
- `node tests/battle-ui-browser.cjs`
- `node tests/battle-browser.cjs` and `PS_RELAY_ONLY=1 node tests/battle-browser.cjs`
- `node tests/nas-production.cjs`
- `node tools/verify-comfort.cjs` (full baseline/modified/isolated rollback)

The NAS updater and persistent data mounts are unchanged. Update via the existing maintenance/drain process and refresh clients afterwards.
