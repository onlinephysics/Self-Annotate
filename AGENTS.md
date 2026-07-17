# Self-Annotate — Agent Instructions

## Project Overview
Chrome/Firefox MV3 extension: **Self-Annotate v1.3** — annotation toolbar + multi-page whiteboard for any webpage (`http://`, `https://`, `file://`). Built for interactive smart boards in education.

**Author:** TarangoHasan | **Org:** Self Study (HSC Physics, ICT & Varsity Admission platform)

## Source Structure
```
test-temp/temp_extract_v13/      # ← Main source (v1.3 stable)
├── manifest.json                # MV3 manifest
├── background.js                # Service worker (toggle, injection, autosave handlers)
├── content.js                   # Content script — annotation toolbar, whiteboard, drawing engine
├── popup.html / popup.js        # Popup UI — ON/OFF, theme/lang, autosave, toolbar layout editor
├── options.html                 # Options page — theme & language only
├── whiteboard.html / whiteboard.js  # Standalone whiteboard tab (multi-page, PDF export)
└── icons/                       # 48px, 96px, SVG
```

**Package outputs:** `chrome-packages/self-annotate-v1.3-chrome.zip`, `firefox-packages/self-annotate-v1.3-firefox.zip`

**Note:** Working directory is `temp_extract_v14/` (v1.4 in development). Stable source is `temp_extract_v13/`.

## Key Architecture
- **No build step** — plain JS/HTML/CSS, load unpacked in browser
- **Manifest V3** — `background.service_worker`, `chrome.scripting.executeScript` for injection
- **Storage:** `chrome.storage.local` (settings, autosave data, toolbar layouts)
- **Injection:** Background injects `content.js` on tab update when extension is ON; also on demand via popup
- **Content script** injects full UI (toolbar, canvas, whiteboard window) into page DOM
- **Whiteboard** runs in-page (floating window) OR standalone tab via `whiteboard.html`

## Key Files Quick Reference
| File | Purpose |
|------|---------|
| `background.js:139` | `injectIntoTab()` — injects content.js with theme/lang init |
| `content.js:862` | `renderAnBar()` — group toolbar renderer (inline/flyout) |
| `content.js:721` | `makeBoard()` — shared drawing engine (overlay + whiteboard) |
| `popup.js:174` | Storage load → renders presets + groups for both toolbars |
| `popup.js:205` | `an-save` / `wb-save` → persists groups + notifies active tab |
| `whiteboard.js:258` | `makePdfBlob()` — raw PDF binary generation (no jsPDF) |
| `manifest.json:25` | `host_permissions: ["<all_urls>", "file:///*"]` |

## Developer Commands
```bash
# Load in Chrome (MV3)
1. chrome://extensions → Developer mode → Load unpacked → select test-temp/temp_extract_v13/

# Load in Firefox (temporary)
1. about:debugging#/runtime/this-firefox → Load Temporary Add-on → select manifest.json

# For file:// URLs: enable "Allow access to file URLs" in extension details
```

## Testing / Verification
- No automated test suite
- Manual: load unpacked, toggle ON, open any page, click FAB (✏️), verify toolbar appears
- Whiteboard: click 🖥️ in toolbar → verify multi-page, export PNG/PDF, save/load `.sswb`
- Autosave: enable in popup → annotate → reload page → verify restore
- Toolbar layout: popup → Annotate/Whiteboard tabs → edit groups → Apply → verify on page

## Firefox Build Differences (`firefox-packages/`)
- `manifest.json`: `background.scripts: ["background.js"]` (not `service_worker`)
- `options_ui` instead of `options_page`
- `browser_specific_settings.gecko.id` for AMO signing
- All `chrome.*` APIs work in Firefox ≥ 109 (no polyfill needed)

## Notable Implementation Details
- **Toolbar groups** stored as JSON in storage (`AN_groups`, `WB_groups`); rendered dynamically in content.js + popup.js
- **Flyout fix:** flyouts rendered as direct children of `#AN_bar` with `position:relative; overflow:visible`, positioned via `getBoundingClientRect()` (see `content.js:103` `.AN_flyout`)
- **Whiteboard PDF:** custom PDF binary writer (`whiteboard.js:258`) — renders each page to canvas → JPEG → embeds in PDF structure
- **Autosave:** per-URL in `AN_autosave_sites`; blacklist patterns in `AN_autosave_rules`; experimental, toggle in popup
- **Theme:** `device` \| `light` \| `dark` — applies `AN_dark` class to `body` for extension UI only (not page content)

## Version History
- **v1.3:** Autosave, saved sites list, whiteboard multi-page, PNG/PDF export, new tab whiteboard, flyout fix, export @1x DPR
- **v1.2:** Group toolbar system, flyout groups, custom layout from popup
- **v1.0:** Initial release

## Common Tasks
| Task | Where |
|------|-------|
| Add toolbar button | `popup.js:8` `ALL_BTNS` / `WB_BTNS` + `content.js:987` `makeAnBtn` |
| Modify drawing tools | `content.js:721` `makeBoard()` / `whiteboard.js:34` `makeBoard()` |
| Change storage keys | `background.js:12` + `popup.js:164` + `content.js` references |
| Adjust PDF export | `whiteboard.js:258` `makePdfBlob()` |
| Update manifest permissions | `manifest.json:19-28` |