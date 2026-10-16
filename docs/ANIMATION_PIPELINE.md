# Complete animation pipeline (0.8.1)

## Scope and source

The original seven animation sheets and `js/data/sprites-meta.js` are unchanged.
New original SpriteCollab Strike, Swing, Double, Hop and Rotate actions are additive.
The source revision is `392fc81d5190ceca40c08ef4c754f226458b5f59`.
`assets/pokemon/EXTRA-CREDITS.md`, per-variant `extra/credits.txt`,
`extra-credit-names.txt`, `EXTRA-LICENSE.md` and the source manifest retain
attribution, names, source links and CC BY-NC 4.0 terms. Existing notices remain.
No interpolated frames, smoothing filter, external animation library or gameplay
stat/cooldown change is introduced.

Reproduce the import from the project root:

```sh
python -X utf8 tools/fetch_extra_animations.py
node --test tests/animation*.test.cjs
node tests/animation-browser.cjs
npm run build
```

The importer inspects all 966 existing species. It retains all source columns,
eight-direction rows (or original one-direction rows), durations, and a source
shadow-derived ground anchor. It rejects missing anchors/credits or invalid
geometry and verifies exact RGBA equality after lossless PNG optimization.
Normal/shiny assets are separate; missing or oversized new actions fall back to
an existing action. Hashes record raw source, output, RGBA, XML and original credits.
The revision-scoped ignored cache avoids repeated network fetches and records 404s.

## Playback seam

`Sprites.actionFor` selects complete available actions by move kind with a small
move-ID override table (dance, body slam, wing/vine and claw/chop). No translated
names or Chinese-specific behavior enters this mapping.

A cast previously restarted a busy action after 65% completion. `Animator.request`
now coalesces requests into one latest pending visual action. A full cycle completes
before that action starts; damage, costs, sounds and cooldowns continue immediately.
`play` remains the explicit interruption path for hurt/faint. Faint's held last
frame rejects cast requests until an explicit revive. Background locomotion keeps
its own phase and speed during attacks and carries excess update time across
transitions. Player locomotion rate follows actual post-collision displacement,
without changing physical movement/aim or attack targeting.

## Network clocks

Existing tuple fields and original animation indexes remain unchanged. Player
state appends `[epoch, action, phaseTicks, speed, once, hold, base, baseSpeed, dir]`.
Reliable cast events append the same pose, so sound/FX can arrive independently
without restarting a newer visual epoch. Enemy tuples append only epoch, phase
and speed; their existing action/direction fields are reused. Missing extensions
retain legacy behavior. Older packets are ignored. Same-epoch correction advances
at most 1.5 source ticks, never rewinds an action, and new epochs distinguish
consecutive same-named attacks. Receive age prediction is capped at 250ms; no
absolute wall clock or per-frame image/network upload is introduced. Existing
RTC/NAS relay, reliable-event ordering and positional interpolation remain intact.

## Mobile and memory

Only the existing seven actions are preloaded for wild enemies. Learned player
extras are warmed individually; other extra sheets load on demand. Rendering
remains nearest-neighbor Canvas drawing using the source frame durations.
Estimated decoded-image plus white/outline-canvas budgets: low-end 32MiB, coarse
pointer 64MiB, desktop 128MiB. Least-recently-used sheets (including recent ones)
are released when the budget or 200-sheet count limit is exceeded. One currently
protected image may exceed the budget if an existing original sheet alone is
larger; new mobile actions above 8MiB fall back to existing actions. Budgets are
application cache estimates, not a promise about browser/GPU process RSS.

## Verification boundaries

Automated clock tests, source PNG integrity and controlled Chrome RTC/relay tests
are reproducible. Browser frame traces enumerate actual original frames, while
screenshots inspect five decoded Charizard actions. Neither these nor desktop
portrait emulation prove physical phone thermal/battery behavior or cross-country
network latency. Live NAS deployment and real phone acceptance remain separate.

## Deployment and rollback

No account/save schema or economy rule changes. Administrator `jyh9521` should
enable maintenance drain and wait until ready, then run the existing updater:

```sh
cd /mnt/user/appdata/pokesurvivor-cn/app
git -c safe.directory=/mnt/user/appdata/pokesurvivor-cn/app pull --ff-only origin main
sh deploy/update-unraid.sh 'https://pokemon.blfy.cc:9521'
```

The updater validates the existing `/data` mount, builds first, creates a consistent
SQLite backup and retains the old container. Source-only isolated rollback evidence
is in the release transaction artifacts; it is not a claim of a live NAS rollback.
