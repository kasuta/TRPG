# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, client-side character sheet ("キャラシ") tools for tabletop RPGs, hosted as plain HTML/CSS/JS (no build step, no bundler, no package.json). `index.html` at the repo root is a landing page linking to each tool.

- `magirogi/` — character sheet creator for the TRPG "マギロギ" (Magirogi)
- `sinobigami/` — character sheet creator for the TRPG "シノビガミ" (Shinobigami)
- `sinobigami_tool/` — a standalone, single-file skill-check/dice tool for Shinobigami (self-contained `index.html`, no JS/CSS file, no backend calls)

`magirogi/` and `sinobigami/` are structurally parallel apps: each is one `index.html` + one `index.js` + one `stylesheet.css`, built from vanilla JS with no frameworks. They are largely independent copies of the same pattern rather than sharing a common module — when fixing a bug in one app's cross-cutting logic (auth, history, save/share), check whether the equivalent code in the other app's `index.js` needs the same fix.

## Running / testing

There is no build, lint, or test tooling in this repo. Open the relevant `index.html` directly in a browser (or serve the folder statically) to test changes. There are no automated tests — verify UI changes manually in a browser per the "UI or frontend changes" guidance (start a local static server, exercise the golden path and edge cases).

## Backend

Both `magirogi` and `sinobigami` talk to the same remote Cloudflare Worker API — **not part of this repo**:

```
API_BASE = 'https://sinobigami-api.kasu-kasu.workers.dev'
```

Key endpoints (used identically from both apps, differentiated by a `game` query param / `CURRENT_GAME` constant which is `'magirogi'` or `'sinobigami'`):
- `POST /api/save?game=<game>` — save a new character
- `PUT /api/update/:id` — update an existing character
- `GET /api/load/:id` — load a character by id (used when opening a shared link)
- `GET /api/character/:id` — fetch character detail (authenticated)
- `POST /api/upload-image/:id` — upload character portrait (requires `Authorization` header)
- `GET /api/image/:id` — fetch character portrait
- `GET /api/my-characters` — list the logged-in user's characters
- `POST /api/login`, `POST /api/register`, `POST /api/logout` — auth

Since the API source isn't in this repo, when changing request shapes/headers, cross-check both `magirogi/index.js` and `sinobigami/index.js` for consistency, and assume the worker is opaque (treat API errors from the deployed worker as ground truth about its actual contract, not just what the JS assumes).

`.wrangler/` present locally is Cloudflare tooling state, not part of the app source here.

## Client-side architecture (per app: magirogi/index.js, sinobigami/index.js)

Each `index.js` is a single large script (1500–2000 lines) organized around these concerns, all operating directly on the DOM (no virtual DOM / component framework):

- **Form state**: character sheet fields are plain form inputs (`input[type=text]`, `input[type=number]`, `select`, `textarea`, checkboxes). `buildSaveData()` serializes all matching form elements into a save payload; `applyLoadedData()` does the reverse to populate the form from loaded data.
- **Dynamic rows**: repeatable sections (spells/relations in sinobigami, similar list rows in magirogi) are added/removed/reordered via row-builder functions (e.g. `addSpellRow`, `removeSpellRow`, `swapSpellRows`) and pruned of empty trailing rows before save (`trimTrailingEmpty`, `isEmptySpellRow`/`isEmptyRelationRow`).
- **Share links / compact encoding**: `compactifyForShare()` / `expandFromShare()` compress the full form data into a compact query-string-friendly shape for share URLs; loading a shared link goes through `GET /api/load/:id`.
- **Local history**: recently opened/created characters are cached in `localStorage` under the key `sinobigami_history` (this key name is shared by *both* apps — entries carry a `game` field and a `GAME_LABEL` map is used to badge them in the UI). This is separate from server-side "my characters", which requires login and is fetched via `/api/my-characters`.
- **Auth**: simple token-based auth (`setAuth`/`clearAuth`) against the same Worker API; `updateAuthUI()` toggles login/register/logged-in views. Auth token is sent as an `Authorization` header on authenticated requests (image upload, character detail, my-characters, update).
- **Account/character-list panel**: a togglable side panel (history/account toggle button) rendering either local history or the server-backed character list (`renderListItems`, `renderMyCharacters`, `renderGuestHistory`), filterable by game via `characterListFilter` in `localStorage`.

When making changes, prefer following the existing pattern in the file you're editing (e.g. naming a new row-adder like the existing `addSpellRow`/`addRelationRow`) rather than introducing new abstractions — these files are not modularized and mixing styles increases the maintenance burden between the two parallel apps.

## Commit style

Commit messages in this repo are written in Japanese, describing the user-facing change concisely (e.g. "画像アップロードにAuthorizationヘッダーを付与し、保存失敗の不具合を修正"). Match this style for new commits.
