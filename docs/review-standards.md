# Standards review — Simplified Chinese PR

Compared `git diff upstream/main...review/zh-cn`: baseline `537440510dcdadf8ed711ec3dea7ae795533a662`, candidate `a23065deefa1dd4d23557c7b10f6d8d99af42dbc`.

Standards consulted: global localization instructions (reproducible builds; language-specific data separate from reusable infrastructure; automated validation); candidate `docs/LOCALIZATION.md` (preserve model/save/network values, protect nicknames, source/font provenance); code-review smell baseline. Static review only; no browser acceptance claimed.

## Findings

1. **[P2] Rebuild inputs are not actually pinned or verified.** `tools/fetch_localization.py:19–21` downloads font binaries and license from mutable `main`; `fetch():24–31` computes the hash of whatever it receives rather than comparing with the reviewed hash. The official dictionary endpoint is also mutable. `tools/make_zh_font.py:17` consumes cached files without checksum validation. This conflicts with the reusable/reproducible-build preference and the script's “pinned localization inputs” claim: a clean cache can silently yield different fonts or names while replacing provenance records. Pin font URLs to a commit and keep expected SHA-256 values in a separate checked-in lock manifest; reject mismatches before regenerating. Preserve a frozen authoritative-name input or verify its expected digest and require explicit lock updates for deliberate refreshes.

2. **[P3, judgment call: Repeated Switches / Shotgun Surgery] Numeric localization is scattered.** The identical `G.I18n.lang === 'zh-CN' ? 'zh-CN' : 'es'` appears in `js/ui/goals-ui.js:68,142,259,261`, `ranking-ui.js:123`, `menu.js`, and `ui.js`, even though `G.I18n.locale` now exists. Adding another language requires changing unrelated screens, and English continues Spanish thousands grouping (e.g. `12345` renders `12.345`). Prefer one reusable number formatter or `G.I18n.locale`; if preserving the historical English format is deliberate, centralize/document that compatibility rule. This is a maintainability heuristic, not a hard documented violation.

## Positive checks

The change retains original species names, IDs, save title values and network identifiers; translates presentation through contexts; protects main nickname rendering with `translate="no"` / `rawCanvas`; ships local renamed OFL font subsets and provenance; supplies unit and browser tests. No game-balance change or proprietary complete-game asset addition identified in this diff.

Summary: 2 findings; most important is unverified mutable rebuild input provenance.


## 合并后处理

本地发行配置、账号持久化实测、简体昵称用词、字体输入版本及哈希校验已修正。详见 LOCAL_EDITION.md。数字格式器重构仅列为维护建议，未在此次扩大改动。
