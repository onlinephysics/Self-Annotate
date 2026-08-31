# Self-Annotate

**Annotation Tool + Whiteboard** for any webpage. Draw, highlight, add text, manage multi-page whiteboards, and more — all inside the browser. Works on `http://`, `https://`, and `file://` pages.

> Chrome MV3 extension · Firefox build available (v109+)

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

### Core Tools
| Tool | Description |
|------|-------------|
| ✏️ Pen | Smooth freehand drawing |
| ✨ Magic Pen | Draws with fade animation (2s) |
| 🖊️ Highlighter | Semi-transparent marker |
| ➡️ Arrow / Shapes | 8 shapes: arrow, rect, circle, triangle, pentagon, hexagon, roundrect, diamond, star, right triangle |
| T Text | Type onto the page |
| 👆 Select | Select, move, delete individual strokes |
| 🧹 Eraser | **Partial eraser** — splits strokes at eraser point (not whole stroke removal) with **size preview circle** |
| 🤚 Pan | Drag to pan the canvas |
| ↩️ Undo / ↪️ Redo | **Multi-level undo/redo stack** (up to 50 steps) with Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y |
| 🗑️ Clear | Clear all annotations |

### Annotation Overlay
- Draggable toolbar with position memory across pages
- **Custom layout** — rearrange tools, create flyout groups via the popup editor
- **Custom color picker** — choose any color via native `<input type="color">` alongside 7 presets
- **Built-in presets**: Default, Minimal, Drawing, Compact
- Hide/show annotations, scroll mode, rotate toolbar

### Whiteboard (Floating Window)
- Full set of drawing tools (pen, marker, shapes, text, eraser with preview)
- **Multi-page** — add, navigate, delete pages with sidebar thumbnails
- **Export** — current page as PNG, multiple pages as PDF (real PDF, canvas-sized JPEG)
- Resizable, draggable, minimizable, fullscreen
- Background color picker, zoom controls
- Save/load `.sswb` files (proprietary whiteboard format)
- **Standalone tab** — open a dedicated whiteboard tab via the popup

### Autosave (experimental)
- Annotations and whiteboard data saved per URL in Chrome storage
- **Blacklist** URL patterns to exclude specific sites
- Auto-restore when revisiting a page
- Saved sites list in the popup (open or delete entries)
- Toggle on/off from the popup

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Delete / Backspace | Delete selected strokes |
| Escape | Deselect all |
| Ctrl+S (whiteboard) | Save .sswb file |
| Ctrl+O (whiteboard) | Load .sswb file |

---

## Installation

### Chrome
1. Download `self-annotate-v1.4.5-chrome.zip` from the `chrome-packages/` folder
2. Extract to a permanent folder (e.g. `C:\Extensions\self-annotate\`)
3. Open `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** → select the extracted folder
6. Pin the extension and click the icon to turn it ON

### Firefox
1. Download `self-annotate-v1.4.5-firefox.zip`
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
2. Open any webpage → click the ✏️ **FAB button** (bottom-right)
3. Annotation toolbar appears — start drawing
4. 🖥️ opens the whiteboard; ⚙️ in popup shows all settings
5. Enable **Autosave** in the popup to persist annotations per URL

---

## Packages

| Package | Version | Path |
|---------|---------|------|
| Chrome | v1.4.5 | `chrome-packages/self-annotate-v1.4.5-chrome.zip` |
| Firefox | v1.4.5 | `firefox-packages/self-annotate-v1.4.5-firefox.zip` |

### Build History
| Version | Highlights |
|---------|------------|
| v1.4.5 | **Major Bug Fix**: True infinite canvas, drawing coordinate alignment across zoom/pan, smooth touch pinch-zoom & pan, Chrome MV3 compatibility |
| v1.4.4 | Multi-level undo/redo, custom color picker, bug fixes (double Ctrl+Z, missing translations) |
| v1.4.3 | Undo/Redo stack, custom color picker, redo buttons |
| v1.4.2 | Partial eraser (split strokes), eraser preview circle |
| v1.4.1 | Critical bug fix (viewport code), version bump |
| v1.4.0 | Selection, new shapes, image paste, pan/zoom, keyboard shortcuts |
| v1.3 | Autosave, multi-page whiteboard, PNG/PDF export |
| v1.2 | Group toolbar system, flyout groups, custom layout |

---

## Files

| File | Description |
|------|-------------|
| `background.js` | Service worker (Chrome) / Background page (Firefox) — message routing, injection, autosave handlers |
| `content.js` | Content script (~2700 lines) — annotation toolbar, whiteboard, drawing engine, eraser, undo/redo |
| `popup.html` / `popup.js` | Popup — ON/OFF, theme/lang, autosave controls, toolbar layout editor |
| `options.html` | Options page — theme & language settings |
| `whiteboard.html` / `whiteboard.js` | Standalone whiteboard — multi-page, export, PDF generator |
| `icons/` | Extension icons (48px, 96px, SVG) |

---

## License

MIT © [TarangoHasan](https://github.com/TarangoHasan) · [Self Study](https://www.selfstudy.xyz)
