## Self-Annotate v1.3 — Release Notes

### New Features
- **Autosave (experimental)** — Annotations and whiteboard data are automatically saved per URL in Chrome storage. Enabled via the popup's toggle. Supports blacklist URL patterns to exclude specific sites.
- **Saved Sites list** — View all pages with saved annotations in the popup. Open a saved page in a new tab or delete individual entries. "Clear All" bulk delete available.
- **Whiteboard multi-page system** — Full page management with sidebar thumbnails in the standalone whiteboard (`whiteboard.html`). Navigate, add, and delete pages.
- **Export** — Export whiteboard pages as PNG (single) or PDF (multi-page). PDF renders real PDF binary (not HTML+print) with canvas-sized pages.
- **"Open in New Whiteboard Tab"** button in popup launches the standalone whiteboard.

### Improvements
- **Flyout clipping fixed** — Root cause was `overflow-x:auto` on the scroll wrapper implicitly setting `overflow-y:auto`, clipping positioned flyouts. Fixed by rendering flyouts as direct children of the toolbar bar with `position: relative` and `overflow:visible`, positioned via `getBoundingClientRect`.
- **Export resolution** — Changed from 0.5x to 1x (full native DPR-scaled resolution).
- **Clear button behavior** — Whiteboard "Clear" button (🗑️) now actually **deletes the current page** from the page list (not just clears its strokes). Single-page mode fallback clears strokes.
- **Cross button** (✕) repurposed from "delete current page" to **"Clear All Board"** (resets all pages).
- **Flyout chevron indicator** — Added `position:relative` to trigger buttons so the chevron arrow positions correctly.
- **Options page** — Kept as theme/language settings (autosave controls live in the popup).

### Firefox Compatibility
- Separate package `self-annotate-v1.3-firefox.zip` with:
  - `browser_specific_settings.gecko` for addon signing
  - `options_ui` instead of `options_page`
  - `background.scripts` instead of `background.service_worker`
- All `chrome.*` APIs used are supported in Firefox ≥ 109.

### Files
| File | Description |
|------|-------------|
| `background.js` | Service worker (Chrome) / Background page (Firefox) — autosave message handlers |
| `content.js` | Content script — annotation toolbar, whiteboard, autosave hooks |
| `popup.html` | Popup — ON/OFF toggle, theme/lang, autosave controls, site list |
| `popup.js` | Popup logic, toolbar layout editor, autosave settings |
| `options.html` | Options page — theme & language settings |
| `whiteboard.html` | Standalone whiteboard (opened in its own tab) |
| `whiteboard.js` | Standalone whiteboard logic — pages, export, PDF generator |
