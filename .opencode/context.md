# Project Context

## Environment
- Language: JavaScript (ES6+, plain JS, no build step)
- Runtime: Chrome MV3 / Firefox MV3 (browser extension)
- Package: Load unpacked / temporary add-on (no build command needed)
- Test: Manual verification

## Project Type
- [x] Browser Extension (Chrome + Firefox)
- Manifest V3 (MV3)

## Infrastructure
- Container: None
- CI/CD: None
- Packages: chrome-packages/, firefox-packages/

## Structure
- Working source: `test-temp/temp_extract_v14/`
- Chrome build: `test-temp/chrome-v1.4.1/`
- Firefox build: `test-temp/firefox-v1.4.1/`
- Output packages: `chrome-packages/`, `firefox-packages/`

## Deliverables
- `chrome-packages/self-annotate-v1.4.1-chrome.zip` (66KB)
- `firefox-packages/self-annotate-v1.4.1-firefox.zip` (66KB)

## Bug Fix Applied
- **content.js:809**: Removed orphaned `viewport.x += dx; viewport.y += dy; applyViewport(); }` 
  (dx,dy undefined would throw ReferenceError during viewport pan)

## Version Bump
- Updated all version references from v1.3/v1.4 to v1.4.1 across 5 files

## Chrome Build Keys
- `background.service_worker: "background.js"`
- `options_page: "options.html"`

## Firefox Build Keys
- `background.scripts: ["background.js"]`
- `options_ui: { page: "options.html", open_in_tab: true }`
- `browser_specific_settings.gecko.id: "self-annotate@selfstudy.xyz"`
