# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, client-side character sheet ("キャラシ") tools for tabletop RPGs, hosted as plain HTML/CSS/JS (no build step, no bundler, no package.json). `index.html` at the repo root is a landing page linking to each tool.

- `magirogi/` — character sheet creator for the TRPG "マギロギ" (Magirogi)
- `sinobigami/` — character sheet creator for the TRPG "シノビガミ" (Shinobigami)
- `sinobigami_tool/` — a standalone, single-file tool for Shinobigami that loads saved character JSON files and computes skill distances / target numbers on the skill-area wheel (self-contained `index.html`, no JS/CSS file, no backend calls)

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
- **Account/character-list panel**: a togglable side panel (history/account toggle button) rendering either local history or the server-backed character list (`renderListItems`, `renderMyCharacters`, `renderGuestHistory`), filterable by game via `characterListFilter` in `localStorage`. The server-backed list is kept as `myLayoutItems` (tree from `/api/my-layout`) and `myCharactersCache` (flattened, in order). On PC (`(hover: hover) and (pointer: fine)`) rows can be dragged to reorder (`moveMyCharacter` → `saveMyLayout`, which reverts to `myLayoutSavedItems` on failure); while a game filter is active only the visible rows are reordered and written back into their slots, so hidden games' positions don't move.

When making changes, prefer following the existing pattern in the file you're editing (e.g. naming a new row-adder like the existing `addSpellRow`/`addRelationRow`) rather than introducing new abstractions — these files are not modularized and mixing styles increases the maintenance burden between the two parallel apps.

## Commit style

Commit messages in this repo are written in Japanese, describing the user-facing change concisely (e.g. "画像アップロードにAuthorizationヘッダーを付与し、保存失敗の不具合を修正"). Match this style for new commits.
