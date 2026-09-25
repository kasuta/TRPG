# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, client-side character sheet ("キャラシ") tools for tabletop RPGs, hosted as plain HTML/CSS/JS (no build step, no bundler, no package.json). `index.html` at the repo root is a landing page linking to each tool.

- `magirogi/` — character sheet creator for the TRPG "マギロギ" (Magirogi)
- `sinobigami/` — character sheet creator for the TRPG "シノビガミ" (Shinobigami)
- `sinobigami_tool/` — a single-file judgement tool for Shinobigami (self-contained `index.html`, inline CSS/JS, light theme matching the sheet). It loads characters — from the logged-in user's characters (`GET /api/my-layout`, Shinobigami only, grouped by folder; login is shared via `sinobigami_auth_token` / `sinobigami_auth_username`, and the tool can log in/out itself via `/api/login` and `/api/logout`, which switches the sheet's account too), from a share link / ID (`GET /api/load/:id`; the compact format is converted by `characterFromCompact`, and Magirogi data is rejected by keys only that game uses, since `/api/load` has no game field), or from a JSON file saved by the sheet. Several characters can be loaded; each load adds one (re-loading the same server id updates it in place), and the character area switches between them (`state.characters`, `activeCharKey`, `currentCharacter()`); both modes compute for the selected character. Two modes: **判定値診断** (every cell shows its lowest target number = 5 + distance from a usable learned skill; the table does **not** wrap — 器術 and 妖術 are not adjacent, so column distance only counts gap1–gap5 between the two columns (1 if filled, 2 if not) — unless the character has the 忍法 【魔界工学】 (per-character `makai`, auto-on when a loaded 忍法 name contains 魔界工学, toggled by a button above the table), which makes 器術 and 妖術 adjacent with an unfilled gap (2) between them, colored in 8 ordinal steps 5…12+ of blue (kept distinct from the vermilion UI), validated with the dataviz skill's `validate_palette.js --ordinal`) and **セッション** (register up to 8 character names with fixed colors, then buttons = label + character + designated skill; pressing one shows the lowest target and which skill to roll with, and annotates the table). Per-area "使用不可" toggles (life lost in that area; stored per character as `lostColumns`, shown by the header button — white 「✓ 使用可」 / vermilion 「✕ 使用不可」 like the sheet's damage check — plus diagonal hatching on that column's cells; headers and gaps use the sheet's skill-table colors) remove that column's learned skills from the calculation in both modes while distances still pass through it. All state (characters, toggles, mode, names, buttons) is kept in `localStorage` under `sinobigamiToolState`. It has the same four themes as the sheet (light / dark / dark-muted / dark-full) and shares the choice via the sheet's `sinobigami_theme` key; colors are CSS variables per theme (`--heat-5`…`--heat-12`, `--char-0`…`--char-7`), and dark-full has its own ramps validated on its dark surface, in the same pale-to-deep direction as light. Learned skills are marked with ◆, a thick border and (on uncolored cells) a background tint. Loading a character also registers its 攻撃 (attack) 忍法 whose 指定特技 is an exact skill name as session buttons under that character's name (`registerAttackNinpo`; no duplicates). Like the sheets, it talks to `http://localhost:8787` when opened on localhost.

`magirogi/` and `sinobigami/` are structurally parallel apps: each is one `index.html` + one `index.js` + one `stylesheet.css`, built from vanilla JS with no frameworks. They are largely independent copies of the same pattern rather than sharing a common module — when fixing a bug in one app's cross-cutting logic (auth, history, save/share), check whether the equivalent code in the other app's `index.js` needs the same fix.

## Running / testing

There is no build, lint, or test tooling in this repo. Open the relevant `index.html` directly in a browser (or serve the folder statically) to test changes. There are no automated tests — verify UI changes manually in a browser per the "UI or frontend changes" guidance (start a local static server, exercise the golden path and edge cases).

**Testing against a local API**: when the pages are opened on `localhost`/`127.0.0.1`, both apps talk to `http://localhost:8787` instead of production (the production API does not allow localhost origins anyway). Run the API locally from `sinobigami-api` (copy `.dev.vars.example` to `.dev.vars`, `npm run db:migrate:local`, `npm run dev`), then serve this repo with the `static-server` entry in `.claude/launch.json` (port 8420). Browsers may cache `index.js`/`stylesheet.css` from the static server — bust the cache when a change doesn't seem to apply.

## Backend

Both `magirogi` and `sinobigami` talk to the same remote Cloudflare Worker API — **not part of this repo**:

```
API_BASE = 'https://sinobigami-api.kasu-kasu.workers.dev'   // http://localhost:8787 when opened on localhost
```

Key endpoints (used identically from both apps, differentiated by a `game` query param / `CURRENT_GAME` constant which is `'magirogi'` or `'sinobigami'`):
- `POST /api/save?game=<game>` — save a new character
- `PUT /api/update/:id` — update an existing character
- `GET /api/load/:id` — load a character by id (used when opening a shared link)
- `DELETE /api/character/:id` — delete a character (owner only, requires `Authorization`; also removes the R2 image)
- `POST /api/upload-image/:id` — upload character portrait (requires `Authorization` header)
- `GET /api/image/:id` — fetch character portrait
- `GET /api/my-characters` — list the logged-in user's characters (newest first; kept for compatibility, the apps no longer call it)
- `GET /api/my-layout` / `PUT /api/my-layout` — the logged-in user's character list order and folders (see below)
- `POST /api/login`, `POST /api/register`, `POST /api/logout` — auth

Since the API source isn't in this repo, when changing request shapes/headers, cross-check both `magirogi/index.js` and `sinobigami/index.js` for consistency, and assume the worker is opaque (treat API errors from the deployed worker as ground truth about its actual contract, not just what the JS assumes).

`.wrangler/` present locally is Cloudflare tooling state, not part of the app source here.

### API source and contract notes (added 2026-09-21)

The Worker source now lives in its own repo: `https://github.com/kasuta/sinobigami-api` (private; local clone at `C:\Users\bokem\Documents\sinobigami-api`). Its `AGENTS.md` and `docs/development-log.md` have the conventions, history and open issues — check them before changing request shapes. The points below affect this frontend:

- **Character IDs**: new IDs are 12 hex chars (older ones are 8). `#id=<id>` links of either length keep working; don't hard-code the length.
- **Request limits**: `save`/`update` bodies are limited to 64KB (413), login/register to 4KB. Uploaded images are limited to 5MB and must be png/jpeg/gif/webp/avif — SVG/HEIC/BMP get 415. The image input uses `accept="image/*"` and sends the file as-is, so those types currently fail with the generic "画像のアップロードに失敗しました" (the character itself is already saved by then).
- **Error bodies**: errors are `{ "error": "<message>" }` JSON with CORS headers. Only login/register show the server message (`json.error`); save/update/image upload show fixed messages, so 413/415 reasons are not surfaced to the user (a possible improvement).
- **`v` field**: the server adds `v` (data version, currently 1) to saved data and returns it from `/api/load`. `expandFromShare` ignores unknown keys, so this is harmless; if `compactifyForShare`'s format changes, send a new `v` from the client.
- **Anonymous characters** (saved while logged out) can still be overwritten by anyone who has the link, and cannot be deleted — this is intentional (shared editing). Hidden-section passwords (`pw`) are stored and returned in plain text — also intentional.
- **My-character layout (added 2026-09-26)**: the list order (and folders, for the upcoming folder feature) is stored per user as one JSON. `GET /api/my-layout` returns the ordered tree `{ v: 1, items: [ {type:"character", id, name, game, updatedAt, createdAt}, {type:"folder", id, name, items:[<character summaries>]} ] }`; characters not in the saved layout (e.g. newly saved) come first, newest first. `PUT /api/my-layout` takes the same shape with ids only (`{type:"character", id}`, `{type:"folder", id, name, items:["<id>", ...]}`): folders are one level deep, max 100, names 1–30 chars; other users' / unknown ids are silently dropped. The server builds the order (it has tests; this repo doesn't). Plan and decisions: `docs/plan-2026-09-features.md`.
- Rate limiting is **not** enabled on the API yet (on hold because of unclear pricing), so don't assume 429 handling exists server-side.

## Client-side architecture (per app: magirogi/index.js, sinobigami/index.js)

Each `index.js` is a single large script (1500–2000 lines) organized around these concerns, all operating directly on the DOM (no virtual DOM / component framework):

- **Form state**: character sheet fields are plain form inputs (`input[type=text]`, `input[type=number]`, `select`, `textarea`, checkboxes). `buildSaveData()` serializes all matching form elements into a save payload; `applyLoadedData()` does the reverse to populate the form from loaded data.
- **Dynamic rows**: repeatable sections (spells/relations in sinobigami, similar list rows in magirogi) are added/removed/reordered via row-builder functions (e.g. `addSpellRow`, `removeSpellRow`, `swapSpellRows`) and pruned of empty trailing rows before save (`trimTrailingEmpty`, `isEmptySpellRow`/`isEmptyRelationRow`).
- **Share links / compact encoding**: `compactifyForShare()` / `expandFromShare()` compress the full form data into a compact query-string-friendly shape for share URLs; loading a shared link goes through `GET /api/load/:id`.
- **Local history**: recently opened/created characters are cached in `localStorage` under the key `sinobigami_history` (this key name is shared by *both* apps — entries carry a `game` field and a `GAME_LABEL` map is used to badge them in the UI). This is separate from server-side "my characters", which requires login and is fetched via `/api/my-layout`.
- **Auth**: simple token-based auth (`setAuth`/`clearAuth`) against the same Worker API; `updateAuthUI()` toggles login/register/logged-in views. Auth token is sent as an `Authorization` header on authenticated requests (image upload, character detail, my-characters, update).
- **Account/character-list panel**: a togglable side panel (history/account toggle button) rendering either local history or the server-backed character list (`renderListItems`, `renderMyCharacters`, `renderGuestHistory`), filterable by game via `characterListFilter` in `localStorage`. The server-backed list is kept as `myLayoutItems` (tree from `/api/my-layout`) and `myCharactersCache` (flattened, in order), and drawn by `renderMyLayoutList` (guest history still uses `renderListItems`; both share `buildListItemHTML`). Folders (one level, mixed freely with characters) open/close in place; the open folder ids are kept in `localStorage` under `characterListOpenFolders` (shared by both apps). Folder names are edited inline (`startNewFolder` / `startRenameFolder` / `finishFolderEdit`; Enter confirms, Esc cancels, leaving the field confirms, IME composition is ignored); only empty folders can be deleted (`deleteFolder`). On PC (`(hover: hover) and (pointer: fine)`) characters and folders can be dragged (`resolveDrop` → `moveLayoutItem` → `saveMyLayout`, which reverts to `myLayoutSavedItems` on failure): hit-testing uses the dragged row's box (its top/bottom computed from the pointer and the grab offset recorded at `dragstart`), not the pointer: a character overlapping a folder row by at least `FOLDER_DROP_OVERLAP` (half its height) goes into it (end if closed, start if open; the larger overlap wins), otherwise the dragged row's center decides before/after the row it falls on; an open empty folder's placeholder = into, empty space below the list = root end; folders only move before/after, never into folders. `moveLayoutItem` removes and re-inserts one item, so other items (including ones hidden by the game filter) keep their relative order.

When making changes, prefer following the existing pattern in the file you're editing (e.g. naming a new row-adder like the existing `addSpellRow`/`addRelationRow`) rather than introducing new abstractions — these files are not modularized and mixing styles increases the maintenance burden between the two parallel apps.

## Commit style

Commit messages in this repo are written in Japanese, describing the user-facing change concisely (e.g. "画像アップロードにAuthorizationヘッダーを付与し、保存失敗の不具合を修正"). Match this style for new commits.
