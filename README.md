# Self-Annotate

**Annotation Tool + Whiteboard** for any webpage. Draw, highlight, add text, and manage multi-page whiteboards — all inside the browser. Works on `http://`, `https://`, and `file://` pages.

> Chrome MV3 extension · Firefox build also available

---

## Developer

| | |
|---|---|
| **Author** | [TarangoHasan](https://github.com/TarangoHasan) |
| **Organization** | [Self Study](https://www.selfstudy.xyz) — HSC Physics, ICT & Varsity Admission platform |
| **Purpose** | Built for **Interactive Smart Boards** in classrooms and educational environments |
| **Use Case** | Teachers and students can annotate live web content, draw diagrams, solve MCQs, and present lessons on smart boards without additional software |

---

## Features

### Annotation Overlay
| Tool | Description |
|------|-------------|
| ✏️ Pen | Smooth freehand drawing |
| ✨ Magic Pen | Draws and fades after 2 seconds |
| 🖊️ Highlighter | Semi-transparent marker |
| ➡️ Arrow / ⬜ Rectangle / ⭕ Circle | Shape tools |
| T Text | Type onto the page |
| 🧹 Eraser | Remove specific strokes |
| ↩️ Undo | Last stroke (also Ctrl+Z) |
| 🗑️ Clear | Clear all overlay annotations |
| 👁️ Hide/Show | Toggle annotations visibility |
| 🤚 Scroll Mode | Disable drawing, scroll freely |
| ↔️ Rotate Bar | Switch toolbar horizontal/vertical |
| 🎨 Colors | 7 swatches + stroke width slider |
| 🖥️ Whiteboard | Open floating whiteboard |

- Draggable toolbar with position memory across pages
- **Custom layout** — rearrange tools, create flyout groups via the popup editor

### Whiteboard (Floating Window)
- Full set of drawing tools (pen, marker, shapes, text, eraser)
- **Multi-page** — add, navigate, delete pages with sidebar thumbnails
- **Export** — current page as PNG, multiple pages as PDF (real PDF, canvas-sized)
- Resizable, draggable, minimizable, fullscreen
- Background color picker, zoom
- Save/load `.sswb` files
- **Standalone mode** — open a dedicated whiteboard tab via the popup

### Autosave (experimental)
- Annotations and whiteboard data saved per URL in Chrome storage
- **Blacklist** URL patterns to exclude specific sites
- Auto-restore when revisiting a page
- Saved sites list in the popup (open or delete entries)
- Toggle on/off from the popup

### Toolbar Layout Editor
- Built-in presets: Default, Minimal, Drawing, Compact
- Custom groups: drag-and-drop tool arrangement
- Inline / flyout group modes
- Works for both annotation toolbar and whiteboard toolbar

---

## Installation

### Chrome
1. Download `self-annotate-v1.3-chrome.zip` from the [releases page](https://github.com/anomalyco/self-annotate/releases)
2. Extract to a permanent folder (e.g. `C:\Extensions\self-annotate\`)
3. Open `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** → select the extracted folder
6. Pin the extension (🧩 → 📌) and click the icon to turn it ON

### Firefox
1. Download `self-annotate-v1.3-firefox.zip`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select the zip
4. For permanent install, submit to [addons.mozilla.org](https://addons.mozilla.org)

### File Access
For `file://` pages, enable **Allow access to file URLs**:
- **Chrome**: Extension details → "Allow access to file URLs"
- **Firefox**: `about:addons` → Self Annotate → Preferences → "Access to file:// URLs"

---

## Quick Start
1. Click the extension icon → toggle **ON** (green badge)
2. Open any webpage → click the ✏️ FAB button (bottom-right)
3. Annotation toolbar appears — start drawing
4. 🖥️ opens the whiteboard; ⚙️ in popup shows all settings
5. Enable **Autosave** in the popup to persist annotations per URL

---

## Packages

| Package | Path |
|---------|------|
| Chrome | `chrome-packages/self-annotate-v1.3-chrome.zip` |
| Firefox | `firefox-packages/self-annotate-v1.3-firefox.zip` |

---

## Files

| File | Description |
|------|-------------|
| `background.js` | Service worker (Chrome) / Background page (Firefox) — message routing, injection, autosave handlers |
| `content.js` | Content script — annotation toolbar, whiteboard, autosave hooks |
| `popup.html` / `popup.js` | Popup — ON/OFF, theme/lang, autosave controls, toolbar layout editor |
| `options.html` | Options page — theme & language settings |
| `whiteboard.html` / `whiteboard.js` | Standalone whiteboard — multi-page, export, PDF generator |
| `icons/` | Extension icons (48px, 96px, SVG) |

---

## License

MIT © [TarangoHasan](https://github.com/TarangoHasan) · [Self Study](https://www.selfstudy.xyz)
