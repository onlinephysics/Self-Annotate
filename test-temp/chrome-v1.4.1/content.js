/* ══════════════════════════════════════════════════════════
   ANNOTATION TOOL + WHITEBOARD  — Chrome/Firefox Extension
   Content Script: inject করলে যেকোনো পেজে কাজ করে (http, https, file://)।
   Settings এখন popup-এ — পেজে আর কোনো Settings button নেই।
   v1.4.1 — Group toolbar system, flyout groups, custom layout, select/pan, shapes, images, zoom
══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Already injected? ──
  if (document.getElementById('AN_bar')) {
    var bar = document.getElementById('AN_bar');
    bar.classList.remove('AN_gone');
    document.getElementById('AN_open') && document.getElementById('AN_open').classList.remove('AN_vis');
    return;
  }

  // ── Google Fonts ──
  if (!document.getElementById('AN_font')) {
    var lnk = document.createElement('link');
    lnk.id = 'AN_font';
    lnk.rel = 'stylesheet';
    lnk.href = 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700;800&display=swap';
    document.head.appendChild(lnk);
  }

  // ════════════════════════════════════════════
  //  CSS
  // ════════════════════════════════════════════
  var style = document.createElement('style');
  style.id = 'AN_style';
  style.textContent = `
@keyframes AN_fadeIn  { from{opacity:0}              to{opacity:1}               }
@keyframes AN_popIn   { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes AN_flyPop { from{opacity:0} to{opacity:1} }

/* Settings panel removed — now lives in popup.html */

/* ── Overlay canvas ── */
#AN_canvas {
  position:fixed; inset:0; width:100vw; height:100vh;
  z-index:800; pointer-events:none; touch-action:none;
}
#AN_canvas.AN_on { pointer-events:all; }

/* ── Annotation toolbar ── */
#AN_bar {
  position:fixed; bottom:22px; left:50%; transform:translateX(-50%);
  z-index:9100; display:flex; align-items:center; gap:2px; padding:5px 8px;
  background:rgba(255,255,255,.97); border:1.5px solid #cbd5e1;
  border-radius:18px; box-shadow:0 8px 32px rgba(0,0,0,.22);
  backdrop-filter:blur(14px); user-select:none;
  flex-wrap:nowrap; max-width:99vw; overflow:visible;
  transition:opacity .25s;
  font-family:'Hind Siliguri',Arial,sans-serif;
}
body.AN_dark #AN_bar { background:rgba(22,32,50,.97); border-color:#34445a; }
#AN_bar.AN_gone { opacity:0; pointer-events:none; }
#AN_bar.AN_vert {
  flex-direction:column; padding:7px 5px;
  bottom:auto; left:auto; top:50%; right:14px;
  transform:translateY(-50%); max-width:none;
  overflow:visible; max-height:96vh;
  width:44px;
}
#AN_bar.AN_vert .AN_sep { width:30px; height:1px; }
/* Vertical slider when toolbar is vertical */
#AN_bar.AN_vert #AN_slider {
  writing-mode:vertical-lr; direction:rtl;
  width:4px !important; height:68px !important; cursor:pointer;
}

.AN_sep { width:1px; height:22px; background:#cbd5e1; flex-shrink:0; }

/* ── Group toolbar system ── */
.AN_grp {
  display:flex; align-items:center; flex-shrink:0; position:relative;
}
#AN_bar.AN_vert .AN_grp { flex-direction:column; }

/* Flyout group trigger button */
.AN_grpBtn {
  background:none; border:2px solid transparent; border-radius:8px;
  width:30px; height:30px; font-size:15px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .12s,border-color .12s,transform .1s; flex-shrink:0;
  position:relative;
}
.AN_grpBtn:hover { background:rgba(13,110,253,.08); transform:scale(1.08); }
.AN_grpBtn.AN_grpOpen { background:rgba(13,110,253,.12); border-color:#0d6efd; }
body.AN_dark .AN_grpBtn { color:#d4dce8; }
/* Small expand indicator */
.AN_grpBtn::after {
  content:''; position:absolute; bottom:2px; right:2px;
  width:4px; height:4px; border-right:1.5px solid #94a3b8; border-bottom:1.5px solid #94a3b8;
  transform:rotate(45deg);
}
#AN_bar.AN_vert .AN_grpBtn::after { transform:rotate(-45deg); bottom:2px; right:2px; }

/* Flyout panel */
.AN_flyout {
  position:absolute; z-index:9200;
  background:rgba(255,255,255,.98); border:1.5px solid #cbd5e1;
  border-radius:12px; padding:5px 6px;
  box-shadow:0 8px 28px rgba(0,0,0,.22);
  display:none; gap:3px; flex-wrap:wrap; max-width:200px;
  backdrop-filter:blur(12px);
  animation:AN_flyPop .14s cubic-bezier(.34,1.56,.64,1);
}
.AN_flyout.AN_flyOpen { display:flex; }
body.AN_dark .AN_flyout { background:rgba(22,32,50,.98); border-color:#34445a; }

/* Horizontal bar: flyout pops UP */
#AN_bar:not(.AN_vert) .AN_flyout {
  bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
  flex-direction:row;
}
/* Vertical bar: flyout pops LEFT */
#AN_bar.AN_vert .AN_flyout {
  right:calc(100% + 8px); top:50%; transform:translateY(-50%);
  flex-direction:column;
}

/* Colors block inside flyout or inline */
.AN_colorsBlock { display:flex; gap:3px; align-items:center; flex-shrink:0; }
#AN_bar.AN_vert .AN_colorsBlock { flex-direction:column; }

/* Slider block */
.AN_sliderBlock { display:flex; align-items:center; flex-shrink:0; }

body.AN_dark .AN_sep { background:#34445a; }

#AN_drag {
  cursor:grab; opacity:.38; padding:2px 3px; border-radius:6px;
  display:flex; align-items:center; color:#64748b; touch-action:none; flex-shrink:0;
}
#AN_drag:hover { opacity:.85; }
#AN_drag:active { cursor:grabbing; }

.AN_tool {
  background:none; border:2px solid transparent; border-radius:8px;
  width:30px; height:30px; font-size:15px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .12s,border-color .12s,transform .1s; flex-shrink:0;
}
.AN_tool:hover { background:rgba(13,110,253,.08); transform:scale(1.08); }
.AN_tool.AN_active { background:rgba(13,110,253,.12); border-color:#0d6efd; }
.AN_tool[data-tool="magic"].AN_active { border-color:#f59e0b; background:rgba(245,158,11,.12); }
.AN_Ttxt { font-size:14px!important; font-weight:800; font-family:'Hind Siliguri',Arial,sans-serif; color:#1e293b; }
body.AN_dark .AN_Ttxt { color:#d4dce8; }

#AN_colors { display:flex; gap:3px; align-items:center; flex-shrink:0; }
#AN_bar.AN_vert #AN_colors { flex-direction:column; gap:3px; }
.AN_clr {
  width:18px; height:18px; border-radius:50%; border:2px solid transparent;
  cursor:pointer; transition:transform .13s; flex-shrink:0;
}
.AN_clr:hover { transform:scale(1.22); }
.AN_clr.AN_active { border-color:#fff; box-shadow:0 0 0 2.5px #0d6efd; transform:scale(1.15); }

#AN_slider {
  width:58px; height:4px; flex-shrink:0;
  -webkit-appearance:none; appearance:none;
  background:#cbd5e1; border-radius:2px; outline:none; cursor:pointer;
}
body.AN_dark #AN_slider { background:#34445a; }
#AN_slider::-webkit-slider-thumb {
  -webkit-appearance:none; width:16px; height:16px;
  border-radius:50%; background:#0d6efd; cursor:pointer;
}

/* Annotation toolbar thickness controls */
.AN_ThickWrap { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.AN_ThickBtn {
  width:28px; height:28px; border:none; border-radius:7px;
  background:rgba(13,110,253,.1); color:#1e293b; font-size:14px;
  font-weight:700; cursor:pointer; display:flex; align-items:center;
  justify-content:center; transition:background .12s,transform .1s; flex-shrink:0;
}
body.AN_dark .AN_ThickBtn { color:#d4dce8!important; background:rgba(96,165,250,.15); }
.AN_ThickBtn:hover { background:rgba(13,110,253,.2); transform:scale(1.08); }
.AN_ThickVal {
  min-width:36px; text-align:center; font-size:13px; font-weight:700;
  color:#1e293b; cursor:pointer; user-select:none; padding:0 6px;
  border-radius:6px; background:rgba(13,110,253,.08); transition:background .12s;
}
body.AN_dark .AN_ThickVal { color:#d4dce8!important; background:rgba(96,165,250,.15); }
.AN_ThickVal:hover { background:rgba(13,110,253,.15); }
body.AN_dark .AN_ThickVal:hover { background:rgba(96,165,250,.25); }

/* In-page whiteboard thickness controls */
.AN_wbThickWrap { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.AN_wbThickBtn {
  width:28px; height:28px; border:none; border-radius:7px;
  background:rgba(13,110,253,.1); color:#1e293b; font-size:14px;
  font-weight:700; cursor:pointer; display:flex; align-items:center;
  justify-content:center; transition:background .12s,transform .1s; flex-shrink:0;
}
body.AN_dark .AN_wbThickBtn { color:#d4dce8!important; background:rgba(96,165,250,.15); }
.AN_wbThickBtn:hover { background:rgba(13,110,253,.2); transform:scale(1.08); }
.AN_wbThickVal {
  min-width:36px; text-align:center; font-size:13px; font-weight:700;
  color:#1e293b; cursor:pointer; user-select:none; padding:0 6px;
  border-radius:6px; background:rgba(13,110,253,.08); transition:background .12s;
}
body.AN_dark .AN_wbThickVal { color:#d4dce8!important; background:rgba(96,165,250,.15); }
.AN_wbThickVal:hover { background:rgba(13,110,253,.15); }
body.AN_dark .AN_wbThickVal:hover { background:rgba(96,165,250,.25); }

/* Numpad modal (shared) */
.AN_NumpadModal,
.AN_wbNumpadModal {
  display:none; position:fixed; inset:0; z-index:99999;
  align-items:center; justify-content:center;
  background:rgba(0,0,0,.5); backdrop-filter:blur(4px);
}
.AN_NumpadModal .AN_NumpadKey:hover,
.AN_wbNumpadModal .AN_NumpadKey:hover {
  background:rgba(59,130,246,.25) !important; transform:scale(1.05);
}
body.AN_dark .AN_NumpadModal .AN_NumpadKey,
body.AN_dark .AN_wbNumpadModal .AN_NumpadKey {
  background:rgba(255,255,255,.04); color:#e2e8f0;
}
body.AN_dark .AN_NumpadModal .AN_NumpadKey[data-key="⌫"],
body.AN_dark .AN_NumpadModal .AN_NumpadKey[data-key="✓"],
body.AN_dark .AN_wbNumpadModal .AN_NumpadKey[data-key="⌫"],
body.AN_dark .AN_wbNumpadModal .AN_NumpadKey[data-key="✓"] {
  background:rgba(59,130,246,.15); color:#3b82f6;
}
body.AN_dark .AN_NumpadModal .AN_NumpadKey:hover,
body.AN_dark .AN_wbNumpadModal .AN_NumpadKey:hover {
  background:rgba(59,130,246,.25) !important;
}
.AN_NumpadInput:focus,
.AN_wbNumpadInput:focus { outline:none; border-color:#3b82f6 !important; box-shadow:0 0 0 3px rgba(59,130,246,.2); }

.AN_act {
  background:none; border:none; font-size:15px; cursor:pointer;
  width:30px; height:30px; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  transition:background .12s,transform .1s; flex-shrink:0;
}
.AN_act:hover { background:rgba(13,110,253,.08); transform:scale(1.1); }
#AN_touch.AN_scroll_on { background:rgba(16,185,129,.15); border:2px solid #10b981; border-radius:10px; }

/* ── Reopen FAB ── */
#AN_open {
  position:fixed; bottom:22px; right:16px; z-index:9100;
  width:52px; height:52px; border-radius:50%; border:none;
  background:#0d6efd; color:#fff; font-size:22px; cursor:pointer;
  box-shadow:0 4px 18px rgba(13,110,253,.5);
  display:none; align-items:center; justify-content:center;
}
#AN_open.AN_vis { display:flex; }

/* ── Text popup ── */
#AN_textpop {
  position:fixed; z-index:9200;
  background:rgba(255,255,255,.98); border:1.5px solid #cbd5e1;
  border-radius:14px; padding:14px 16px;
  box-shadow:0 8px 32px rgba(0,0,0,.2);
  display:none; flex-direction:column; min-width:240px;
  font-family:'Hind Siliguri',Arial,sans-serif;
}
body.AN_dark #AN_textpop { background:rgba(22,32,50,.98); border-color:#34445a; }
#AN_textpop.AN_show { display:flex; }
#AN_tinput {
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:15px;
  padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px;
  background:transparent; color:inherit; outline:none; width:100%;
}
body.AN_dark #AN_tinput { border-color:#34445a; color:#d4dce8; }
#AN_tinput:focus { border-color:#0d6efd; }
#AN_tok,#AN_tcancel {
  flex:1; padding:7px; border:none; border-radius:8px;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:13px; font-weight:600; cursor:pointer;
}
#AN_tok { background:#0d6efd; color:#fff; }
#AN_tcancel { background:#f0f4ff; color:#1e293b; border:1px solid #cbd5e1; }

/* ── Custom confirm modal ── */
#AN_modal {
  display:none; position:fixed; inset:0; z-index:99999;
  align-items:center; justify-content:center;
  background:rgba(0,0,0,.45); backdrop-filter:blur(4px);
  animation:AN_fadeIn .15s ease;
}
#AN_modal.AN_show { display:flex; }
#AN_modalBox {
  background:#1e293b; color:#e2e8f0;
  border-radius:18px; padding:28px 28px 22px;
  box-shadow:0 24px 64px rgba(0,0,0,.6);
  min-width:260px; max-width:340px; width:90vw;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  animation:AN_popIn .18s cubic-bezier(.34,1.56,.64,1);
  border:1px solid rgba(255,255,255,.08);
  font-family:'Hind Siliguri',Arial,sans-serif;
}
#AN_modalIcon { font-size:36px; line-height:1; }
#AN_modalMsg { font-size:16px; font-weight:600; text-align:center; line-height:1.5; color:#e2e8f0; }
#AN_modalBtns { display:flex; gap:10px; margin-top:6px; width:100%; }
#AN_modalOk, #AN_modalCancel {
  flex:1; padding:10px 0; border:none; border-radius:10px;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:14px;
  font-weight:700; cursor:pointer; transition:transform .1s, filter .12s;
}
#AN_modalOk     { background:#ef4444; color:#fff; }
#AN_modalCancel { background:rgba(255,255,255,.1); color:#e2e8f0; border:1px solid rgba(255,255,255,.15); }
#AN_modalOk:hover     { filter:brightness(1.15); transform:scale(1.03); }
#AN_modalCancel:hover { filter:brightness(1.2);  transform:scale(1.03); }

/* ══ WHITEBOARD WINDOW ══ */
#AN_wbWin {
  display:none; position:fixed; left:80px; top:60px;
  width:680px; height:500px; min-width:280px; min-height:220px;
  z-index:9500; flex-direction:column;
  border-radius:18px; overflow:visible;
  box-shadow:0 20px 60px rgba(0,0,0,.45), 0 0 0 1.5px rgba(255,255,255,.18);
  background:#9ca3af;
}
@media(max-width:600px){
  #AN_wbWin { left:4px!important; width:calc(100vw - 8px)!important; }
}
#AN_wbWin.AN_wbOpen { display:flex; }
#AN_wbWin.AN_wbFull {
  left:0!important; top:0!important;
  width:100vw!important; height:100vh!important;
  border-radius:0!important; border:none!important;
}
#AN_wbWin.AN_wbFull .AN_rsz { display:none; }

#AN_wbTitleBar {
  height:38px; flex-shrink:0; display:flex; align-items:center;
  background:rgba(15,23,42,.94); backdrop-filter:blur(10px);
  padding:0 8px 0 13px; border-radius:16px 16px 0 0;
  border-bottom:1px solid rgba(255,255,255,.09);
  user-select:none; gap:8px;
}
#AN_wbWin.AN_wbFull #AN_wbTitleBar { border-radius:0; }
#AN_wbTitleDrag { flex:1; cursor:grab; touch-action:none; display:flex; align-items:center; height:100%; color:#e2e8f0; font-family:'Hind Siliguri',Arial,sans-serif; font-size:13px; font-weight:700; }
#AN_wbTitleDrag:active { cursor:grabbing; }
#AN_wbWinBtns { display:flex; gap:6px; }
#AN_wbWinBtns button {
  width:28px; height:20px; border-radius:6px; border:none; cursor:pointer;
  font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center;
  transition:filter .15s, transform .12s; color:rgba(0,0,0,.55);
}
#AN_wbMinBtn   { background:#f59e0b; }
#AN_wbMaxBtn   { background:#10b981; }
#AN_wbCloseBtn { background:#ef4444; }
#AN_wbWinBtns button:hover { filter:brightness(1.2); transform:scale(1.08); }

#AN_wbMain { display:flex; flex:1; min-height:0; overflow:hidden; }
#AN_wbBody { flex:1; position:relative; min-height:0; overflow:hidden; }
#AN_wbCanvas {
  position:absolute; inset:0; width:100%; height:100%;
  cursor:crosshair; touch-action:none; display:block;
}

/* Page sidebar */
#AN_pgSidebar {
  width:44px; flex-shrink:0; background:rgba(15,23,42,.88);
  border-right:1px solid rgba(255,255,255,.07);
  display:flex; align-items:center; justify-content:center;
  border-radius:0 0 0 0;
}
#AN_pgSidebar.AN_pgHidden { display:none; }
#AN_pgSidebarInner { display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 0; }
.AN_pgSBtn {
  width:32px; height:32px; border:none; border-radius:7px;
  background:none; color:#94a3b8; font-size:15px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .12s, color .12s; flex-shrink:0;
}
.AN_pgSBtn:hover { background:rgba(255,255,255,.1); color:#e2e8f0; }
.AN_pgHSep { width:24px; height:1px; background:rgba(255,255,255,.07); margin:2px 0; }
#AN_pgInfo { display:flex; flex-direction:column; align-items:center; }
#AN_pgNum { font-size:13px; font-weight:800; color:#e2e8f0; font-family:'Hind Siliguri',Arial,sans-serif; line-height:1; }
#AN_pgOf  { font-size:9px; color:#475569; font-family:'Hind Siliguri',Arial,sans-serif; }
.AN_pgDelBtn { color:#ef4444!important; }
.AN_pgDelBtn:hover { background:rgba(239,68,68,.15)!important; }

#AN_pgSideTab {
  width:14px; flex-shrink:0; background:rgba(15,23,42,.7);
  display:none; align-items:center; justify-content:center;
  cursor:pointer; color:#64748b; font-size:12px;
  border-right:1px solid rgba(255,255,255,.05);
  transition:background .12s, color .12s;
}
#AN_pgSideTab.AN_sideHidden { display:flex; }
#AN_pgSideTab:hover { background:rgba(255,255,255,.1); color:#e2e8f0; }

/* Resize handles */
#AN_rszOverlay { position:fixed; z-index:9520; pointer-events:none; display:none; }
#AN_rszOverlay.AN_rszVis { display:block; }
.AN_rsz { position:absolute; touch-action:none; pointer-events:all; }
.AN_rsz[data-dir="n"] { top:-10px; left:50px; right:50px; height:20px; cursor:n-resize; }
.AN_rsz[data-dir="s"] { bottom:-10px; left:50px; right:50px; height:20px; cursor:s-resize; }
.AN_rsz[data-dir="e"] { right:-10px; top:50px; bottom:50px; width:20px; cursor:e-resize; }
.AN_rsz[data-dir="w"] { left:-10px; top:50px; bottom:50px; width:20px; cursor:w-resize; }
.AN_rsz[data-dir="ne"] { top:-20px; right:-20px; width:54px; height:54px; cursor:ne-resize; clip-path:polygon(0 0,54px 0,54px 54px,34px 54px,34px 20px,0 20px); }
.AN_rsz[data-dir="nw"] { top:-20px; left:-20px; width:54px; height:54px; cursor:nw-resize; clip-path:polygon(0 0,54px 0,54px 20px,20px 20px,20px 54px,0 54px); }
.AN_rsz[data-dir="se"] { bottom:-20px; right:-20px; width:54px; height:54px; cursor:se-resize; clip-path:polygon(34px 0,54px 0,54px 54px,0 54px,0 34px,34px 34px); }
.AN_rsz[data-dir="sw"] { bottom:-20px; left:-20px; width:54px; height:54px; cursor:sw-resize; clip-path:polygon(0 0,20px 0,20px 34px,54px 34px,54px 54px,0 54px); }
.AN_rsz[data-dir="ne"]::before,.AN_rsz[data-dir="nw"]::before,.AN_rsz[data-dir="se"]::before,.AN_rsz[data-dir="sw"]::before {
  content:''; position:absolute; width:28px; height:28px; border:4px solid rgba(255,255,255,.9);
  filter:drop-shadow(0 0 4px rgba(0,0,0,.6)); box-sizing:border-box; pointer-events:none;
  transition:border-color .15s,filter .15s,transform .12s;
}
.AN_rsz[data-dir="ne"]::before { top:10px; right:10px; border-left:none; border-bottom:none; border-radius:0 16px 0 0; }
.AN_rsz[data-dir="nw"]::before { top:10px; left:10px; border-right:none; border-bottom:none; border-radius:16px 0 0 0; }
.AN_rsz[data-dir="se"]::before { bottom:10px; right:10px; border-left:none; border-top:none; border-radius:0 0 16px 0; }
.AN_rsz[data-dir="sw"]::before { bottom:10px; left:10px; border-right:none; border-top:none; border-radius:0 0 0 16px; }
.AN_rsz[data-dir="ne"]:hover::before,.AN_rsz[data-dir="nw"]:hover::before,
.AN_rsz[data-dir="se"]:hover::before,.AN_rsz[data-dir="sw"]:hover::before {
  border-color:#fff; transform:scale(1.1); filter:drop-shadow(0 0 7px rgba(255,255,255,.7));
}
.AN_rsz.AN_rszActive::before { border-color:#60a5fa!important; filter:drop-shadow(0 0 8px rgba(96,165,250,.9))!important; transform:scale(1.05)!important; }

/* WB bottom bar */
#AN_wbBar {
  display:flex; align-items:center; gap:4px; padding:5px 10px; flex-shrink:0;
  background:rgba(255,255,255,.97); border-top:1px solid #e2e8f0;
  border-radius:0 0 16px 16px; flex-wrap:nowrap; overflow:visible;
  position:relative; user-select:none; min-height:44px; transition:background .2s,border-color .2s;
}
#AN_wbBar .AN_wbScroll { display:flex; align-items:center; gap:4px; overflow-x:auto; flex:1; }
body.AN_dark #AN_wbBar { background:rgba(15,23,42,.97); border-top:1px solid rgba(255,255,255,.08); }
#AN_wbWin.AN_wbFull #AN_wbBar { border-radius:0; }
.AN_wbSep { width:1px; height:22px; background:#e2e8f0; flex-shrink:0; }
body.AN_dark .AN_wbSep { background:rgba(255,255,255,.1); }
.AN_wbt {
  background:none; border:2px solid transparent; border-radius:8px;
  width:32px; height:32px; font-size:16px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .12s,border-color .12s,transform .1s; flex-shrink:0;
}
.AN_wbt:hover { background:rgba(13,110,253,.08); transform:scale(1.08); }
body.AN_dark .AN_wbt:hover { background:rgba(255,255,255,.08); }
.AN_wbt.AN_wbActive { background:rgba(13,110,253,.12); border-color:#0d6efd; }
.AN_wbt[data-tool="magic"].AN_wbActive { border-color:#f59e0b; background:rgba(245,158,11,.12); }
#AN_wbColors,#AN_wbBG { display:flex; gap:4px; align-items:center; flex-shrink:0; }
.AN_wbClr,.AN_bgClr { width:19px; height:19px; border-radius:50%; border:2px solid transparent; cursor:pointer; transition:transform .13s; flex-shrink:0; }
.AN_wbClr:hover,.AN_bgClr:hover { transform:scale(1.22); }
.AN_wbClr.AN_wbClrActive { border-color:#fff; box-shadow:0 0 0 2.5px #0d6efd; transform:scale(1.15); }
.AN_bgClr.AN_bgActive { border-color:#fff; box-shadow:0 0 0 2.5px #6366f1; transform:scale(1.15); }
.AN_wbBGlbl { font-size:11px; font-weight:700; color:#94a3b8; white-space:nowrap; font-family:'Hind Siliguri',Arial,sans-serif; }
body.AN_dark .AN_wbBGlbl { color:#64748b; }
#AN_wbSlider { width:64px; height:4px; flex-shrink:0; -webkit-appearance:none; appearance:none; background:#cbd5e1; border-radius:2px; outline:none; cursor:pointer; }
body.AN_dark #AN_wbSlider { background:rgba(255,255,255,.15); }
#AN_wbSlider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#0d6efd; cursor:pointer; }

.AN_wbAct { background:none; border:none; font-size:16px; cursor:pointer; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:background .12s,transform .1s; flex-shrink:0; }
.AN_wbAct:hover { background:rgba(13,110,253,.08); transform:scale(1.1); }
body.AN_dark .AN_wbAct:hover { background:rgba(255,255,255,.09); }

/* WB text popup */
#AN_wbTextpop {
  position:absolute; z-index:9600;
  background:rgba(255,255,255,.98); border:1.5px solid #cbd5e1;
  border-radius:11px; padding:11px 13px;
  box-shadow:0 8px 26px rgba(0,0,0,.18);
  display:none; flex-direction:column; min-width:210px;
  font-family:'Hind Siliguri',Arial,sans-serif;
}
#AN_wbTextpop.AN_show { display:flex; }
body.AN_dark #AN_wbTextpop { background:rgba(15,23,42,.98); border-color:#34445a; }
#AN_wbTinput {
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:14px;
  padding:6px 10px; border:1.5px solid #cbd5e1; border-radius:7px;
  background:transparent; color:inherit; outline:none; width:100%;
}
body.AN_dark #AN_wbTinput { border-color:#34445a; color:#d4dce8; }
#AN_wbTinput:focus { border-color:#0d6efd; }
#AN_wbTok,#AN_wbTcancel {
  flex:1; padding:7px; border:none; border-radius:8px;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:13px; font-weight:600; cursor:pointer;
}
#AN_wbTok { background:#0d6efd; color:#fff; }
#AN_wbTcancel { background:#f0f4ff; color:#1e293b; border:1px solid #cbd5e1; }

/* ── Selection action buttons ── */
.AN_selActions{position:absolute;z-index:9999;display:none;gap:4px;}
.AN_selActions.AN_show{display:flex;}
.AN_selActions button{pointer-events:auto;width:28px;height:28px;border:none;border-radius:7px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);}
.AN_selDel{background:#ef4444;color:#fff;}
.AN_selEdit{background:#3b82f6;color:#fff;}

/* WB minimized tab */
#AN_wbMinTab {
  display:none; position:fixed; bottom:0; left:50%; transform:translateX(-50%);
  z-index:9500; background:rgba(15,23,42,.93); color:#e2e8f0;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:13px; font-weight:700;
  padding:6px 18px; gap:12px; border-radius:10px 10px 0 0;
  align-items:center; white-space:nowrap;
  backdrop-filter:blur(10px); box-shadow:0 -4px 18px rgba(0,0,0,.25);
}
#AN_wbMinTab.AN_minVis { display:flex; }
#AN_wbRestoreBtn {
  background:#0d6efd; color:#fff; border:none;
  padding:3px 12px; border-radius:7px;
  font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
}
#AN_wbRestoreBtn:hover { opacity:.85; }

/* Page modal */
#AN_pgModal {
  display:none; position:fixed; inset:0; z-index:99990;
  align-items:center; justify-content:center;
  background:rgba(0,0,0,.5); backdrop-filter:blur(5px);
}
#AN_pgModal.AN_show { display:flex; }
#AN_pgModalBox {
  background:#1e293b; border-radius:16px;
  padding:0; width:min(680px,92vw); max-height:80vh;
  display:flex; flex-direction:column;
  box-shadow:0 24px 64px rgba(0,0,0,.6);
  border:1px solid rgba(255,255,255,.1); overflow:hidden;
  animation:AN_popIn .18s cubic-bezier(.34,1.56,.64,1);
  font-family:'Hind Siliguri',Arial,sans-serif;
}
#AN_pgModalHeader {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px 12px; border-bottom:1px solid rgba(255,255,255,.08);
  font-size:15px; font-weight:800; color:#e2e8f0; flex-shrink:0;
}
#AN_pgModalClose {
  background:rgba(255,255,255,.08); border:none; color:#94a3b8;
  width:28px; height:28px; border-radius:7px; cursor:pointer; font-size:14px;
  display:flex; align-items:center; justify-content:center; transition:background .12s;
}
#AN_pgModalClose:hover { background:rgba(239,68,68,.2); color:#ef4444; }
#AN_pgThumbs { display:flex; flex-wrap:wrap; gap:14px; padding:16px; overflow-y:auto; }
.AN_pgThumb { display:flex; flex-direction:column; align-items:center; gap:7px; cursor:pointer; transition:transform .13s; }
.AN_pgThumb:hover { transform:scale(1.04); }
.AN_pgThumb canvas { width:140px; height:100px; border-radius:8px; border:2.5px solid transparent; box-shadow:0 4px 14px rgba(0,0,0,.35); }
.AN_pgThumb.AN_pgCurrent canvas { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.35); }
.AN_pgThumb span { font-size:12px; font-weight:700; color:#94a3b8; font-family:'Hind Siliguri',Arial,sans-serif; }
.AN_pgThumb.AN_pgCurrent span { color:#3b82f6; }

/* Export modal */
#AN_expModal {
  display:none; position:fixed; inset:0; z-index:99990;
  align-items:center; justify-content:center;
  background:rgba(0,0,0,.5); backdrop-filter:blur(5px);
}
#AN_expModal.AN_show { display:flex; }
#AN_expBox {
  background:#1e293b; border-radius:16px;
  width:min(340px,92vw); display:flex; flex-direction:column;
  box-shadow:0 24px 64px rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.1);
  overflow:hidden; animation:AN_popIn .18s cubic-bezier(.34,1.56,.64,1);
  font-family:'Hind Siliguri',Arial,sans-serif;
}
#AN_expHeader {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,.07);
  font-size:14px; font-weight:800; color:#e2e8f0;
}
#AN_expClose {
  background:rgba(255,255,255,.08); border:none; color:#94a3b8;
  width:26px; height:26px; border-radius:6px; cursor:pointer; font-size:13px;
  display:flex; align-items:center; justify-content:center; transition:background .12s;
}
#AN_expClose:hover { background:rgba(239,68,68,.2); color:#ef4444; }
.AN_expBtns { display:flex; flex-direction:column; gap:8px; padding:12px 14px; }
.AN_expBtn {
  display:flex; align-items:center; gap:12px; padding:10px 14px;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1);
  border-radius:10px; cursor:pointer; transition:background .15s,border-color .15s,transform .1s;
  text-align:left; width:100%;
}
.AN_expBtn:hover { background:rgba(59,130,246,.15); border-color:rgba(59,130,246,.4); transform:scale(1.01); }
.AN_expIcon { font-size:26px; flex-shrink:0; }
.AN_expTitle { font-size:14px; font-weight:800; color:#e2e8f0; display:block; }
.AN_expSub   { font-size:11px; color:#64748b; margin-top:2px; display:block; }
#AN_expSelArea { padding:12px 14px 8px; border-top:1px solid rgba(255,255,255,.07); }
#AN_expSelLabel { font-size:12px; font-weight:700; color:#94a3b8; margin-bottom:8px; display:block; }
#AN_expSelGrid { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:10px; }
.AN_expSelThumb { display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; }
.AN_expSelThumb canvas { width:70px; height:50px; border-radius:6px; border:2.5px solid rgba(255,255,255,.15); transition:border-color .13s; }
.AN_expSelThumb.AN_selChk canvas { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.35); }
.AN_expSelThumb span { font-size:10px; font-weight:700; color:#64748b; }
.AN_expSelThumb.AN_selChk span { color:#3b82f6; }
#AN_expSelActions { display:flex; gap:7px; }
#AN_expSelActions button {
  flex:1; padding:8px 0; border:none; border-radius:8px;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:12px; font-weight:700; cursor:pointer;
  transition:filter .12s,transform .1s;
}
#AN_expSelAll,#AN_expSelNone { background:rgba(255,255,255,.08); color:#e2e8f0; }
#AN_expSelGo { background:#3b82f6; color:#fff; }
#AN_expSelGo:hover { filter:brightness(1.15); }
#AN_expProgress { padding:12px 16px 14px; border-top:1px solid rgba(255,255,255,.07); display:none; }
#AN_expProgBar { height:6px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden; margin-bottom:8px; }
#AN_expProgFill { height:100%; background:#3b82f6; border-radius:3px; width:0%; transition:width .2s; }
#AN_expProgTxt { font-size:12px; color:#94a3b8; text-align:center; font-family:'Hind Siliguri',Arial,sans-serif; }

/* Dark mode applies ONLY to annotation tool elements, not the page */
body.AN_dark .AN_flyout { background:rgba(22,32,50,.98) !important; border-color:#34445a !important; }
body.AN_dark .AN_grpBtn { color:#d4dce8; }
body.AN_dark .AN_grpBtn.AN_grpOpen { background:rgba(59,130,246,.15); border-color:#3b82f6; }

/* WB flyout positioned by JS */

/* WB zoom */
#AN_wbCanvas { transform-origin:0 0; }
.AN_dragGhost { position:fixed; inset:0; z-index:9999; border:3px dashed #3b82f6; background:rgba(59,130,246,.08); pointer-events:none; display:none; }
.AN_dragGhost.AN_on { display:block; }
.AN_wbZoomBlock { display:flex; align-items:center; gap:5px; flex-shrink:0; }
.AN_wbZoomBtn {
  width:26px; height:26px; border:none; border-radius:6px;
  background:rgba(13,110,253,.1); color:#1e293b; font-size:14px;
  font-weight:700; cursor:pointer; display:flex; align-items:center;
  justify-content:center; transition:background .12s; flex-shrink:0;
}
body.AN_dark .AN_wbZoomBtn { color:#d4dce8; background:rgba(96,165,250,.15); }
.AN_wbZoomBtn:hover { background:rgba(13,110,253,.2); }
.AN_wbZoomVal {
  font-size:11px; font-weight:700; color:#475569; min-width:34px;
  text-align:center; font-family:'Hind Siliguri',Arial,sans-serif;
}
body.AN_dark .AN_wbZoomVal { color:#94a3b8; }
.AN_wbZoomSlider {
  width:58px; height:4px;
  -webkit-appearance:none; appearance:none;
  background:#cbd5e1; border-radius:2px; outline:none; cursor:pointer;
}
body.AN_dark .AN_wbZoomSlider { background:rgba(255,255,255,.15); }
.AN_wbZoomSlider::-webkit-slider-thumb {
  -webkit-appearance:none; width:14px; height:14px;
  border-radius:50%; background:#0d6efd; cursor:pointer;
}
`;
  document.head.appendChild(style);

  // ════════════════════════════════════════════
  //  HTML
  // ════════════════════════════════════════════
  var html = `
<!-- Overlay canvas -->
<canvas id="AN_canvas"></canvas>

<!-- Annotation toolbar — dynamically rendered by group engine -->
<div id="AN_bar">
  <div id="AN_drag">
    <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.4"/><circle cx="10" cy="3" r="1.4"/>
      <circle cx="4" cy="7" r="1.4"/><circle cx="10" cy="7" r="1.4"/>
      <circle cx="4" cy="11" r="1.4"/><circle cx="10" cy="11" r="1.4"/>
    </svg>
  </div>
  <!-- Groups injected here by JS -->
</div>

<!-- Reopen FAB -->
<button id="AN_open">✏️</button>

<!-- Annotation text popup -->
<div id="AN_textpop">
  <div style="font-size:12px;font-weight:700;color:#0d6efd;margin-bottom:6px">✍️ টেক্সট লেখো</div>
  <input id="AN_tinput" type="text" placeholder="এখানে লেখো..." autocomplete="off">
  <div style="display:flex;gap:8px;margin-top:8px">
    <button id="AN_tok">✅ যোগ</button>
    <button id="AN_tcancel">❌ বাতিল</button>
  </div>
</div>

<!-- Custom confirm modal -->
<div id="AN_modal">
  <div id="AN_modalBox">
    <div id="AN_modalIcon">🗑️</div>
    <div id="AN_modalMsg"></div>
    <div id="AN_modalBtns">
      <button id="AN_modalOk">হ্যাঁ, মুছো</button>
      <button id="AN_modalCancel">বাতিল</button>
    </div>
  </div>
</div>

<!-- WHITEBOARD WINDOW -->
<div id="AN_wbWin">
  <div id="AN_wbTitleBar">
    <div id="AN_wbTitleDrag"><span>🖊️ হোয়াইটবোর্ড</span></div>
    <div id="AN_wbWinBtns">
      <button id="AN_wbMinBtn"   title="মিনিমাইজ">─</button>
      <button id="AN_wbMaxBtn"   title="ফুল স্ক্রিন">⛶</button>
      <button id="AN_wbCloseBtn" title="বন্ধ করো">✕</button>
    </div>
  </div>
  <div id="AN_wbMain">
    <div id="AN_pgSidebar">
      <div id="AN_pgSidebarInner">
        <button class="AN_pgSBtn" id="AN_pgNew"   title="নতুন পেজ">＋</button>
        <div class="AN_pgHSep"></div>
        <button class="AN_pgSBtn" id="AN_pgPrev"  title="আগের পেজ">↑</button>
        <div id="AN_pgInfo"><span id="AN_pgNum">1</span><span id="AN_pgOf">/1</span></div>
        <button class="AN_pgSBtn" id="AN_pgNext"  title="পরের পেজ">↓</button>
        <div class="AN_pgHSep"></div>
        <button class="AN_pgSBtn" id="AN_pgThumb" title="সব পেজ দেখো">⊞</button>
        <button class="AN_pgSBtn AN_pgDelBtn" id="AN_pgDel" title="পেজ মুছো">✕</button>
        <div class="AN_pgHSep"></div>
        <button class="AN_pgSBtn" id="AN_pgExport" title="Export">⬇️</button>
        <div class="AN_pgHSep"></div>
        <button class="AN_pgSBtn" id="AN_pgOpenTab" title="New Tab-এ খোলো">🗂️</button>
        <div class="AN_pgHSep"></div>
        <button class="AN_pgSBtn" id="AN_pgSideMin" title="সাইডবার লুকাও">‹</button>
      </div>
    </div>
    <div id="AN_pgSideTab" title="সাইডবার খোলো">›</div>
    <div id="AN_wbBody">
      <canvas id="AN_wbCanvas"></canvas>
      <div id="AN_wbTextpop">
        <div style="font-size:11px;font-weight:700;color:#0d6efd;margin-bottom:5px">✍️ টেক্সট লেখো</div>
        <input id="AN_wbTinput" type="text" placeholder="এখানে লেখো..." autocomplete="off">
        <div style="display:flex;gap:6px;margin-top:7px">
          <button id="AN_wbTok">✅ যোগ</button>
          <button id="AN_wbTcancel">❌ বাতিল</button>
        </div>
      </div>
    </div>
  </div>
  <div id="AN_wbBar"><!-- dynamically rendered by WB group engine --></div>
</div>
<!-- Resize overlay for WB -->
<div id="AN_rszOverlay">
  <div class="AN_rsz" data-dir="n"></div>
  <div class="AN_rsz" data-dir="s"></div>
  <div class="AN_rsz" data-dir="e"></div>
  <div class="AN_rsz" data-dir="w"></div>
  <div class="AN_rsz" data-dir="ne"></div>
  <div class="AN_rsz" data-dir="nw"></div>
  <div class="AN_rsz" data-dir="se"></div>
  <div class="AN_rsz" data-dir="sw"></div>
</div>
<!-- WB minimized tab -->
<div id="AN_wbMinTab">
  <span>🖊️ হোয়াইটবোর্ড</span>
  <button id="AN_wbRestoreBtn">↑ খোলো</button>
</div>
<!-- Page thumbnail modal -->
<div id="AN_pgModal">
  <div id="AN_pgModalBox">
    <div id="AN_pgModalHeader">
      <span>📄 পেজ বেছে নাও</span>
      <button id="AN_pgModalClose">✕</button>
    </div>
    <div id="AN_pgThumbs"></div>
  </div>
</div>
<!-- Export modal -->
<div id="AN_expModal">
  <div id="AN_expBox">
    <div id="AN_expHeader">
      <span>⬇️ Export</span>
      <button id="AN_expClose">✕</button>
    </div>
    <div class="AN_expBtns">
      <button class="AN_expBtn" id="AN_expPng">
        <span class="AN_expIcon">🖼️</span>
        <span><span class="AN_expTitle">এই পেজ — PNG</span><span class="AN_expSub">Current page as image</span></span>
      </button>
      <button class="AN_expBtn" id="AN_expAll">
        <span class="AN_expIcon">📄</span>
        <span><span class="AN_expTitle">সব পেজ — PDF</span><span class="AN_expSub">All pages in one PDF</span></span>
      </button>
      <button class="AN_expBtn" id="AN_expSel">
        <span class="AN_expIcon">🗂️</span>
        <span><span class="AN_expTitle">বেছে নেওয়া পেজ — PDF</span><span class="AN_expSub">Select which pages to include</span></span>
      </button>
    </div>
    <div id="AN_expSelArea" style="display:none">
      <span id="AN_expSelLabel">পেজ বেছে নাও:</span>
      <div id="AN_expSelGrid"></div>
      <div id="AN_expSelActions">
        <button id="AN_expSelAll">সব বেছে নাও</button>
        <button id="AN_expSelNone">কোনোটি না</button>
        <button id="AN_expSelGo">✅ PDF বানাও</button>
      </div>
    </div>
    <div id="AN_expProgress">
      <div id="AN_expProgBar"><div id="AN_expProgFill"></div></div>
      <div id="AN_expProgTxt">তৈরি হচ্ছে…</div>
    </div>
  </div>
</div>
<div class="AN_dragGhost" id="AN_dragGhost"></div>
`;

  var wrap = document.createElement('div');
  wrap.innerHTML = html;
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  // ════════════════════════════════════════════
  //  DRAWING ENGINE
  // ════════════════════════════════════════════
  function makeBoard(canvas, mode, getBg) {
    var ctx = canvas.getContext('2d');
    var strokes = [], cur = null, drawing = false;
    var imageCache = new Map();
    var selectedStrokes = [], selectRect = null, isMoving = false, moveStart = null;
    var _moveOrig = [];
    var isPanning = false, panStart = null;
    var selActions = null;
    var _editInput = null;

    var viewport = { x: 0, y: 0, scale: 1 };

    function resize() {
      var dpr = window.devicePixelRatio || 1, w, h;
      if (mode === 'overlay') { w = window.innerWidth; h = window.innerHeight; }
      else { var body = canvas.parentElement; w = body.clientWidth; h = body.clientHeight; }
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyViewport();
      redraw();
    }
    function getCoord(e) {
      var s = e.touches ? e.touches[0] : e;
      var z = viewport.scale;
      if (mode === 'overlay') return { x: (s.clientX + window.scrollX - viewport.x) / z, y: (s.clientY + window.scrollY - viewport.y) / z };
      var r = canvas.getBoundingClientRect();
      return { x: (s.clientX - r.left - viewport.x) / z, y: (s.clientY - r.top  - viewport.y) / z };
    }
    function toCanvas(x, y) {
      if (mode === 'overlay') return { x: x - window.scrollX, y: y - window.scrollY };
      return { x: x, y: y };
    }
    function smoothPath(pts) {
      if (!pts || pts.length < 2) return;
      var p0 = toCanvas(pts[0].x, pts[0].y);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
      if (pts.length === 2) { var p1 = toCanvas(pts[1].x, pts[1].y); ctx.lineTo(p1.x, p1.y); }
      else {
        for (var i = 1; i < pts.length - 1; i++) {
          var a = toCanvas(pts[i].x, pts[i].y), b = toCanvas(pts[i+1].x, pts[i+1].y);
          ctx.quadraticCurveTo(a.x, a.y, (a.x+b.x)/2, (a.y+b.y)/2);
        }
        var last = toCanvas(pts[pts.length-1].x, pts[pts.length-1].y);
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
    function getStrokeBBox(s) {
      if (s.pts) { var mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity; for(var i=0;i<s.pts.length;i++){if(s.pts[i].x<mnX)mnX=s.pts[i].x;if(s.pts[i].y<mnY)mnY=s.pts[i].y;if(s.pts[i].x>mxX)mxX=s.pts[i].x;if(s.pts[i].y>mxY)mxY=s.pts[i].y;} return {x:mnX,y:mnY,w:mxX-mnX,h:mxY-mnY}; }
      if (s.tool==='text') { var fs=Math.max(14,s.lw*3+12); return {x:s.sx,y:s.sy-fs,w:fs*(s.text||'').length*0.6,h:fs*1.2}; }
      if (s.tool==='image') return {x:s.sx,y:s.sy,w:s.w,h:s.h};
      return {x:Math.min(s.sx,s.ex),y:Math.min(s.sy,s.ey),w:Math.abs(s.ex-s.sx),h:Math.abs(s.ey-s.sy)};
    }
    function hitTest(px,py) {
      for (var i=strokes.length-1;i>=0;i--) { var s=strokes[i];
        if (s.tool==='text') { var fs=Math.max(14,s.lw*3+12); var tw=fs*(s.text||'').length*0.6; if(px>=s.sx&&px<=s.sx+tw&&py>=s.sy-fs&&py<=s.sy+fs*0.2)return s; }
        if (s.tool==='image') { if(px>=s.sx&&px<=s.sx+s.w&&py>=s.sy&&py<=s.sy+s.h)return s; }
        if (s.pts) { for(var j=0;j<s.pts.length;j++){if(Math.hypot(px-s.pts[j].x,py-s.pts[j].y)<12)return s;} }
        if (s.sx!==undefined) { var bx=getStrokeBBox(s); if(bx&&px>=bx.x-3&&px<=bx.x+bx.w+3&&py>=bx.y-3&&py<=bx.y+bx.h+3)return s; }
      }
      return null;
    }
    function isSelected(s){return selectedStrokes.indexOf(s)>=0;}
    function clearSel(){selectedStrokes=[];}
    function getSel(){return selectedStrokes.slice();}
    function setSel(arr){selectedStrokes=arr?arr.slice():[];}
    function toggleSel(s){var idx=selectedStrokes.indexOf(s);if(idx>=0)selectedStrokes.splice(idx,1);else selectedStrokes.push(s);}
    function addSel(s){if(!isSelected(s))selectedStrokes.push(s);}
    function initMove(){_moveOrig=[];selectedStrokes.forEach(function(s){var o={};if(s.pts)o.pts=s.pts.map(function(p){return{x:p.x,y:p.y};});if(s.sx!==undefined)o.sx=s.sx;if(s.sy!==undefined)o.sy=s.sy;if(s.ex!==undefined)o.ex=s.ex;if(s.ey!==undefined)o.ey=s.ey;_moveOrig.push({s:s,o:o});});}
    function applySelMove(dx,dy){_moveOrig.forEach(function(m){var s=m.s,o=m.o;if(o.pts){for(var i=0;i<s.pts.length;i++){s.pts[i].x=o.pts[i].x+dx;s.pts[i].y=o.pts[i].y+dy;}}else{if(o.sx!==undefined)s.sx=o.sx+dx;if(o.sy!==undefined)s.sy=o.sy+dy;if(o.ex!==undefined)s.ex=o.ex+dx;if(o.ey!==undefined)s.ey=o.ey+dy;}});}
    function selInRect(x1,y1,x2,y2,_m){var sx=_m==='overlay'?window.scrollX:0,sy=_m==='overlay'?window.scrollY:0;strokes.forEach(function(s){var bx=getStrokeBBox(s);if(bx&&bx.x+bx.w>=x1+sx&&bx.x<=x2+sx&&bx.y+bx.h>=y1+sy&&bx.y<=y2+sy)addSel(s);});}
    function drawOne(s, alphaForce) {
      ctx.save();
      var alpha = (alphaForce !== undefined) ? alphaForce : (s.tool === 'marker') ? 0.38 : 1;
      ctx.globalAlpha = alpha; ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
      ctx.lineWidth = s.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.tool==='pen'||s.tool==='marker'||s.tool==='magic') { smoothPath(s.pts); }
      else if (s.tool === 'arrow') {
        var cs = toCanvas(s.sx,s.sy), ce = toCanvas(s.ex,s.ey);
        var dx=ce.x-cs.x, dy=ce.y-cs.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist < 4) { ctx.restore(); return; }
        var ang = Math.atan2(dy,dx), hw = Math.max(16,Math.min(26,dist*0.32));
        ctx.beginPath(); ctx.moveTo(cs.x,cs.y);
        ctx.lineTo(ce.x-hw*0.75*Math.cos(ang), ce.y-hw*0.75*Math.sin(ang)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ce.x,ce.y);
        ctx.lineTo(ce.x-hw*Math.cos(ang-0.42), ce.y-hw*Math.sin(ang-0.42));
        ctx.lineTo(ce.x-hw*Math.cos(ang+0.42), ce.y-hw*Math.sin(ang+0.42));
        ctx.closePath(); ctx.fill();
      } else if (s.tool==='rect') {
        var cs2=toCanvas(s.sx,s.sy), ce2=toCanvas(s.ex,s.ey);
        ctx.strokeRect(cs2.x,cs2.y,ce2.x-cs2.x,ce2.y-cs2.y);
      } else if (s.tool==='circle') {
        var cs3=toCanvas(s.sx,s.sy), ce3=toCanvas(s.ex,s.ey);
        var rx=(ce3.x-cs3.x)/2, ry=(ce3.y-cs3.y)/2;
        ctx.beginPath(); ctx.ellipse(cs3.x+rx,cs3.y+ry,Math.abs(rx)||1,Math.abs(ry)||1,0,0,Math.PI*2); ctx.stroke();
      } else if (s.tool==='triangle') {
        var ct0=toCanvas(s.sx,s.sy), ce0=toCanvas(s.ex,s.ey);
        var bx0=ct0.x, by0=ct0.y, w0=ce0.x-ct0.x, h0=ce0.y-ct0.y;
        ctx.beginPath(); ctx.moveTo(bx0+w0/2,by0); ctx.lineTo(bx0,by0+h0); ctx.lineTo(bx0+w0,by0+h0); ctx.closePath(); ctx.stroke();
      } else if (s.tool==='pentagon') {
        var ct4=toCanvas(s.sx,s.sy), ce4=toCanvas(s.ex,s.ey);
        var cx4=(ct4.x+ce4.x)/2, cy4=(ct4.y+ce4.y)/2, r4=Math.min(Math.abs(ce4.x-ct4.x),Math.abs(ce4.y-ct4.y))/2;
        ctx.beginPath();
        for(var i4=0;i4<5;i4++){var a4=Math.PI/2+i4*2*Math.PI/5;if(i4===0)ctx.moveTo(cx4+r4*Math.cos(a4),cy4-r4*Math.sin(a4));else ctx.lineTo(cx4+r4*Math.cos(a4),cy4-r4*Math.sin(a4));}
        ctx.closePath(); ctx.stroke();
      } else if (s.tool==='hexagon') {
        var ct5=toCanvas(s.sx,s.sy), ce5=toCanvas(s.ex,s.ey);
        var cx5=(ct5.x+ce5.x)/2, cy5=(ct5.y+ce5.y)/2, r5=Math.min(Math.abs(ce5.x-ct5.x),Math.abs(ce5.y-ct5.y))/2;
        ctx.beginPath();
        for(var i5=0;i5<6;i5++){var a5=Math.PI/2+i5*2*Math.PI/6;if(i5===0)ctx.moveTo(cx5+r5*Math.cos(a5),cy5-r5*Math.sin(a5));else ctx.lineTo(cx5+r5*Math.cos(a5),cy5-r5*Math.sin(a5));}
        ctx.closePath(); ctx.stroke();
      } else if (s.tool==='roundrect') {
        var ct6=toCanvas(s.sx,s.sy), ce6=toCanvas(s.ex,s.ey);
        var x6=ct6.x,y6=ct6.y,w6=ce6.x-ct6.x,h6=ce6.y-ct6.y,rad6=Math.min(Math.abs(w6),Math.abs(h6),20);
        ctx.beginPath(); ctx.roundRect(x6,y6,w6,h6,rad6); ctx.stroke();
      } else if (s.tool==='diamond') {
        var ct7=toCanvas(s.sx,s.sy), ce7=toCanvas(s.ex,s.ey);
        var cx7=(ct7.x+ce7.x)/2, cy7=(ct7.y+ce7.y)/2;
        ctx.beginPath(); ctx.moveTo(cx7,ct7.y); ctx.lineTo(ce7.x,cy7); ctx.lineTo(cx7,ce7.y); ctx.lineTo(ct7.x,cy7); ctx.closePath(); ctx.stroke();
      } else if (s.tool==='star') {
        var ct8=toCanvas(s.sx,s.sy), ce8=toCanvas(s.ex,s.ey);
        var cx8=(ct8.x+ce8.x)/2, cy8=(ct8.y+ce8.y)/2, rOuter8=Math.min(Math.abs(ce8.x-ct8.x),Math.abs(ce8.y-ct8.y))/2, rInner8=rOuter8*0.4;
        ctx.beginPath();
        for(var i8=0;i8<5;i8++){var a8=Math.PI/2+i8*2*Math.PI/5;if(i8===0)ctx.moveTo(cx8+rOuter8*Math.cos(a8),cy8-rOuter8*Math.sin(a8));ctx.lineTo(cx8+rInner8*Math.cos(a8+Math.PI/5),cy8-rInner8*Math.sin(a8+Math.PI/5));ctx.lineTo(cx8+rOuter8*Math.cos(a8+2*Math.PI/5),cy8-rOuter8*Math.sin(a8+2*Math.PI/5));}
        ctx.closePath(); ctx.stroke();
      } else if (s.tool==='righttri') {
        var ct9=toCanvas(s.sx,s.sy), ce9=toCanvas(s.ex,s.ey);
        ctx.beginPath(); ctx.moveTo(ct9.x,ct9.y); ctx.lineTo(ce9.x,ce9.y); ctx.lineTo(ct9.x,ce9.y); ctx.closePath(); ctx.stroke();
      } else if (s.tool==='text') {
        var ct=toCanvas(s.sx,s.sy);
        ctx.globalAlpha=(alphaForce!==undefined)?alphaForce:1;
        ctx.font='bold '+Math.max(14,s.lw*3+12)+'px Hind Siliguri,Arial';
        ctx.fillText(s.text,ct.x,ct.y);
      } else if (s.tool==='image') {
        var img = imageCache.get(s);
        if (!img) { img = new Image(); var _s=s; img.onload=function(){if(strokes.indexOf(_s)>=0)redraw();}; img.src = s.dataUrl; imageCache.set(s, img); }
        if (img.complete && img.naturalWidth>0) { var cp=toCanvas(s.sx,s.sy); ctx.drawImage(img, cp.x, cp.y, s.w, s.h); }
      }
      ctx.restore();
    }
    function redraw() {
      var dpr=window.devicePixelRatio||1, w=canvas.width/dpr, h=canvas.height/dpr;
      ctx.clearRect(0,0,w,h);
      if (getBg) { ctx.fillStyle=getBg(); ctx.fillRect(0,0,w,h); }
      for (var i=0;i<strokes.length;i++) drawOne(strokes[i], strokes[i]._alpha!==undefined?strokes[i]._alpha:undefined);
      if (cur) drawOne(cur);
      ctx.save();
      selectedStrokes.forEach(function(s){var bx=getStrokeBBox(s);if(bx){var p1=toCanvas(bx.x,bx.y);ctx.strokeStyle='#3b82f6';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(p1.x-4,p1.y-4,bx.w+8,bx.h+8);ctx.setLineDash([]);}});
      if (selectRect) {
        var rx,ry,rw,rh;
        if (mode==='overlay') { rx=Math.min(selectRect.x1,selectRect.x2); ry=Math.min(selectRect.y1,selectRect.y2); rw=Math.abs(selectRect.x2-selectRect.x1); rh=Math.abs(selectRect.y2-selectRect.y1); }
        else { rx=Math.min(selectRect.x1,selectRect.x2); ry=Math.min(selectRect.y1,selectRect.y2); rw=Math.abs(selectRect.x2-selectRect.x1); rh=Math.abs(selectRect.y2-selectRect.y1); }
        ctx.fillStyle='rgba(59,130,246,0.08)'; ctx.strokeStyle='rgba(59,130,246,0.6)'; ctx.lineWidth=1.5; ctx.setLineDash([5,5]); ctx.fillRect(rx,ry,rw,rh); ctx.strokeRect(rx,ry,rw,rh); ctx.setLineDash([]);
      }
      ctx.restore();
      updSelBtns();
    }
    function scheduleFade(s) {
      var SHOW=2000, FADE=800;
      setTimeout(function(){
        var t1=Date.now();
        (function fade(){
          var el=Date.now()-t1, a=Math.max(0,1-el/FADE);
          s._alpha=a; redraw();
          if (a>0) requestAnimationFrame(fade);
          else { strokes=strokes.filter(function(x){return x!==s;}); redraw(); }
        })();
      }, SHOW);
    }
    function eraseAt(px,py,lw) {
      var r=lw*4+12;
      strokes=strokes.filter(function(s){
        if (s.tool==='text') return Math.hypot(s.sx-px,s.sy-py)>r;
        if (s.tool==='image') return !(px>=s.sx&&px<=s.sx+s.w&&py>=s.sy&&py<=s.sy+s.h);
        if (s.pts) { for(var i=0;i<s.pts.length;i++) if(Math.hypot(s.pts[i].x-px,s.pts[i].y-py)<=r) return false; }
        else { if(Math.hypot((s.sx+s.ex)/2-px,(s.sy+s.ey)/2-py)<=r*2) return false; }
        return true;
      });
      redraw();
    }
    function onDown(tool,color,lw,e) {
      var p=getCoord(e);
      if (tool==='eraser'){drawing=true;eraseAt(p.x,p.y,lw);return;}
      if (tool==='pan') {
        drawing=true; isPanning=true; panStart={x:e.clientX,y:e.clientY};
        canvas.style.cursor='grabbing'; return;
      }
      if (tool==='select') {
        canvas.style.cursor='default';
        drawing=true; var hit=hitTest(p.x,p.y);
        if (hit) {
          if (e.shiftKey) { toggleSel(hit); }
          else if (!isSelected(hit)) { clearSel(); addSel(hit); }
          if (selectedStrokes.length>0) { isMoving=true; moveStart=p; initMove(); }
        } else {
          if (!e.shiftKey) clearSel();
          if (mode==='overlay') selectRect={x1:e.clientX,y1:e.clientY,x2:e.clientX,y2:e.clientY};
          else selectRect={x1:p.x,y1:p.y,x2:p.x,y2:p.y};
        }
        return;
      }
      drawing=true; canvas.style.cursor='crosshair';
      if(tool==='pen'||tool==='marker'||tool==='magic') cur={tool,color,lw,pts:[p]};
      else cur={tool,color,lw,sx:p.x,sy:p.y,ex:p.x,ey:p.y};
    }
    function onMove(tool,lw,e) {
      if(!drawing)return; var p=getCoord(e);
      if(tool==='eraser'){eraseAt(p.x,p.y,lw);return;}
      if(tool==='pan') {
        if(isPanning){panBy(e.clientX-panStart.x,e.clientY-panStart.y); panStart={x:e.clientX,y:e.clientY}; redraw();}
        return;
      }
      if(tool==='select') {
        if (selectRect) {
          if (mode==='overlay') { selectRect.x2=e.clientX;selectRect.y2=e.clientY; }
          else { selectRect.x2=p.x;selectRect.y2=p.y; }
          redraw();
        }
        else if (isMoving) { applySelMove(p.x-moveStart.x,p.y-moveStart.y);redraw(); }
        return;
      }
      if(!cur)return;
      if(tool==='pen'||tool==='marker'||tool==='magic') cur.pts.push(p);
      else{cur.ex=p.x;cur.ey=p.y;}
      redraw();
    }
    function onUp(tool) {
      if(!drawing)return; drawing=false;
      if(tool==='pan') { isPanning=false; panStart=null; canvas.style.cursor='grab'; redraw(); return; }
      if(tool==='select') {
        if (selectRect) { selInRect(Math.min(selectRect.x1,selectRect.x2),Math.min(selectRect.y1,selectRect.y2),Math.max(selectRect.x1,selectRect.x2),Math.max(selectRect.y1,selectRect.y2),mode); selectRect=null; }
        isMoving=false; moveStart=null; redraw(); return;
      }
      if(cur){strokes.push(cur); if(tool==='magic')scheduleFade(cur); cur=null;}
      redraw();
    }
    function pushText(color,lw,pos,text){strokes.push({tool:'text',color,lw,sx:pos.x,sy:pos.y,text});redraw();}
    function addImage(dataUrl,x,y,w,h){strokes.push({tool:'image',sx:x,sy:y,w,h,dataUrl});redraw();}
    function undo(){strokes.pop();redraw();}
    function clear(){strokes=[];cur=null;selectedStrokes=[];selectRect=null;redraw();}
    function getStrokes(){return strokes.slice();}
    function setStrokes(arr){strokes=arr?arr.slice():[];cur=null;selectedStrokes=[];selectRect=null;strokes.forEach(function(s){if(s.tool==='image'&&!imageCache.has(s)){var img=new Image();img.src=s.dataUrl;imageCache.set(s,img);}});redraw();}
    document.addEventListener('keydown',function(e){
      if (selectedStrokes.length===0) return;
      var tag=e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
      if (e.key==='Delete'||e.key==='Backspace'){strokes=strokes.filter(function(s){return selectedStrokes.indexOf(s)<0;});selectedStrokes=[];redraw();e.preventDefault();}
      if (e.key==='Escape'){selectedStrokes=[];redraw();}
    });
    // Viewport API
    function getViewport(){return {x:viewport.x,y:viewport.y,scale:viewport.scale};}
    function setViewport(v){if(!v)return;viewport.x=v.x!==undefined?v.x:viewport.x;viewport.y=v.y!==undefined?v.y:viewport.y;viewport.scale=v.scale!==undefined?v.scale:viewport.scale;applyViewport();redraw();}
    function zoomAtPoint(clientX,clientY,newScale){
      var r=canvas.getBoundingClientRect();
      var cx=clientX-r.left, cy=clientY-r.top;
      var logicalX=(cx-viewport.x)/viewport.scale;
      var logicalY=(cy-viewport.y)/viewport.scale;
      viewport.x=cx-logicalX*newScale;
      viewport.y=cy-logicalY*newScale;
      viewport.scale=Math.max(0.25,Math.min(5,newScale));
      applyViewport();redraw();
    }
    function panBy(dx,dy){viewport.x+=dx;viewport.y+=dy;applyViewport();redraw();}
    function applyViewport(){canvas.style.transform='translate('+viewport.x+'px,'+viewport.y+'px) scale('+viewport.scale+')';}
    return {resize,redraw,onDown,onMove,onUp,pushText,addImage,undo,clear,getStrokes,setStrokes,clearSel,getSel,setSel,getViewport,setViewport,zoomAtPoint,panBy};
  }

  // ════════════════════════════════════════════
  //  OVERLAY ANNOTATION
  // ════════════════════════════════════════════
  var ovCanvas = document.getElementById('AN_canvas');
  var OV = makeBoard(ovCanvas, 'overlay', null);
  var ovState = { tool:'pen', color:'#ef4444', lw:4, hidden:false, barOpen:false, scrollMode:false, isVert:false, textPos:null };

  // Paste & drag-drop for overlay
  document.addEventListener('paste', function(e) {
    if (!ovCanvas.classList.contains('AN_on')) return;
    var tag = e.target.tagName; if (tag==='INPUT'||tag==='TEXTAREA') return;
    var items = e.clipboardData.items;
    for (var i=0;i<items.length;i++) {
      if (items[i].type.indexOf('image')===-1) continue;
      var file = items[i].getAsFile();
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        var img = new Image();
        img.onload = function() {
          OV.addImage(dataUrl, window.scrollX+window.innerWidth/2-img.width/2, window.scrollY+window.innerHeight/2-img.height/2, img.width, img.height);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      break;
    }
  });
  ovCanvas.addEventListener('dragover', function(e){e.preventDefault();document.getElementById('AN_dragGhost').classList.add('AN_on');});
  ovCanvas.addEventListener('dragleave',function(){document.getElementById('AN_dragGhost').classList.remove('AN_on');});
  ovCanvas.addEventListener('drop',function(e){
    e.preventDefault();document.getElementById('AN_dragGhost').classList.remove('AN_on');
    var file=e.dataTransfer.files[0];if(!file||file.type.indexOf('image')===-1)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var dataUrl=ev.target.result,img=new Image();
      img.onload=function(){OV.addImage(dataUrl,e.clientX+window.scrollX-img.width/2,e.clientY+window.scrollY-img.height/2,img.width,img.height);};
      img.src=dataUrl;
    };
    reader.readAsDataURL(file);
  });

  /* ════════════════════════════════════════════
     GROUP TOOLBAR ENGINE
     Reads AN_groups from storage, renders groups
     into #AN_bar as inline or flyout blocks.
     Each group block is separated by .AN_sep.
  ════════════════════════════════════════════ */

  // Default groups (mirrors popup.js AN_PRESETS.default)
  var DEFAULT_AN_GROUPS = [
    { id:'g1', name:'Annotate', icon:'✏️', mode:'inline',  btns:['pen','magic','marker','eraser','select','pan'] },
    { id:'g2', name:'Shapes',   icon:'📐', mode:'flyout',  btns:['arrow','rect','circle','triangle','pentagon','hexagon','roundrect','diamond','star','righttri'] },
    { id:'g3', name:'More',     icon:'➕', mode:'flyout',  btns:['text'] },
    { id:'g4', name:'Style',   icon:'🎨', mode:'inline',  btns:['colors','slider'] },
    { id:'g5', name:'Actions',  icon:'⚡', mode:'inline',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
  ];

  var anGroups = DEFAULT_AN_GROUPS;

  // Render the annotate toolbar from groups array
  function renderAnBar(groups) {
    var bar = document.getElementById('AN_bar');
    // Remove all children except drag handle
    var drag = document.getElementById('AN_drag');
    while (bar.lastChild && bar.lastChild !== drag) bar.removeChild(bar.lastChild);

    groups.forEach(function(grp, gi) {
      // Separator between groups
      if (gi > 0) {
        var sep = document.createElement('div');
        sep.className = 'AN_sep';
        bar.appendChild(sep);
      }

      var grpWrap = document.createElement('div');
      grpWrap.className = 'AN_grp';
      grpWrap.dataset.grpId = grp.id;

      if (grp.mode === 'flyout') {
        // Single trigger button that opens flyout
        var trigBtn = document.createElement('button');
        trigBtn.className = 'AN_grpBtn';
        trigBtn.title = grp.name;
        trigBtn.textContent = grp.icon || '📦';

        var flyout = document.createElement('div');
        flyout.className = 'AN_flyout';

        buildGroupButtons(grp.btns, flyout, true);

        trigBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = flyout.classList.contains('AN_flyOpen');
          // Close all other flyouts
          document.querySelectorAll('.AN_flyout.AN_flyOpen').forEach(function(f){
            f.classList.remove('AN_flyOpen');
            f.previousSibling && f.previousSibling.classList && f.previousSibling.classList.remove('AN_grpOpen');
          });
          if (!isOpen) {
            flyout.classList.add('AN_flyOpen');
            trigBtn.classList.add('AN_grpOpen');
          }
        });

        grpWrap.appendChild(trigBtn);
        grpWrap.appendChild(flyout);
      } else {
        // Inline: render buttons directly
        buildGroupButtons(grp.btns, grpWrap, false);
      }

      bar.appendChild(grpWrap);
    });

    // Close flyouts on outside click (only once)
    if (!window._anDocClick) {
      window._anDocClick = function() {
        document.querySelectorAll('.AN_flyout.AN_flyOpen').forEach(function(f){
          f.classList.remove('AN_flyOpen');
          f.previousSibling && f.previousSibling.classList && f.previousSibling.classList.remove('AN_grpOpen');
        });
      };
      document.addEventListener('click', window._anDocClick);
    }

    // Re-attach non-tool listeners that rely on element IDs
    reattachBarListeners();
  }

  // Build all buttons for a group into a container element
  function buildGroupButtons(btns, container, isFlyout) {
    btns.forEach(function(key) {
      if (key === 'colors') {
        var cb = document.createElement('div');
        cb.className = 'AN_colorsBlock';
        [
          ['#ef4444',''],['#f59e0b',''],['#10b981',''],
          ['#3b82f6',''],['#a855f7',''],
          ['#ffffff','border:1.5px solid #aaa'],['#111827','']
        ].forEach(function(c, ci) {
          var btn = document.createElement('button');
          btn.className = 'AN_clr' + (ci===0?' AN_active':'');
          btn.dataset.c = c[0];
          btn.style.cssText = 'background:' + c[0] + (c[1]?';'+c[1]:'');
          btn.addEventListener('click', function() {
            document.querySelectorAll('.AN_clr').forEach(function(b){ b.classList.remove('AN_active'); });
            btn.classList.add('AN_active');
            ovState.color = c[0];
          });
          cb.appendChild(btn);
        });
        container.appendChild(cb);
        return;
      }
      if (key === 'slider') {
        var wrap = document.createElement('div');
        wrap.className = 'AN_ThickWrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';
        var dec = document.createElement('button');
        dec.className = 'AN_ThickBtn';
        dec.textContent = '−';
        dec.title = 'Decrease';
        dec.style.cssText = 'width:28px;height:28px;border:none;border-radius:7px;background:rgba(13,110,253,.1);color:#1e293b;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .1s;flex-shrink:0;';
        dec.addEventListener('click', function(){ ovState.lw = Math.max(1, ovState.lw - 1); updateAnThick(); });
        var val = document.createElement('span');
        val.className = 'AN_ThickVal';
        val.id = 'AN_ThickVal';
        val.textContent = ovState.lw + 'px';
        val.title = 'Click to type';
        val.style.cssText = 'min-width:36px;text-align:center;font-size:13px;font-weight:700;color:#1e293b;cursor:pointer;user-select:none;padding:0 6px;border-radius:6px;background:rgba(13,110,253,.08);transition:background .12s;';
        val.addEventListener('click', function(){ openAnNumpad(val); });
        var inc = document.createElement('button');
        inc.className = 'AN_ThickBtn';
        inc.textContent = '+';
        inc.title = 'Increase';
        inc.style.cssText = 'width:28px;height:28px;border:none;border-radius:7px;background:rgba(13,110,253,.1);color:#1e293b;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .1s;flex-shrink:0;';
        inc.addEventListener('click', function(){ ovState.lw = ovState.lw + 1; updateAnThick(); });
        wrap.appendChild(dec);
        wrap.appendChild(val);
        wrap.appendChild(inc);
        container.appendChild(wrap);
        return;
      }
      // Map key → button element
      var btn = makeAnBtn(key);
      if (btn) container.appendChild(btn);
    });
  }

  // Create an individual annotate toolbar button by key
  function makeAnBtn(key) {
    var defs = {
      pen:    { cls:'AN_tool', dt:'pen',    icon:'✏️', title:'Pen',       extra:'AN_active' },
      magic:  { cls:'AN_tool', dt:'magic',  icon:'✨', title:'Magic Pen'  },
      marker: { cls:'AN_tool', dt:'marker', icon:'🖊️', title:'Marker'     },
      arrow:    { cls:'AN_tool', dt:'arrow',    icon:'➡️', title:'Arrow'      },
      rect:     { cls:'AN_tool', dt:'rect',     icon:'⬜', title:'Rectangle'  },
      circle:   { cls:'AN_tool', dt:'circle',   icon:'⭕', title:'Circle'     },
      triangle: { cls:'AN_tool', dt:'triangle', icon:'△', title:'Triangle'   },
      pentagon: { cls:'AN_tool', dt:'pentagon', icon:'⬠', title:'Pentagon'   },
      hexagon:  { cls:'AN_tool', dt:'hexagon',  icon:'⬡', title:'Hexagon'    },
      roundrect:{ cls:'AN_tool', dt:'roundrect',icon:'▢', title:'Round Rect' },
      diamond:  { cls:'AN_tool', dt:'diamond',  icon:'◇', title:'Diamond'    },
      star:     { cls:'AN_tool', dt:'star',     icon:'★', title:'Star'       },
      righttri: { cls:'AN_tool', dt:'righttri', icon:'⊿', title:'Right Tri'  },
      text:   { cls:'AN_tool AN_Ttxt', dt:'text', icon:'T', title:'Text'  },
      select: { cls:'AN_tool', dt:'select', icon:'👆', title:'Select'  },
      eraser: { cls:'AN_tool', dt:'eraser', icon:'🧹', title:'Eraser'     },
      pan:    { cls:'AN_tool', dt:'pan',    icon:'🤚', title:'Pan'        },
      undo:   { cls:'AN_act',  id:'AN_undo',   icon:'↩️', title:'Undo'      },
      clear:  { cls:'AN_act',  id:'AN_clear',  icon:'🗑️', title:'Clear All' },
      hide:   { cls:'AN_act',  id:'AN_hide',   icon:'👁️', title:'Hide'      },
      scroll: { cls:'AN_act',  id:'AN_touch',  icon:'🤚', title:'Scroll'    },
      rotate: { cls:'AN_act',  id:'AN_rotate', icon:'↔️', title:'Rotate'    },
      wb:     { cls:'AN_act',  id:'AN_wb',     icon:'🖥️', title:'Whiteboard'},
      close:  { cls:'AN_act',  id:'AN_close',  icon:'✖',  title:'Close'     }
    };
    var d = defs[key];
    if (!d) return null;
    var btn = document.createElement('button');
    btn.className = d.cls + (d.extra ? ' ' + d.extra : '');
    if (d.id)  btn.id = d.id;
    if (d.dt)  btn.dataset.tool = d.dt;
    btn.textContent = d.icon;
    btn.title = d.title;
    if (d.cls.indexOf('AN_tool') >= 0) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.AN_tool').forEach(function(b){ b.classList.remove('AN_active'); });
        btn.classList.add('AN_active');
        ovState.tool = d.dt;
        ovCanvas.style.cursor = d.dt==='pan' ? 'grab' : d.dt==='select' ? 'default' : 'crosshair';
        document.getElementById('AN_textpop').classList.remove('AN_show');
        // Close flyout if in one
        var flyout = btn.closest && btn.closest('.AN_flyout');
        if (flyout) { flyout.classList.remove('AN_flyOpen'); flyout.previousSibling && flyout.previousSibling.classList && flyout.previousSibling.classList.remove('AN_grpOpen'); }
      });
    }
    return btn;
  }

  // Re-attach listeners for action buttons (by ID) after bar rebuild
  function reattachBarListeners() {
    var undoEl = document.getElementById('AN_undo');
    if (undoEl) undoEl.addEventListener('click', function(){ OV.undo(); closeFlyouts(); });

    var clearEl = document.getElementById('AN_clear');
    if (clearEl) clearEl.addEventListener('click', function(){
      AN_confirm('সব অ্যানোটেশন মুছে ফেলবো?', function(){ OV.clear(); });
      closeFlyouts();
    });

    var hideEl = document.getElementById('AN_hide');
    if (hideEl) hideEl.addEventListener('click', function(){
      ovState.hidden = !ovState.hidden;
      ovCanvas.style.opacity = ovState.hidden ? '0' : '1';
      hideEl.textContent = ovState.hidden ? '🙈' : '👁️';
      syncCanvas(); closeFlyouts();
    });

    var touchEl = document.getElementById('AN_touch');
    if (touchEl) touchEl.addEventListener('click', function(){
      ovState.scrollMode = !ovState.scrollMode;
      touchEl.classList.toggle('AN_scroll_on', ovState.scrollMode);
      syncCanvas(); closeFlyouts();
    });

    var rotEl = document.getElementById('AN_rotate');
    if (rotEl) rotEl.addEventListener('click', function(){
      ovState.isVert = !ovState.isVert;
      var bar = document.getElementById('AN_bar');
      bar.classList.toggle('AN_vert', ovState.isVert);
      rotEl.textContent = ovState.isVert ? '↕️' : '↔️';
      bar.style.cssText = '';
      if (ovState.isVert) { bar.style.top='50%'; bar.style.right='14px'; bar.style.transform='translateY(-50%)'; }
      else { bar.style.bottom='22px'; bar.style.left='50%'; bar.style.transform='translateX(-50%)'; }
      closeFlyouts();
    });

    var wbEl = document.getElementById('AN_wb');
    if (wbEl) wbEl.addEventListener('click', function(){
      ensureWbBarRendered();
      wbWin.classList.add('AN_wbOpen'); wbMinTab.classList.remove('AN_minVis');
      wbState.isMin = false; setTimeout(function(){ wbFit(); syncRszOverlay(); }, 30);
      closeFlyouts();
    });

    var closeEl = document.getElementById('AN_close');
    if (closeEl) closeEl.addEventListener('click', function(){
      ovState.barOpen = false;
      document.getElementById('AN_bar').classList.add('AN_gone');
      document.getElementById('AN_open').classList.add('AN_vis');
      syncCanvas(); closeFlyouts();
    });
  }

  function closeFlyouts() {
    document.querySelectorAll('.AN_flyout.AN_flyOpen').forEach(function(f){
      f.classList.remove('AN_flyOpen');
      f.previousSibling && f.previousSibling.classList && f.previousSibling.classList.remove('AN_grpOpen');
    });
  }

  // Annotation toolbar thickness update
  function updateAnThick() {
    var val = document.getElementById('AN_ThickVal');
    if (val) val.textContent = ovState.lw + 'px';
  }

  // In-page whiteboard thickness update
  function updateWbThick() {
    var val = document.getElementById('AN_wbThickVal');
    if (val) val.textContent = wbState.lw + 'px';
  }

  function updateWbBgActive() {
    document.querySelectorAll('.AN_bgClr').forEach(function(b){ b.classList.remove('AN_bgActive'); });
    document.querySelectorAll('.AN_bgClr[data-bg="' + wbState.bg + '"]').forEach(function(b){ b.classList.add('AN_bgActive'); });
  }

  // Annotation toolbar numpad
  function openAnNumpad(targetEl) {
    var modal = document.getElementById('AN_NumpadModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'AN_NumpadModal';
      modal.className = 'AN_NumpadModal';
      modal.innerHTML = '<div style="background:#1e293b;border-radius:16px;padding:20px;box-shadow:0 24px 64px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);width:min(280px,90vw);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<span style="font-size:14px;font-weight:800;color:#e2e8f0;">Thickness (px)</span>' +
          '<button id="AN_NumpadClose" style="background:rgba(255,255,255,.08);border:none;color:#94a3b8;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>' +
        '</div>' +
        '<input id="AN_NumpadInput" class="AN_NumpadInput" type="text" style="width:100%;padding:12px;font-size:18px;font-weight:700;text-align:center;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0f172a;color:#e2e8f0;outline:none;" maxlength="4" />' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;">' +
          ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(function(k){
            var isAction = k==='⌫'||k==='✓';
            return '<button class="AN_NumpadKey" data-key="'+k+'" style="padding:14px 0;font-size:18px;font-weight:700;border:none;border-radius:10px;cursor:pointer;background:'+(isAction?'rgba(59,130,246,.15)':'rgba(255,255,255,.04)')+';color:'+(isAction?'#3b82f6':'#e2e8f0')+';transition:background .12s,transform .1s;">'+k+'</button>';
          }).join('') +
        '</div>' +
      '</div>';
      document.body.appendChild(modal);
      var input = document.getElementById('AN_NumpadInput');
      modal.querySelectorAll('.AN_NumpadKey').forEach(function(btn){
        btn.addEventListener('click', function(){
          var k = btn.dataset.key;
          if (k==='⌫') { input.value = input.value.slice(0,-1); }
          else if (k==='✓') { var v = parseInt(input.value)||1; ovState.lw = Math.max(1, v); updateAnThick(); closeAnNumpad(); }
          else if (input.value.length < 4) { input.value += k; }
        });
      });
      document.getElementById('AN_NumpadClose').addEventListener('click', closeAnNumpad);
      modal.addEventListener('click', function(e){ if (e.target === modal) closeAnNumpad(); });
      input.addEventListener('keydown', function(e){ if (e.key==='Enter') { var v = parseInt(input.value)||1; ovState.lw = Math.max(1, v); updateAnThick(); closeAnNumpad(); } });
    }
    var input = document.getElementById('AN_NumpadInput');
    input.value = ovState.lw;
    modal.style.display = 'flex';
    input.focus(); input.select();
  }
  function closeAnNumpad() {
    var modal = document.getElementById('AN_NumpadModal');
    if (modal) modal.style.display = 'none';
  }

  // In-page whiteboard numpad
  function openWbNumpad(targetEl) {
    var modal = document.getElementById('AN_wbNumpadModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'AN_wbNumpadModal';
      modal.className = 'AN_wbNumpadModal';
      modal.innerHTML = '<div style="background:#1e293b;border-radius:16px;padding:20px;box-shadow:0 24px 64px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);width:min(280px,90vw);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<span style="font-size:14px;font-weight:800;color:#e2e8f0;">Thickness (px)</span>' +
          '<button id="AN_wbNumpadClose" style="background:rgba(255,255,255,.08);border:none;color:#94a3b8;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>' +
        '</div>' +
        '<input id="AN_wbNumpadInput" class="AN_wbNumpadInput" type="text" style="width:100%;padding:12px;font-size:18px;font-weight:700;text-align:center;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0f172a;color:#e2e8f0;outline:none;" maxlength="4" />' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;">' +
          ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(function(k){
            var isAction = k==='⌫'||k==='✓';
            return '<button class="AN_NumpadKey" data-key="'+k+'" style="padding:14px 0;font-size:18px;font-weight:700;border:none;border-radius:10px;cursor:pointer;background:'+(isAction?'rgba(59,130,246,.15)':'rgba(255,255,255,.04)')+';color:'+(isAction?'#3b82f6':'#e2e8f0')+';transition:background .12s,transform .1s;">'+k+'</button>';
          }).join('') +
        '</div>' +
      '</div>';
      document.body.appendChild(modal);
      var input = document.getElementById('AN_wbNumpadInput');
      modal.querySelectorAll('.AN_NumpadKey').forEach(function(btn){
        btn.addEventListener('click', function(){
          var k = btn.dataset.key;
          if (k==='⌫') { input.value = input.value.slice(0,-1); }
          else if (k==='✓') { var v = parseInt(input.value)||1; wbState.lw = Math.max(1, v); updateWbThick(); closeWbNumpad(); }
          else if (input.value.length < 4) { input.value += k; }
        });
      });
      document.getElementById('AN_wbNumpadClose').addEventListener('click', closeWbNumpad);
      modal.addEventListener('click', function(e){ if (e.target === modal) closeWbNumpad(); });
      input.addEventListener('keydown', function(e){ if (e.key==='Enter') { var v = parseInt(input.value)||1; wbState.lw = Math.max(1, v); updateWbThick(); closeWbNumpad(); } });
    }
    var input = document.getElementById('AN_wbNumpadInput');
    input.value = wbState.lw;
    modal.style.display = 'flex';
    input.focus(); input.select();
  }
  function closeWbNumpad() {
    var modal = document.getElementById('AN_wbNumpadModal');
    if (modal) modal.style.display = 'none';
  }

  // Listen for layout updates from popup
  try {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'AN_GROUPS_UPDATE') {
        anGroups = msg.groups;
        renderAnBar(anGroups);
      }
      if (msg.type === 'WB_GROUPS_UPDATE') {
        wbGroups = msg.groups;
        wbBarRendered = true;
        renderWbBar(wbGroups);
      }
      if (msg.type === 'AN_THEME_UPDATE') {
        if (msg.defaultThickness) {
          ovState.lw = msg.defaultThickness;
          updateAnThick();
          wbState.lw = msg.defaultThickness;
          updateWbThick();
        }
        if (msg.defaultBg) {
          wbState.bg = msg.defaultBg;
          document.querySelectorAll('.AN_bgClr').forEach(function(b){ b.classList.remove('AN_bgActive'); });
          document.querySelectorAll('.AN_bgClr[data-bg="' + msg.defaultBg + '"]').forEach(function(b){ b.classList.add('AN_bgActive'); });
          if (typeof WB !== 'undefined' && WB.redraw) WB.redraw();
        }
      }
    });
  } catch(e){}

  function ovResize() {
    var dpr=window.devicePixelRatio||1;
    ovCanvas.width=window.innerWidth*dpr; ovCanvas.height=window.innerHeight*dpr;
    ovCanvas.style.width=window.innerWidth+'px'; ovCanvas.style.height=window.innerHeight+'px';
    ovCanvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0); OV.redraw();
  }
  window.addEventListener('resize', ovResize);
  window.addEventListener('scroll', OV.redraw, {passive:true});
  ovResize();

  function syncCanvas() {
    var active = ovState.barOpen && !ovState.hidden && !ovState.scrollMode;
    ovCanvas.classList.toggle('AN_on', active);
  }

  ovCanvas.addEventListener('mousedown',  function(e){e.preventDefault();if(ovState.tool==='text'){openOVText(e);return;}OV.onDown(ovState.tool,ovState.color,ovState.lw,e);},{passive:false});
  ovCanvas.addEventListener('mousemove',  function(e){e.preventDefault();OV.onMove(ovState.tool,ovState.lw,e);},{passive:false});
  ovCanvas.addEventListener('mouseup',    function(){OV.onUp(ovState.tool);});
  ovCanvas.addEventListener('mouseleave', function(){OV.onUp(ovState.tool);});

  // Pinch zoom state for overlay
  var ovPinchDist=0, ovPinchCenter={x:0,y:0}, ovPinchStartScale=1;
  ovCanvas.addEventListener('touchstart', function(e){
    e.preventDefault();
    if(e.touches.length===2){
      var t1=e.touches[0], t2=e.touches[1];
      ovPinchCenter={x:(t1.clientX+t2.clientX)/2, y:(t1.clientY+t2.clientY)/2};
      var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
      ovPinchDist=Math.sqrt(dx*dx+dy*dy);
      ovPinchStartScale=OV.getViewport().scale;
      return;
    }
    if(ovState.tool==='text'){openOVText(e);return;}
    OV.onDown(ovState.tool,ovState.color,ovState.lw,e);
  },{passive:false});
  ovCanvas.addEventListener('touchmove', function(e){
    e.preventDefault();
    if(e.touches.length===2){
      var t1=e.touches[0], t2=e.touches[1];
      var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(ovPinchDist>0){
        var newScale=Math.max(0.25,Math.min(5,ovPinchStartScale*(dist/ovPinchDist)));
        OV.zoomAtPoint(ovPinchCenter.x,ovPinchCenter.y,newScale);
      }
      ovPinchDist=dist;
      return;
    }
    OV.onMove(ovState.tool,ovState.lw,e);
  },{passive:false});
  ovCanvas.addEventListener('touchend', function(e){
    if(e.touches.length<2) ovPinchDist=0;
    OV.onUp(ovState.tool);
  });

  function openOVText(e) {
    var s=e.touches?e.touches[0]:e;
    ovState.textPos={x:s.clientX+window.scrollX,y:s.clientY+window.scrollY};
    var pop=document.getElementById('AN_textpop');
    pop.style.left=Math.min(s.clientX+12,window.innerWidth-260)+'px';
    pop.style.top=Math.min(s.clientY-10,window.innerHeight-150)+'px';
    pop.classList.add('AN_show');
    document.getElementById('AN_tinput').focus();
  }
  document.getElementById('AN_tok').addEventListener('click',function(){
    var val=document.getElementById('AN_tinput').value.trim();
    if(val&&ovState.textPos)OV.pushText(ovState.color,ovState.lw,ovState.textPos,val);
    document.getElementById('AN_tinput').value='';
    document.getElementById('AN_textpop').classList.remove('AN_show');
  });
  document.getElementById('AN_tcancel').addEventListener('click',function(){
    document.getElementById('AN_tinput').value='';
    document.getElementById('AN_textpop').classList.remove('AN_show');
  });
  document.getElementById('AN_tinput').addEventListener('keydown',function(e){
    if(e.key==='Enter')document.getElementById('AN_tok').click();
    if(e.key==='Escape')document.getElementById('AN_tcancel').click();
  });

  // Ctrl+Z global undo
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='z')OV.undo();});

  // Reopen FAB
  document.getElementById('AN_open').addEventListener('click',function(){
    ovState.barOpen=true;
    document.getElementById('AN_bar').classList.remove('AN_gone');
    document.getElementById('AN_open').classList.remove('AN_vis');
    syncCanvas();
  });

  // Drag toolbar
  (function(){
    var bar=document.getElementById('AN_bar'),drag=document.getElementById('AN_drag');
    var dragging=false,ox=0,oy=0;
    drag.addEventListener('mousedown',s,{passive:false});
    drag.addEventListener('touchstart',s,{passive:false});
    window.addEventListener('mousemove',m,{passive:false});
    window.addEventListener('touchmove',m,{passive:false});
    window.addEventListener('mouseup',end);
    window.addEventListener('touchend',end);
    function s(e){dragging=true;var p=e.touches?e.touches[0]:e,r=bar.getBoundingClientRect();ox=p.clientX-r.left;oy=p.clientY-r.top;bar.style.transition='none';e.preventDefault();}
    function m(e){if(!dragging)return;var p=e.touches?e.touches[0]:e;bar.style.left=Math.max(0,Math.min(window.innerWidth-bar.offsetWidth,p.clientX-ox))+'px';bar.style.top=Math.max(0,Math.min(window.innerHeight-bar.offsetHeight,p.clientY-oy))+'px';bar.style.right='auto';bar.style.bottom='auto';bar.style.transform='none';e.preventDefault();}
    function end(){
    dragging=false;bar.style.transition='';
    // Save position to localStorage
    try {
      var r = bar.getBoundingClientRect();
      localStorage.setItem('AN_barPos', JSON.stringify({
        left: bar.style.left, top: bar.style.top,
        right: bar.style.right, bottom: bar.style.bottom,
        transform: bar.style.transform, vert: ovState.isVert
      }));
    } catch(e){}
  }
  })();

  // Confirm modal
  var _modalCb=null,_modal=document.getElementById('AN_modal'),_modalMsg=document.getElementById('AN_modalMsg');
  document.getElementById('AN_modalOk').addEventListener('click',function(){_modal.classList.remove('AN_show');if(_modalCb){_modalCb();_modalCb=null;}});
  document.getElementById('AN_modalCancel').addEventListener('click',function(){_modal.classList.remove('AN_show');_modalCb=null;});
  _modal.addEventListener('click',function(e){if(e.target===_modal){_modal.classList.remove('AN_show');_modalCb=null;}});
  document.addEventListener('keydown',function(e){
    if(!_modal.classList.contains('AN_show'))return;
    if(e.key==='Enter')document.getElementById('AN_modalOk').click();
    if(e.key==='Escape')document.getElementById('AN_modalCancel').click();
  });
  function AN_confirm(msg,cb){_modalMsg.textContent=msg;_modalCb=cb;_modal.classList.add('AN_show');setTimeout(function(){document.getElementById('AN_modalOk').focus();},50);}

  // Load groups from storage, then render bar
  (function(){
    try {
      chrome.storage.local.get(['AN_groups','AN_defaultThickness'], function(r) {
        if (r.AN_groups) {
          try { anGroups = JSON.parse(r.AN_groups); } catch(e){}
        }
        if (r.AN_defaultThickness) {
          ovState.lw = r.AN_defaultThickness;
          updateAnThick();
        }
        renderAnBar(anGroups);
      });
    } catch(e) {
      renderAnBar(anGroups);
    }
  })();

  syncCanvas();

  // ── Initial bar state: always start closed, show FAB ──
  document.getElementById('AN_bar').classList.add('AN_gone');
  document.getElementById('AN_open').classList.add('AN_vis');

  // ════════════════════════════════════════════
  //  WHITEBOARD
  // ════════════════════════════════════════════
  var wbWin=document.getElementById('AN_wbWin');
  var wbCanvas=document.getElementById('AN_wbCanvas');
  var wbBody=document.getElementById('AN_wbBody');
  var wbMinTab=document.getElementById('AN_wbMinTab');
  var wbState={tool:'pen',color:'#ef4444',lw:4,bg:'#1e293b',isFull:false,isMin:false,textPos:null,savedL:'',savedT:'',savedW:'',savedH:'',zoom:1};

  /* ════════════ WB GROUP TOOLBAR ENGINE ════════════ */
  var DEFAULT_WB_GROUPS = [
    { id:'g1', name:'Annotate', icon:'✏️', mode:'inline',  btns:['pen','magic','marker','eraser','select','pan'] },
    { id:'g2', name:'Shapes',   icon:'📐', mode:'flyout',  btns:['arrow','rect','circle','triangle','pentagon','hexagon','roundrect','diamond','star','righttri'] },
    { id:'g3', name:'More',     icon:'➕', mode:'flyout',  btns:['text'] },
    { id:'g4', name:'Style',    icon:'🎨', mode:'inline',  btns:['colors','slider','bg'] },
    { id:'g5', name:'Actions',  icon:'⚡', mode:'inline',  btns:['undo','clear','zoom'] },
    { id:'g6', name:'File',     icon:'💾', mode:'flyout',  btns:['save','load'] }
  ];
  var wbGroups = DEFAULT_WB_GROUPS;

  function renderWbBar(groups) {
    var bar = document.getElementById('AN_wbBar');
    if (!bar) return;
    bar.innerHTML = '<div class="AN_wbScroll" id="AN_wbScroll"></div>';
    var scrollEl = document.getElementById('AN_wbScroll');

    groups.forEach(function(grp, gi) {
      if (gi > 0) {
        var sep = document.createElement('div');
        sep.className = 'AN_wbSep';
        scrollEl.appendChild(sep);
      }

      if (grp.mode === 'flyout') {
        var trigBtn = document.createElement('button');
        trigBtn.className = 'AN_wbt';
        trigBtn.title = grp.name;
        trigBtn.style.position = 'relative';
        trigBtn.innerHTML = (grp.icon||'📦') + '<span style="position:absolute;bottom:1px;right:1px;width:4px;height:4px;border-right:1.5px solid #94a3b8;border-bottom:1.5px solid #94a3b8;transform:rotate(45deg);display:block;"></span>';

        var flyout = document.createElement('div');
        flyout.className = 'AN_flyout AN_wbFlyout';
        buildWbGroupButtons(grp.btns, flyout);

        trigBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = flyout.classList.contains('AN_flyOpen');
          bar.querySelectorAll('.AN_wbFlyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
          if (!isOpen) {
            var tr = trigBtn.getBoundingClientRect();
            var br = bar.getBoundingClientRect();
            flyout.style.left = (tr.left - br.left + tr.width/2) + 'px';
            flyout.style.bottom = 'calc(100% + 8px)';
            flyout.style.transform = 'translateX(-50%)';
            flyout.classList.add('AN_flyOpen');
          }
        });

        scrollEl.appendChild(trigBtn);
        bar.appendChild(flyout);
      } else {
        var grpWrap = document.createElement('div');
        grpWrap.style.cssText = 'display:flex;align-items:center;gap:3px;flex-shrink:0;';
        buildWbGroupButtons(grp.btns, grpWrap);
        scrollEl.appendChild(grpWrap);
      }
    });

    if (!window._wbDocClick) {
      window._wbDocClick = function(e) {
        bar.querySelectorAll('.AN_wbFlyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
      };
      document.addEventListener('click', window._wbDocClick);
    }
    scrollEl.addEventListener('scroll', function(){
      bar.querySelectorAll('.AN_wbFlyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
    });
    reattachWbListeners();
  }

  function buildWbGroupButtons(btns, container) {
    btns.forEach(function(key) {
      if (key === 'colors') {
        var cb = document.createElement('div');
        cb.id = 'AN_wbColors';
        cb.style.cssText = 'display:flex;gap:4px;align-items:center;flex-shrink:0;';
        [['#ef4444',''],['#f59e0b',''],['#10b981',''],['#3b82f6',''],['#a855f7',''],
         ['#ffffff','border:1.5px solid rgba(255,255,255,.3)'],['#111827','']
        ].forEach(function(c,ci){
          var btn=document.createElement('button');
          btn.className='AN_wbClr'+(ci===0?' AN_wbClrActive':'');
          btn.dataset.c=c[0];
          btn.style.cssText='background:'+c[0]+(c[1]?';'+c[1]:'');
          btn.addEventListener('click',function(){
            document.querySelectorAll('.AN_wbClr').forEach(function(b){b.classList.remove('AN_wbClrActive');});
            btn.classList.add('AN_wbClrActive');
            wbState.color=c[0];
          });
          cb.appendChild(btn);
        });
        container.appendChild(cb);
        return;
      }
      if (key === 'slider') {
        var wrap = document.createElement('div');
        wrap.className = 'AN_wbThickWrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';
        var dec = document.createElement('button');
        dec.className = 'AN_wbThickBtn';
        dec.textContent = '−';
        dec.title = 'Decrease';
        dec.style.cssText = 'width:28px;height:28px;border:none;border-radius:7px;background:rgba(13,110,253,.1);color:#1e293b;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .1s;flex-shrink:0;';
        dec.addEventListener('click', function(){ wbState.lw = Math.max(1, wbState.lw - 1); updateWbThick(); });
        var val = document.createElement('span');
        val.className = 'AN_wbThickVal';
        val.id = 'AN_wbThickVal';
        val.textContent = wbState.lw + 'px';
        val.title = 'Click to type';
        val.style.cssText = 'min-width:36px;text-align:center;font-size:13px;font-weight:700;color:#1e293b;cursor:pointer;user-select:none;padding:0 6px;border-radius:6px;background:rgba(13,110,253,.08);transition:background .12s;';
        val.addEventListener('click', function(){ openWbNumpad(val); });
        var inc = document.createElement('button');
        inc.className = 'AN_wbThickBtn';
        inc.textContent = '+';
        inc.title = 'Increase';
        inc.style.cssText = 'width:28px;height:28px;border:none;border-radius:7px;background:rgba(13,110,253,.1);color:#1e293b;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .1s;flex-shrink:0;';
        inc.addEventListener('click', function(){ wbState.lw = wbState.lw + 1; updateWbThick(); });
        wrap.appendChild(dec);
        wrap.appendChild(val);
        wrap.appendChild(inc);
        container.appendChild(wrap);
        return;
      }
      if (key === 'bg') {
        var lbl=document.createElement('span');
        lbl.className='AN_wbBGlbl';
        lbl.textContent='BG:';
        lbl.style.cssText='font-size:11px;font-weight:700;color:#94a3b8;white-space:nowrap;font-family:"Hind Siliguri",Arial,sans-serif;';
        container.appendChild(lbl);
        var bgDiv=document.createElement('div');
        bgDiv.id='AN_wbBG';
        bgDiv.style.cssText='display:flex;gap:4px;align-items:center;flex-shrink:0;';
        [['#9ca3af','ধূসর'],['#ffffff','সাদা'],['#1e293b','ডার্ক',true],['#fef9c3','হলুদ'],['#f0fdf4','সবুজ']].forEach(function(bg){
          var btn=document.createElement('button');
          btn.className='AN_bgClr'+(bg[2]?' AN_bgActive':'');
          btn.dataset.bg=bg[0];
          btn.title=bg[1];
          btn.style.cssText='background:'+bg[0]+(bg[0]==='#ffffff'?';border:1.5px solid rgba(0,0,0,.15)':'')+';';
          btn.addEventListener('click',function(){
            document.querySelectorAll('.AN_bgClr').forEach(function(b){b.classList.remove('AN_bgActive');});
            btn.classList.add('AN_bgActive');
            wbState.bg=bg[0]; WB.redraw();
          });
          bgDiv.appendChild(btn);
        });
        container.appendChild(bgDiv);
        return;
      }
      if (key === 'zoom') {
        var zb = document.createElement('div');
        zb.className = 'AN_wbZoomBlock';
        zb.style.display = 'none';
        zb.id = 'AN_wbZoomBlock';
        var zmOut = document.createElement('button');
        zmOut.className = 'AN_wbZoomBtn'; zmOut.textContent = '−';
        zmOut.addEventListener('click', function(){ var vp=WB.getViewport(); WB.setViewport({x:vp.x,y:vp.y,scale:Math.max(0.25,vp.scale-0.25)}); updateZoomDisplay(); });
        var zmIn = document.createElement('button');
        zmIn.className = 'AN_wbZoomBtn'; zmIn.textContent = '+';
        zmIn.addEventListener('click', function(){ var vp=WB.getViewport(); WB.setViewport({x:vp.x,y:vp.y,scale:Math.min(5,vp.scale+0.25)}); updateZoomDisplay(); });
        var zmVal = document.createElement('span');
        zmVal.className = 'AN_wbZoomVal'; zmVal.id = 'AN_wbZoomVal'; zmVal.textContent = '100%';
        var zmSl = document.createElement('input');
        zmSl.type = 'range'; zmSl.className = 'AN_wbZoomSlider'; zmSl.id = 'AN_wbZoomSlider';
        zmSl.min = 25; zmSl.max = 500; zmSl.value = 100;
        zmSl.addEventListener('input', function(){ var vp=WB.getViewport(); WB.setViewport({x:vp.x,y:vp.y,scale:+zmSl.value/100}); updateZoomDisplay(); });
        zb.appendChild(zmOut);
        zb.appendChild(zmSl);
        zb.appendChild(zmIn);
        zb.appendChild(zmVal);
        container.appendChild(zb);
        return;
      }
      var btn = makeWbBtn(key);
      if (btn) container.appendChild(btn);
    });
  }

  function makeWbBtn(key) {
    var defs = {
      pen:    { dt:'pen',    icon:'✏️', extra:'AN_wbActive' },
      magic:  { dt:'magic',  icon:'✨' },
      marker: { dt:'marker', icon:'🖊️' },
      arrow:    { dt:'arrow',    icon:'➡️' },
      rect:     { dt:'rect',     icon:'⬜' },
      circle:   { dt:'circle',   icon:'⭕' },
      triangle: { dt:'triangle', icon:'△' },
      pentagon: { dt:'pentagon', icon:'⬠' },
      hexagon:  { dt:'hexagon',  icon:'⬡' },
      roundrect:{ dt:'roundrect',icon:'▢' },
      diamond:  { dt:'diamond',  icon:'◇' },
      star:     { dt:'star',     icon:'★' },
      righttri: { dt:'righttri', icon:'⊿' },
      text:   { dt:'text',   icon:'T', txtClass:true },
      select: { dt:'select', icon:'👆' },
      eraser: { dt:'eraser', icon:'🧹' },
      pan:    { dt:'pan',    icon:'🤚' },
      undo:   { id:'AN_wbUndo',  icon:'↩️', act:true },
      clear:  { id:'AN_wbClear', icon:'🗑️', act:true },
      zoom:   { id:'AN_wbZoomBtn', icon:'🔍', act:true },
      save:   { id:'AN_wbSave', icon:'💾', act:true },
      load:   { id:'AN_wbLoad', icon:'📂', act:true }
    };
    var d = defs[key]; if (!d) return null;
    var btn = document.createElement('button');
    if (d.act) {
      btn.className = 'AN_wbAct';
      btn.id = d.id;
      btn.textContent = d.icon;
    } else {
      btn.className = 'AN_wbt' + (d.extra?' '+d.extra:'') + (d.txtClass?' AN_Ttxt':'');
      btn.dataset.tool = d.dt;
      btn.textContent = d.icon;
      btn.addEventListener('click', function() {
        document.querySelectorAll('.AN_wbt').forEach(function(b){ b.classList.remove('AN_wbActive'); });
        btn.classList.add('AN_wbActive');
        wbState.tool = d.dt;
        wbCanvas.style.cursor = d.dt==='pan' ? 'grab' : d.dt==='select' ? 'default' : 'crosshair';
        document.getElementById('AN_wbTextpop') && document.getElementById('AN_wbTextpop').classList.remove('AN_show');
        document.querySelectorAll('.AN_wbFlyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
      });
    }
    return btn;
  }

  function reattachWbListeners() {
    var undoEl = document.getElementById('AN_wbUndo');
    if (undoEl) undoEl.addEventListener('click', function(){ WB.undo(); });
    var clearEl = document.getElementById('AN_wbClear');
    if (clearEl) clearEl.addEventListener('click', function(){
      AN_confirm('এই পেজ মুছে ফেলবো?', function(){
        if (wbPages.length <= 1) {
          WB.clear(); wbSavePage();
        } else {
          wbPages.splice(wbPageIdx, 1);
          if (wbPageIdx >= wbPages.length) wbPageIdx = wbPages.length - 1;
          wbLoadPage();
          wbSaveLocal();
        }
      });
    });
    var zoomBtn = document.getElementById('AN_wbZoomBtn');
    if (zoomBtn) zoomBtn.addEventListener('click', function(){ toggleZoomControls(); });
    var saveBtn = document.getElementById('AN_wbSave');
    if (saveBtn) saveBtn.addEventListener('click', function(){ wbSaveToFile(); });
    var loadBtn = document.getElementById('AN_wbLoad');
    if (loadBtn) loadBtn.addEventListener('click', function(){ wbLoadFromFile(); });
  }
  var WB=makeBoard(wbCanvas,'window',function(){return wbState.bg;});

  // Paste & drag-drop for in-page whiteboard
  document.addEventListener('paste', function(e) {
    if (!wbWin.classList.contains('AN_wbOpen')) return;
    var tag = e.target.tagName; if (tag==='INPUT'||tag==='TEXTAREA') return;
    var items = e.clipboardData.items;
    for (var i=0;i<items.length;i++) {
      if (items[i].type.indexOf('image')===-1) continue;
      var file = items[i].getAsFile();
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        var img = new Image();
        img.onload = function() {
          var r = wbCanvas.getBoundingClientRect();
          WB.addImage(dataUrl, r.width/2-img.width/2, r.height/2-img.height/2, img.width, img.height);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      break;
    }
  });
  wbCanvas.addEventListener('dragover', function(e){e.preventDefault();document.getElementById('AN_dragGhost').classList.add('AN_on');});
  wbCanvas.addEventListener('dragleave',function(){document.getElementById('AN_dragGhost').classList.remove('AN_on');});
  wbCanvas.addEventListener('drop',function(e){
    e.preventDefault();document.getElementById('AN_dragGhost').classList.remove('AN_on');
    var file=e.dataTransfer.files[0];if(!file||file.type.indexOf('image')===-1)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var dataUrl=ev.target.result,img=new Image();
      img.onload=function(){
        var r=wbCanvas.getBoundingClientRect();
        WB.addImage(dataUrl,e.clientX-r.left-img.width/2,e.clientY-r.top-img.height/2,img.width,img.height);
      };
      img.src=dataUrl;
    };
    reader.readAsDataURL(file);
  });

  // Multi-page
  var wbPages=[WB.getStrokes()], wbPageIdx=0;
  function wbSavePage(){wbPages[wbPageIdx]=WB.getStrokes();wbSaveLocal();}
  function wbLoadPage(){WB.setStrokes(wbPages[wbPageIdx]);updatePgInfo();}
  function updatePgInfo(){
    document.getElementById('AN_pgNum').textContent=wbPageIdx+1;
    document.getElementById('AN_pgOf').textContent='/'+(wbPages.length);
  }

  function wbFit(){
    var dpr=window.devicePixelRatio||1,w=wbBody.clientWidth,h=wbBody.clientHeight;
    wbCanvas.width=w*dpr;wbCanvas.height=h*dpr;
    wbCanvas.style.width=w+'px';wbCanvas.style.height=h+'px';
    wbCanvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
    WB.resize();
  }

  var wbPinchDist=0, wbPinchCenter={x:0,y:0}, wbPinchStartScale=1;
  wbCanvas.addEventListener('mousedown',function(e){e.preventDefault();if(wbState.tool==='text'){openWBText(e);return;}WB.onDown(wbState.tool,wbState.color,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('mousemove',function(e){e.preventDefault();WB.onMove(wbState.tool,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('mouseup',function(){WB.onUp(wbState.tool);});
  wbCanvas.addEventListener('mouseleave',function(){WB.onUp(wbState.tool);});
  wbCanvas.addEventListener('touchstart',function(e){
    e.preventDefault();
    if(e.touches.length===2){
      var t1=e.touches[0], t2=e.touches[1];
      wbPinchCenter={x:(t1.clientX+t2.clientX)/2, y:(t1.clientY+t2.clientY)/2};
      var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
      wbPinchDist=Math.sqrt(dx*dx+dy*dy);
      wbPinchStartScale=WB.getViewport().scale;
      return;
    }
    if(wbState.tool==='text'){openWBText(e);return;}
    WB.onDown(wbState.tool,wbState.color,wbState.lw,e);
  },{passive:false});
  wbCanvas.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(e.touches.length===2){
      var t1=e.touches[0], t2=e.touches[1];
      var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(wbPinchDist>0){
        var newScale=Math.max(0.25,Math.min(5,wbPinchStartScale*(dist/wbPinchDist)));
        WB.zoomAtPoint(wbPinchCenter.x,wbPinchCenter.y,newScale);
        updateZoomDisplay();
      }
      wbPinchDist=dist;
      return;
    }
    WB.onMove(wbState.tool,wbState.lw,e);
  },{passive:false});
  wbCanvas.addEventListener('touchend',function(e){
    if(e.touches.length<2) wbPinchDist=0;
    WB.onUp(wbState.tool);
  });

  function openWBText(e){
    var s=e.touches?e.touches[0]:e,r=wbCanvas.getBoundingClientRect();
    wbState.textPos={x:s.clientX-r.left,y:s.clientY-r.top};
    var pop=document.getElementById('AN_wbTextpop');
    pop.style.left=Math.min(s.clientX-wbBody.getBoundingClientRect().left+10,wbBody.clientWidth-225)+'px';
    pop.style.top=Math.min(s.clientY-wbBody.getBoundingClientRect().top-10,wbBody.clientHeight-130)+'px';
    pop.classList.add('AN_show');
    document.getElementById('AN_wbTinput').focus();
  }
  document.getElementById('AN_wbTok').addEventListener('click',function(){
    var val=document.getElementById('AN_wbTinput').value.trim();
    if(val&&wbState.textPos)WB.pushText(wbState.color,wbState.lw,wbState.textPos,val);
    document.getElementById('AN_wbTinput').value='';
    document.getElementById('AN_wbTextpop').classList.remove('AN_show');
  });
  document.getElementById('AN_wbTcancel').addEventListener('click',function(){
    document.getElementById('AN_wbTinput').value='';
    document.getElementById('AN_wbTextpop').classList.remove('AN_show');
  });
  document.getElementById('AN_wbTinput').addEventListener('keydown',function(e){
    if(e.key==='Enter')document.getElementById('AN_wbTok').click();
    if(e.key==='Escape')document.getElementById('AN_wbTcancel').click();
  });

  // WB tools/colors/actions are attached by renderWbBar → reattachWbListeners

  // WB bar: load groups from storage then render when WB first opens
  var wbBarRendered = false;
  function ensureWbBarRendered() {
    if (wbBarRendered) return;
    wbBarRendered = true;
    try {
      chrome.storage.local.get(['WB_groups','AN_defaultThickness','AN_defaultBg'], function(r) {
        if (r.WB_groups) { try { wbGroups = JSON.parse(r.WB_groups); } catch(e){} }
        if (r.AN_defaultThickness) wbState.lw = r.AN_defaultThickness;
        if (r.AN_defaultBg) { wbState.bg = r.AN_defaultBg; updateWbBgActive(); }
        renderWbBar(wbGroups);
      });
    } catch(e) { renderWbBar(wbGroups); }
  }
  // WB open handled by reattachBarListeners (AN side)
  // Also hook the WB open button directly here for wbBar init
  document.getElementById('AN_bar').addEventListener('click', function(e){
    if (e.target && e.target.id === 'AN_wb') ensureWbBarRendered();
  });
  document.getElementById('AN_wbCloseBtn').addEventListener('click',function(){
    wbSavePage(); wbWin.classList.remove('AN_wbOpen','AN_wbFull');
    wbMinTab.classList.remove('AN_minVis'); wbState.isFull=false; wbState.isMin=false;
    syncRszOverlay();
  });
  document.getElementById('AN_wbMinBtn').addEventListener('click',function(){
    wbSavePage(); wbWin.classList.remove('AN_wbOpen'); wbMinTab.classList.add('AN_minVis');
    wbState.isMin=true; syncRszOverlay();
  });
  document.getElementById('AN_wbRestoreBtn').addEventListener('click',function(){
    wbMinTab.classList.remove('AN_minVis'); wbWin.classList.add('AN_wbOpen');
    wbState.isMin=false; setTimeout(function(){wbFit();syncRszOverlay();},30);
  });
  document.getElementById('AN_wbMaxBtn').addEventListener('click',function(){
    if(!wbState.isFull){
      var r=wbWin.getBoundingClientRect();
      wbState.savedL=r.left+'px';wbState.savedT=r.top+'px';
      wbState.savedW=r.width+'px';wbState.savedH=r.height+'px';
      wbWin.classList.add('AN_wbFull'); wbState.isFull=true;
    } else {
      wbWin.classList.remove('AN_wbFull');
      wbWin.style.left=wbState.savedL;wbWin.style.top=wbState.savedT;
      wbWin.style.width=wbState.savedW;wbWin.style.height=wbState.savedH;
      wbState.isFull=false;
    }
    setTimeout(function(){wbFit();syncRszOverlay();},30);
  });

  // WB drag title
  (function(){
    var dragging=false,ox=0,oy=0;
    var drag=document.getElementById('AN_wbTitleDrag');
    drag.addEventListener('mousedown',s,{passive:false});
    drag.addEventListener('touchstart',s,{passive:false});
    window.addEventListener('mousemove',m,{passive:false});
    window.addEventListener('touchmove',m,{passive:false});
    window.addEventListener('mouseup',end);
    window.addEventListener('touchend',end);
    function s(e){if(wbState.isFull)return;dragging=true;var p=e.touches?e.touches[0]:e,r=wbWin.getBoundingClientRect();ox=p.clientX-r.left;oy=p.clientY-r.top;wbWin.style.transition='none';e.preventDefault();}
    function m(e){if(!dragging)return;var p=e.touches?e.touches[0]:e;wbWin.style.left=Math.max(0,Math.min(window.innerWidth-wbWin.offsetWidth,p.clientX-ox))+'px';wbWin.style.top=Math.max(0,Math.min(window.innerHeight-wbWin.offsetHeight,p.clientY-oy))+'px';wbWin.style.right='auto';wbWin.style.bottom='auto';wbWin.style.transform='none';syncRszOverlay();e.preventDefault();}
    function end(){dragging=false;wbWin.style.transition='';}
  })();

  // Page sidebar
  document.getElementById('AN_pgNew').addEventListener('click',function(){
    wbSavePage(); wbPages.push([]); wbPageIdx=wbPages.length-1; wbLoadPage();
  });
  document.getElementById('AN_pgPrev').addEventListener('click',function(){
    if(wbPageIdx>0){wbSavePage();wbPageIdx--;wbLoadPage();}
  });
  document.getElementById('AN_pgNext').addEventListener('click',function(){
    if(wbPageIdx<wbPages.length-1){wbSavePage();wbPageIdx++;wbLoadPage();}
  });
  document.getElementById('AN_pgDel').addEventListener('click',function(){
    AN_confirm('সব বোর্ড মুছে ফেলবো?',function(){WB.clear();wbPages=[[]];wbPageIdx=0;wbLoadPage();wbSavePage();});
  });
  document.getElementById('AN_pgSideMin').addEventListener('click',function(){
    document.getElementById('AN_pgSidebar').classList.add('AN_pgHidden');
    document.getElementById('AN_pgSideTab').classList.add('AN_sideHidden');
    setTimeout(wbFit,50);
  });
  document.getElementById('AN_pgSideTab').addEventListener('click',function(){
    document.getElementById('AN_pgSidebar').classList.remove('AN_pgHidden');
    this.classList.remove('AN_sideHidden');
    setTimeout(wbFit,50);
  });
  document.getElementById('AN_pgOpenTab').addEventListener('click',function(){
    wbSavePage();
    try{localStorage.setItem('AN_wbTabTransfer',JSON.stringify(wbGetSaveData()));}catch(e){}
    chrome.runtime.sendMessage({type:'OPEN_WB_TAB'}).catch(function(){});
  });

  // Page thumbnails
  document.getElementById('AN_pgThumb').addEventListener('click',function(){
    wbSavePage(); buildThumbModal(); document.getElementById('AN_pgModal').classList.add('AN_show');
  });
  document.getElementById('AN_pgModalClose').addEventListener('click',function(){
    document.getElementById('AN_pgModal').classList.remove('AN_show');
  });
  document.getElementById('AN_pgModal').addEventListener('click',function(e){
    if(e.target===this)this.classList.remove('AN_show');
  });
  function buildThumbModal(){
    var grid=document.getElementById('AN_pgThumbs'); grid.innerHTML='';
    wbPages.forEach(function(pg,i){
      var div=document.createElement('div'); div.className='AN_pgThumb'+(i===wbPageIdx?' AN_pgCurrent':'');
      var c=document.createElement('canvas'); c.width=280; c.height=200;
      var tctx=c.getContext('2d');
      tctx.fillStyle=wbState.bg; tctx.fillRect(0,0,280,200);
      var tmpCv=document.createElement('canvas'); tmpCv.width=wbCanvas.width; tmpCv.height=wbCanvas.height;
      var tmpCtx=tmpCv.getContext('2d');
      var savedStrokes=WB.getStrokes(), savedIdx=wbPageIdx;
      var savedSel=WB.getSel(); WB.clearSel();
      WB.setStrokes(pg); WB.redraw();
      tmpCtx.drawImage(wbCanvas,0,0);
      tctx.drawImage(tmpCv,0,0,280,200);
      WB.setStrokes(savedStrokes); WB.setSel(savedSel); WB.redraw();
      var sp=document.createElement('span'); sp.textContent='পেজ '+(i+1);
      div.appendChild(c); div.appendChild(sp);
      div.addEventListener('click',function(){
        wbPageIdx=i; wbLoadPage();
        document.getElementById('AN_pgModal').classList.remove('AN_show');
      });
      grid.appendChild(div);
    });
  }

  // Export
  document.getElementById('AN_pgExport').addEventListener('click',function(){
    document.getElementById('AN_expSelArea').style.display='none';
    document.getElementById('AN_expProgress').style.display='none';
    document.getElementById('AN_expModal').classList.add('AN_show');
  });
  document.getElementById('AN_expClose').addEventListener('click',function(){document.getElementById('AN_expModal').classList.remove('AN_show');});
  document.getElementById('AN_expModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('AN_show');});
  document.getElementById('AN_expPng').addEventListener('click',function(){
    wbSavePage();
    var sel=WB.getSel();WB.clearSel();WB.redraw();
    var a=document.createElement('a');
    a.href=wbCanvas.toDataURL('image/png');
    a.download='whiteboard-page'+(wbPageIdx+1)+'.png';
    a.click();
    WB.setSel(sel);WB.redraw();
    document.getElementById('AN_expModal').classList.remove('AN_show');
  });
  document.getElementById('AN_expAll').addEventListener('click',function(){exportPDF(wbPages.map(function(_,i){return i;}));});
  document.getElementById('AN_expSel').addEventListener('click',function(){
    var area=document.getElementById('AN_expSelArea');
    area.style.display='block';
    var grid=document.getElementById('AN_expSelGrid'); grid.innerHTML='';
    wbPages.forEach(function(pg,i){
      var div=document.createElement('div'); div.className='AN_expSelThumb AN_selChk';
      var c=document.createElement('canvas'); c.width=140; c.height=100;
      var tctx=c.getContext('2d'); tctx.fillStyle=wbState.bg; tctx.fillRect(0,0,140,100);
      var sp=document.createElement('span'); sp.textContent='পেজ '+(i+1);
      div.appendChild(c); div.appendChild(sp);
      div.dataset.idx=i;
      div.addEventListener('click',function(){this.classList.toggle('AN_selChk');});
      grid.appendChild(div);
    });
  });
  document.getElementById('AN_expSelAll').addEventListener('click',function(){document.querySelectorAll('.AN_expSelThumb').forEach(function(d){d.classList.add('AN_selChk');});});
  document.getElementById('AN_expSelNone').addEventListener('click',function(){document.querySelectorAll('.AN_expSelThumb').forEach(function(d){d.classList.remove('AN_selChk');});});
  document.getElementById('AN_expSelGo').addEventListener('click',function(){
    var sel=[];
    document.querySelectorAll('.AN_expSelThumb.AN_selChk').forEach(function(d){sel.push(+d.dataset.idx);});
    if(sel.length)exportPDF(sel);
  });
  function dataUrlToBytes(url){
    var p=url.split(','),raw=atob(p[1]),b=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);
    return b;
  }
  function makePdfBlob(images){
    var objects=[],nextNum=1;
    function addObj(d){var n=nextNum++;objects[n]=d;return n;}
    var pageRefs=[];
    for(var i=0;i<images.length;i++){
      var img=images[i],raw=dataUrlToBytes(img.d),bin='';
      for(var j=0;j<raw.length;j++)bin+=String.fromCharCode(raw[j]);
      var imgNum=addObj('<< /Type /XObject /Subtype /Image /Width '+img.w+' /Height '+img.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+raw.length+' >>\nstream\n'+bin+'\nendstream');
      var ct='q\n'+img.w+' 0 0 '+img.h+' 0 0 cm\n/Im'+i+' Do\nQ\n';
      var ctNum=addObj('<< /Length '+ct.length+' >>\nstream\n'+ct+'\nendstream');
      var pgNum=addObj('PG_PLACEHOLDER');
      pageRefs.push({n:pgNum,im:imgNum,ct:ctNum,w:img.w,h:img.h,idx:i});
    }
    var pgRoot=addObj('<< /Type /Pages /Kids ['+pageRefs.map(function(p){return p.n+' 0 R';}).join(' ')+'] /Count '+images.length+' >>');
    var cat=addObj('<< /Type /Catalog /Pages '+pgRoot+' 0 R >>');
    pageRefs.forEach(function(p){objects[p.n]='<< /Type /Page /Parent '+pgRoot+' 0 R /MediaBox [0 0 '+p.w+' '+p.h+'] /Contents '+p.ct+' 0 R /Resources << /XObject << /Im'+p.idx+' '+p.im+' 0 R >> >> >>';});
    var pdf='%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
    var xr=[0];
    for(var i=1;i<=nextNum;i++){if(objects[i]!==undefined){xr[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}}
    var xo=pdf.length;
    pdf+='xref\n0 '+nextNum+'\n0000000000 65535 f \n';
    for(var i=1;i<nextNum;i++){var o=String(xr[i]||0);while(o.length<10)o='0'+o;pdf+=o+' 00000 n \n';}
    pdf+='trailer\n<< /Size '+nextNum+' /Root '+cat+' 0 R >>\nstartxref\n'+xo+'\n%%EOF\n';
    var b=new Uint8Array(pdf.length);
    for(var i=0;i<pdf.length;i++)b[i]=pdf.charCodeAt(i)&0xFF;
    return new Blob([b],{type:'application/pdf'});
  }

  function exportPDF(indices){
    document.getElementById('AN_expProgress').style.display='block';
    var fill=document.getElementById('AN_expProgFill');
    var txt=document.getElementById('AN_expProgTxt');
    var isSingle=indices.length===1;
    wbSavePage();
    var allPages=[];
    function next(i){
      if(i>=indices.length){
        fill.style.width='100%';
        if(isSingle){
          txt.textContent='✅ PNG তৈরী…';
          var a=document.createElement('a');
          a.href=allPages[0].d;a.download='whiteboard-page'+(indices[0]+1)+'.png';
          a.click();
          setTimeout(function(){document.getElementById('AN_expModal').classList.remove('AN_show');document.getElementById('AN_expProgress').style.display='none';fill.style.width='0';},200);
        }else{
          txt.textContent='✅ PDF তৈরী…';
          var blob=makePdfBlob(allPages);
          var url=URL.createObjectURL(blob);
          var a=document.createElement('a');a.href=url;a.download='whiteboard-pages.pdf';
          document.body.appendChild(a);a.click();
          setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);document.getElementById('AN_expModal').classList.remove('AN_show');document.getElementById('AN_expProgress').style.display='none';fill.style.width='0';},200);
        }
        return;
      }
      var idx=indices[i];
      fill.style.width=((i/indices.length)*80)+'%';
      txt.textContent='পেজ '+(idx+1)+' প্রস্তুত…';
      var tmpCv=document.createElement('canvas');
      var iw=wbCanvas.width,ih=wbCanvas.height;
      tmpCv.width=iw;tmpCv.height=ih;
      var tmpCtx=tmpCv.getContext('2d');
      tmpCtx.fillStyle=wbState.bg;tmpCtx.fillRect(0,0,iw,ih);
      var savedStrokes=WB.getStrokes();
      var savedSel=WB.getSel(); WB.clearSel();
      WB.setStrokes(wbPages[idx]);WB.redraw();
      tmpCtx.drawImage(wbCanvas,0,0);
      WB.setStrokes(savedStrokes);WB.setSel(savedSel);WB.redraw();
      allPages.push({d:tmpCv.toDataURL(isSingle?'image/png':'image/jpeg',isSingle?1:0.92),w:iw,h:ih});
      setTimeout(function(){next(i+1);},30);
    }
    next(0);
  }

  // Resize WB
  var rszOverlay=document.getElementById('AN_rszOverlay');
  function syncRszOverlay(){
    if(!wbWin.classList.contains('AN_wbOpen')||wbState.isFull){rszOverlay.classList.remove('AN_rszVis');return;}
    var r=wbWin.getBoundingClientRect();
    rszOverlay.style.left=r.left+'px';rszOverlay.style.top=r.top+'px';
    rszOverlay.style.width=r.width+'px';rszOverlay.style.height=r.height+'px';
    rszOverlay.classList.add('AN_rszVis');
  }
  (function(){
    var resizing=false,dir='',sx=0,sy=0,sl=0,st=0,sw=0,sh=0;
    var MIN_W=280,MIN_H=220,activeHandle=null;
    document.querySelectorAll('.AN_rsz').forEach(function(h){
      h.addEventListener('mousedown',rs,{passive:false});
      h.addEventListener('touchstart',rs,{passive:false});
    });
    window.addEventListener('mousemove',rm,{passive:false});
    window.addEventListener('touchmove',rm,{passive:false});
    window.addEventListener('mouseup',re);
    window.addEventListener('touchend',re);
    function rs(e){if(wbState.isFull)return;e.preventDefault();e.stopPropagation();resizing=true;activeHandle=e.currentTarget;activeHandle.classList.add('AN_rszActive');var p=e.touches?e.touches[0]:e;dir=e.currentTarget.dataset.dir;sx=p.clientX;sy=p.clientY;var r=wbWin.getBoundingClientRect();sl=r.left;st=r.top;sw=r.width;sh=r.height;wbWin.style.transition='none';}
    function rm(e){if(!resizing)return;e.preventDefault();var p=e.touches?e.touches[0]:e;var dx=p.clientX-sx,dy=p.clientY-sy;var l=sl,t=st,w=sw,h=sh;if(dir.includes('e'))w=Math.max(MIN_W,sw+dx);if(dir.includes('s'))h=Math.max(MIN_H,sh+dy);if(dir.includes('w')){w=Math.max(MIN_W,sw-dx);l=sl+sw-w;}if(dir.includes('n')){h=Math.max(MIN_H,sh-dy);t=st+sh-h;}l=Math.max(0,l);t=Math.max(0,t);if(l+w>window.innerWidth)w=window.innerWidth-l;if(t+h>window.innerHeight)h=window.innerHeight-t;wbWin.style.left=l+'px';wbWin.style.top=t+'px';wbWin.style.width=w+'px';wbWin.style.height=h+'px';wbWin.style.right='auto';wbWin.style.bottom='auto';wbWin.style.transform='none';syncRszOverlay();wbFit();}
    function re(){if(!resizing)return;resizing=false;if(activeHandle){activeHandle.classList.remove('AN_rszActive');activeHandle=null;}wbWin.style.transition='';syncRszOverlay();wbFit();}
  })();

  window.addEventListener('resize',function(){ovResize();if(wbWin.classList.contains('AN_wbOpen')){wbFit();syncRszOverlay();}});
  window.addEventListener('beforeunload',function(){wbSavePage();});
  updatePgInfo();
  wbLoadLocal();

  // ════════════════════════════════════════════
  //  SETTINGS — Language + Dark/Light Mode
  // ════════════════════════════════════════════

  /* ── Dark / Light / Device mode ── */
  var AN_THEME = 'device'; // 'light' | 'dark' | 'device'

  function getDeviceDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme) {
    AN_THEME = theme;
    var dark = (theme === 'dark') || (theme === 'device' && getDeviceDark());
    if (dark) {
      document.body.classList.add('AN_dark');
    } else {
      document.body.classList.remove('AN_dark');
    }
    // Save to localStorage for fallback
    try { localStorage.setItem('AN_theme', theme); } catch(e){}
  }

  // Listen for system theme changes when in device mode
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      if (AN_THEME === 'device') applyTheme('device');
    });
  }

  // Listen for settings changes from popup (theme / lang)
  try {
    chrome.storage.onChanged.addListener(function(changes) {
      if (changes.AN_theme) applyTheme(changes.AN_theme.newValue || 'device');
      if (changes.AN_lang) {
        AN_LANG = changes.AN_lang.newValue || 'en';
        AN_applyLang();
      }
    });
  } catch(e) {}

  /* ── Language ── */
  var AN_LANG = 'en';
  var AN_STRINGS = {
    bn: { pen:'কলম', magic:'ম্যাজিক পেন', marker:'হাইলাইটার', arrow:'তীর', rect:'বক্স', circle:'বৃত্ত', text:'টেক্সট', eraser:'মুছনি', undo:'আনডু', clearAll:'সব মুছো', hide:'লুকাও', scroll:'স্ক্রোল মোড', rotate:'খাড়া/আড়া', wb:'হোয়াইটবোর্ড', close:'বন্ধ', wbTitle:'🖊️ হোয়াইটবোর্ড', wbMin:'মিনিমাইজ', wbMax:'ফুল স্ক্রিন', wbClose:'বন্ধ করো', wbPen:'কলম', wbMagic:'ম্যাজিক পেন', wbMarker:'মার্কার', wbArrow:'তীর', wbRect:'বক্স', wbCircle:'বৃত্ত', wbText:'টেক্সট', wbEraser:'মুছনি', wbUndo:'আনডু', wbClear:'এই পেজ মুছো', pgNew:'নতুন পেজ', pgPrev:'আগের পেজ', pgNext:'পরের পেজ', pgThumb:'সব পেজ দেখো', pgDel:'পেজ মুছো', pgExport:'Export', pgSideMin:'সাইডবার লুকাও', pgSideTab:'সাইডবার খোলো', textLabel:'✍️ টেক্সট লেখো', textPh:'এখানে লেখো...', textOk:'✅ যোগ', textCancel:'❌ বাতিল', wbTextLabel:'✍️ টেক্সট লেখো', wbTextPh:'এখানে লেখো...', wbTextOk:'✅ যোগ', wbTextCancel:'❌ বাতিল', wbMinTab:'🖊️ হোয়াইটবোর্ড', wbRestore:'↑ খোলো', bgLabel:'BG:', settTitle:'⚙️ Settings', settLang:'Language', settTheme:'থিম', themeDevice:'⚙️ Auto', themeLight:'☀️ Light', themeDark:'🌙 Dark', modalOk:'হ্যাঁ, মুছো', modalCancel:'বাতিল' },
    en: { pen:'Pen', magic:'Magic Pen', marker:'Highlighter', arrow:'Arrow', rect:'Rectangle', circle:'Circle', text:'Text', eraser:'Eraser', undo:'Undo', clearAll:'Clear All', hide:'Hide', scroll:'Scroll Mode', rotate:'Rotate Bar', wb:'Whiteboard', close:'Close', wbTitle:'🖊️ Whiteboard', wbMin:'Minimize', wbMax:'Fullscreen', wbClose:'Close', wbPen:'Pen', wbMagic:'Magic Pen', wbMarker:'Marker', wbArrow:'Arrow', wbRect:'Rectangle', wbCircle:'Circle', wbText:'Text', wbEraser:'Eraser', wbUndo:'Undo', wbClear:'Clear Page', pgNew:'New Page', pgPrev:'Prev Page', pgNext:'Next Page', pgThumb:'All Pages', pgDel:'Delete Page', pgExport:'Export', pgSideMin:'Hide Sidebar', pgSideTab:'Open Sidebar', textLabel:'✍️ Add Text', textPh:'Type here...', textOk:'✅ Add', textCancel:'❌ Cancel', wbTextLabel:'✍️ Add Text', wbTextPh:'Type here...', wbTextOk:'✅ Add', wbTextCancel:'❌ Cancel', wbMinTab:'🖊️ Whiteboard', wbRestore:'↑ Open', bgLabel:'BG:', settTitle:'⚙️ Settings', settLang:'Language', settTheme:'Theme', themeDevice:'⚙️ Auto', themeLight:'☀️ Light', themeDark:'🌙 Dark', modalOk:'Yes, Delete', modalCancel:'Cancel' }
  };
  function t(k){return AN_STRINGS[AN_LANG][k]||AN_STRINGS.bn[k]||k;}
  function qs(sel){ return document.querySelector(sel); }
  function ge(id){ return document.getElementById(id); }
  function AN_applyLang(){
    var pv; // safe helper
    pv=qs('[data-tool="pen"].AN_tool');    if(pv) pv.title=t('pen');
    pv=qs('[data-tool="magic"].AN_tool');  if(pv) pv.title=t('magic');
    pv=qs('[data-tool="marker"].AN_tool'); if(pv) pv.title=t('marker');
    pv=qs('[data-tool="arrow"].AN_tool');  if(pv) pv.title=t('arrow');
    pv=qs('[data-tool="rect"].AN_tool');   if(pv) pv.title=t('rect');
    pv=qs('[data-tool="circle"].AN_tool'); if(pv) pv.title=t('circle');
    pv=qs('[data-tool="text"].AN_tool');   if(pv) pv.title=t('text');
    pv=qs('[data-tool="eraser"].AN_tool'); if(pv) pv.title=t('eraser');
    pv=ge('AN_undo');   if(pv) pv.title=t('undo');
    pv=ge('AN_clear');  if(pv) pv.title=t('clearAll');
    pv=ge('AN_hide');   if(pv) pv.title=t('hide');
    pv=ge('AN_touch');  if(pv) pv.title=t('scroll');
    pv=ge('AN_rotate'); if(pv) pv.title=t('rotate');
    pv=ge('AN_wb');     if(pv) pv.title=t('wb');
    pv=ge('AN_close');  if(pv) pv.title=t('close');
    var tl=qs('#AN_textpop div');if(tl)tl.textContent=t('textLabel');
    pv=ge('AN_tinput');if(pv)pv.placeholder=t('textPh');
    pv=ge('AN_tok');if(pv)pv.textContent=t('textOk');
    pv=ge('AN_tcancel');if(pv)pv.textContent=t('textCancel');
    var wbSpan=qs('#AN_wbTitleDrag span');if(wbSpan)wbSpan.textContent=t('wbTitle');
    pv=ge('AN_wbMinBtn');   if(pv) pv.title=t('wbMin');
    pv=ge('AN_wbMaxBtn');   if(pv) pv.title=t('wbMax');
    pv=ge('AN_wbCloseBtn'); if(pv) pv.title=t('wbClose');
    pv=qs('[data-tool="pen"].AN_wbt');    if(pv) pv.title=t('wbPen');
    pv=qs('[data-tool="magic"].AN_wbt');  if(pv) pv.title=t('wbMagic');
    pv=qs('[data-tool="marker"].AN_wbt'); if(pv) pv.title=t('wbMarker');
    pv=qs('[data-tool="arrow"].AN_wbt');  if(pv) pv.title=t('wbArrow');
    pv=qs('[data-tool="rect"].AN_wbt');   if(pv) pv.title=t('wbRect');
    pv=qs('[data-tool="circle"].AN_wbt'); if(pv) pv.title=t('wbCircle');
    pv=qs('[data-tool="text"].AN_wbt');   if(pv) pv.title=t('wbText');
    pv=qs('[data-tool="eraser"].AN_wbt'); if(pv) pv.title=t('wbEraser');
    pv=ge('AN_wbUndo');  if(pv) pv.title=t('wbUndo');
    pv=ge('AN_wbClear'); if(pv) pv.title=t('wbClear');
    var bgl=qs('.AN_wbBGlbl');if(bgl)bgl.textContent=t('bgLabel');
    pv=ge('AN_pgNew');     if(pv) pv.title=t('pgNew');
    pv=ge('AN_pgPrev');    if(pv) pv.title=t('pgPrev');
    pv=ge('AN_pgNext');    if(pv) pv.title=t('pgNext');
    pv=ge('AN_pgThumb');   if(pv) pv.title=t('pgThumb');
    pv=ge('AN_pgDel');     if(pv) pv.title=t('pgDel');
    pv=ge('AN_pgExport');  if(pv) pv.title=t('pgExport');
    pv=ge('AN_pgSideMin'); if(pv) pv.title=t('pgSideMin');
    pv=ge('AN_pgSideTab'); if(pv) pv.title=t('pgSideTab');
    var wtl=qs('#AN_wbTextpop div');if(wtl)wtl.textContent=t('wbTextLabel');
    pv=ge('AN_wbTinput');if(pv)pv.placeholder=t('wbTextPh');
    pv=ge('AN_wbTok');if(pv)pv.textContent=t('wbTextOk');
    pv=ge('AN_wbTcancel');if(pv)pv.textContent=t('wbTextCancel');
    var wmt=qs('#AN_wbMinTab span');if(wmt)wmt.textContent=t('wbMinTab');
    pv=ge('AN_wbRestoreBtn');if(pv)pv.textContent=t('wbRestore');
    document.getElementById('AN_modalOk').textContent=t('modalOk');
    document.getElementById('AN_modalCancel').textContent=t('modalCancel');
    try { localStorage.setItem('AN_lang', AN_LANG); } catch(e){}
  }

  // Language is set by popup; no in-page language buttons

  function updateZoomDisplay(){
    var vp=WB.getViewport();
    var el=document.getElementById('AN_wbZoomVal');
    if(el)el.textContent=Math.round(vp.scale*100)+'%';
    var sl=document.getElementById('AN_wbZoomSlider');
    if(sl)sl.value=Math.round(vp.scale*100);
  }
  var _zoomVis=false;
  function toggleZoomControls(){
    var el=document.getElementById('AN_wbZoomBlock');
    if(!el)return;
    _zoomVis=!_zoomVis;
    el.style.display=_zoomVis?'flex':'none';
    if(_zoomVis)updateZoomDisplay();
  }

  function wbGetSaveData(){
    wbSavePage();
    var vp=WB.getViewport();
    return {
      version:1,
      format:'sswb',
      name:'Self Study Whiteboard',
      bg:wbState.bg,
      zoom:vp.scale,
      viewport:{x:vp.x,y:vp.y,scale:vp.scale},
      activePage:wbPageIdx,
      pages:wbPages.map(function(pg,i){
        return {strokes:pg,bg:i===wbPageIdx?wbState.bg:null};
      })
    };
  }
  function wbRestoreFromData(data){
    if(!data||!data.pages||!data.pages.length)return;
    wbPages=data.pages.map(function(pg){return pg.strokes||[];});
    wbPageIdx=Math.min(data.activePage||0,wbPages.length-1);
    if(data.bg)wbState.bg=data.bg;
    var vp=data.viewport||{x:0,y:0,scale:1};
    if(data.zoom)vp.scale=Math.max(0.25,Math.min(5,data.zoom));
    var bgEls=document.querySelectorAll('.AN_bgClr');
    bgEls.forEach(function(b){b.classList.toggle('AN_bgActive',b.dataset.bg===wbState.bg);});
    wbLoadPage();
    wbFit();
    WB.setViewport(vp);
    updateZoomDisplay();
  }
  function wbSaveToFile(){
    var data=wbGetSaveData();
    var json=JSON.stringify(data,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='whiteboard.sswb';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
  }
  function wbLoadFromFile(){
    var input=document.getElementById('AN_wbFileInput');
    if(!input){
      input=document.createElement('input');
      input.id='AN_wbFileInput';
      input.type='file';
      input.accept='.sswb,.json';
      input.style.display='none';
      document.body.appendChild(input);
    }
    input.value='';
    input.onchange=function(e){
      var file=e.target.files[0];
      if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        try{
          var data=JSON.parse(ev.target.result);
          if(data.format!=='sswb'){AN_confirm('এটি একটি বৈধ .sswb ফাইল নয়।',function(){});return;}
          wbRestoreFromData(data);
        }catch(err){AN_confirm('ফাইল লোড করতে সমস্যা হয়েছে।',function(){});}
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function wbSaveLocal(){
    try{
      var data=wbGetSaveData();
      localStorage.setItem('AN_wbSave',JSON.stringify(data));
    }catch(e){}
  }
  function wbLoadLocal(){
    try{
      var saved=localStorage.getItem('AN_wbSave');
      if(saved){var data=JSON.parse(saved);if(data.format==='sswb')wbRestoreFromData(data);}
    }catch(e){}
  }

  // ── Restore toolbar position ──
  (function(){
    try {
      var saved = localStorage.getItem('AN_barPos');
      if (!saved) return;
      var pos = JSON.parse(saved);
      var bar = document.getElementById('AN_bar');
      if (pos.vert) {
        ovState.isVert = true;
        bar.classList.add('AN_vert');
        document.getElementById('AN_rotate').textContent = '↕️';
      }
      if (pos.left)   { bar.style.left = pos.left;   bar.style.right = 'auto'; }
      if (pos.top)    { bar.style.top  = pos.top;    bar.style.bottom = 'auto'; }
      if (pos.transform) bar.style.transform = pos.transform;
    } catch(e){}
  })();

  // Restore saved preferences — __AN_INIT injected by background.js (chrome.storage) OR localStorage fallback
  (function(){
    var init = (typeof window.__AN_INIT !== 'undefined') ? window.__AN_INIT : {};
    var savedLang  = init.lang  || (function(){ try{ return localStorage.getItem('AN_lang');  }catch(e){ return null; } })() || 'en';
    var savedTheme = init.theme || (function(){ try{ return localStorage.getItem('AN_theme'); }catch(e){ return null; } })() || 'device';
    // Apply language
    AN_LANG = (savedLang === 'bn') ? 'bn' : 'en';
    AN_applyLang();
    // Apply theme
    applyTheme(savedTheme);
  })();

  // ════════════════════════════════════════════
  //  AUTOSAVE (per-URL annotation persistence)
  // ════════════════════════════════════════════
  (function(){
    var _as = { on:false, mode:'blacklist', rules:[] };

    function asLoadSettings(cb) {
      chrome.storage.local.get(['AN_autosave','AN_autosave_mode','AN_autosave_rules'], function(r){
        _as.on = r.AN_autosave === true;
        _as.mode = r.AN_autosave_mode || 'blacklist';
        _as.rules = r.AN_autosave_rules || [];
        if (cb) cb();
      });
    }

    function asUrlMatch(url, pattern) {
      try {
        var re = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        re = re.replace(/\*\\\./g, '(.*\\.)?');
        re = re.replace(/\*/g, '.*');
        return new RegExp('^' + re + '$', 'i').test(url);
      } catch(e) { return false; }
    }

    function asCanSave(url) {
      if (!url || url.indexOf('chrome-extension://') === 0) return false;
      if (!_as.rules || !_as.rules.length) return true;
      return !_as.rules.some(function(r){ return asUrlMatch(url, r); });
    }

    function asLoad() {
      var url = window.location.href;
      if (!_as.on || !asCanSave(url)) return;
      chrome.storage.local.get(['AN_autosave_sites'], function(r){
        var saved = (r.AN_autosave_sites || {})[url];
        if (!saved) return;
        if (saved.overlay && saved.overlay.length) OV.setStrokes(saved.overlay);
        if (saved.whiteboard) {
          var w = saved.whiteboard;
          if (w.pages && w.pages.length) {
            wbPages = w.pages.map(function(p){ return p.slice(); });
            wbPageIdx = w.activePage || 0;
            if (wbPageIdx >= wbPages.length) wbPageIdx = 0;
            if (w.bg !== undefined) wbState.bg = w.bg;
            if (w.vp) WB.setViewport(w.vp);
            else if (w.zoom !== undefined) WB.setViewport({x:0,y:0,scale:Math.max(0.25,Math.min(5,w.zoom))});
            wbLoadPage();
            wbFit();
          }
        }
      });
    }

    function asSave() {
      if (!_as.on) return;
      var url = window.location.href;
      if (!asCanSave(url)) return;
      wbSavePage();
      chrome.storage.local.get(['AN_autosave_sites'], function(r){
        var sites = r.AN_autosave_sites || {};
        sites[url] = {
          title: document.title,
          url: url,
          savedAt: Date.now(),
          overlay: OV.getStrokes(),
          whiteboard: {
            pages: wbPages.map(function(p){ return p.slice(); }),
            activePage: wbPageIdx,
            bg: wbState.bg,
            vp: WB.getViewport()
          }
        };
        chrome.storage.local.set({ AN_autosave_sites: sites });
      });
    }

    // Init
    asLoadSettings(function(){ if (_as.on) asLoad(); });
    // Save before page unload
    window.addEventListener('beforeunload', asSave);
    // Periodic safety save
    setInterval(function(){ if (_as.on) asSave(); }, 60000);
    // React to settings changes
    chrome.storage.onChanged.addListener(function(changes){
      if (changes.AN_autosave || changes.AN_autosave_mode || changes.AN_autosave_rules) {
        asLoadSettings(function(){ if (_as.on) asLoad(); });
      }
    });
  })();

})();
