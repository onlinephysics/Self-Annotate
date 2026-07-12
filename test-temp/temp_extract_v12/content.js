/* ══════════════════════════════════════════════════════════
   ANNOTATION TOOL + WHITEBOARD  — Chrome Extension
   Content Script: inject করলে যেকোনো পেজে কাজ করে (http, https, file://)।
   Settings এখন popup-এ — পেজে আর কোনো Settings button নেই।
   v1.2 — Group toolbar system, flyout groups, custom layout from popup
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
  animation:AN_popIn .14s cubic-bezier(.34,1.56,.64,1);
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
  border-radius:0 0 16px 16px; flex-wrap:nowrap; overflow-x:auto;
  user-select:none; min-height:44px; transition:background .2s,border-color .2s;
}
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
  flex:1; padding:6px; border:none; border-radius:7px;
  font-family:'Hind Siliguri',Arial,sans-serif; font-size:12px; font-weight:600; cursor:pointer;
}
#AN_wbTok { background:#0d6efd; color:#fff; }
#AN_wbTcancel { background:#f0f4ff; color:#1e293b; border:1px solid #cbd5e1; }

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

    function resize() {
      var dpr = window.devicePixelRatio || 1, w, h;
      if (mode === 'overlay') { w = window.innerWidth; h = window.innerHeight; }
      else { var body = canvas.parentElement; w = body.clientWidth; h = body.clientHeight; }
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }
    function getCoord(e) {
      var s = e.touches ? e.touches[0] : e;
      if (mode === 'overlay') return { x: s.clientX + window.scrollX, y: s.clientY + window.scrollY };
      var r = canvas.getBoundingClientRect();
      return { x: s.clientX - r.left, y: s.clientY - r.top };
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
      } else if (s.tool==='text') {
        var ct=toCanvas(s.sx,s.sy);
        ctx.globalAlpha=(alphaForce!==undefined)?alphaForce:1;
        ctx.font='bold '+Math.max(14,s.lw*3+12)+'px Hind Siliguri,Arial';
        ctx.fillText(s.text,ct.x,ct.y);
      }
      ctx.restore();
    }
    function redraw() {
      var dpr=window.devicePixelRatio||1, w=canvas.width/dpr, h=canvas.height/dpr;
      ctx.clearRect(0,0,w,h);
      if (getBg) { ctx.fillStyle=getBg(); ctx.fillRect(0,0,w,h); }
      for (var i=0;i<strokes.length;i++) drawOne(strokes[i], strokes[i]._alpha!==undefined?strokes[i]._alpha:undefined);
      if (cur) drawOne(cur);
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
        if (s.pts) { for(var i=0;i<s.pts.length;i++) if(Math.hypot(s.pts[i].x-px,s.pts[i].y-py)<=r) return false; }
        else { if(Math.hypot((s.sx+s.ex)/2-px,(s.sy+s.ey)/2-py)<=r*2) return false; }
        return true;
      });
      redraw();
    }
    function onDown(tool,color,lw,e) {
      var p=getCoord(e);
      if (tool==='eraser'){drawing=true;eraseAt(p.x,p.y,lw);return;}
      drawing=true;
      if(tool==='pen'||tool==='marker'||tool==='magic') cur={tool,color,lw,pts:[p]};
      else cur={tool,color,lw,sx:p.x,sy:p.y,ex:p.x,ey:p.y};
    }
    function onMove(tool,lw,e) {
      if(!drawing)return; var p=getCoord(e);
      if(tool==='eraser'){eraseAt(p.x,p.y,lw);return;}
      if(!cur)return;
      if(tool==='pen'||tool==='marker'||tool==='magic') cur.pts.push(p);
      else{cur.ex=p.x;cur.ey=p.y;}
      redraw();
    }
    function onUp(tool) {
      if(!drawing)return; drawing=false;
      if(cur){strokes.push(cur); if(tool==='magic')scheduleFade(cur); cur=null;}
      redraw();
    }
    function pushText(color,lw,pos,text){strokes.push({tool:'text',color,lw,sx:pos.x,sy:pos.y,text});redraw();}
    function undo(){strokes.pop();redraw();}
    function clear(){strokes=[];cur=null;redraw();}
    function getStrokes(){return strokes.slice();}
    function setStrokes(arr){strokes=arr?arr.slice():[];cur=null;redraw();}
    return {resize,redraw,onDown,onMove,onUp,pushText,undo,clear,getStrokes,setStrokes};
  }

  // ════════════════════════════════════════════
  //  OVERLAY ANNOTATION
  // ════════════════════════════════════════════
  var ovCanvas = document.getElementById('AN_canvas');
  var OV = makeBoard(ovCanvas, 'overlay', null);
  var ovState = { tool:'pen', color:'#ef4444', lw:6, hidden:false, barOpen:false, scrollMode:false, isVert:false, textPos:null };

  /* ════════════════════════════════════════════
     GROUP TOOLBAR ENGINE
     Reads AN_groups from storage, renders groups
     into #AN_bar as inline or flyout blocks.
     Each group block is separated by .AN_sep.
  ════════════════════════════════════════════ */

  // Default groups (mirrors popup.js AN_PRESETS.default)
  var DEFAULT_AN_GROUPS = [
    { id:'g1', name:'Draw',    icon:'✏️', mode:'inline',  btns:['pen','magic','marker'] },
    { id:'g2', name:'Shapes',  icon:'📐', mode:'flyout',  btns:['arrow','rect','circle'] },
    { id:'g3', name:'More',    icon:'➕', mode:'flyout',  btns:['text','eraser'] },
    { id:'g4', name:'Colors',  icon:'🎨', mode:'inline',  btns:['colors','slider'] },
    { id:'g5', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
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

    // Close flyouts on outside click
    document.addEventListener('click', function() {
      document.querySelectorAll('.AN_flyout.AN_flyOpen').forEach(function(f){
        f.classList.remove('AN_flyOpen');
        f.previousSibling && f.previousSibling.classList && f.previousSibling.classList.remove('AN_grpOpen');
      });
    });

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
        var sl = document.createElement('input');
        sl.type = 'range'; sl.id = 'AN_slider';
        sl.min = 1; sl.max = 28; sl.value = ovState.lw;
        sl.title = 'Thickness';
        sl.className = '';
        sl.style.cssText = 'width:58px;height:4px;flex-shrink:0;-webkit-appearance:none;appearance:none;background:#cbd5e1;border-radius:2px;outline:none;cursor:pointer;';
        sl.addEventListener('input', function(){ ovState.lw = +sl.value; });
        container.appendChild(sl);
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
      arrow:  { cls:'AN_tool', dt:'arrow',  icon:'➡️', title:'Arrow'      },
      rect:   { cls:'AN_tool', dt:'rect',   icon:'⬜', title:'Rectangle'  },
      circle: { cls:'AN_tool', dt:'circle', icon:'⭕', title:'Circle'     },
      text:   { cls:'AN_tool AN_Ttxt', dt:'text', icon:'T', title:'Text'  },
      eraser: { cls:'AN_tool', dt:'eraser', icon:'🧹', title:'Eraser'     },
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
  ovCanvas.addEventListener('touchstart', function(e){e.preventDefault();if(ovState.tool==='text'){openOVText(e);return;}OV.onDown(ovState.tool,ovState.color,ovState.lw,e);},{passive:false});
  ovCanvas.addEventListener('touchmove',  function(e){e.preventDefault();OV.onMove(ovState.tool,ovState.lw,e);},{passive:false});
  ovCanvas.addEventListener('touchend',   function(){OV.onUp(ovState.tool);});

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
      chrome.storage.local.get(['AN_groups'], function(r) {
        if (r.AN_groups) {
          try { anGroups = JSON.parse(r.AN_groups); } catch(e){}
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
  var wbState={tool:'pen',color:'#ef4444',lw:6,bg:'#9ca3af',isFull:false,isMin:false,textPos:null,savedL:'',savedT:'',savedW:'',savedH:''};

  /* ════════════ WB GROUP TOOLBAR ENGINE ════════════ */
  var DEFAULT_WB_GROUPS = [
    { id:'g1', name:'Draw',    icon:'✏️', mode:'inline',  btns:['pen','magic','marker'] },
    { id:'g2', name:'Shapes',  icon:'📐', mode:'flyout',  btns:['arrow','rect','circle'] },
    { id:'g3', name:'More',    icon:'➕', mode:'flyout',  btns:['text','eraser'] },
    { id:'g4', name:'Style',   icon:'🎨', mode:'inline',  btns:['colors','slider','bg'] },
    { id:'g5', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear'] }
  ];
  var wbGroups = DEFAULT_WB_GROUPS;

  function renderWbBar(groups) {
    var bar = document.getElementById('AN_wbBar');
    if (!bar) return;
    bar.innerHTML = '';

    groups.forEach(function(grp, gi) {
      if (gi > 0) {
        var sep = document.createElement('div');
        sep.className = 'AN_wbSep';
        bar.appendChild(sep);
      }
      var grpWrap = document.createElement('div');
      grpWrap.style.cssText = 'display:flex;align-items:center;gap:3px;position:relative;flex-shrink:0;';

      if (grp.mode === 'flyout') {
        var trigBtn = document.createElement('button');
        trigBtn.className = 'AN_wbt';
        trigBtn.title = grp.name;
        trigBtn.textContent = grp.icon || '📦';
        trigBtn.style.cssText = 'position:relative;';
        trigBtn.innerHTML = (grp.icon||'📦') + '<span style="position:absolute;bottom:1px;right:1px;width:4px;height:4px;border-right:1.5px solid #94a3b8;border-bottom:1.5px solid #94a3b8;transform:rotate(45deg);display:block;"></span>';

        var flyout = document.createElement('div');
        flyout.className = 'AN_flyout';
        flyout.style.cssText += '; background:rgba(255,255,255,.98)';

        buildWbGroupButtons(grp.btns, flyout);

        trigBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = flyout.classList.contains('AN_flyOpen');
          document.querySelectorAll('#AN_wbBar .AN_flyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
          if (!isOpen) flyout.classList.add('AN_flyOpen');
        });
        grpWrap.appendChild(trigBtn);
        grpWrap.appendChild(flyout);
      } else {
        buildWbGroupButtons(grp.btns, grpWrap);
      }
      bar.appendChild(grpWrap);
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('#AN_wbBar .AN_flyout.AN_flyOpen').forEach(function(f){ f.classList.remove('AN_flyOpen'); });
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
        var sl=document.createElement('input');
        sl.type='range'; sl.id='AN_wbSlider'; sl.min=1; sl.max=28; sl.value=wbState.lw;
        sl.title='Thickness';
        sl.style.cssText='width:64px;height:4px;flex-shrink:0;-webkit-appearance:none;appearance:none;background:#cbd5e1;border-radius:2px;outline:none;cursor:pointer;';
        sl.addEventListener('input',function(){ wbState.lw=+sl.value; });
        container.appendChild(sl);
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
        [['#9ca3af','ধূসর',true],['#ffffff','সাদা'],['#1e293b','ডার্ক'],['#fef9c3','হলুদ'],['#f0fdf4','সবুজ']].forEach(function(bg){
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
      var btn = makeWbBtn(key);
      if (btn) container.appendChild(btn);
    });
  }

  function makeWbBtn(key) {
    var defs = {
      pen:    { dt:'pen',    icon:'✏️', extra:'AN_wbActive' },
      magic:  { dt:'magic',  icon:'✨' },
      marker: { dt:'marker', icon:'🖊️' },
      arrow:  { dt:'arrow',  icon:'➡️' },
      rect:   { dt:'rect',   icon:'⬜' },
      circle: { dt:'circle', icon:'⭕' },
      text:   { dt:'text',   icon:'T', txtClass:true },
      eraser: { dt:'eraser', icon:'🧹' },
      undo:   { id:'AN_wbUndo',  icon:'↩️', act:true },
      clear:  { id:'AN_wbClear', icon:'🗑️', act:true }
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
        document.getElementById('AN_wbTextpop') && document.getElementById('AN_wbTextpop').classList.remove('AN_show');
        var fly = btn.closest && btn.closest('.AN_flyout');
        if (fly) fly.classList.remove('AN_flyOpen');
      });
    }
    return btn;
  }

  function reattachWbListeners() {
    var undoEl = document.getElementById('AN_wbUndo');
    if (undoEl) undoEl.addEventListener('click', function(){ WB.undo(); });
    var clearEl = document.getElementById('AN_wbClear');
    if (clearEl) clearEl.addEventListener('click', function(){
      AN_confirm('এই পেজ মুছে ফেলবো?', function(){ WB.clear(); wbSavePage(); });
    });
  }
  var WB=makeBoard(wbCanvas,'window',function(){return wbState.bg;});

  // Multi-page
  var wbPages=[WB.getStrokes()], wbPageIdx=0;
  function wbSavePage(){wbPages[wbPageIdx]=WB.getStrokes();}
  function wbLoadPage(){WB.setStrokes(wbPages[wbPageIdx]);updatePgInfo();}
  function updatePgInfo(){
    document.getElementById('AN_pgNum').textContent=wbPageIdx+1;
    document.getElementById('AN_pgOf').textContent='/'+(wbPages.length);
  }

  function wbFit(){
    var dpr=window.devicePixelRatio||1,w=wbBody.clientWidth,h=wbBody.clientHeight;
    wbCanvas.width=w*dpr;wbCanvas.height=h*dpr;
    wbCanvas.style.width=w+'px';wbCanvas.style.height=h+'px';
    wbCanvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);WB.redraw();
  }

  wbCanvas.addEventListener('mousedown',function(e){e.preventDefault();if(wbState.tool==='text'){openWBText(e);return;}WB.onDown(wbState.tool,wbState.color,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('mousemove',function(e){e.preventDefault();WB.onMove(wbState.tool,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('mouseup',function(){WB.onUp(wbState.tool);});
  wbCanvas.addEventListener('mouseleave',function(){WB.onUp(wbState.tool);});
  wbCanvas.addEventListener('touchstart',function(e){e.preventDefault();if(wbState.tool==='text'){openWBText(e);return;}WB.onDown(wbState.tool,wbState.color,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('touchmove',function(e){e.preventDefault();WB.onMove(wbState.tool,wbState.lw,e);},{passive:false});
  wbCanvas.addEventListener('touchend',function(){WB.onUp(wbState.tool);});

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
      chrome.storage.local.get(['WB_groups'], function(r) {
        if (r.WB_groups) { try { wbGroups = JSON.parse(r.WB_groups); } catch(e){} }
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
    if(wbPages.length<=1){AN_confirm('শুধু একটি পেজ আছে। মুছে নতুন পেজ তৈরি হবে।',function(){WB.clear();wbPages=[[]];wbPageIdx=0;wbLoadPage();});return;}
    AN_confirm('এই পেজ মুছে ফেলবো?',function(){wbPages.splice(wbPageIdx,1);if(wbPageIdx>=wbPages.length)wbPageIdx=wbPages.length-1;wbLoadPage();});
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
      WB.setStrokes(pg); WB.redraw();
      tmpCtx.drawImage(wbCanvas,0,0);
      tctx.drawImage(tmpCv,0,0,280,200);
      WB.setStrokes(savedStrokes); WB.redraw();
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
    var a=document.createElement('a');
    a.href=wbCanvas.toDataURL('image/png');
    a.download='whiteboard-page'+(wbPageIdx+1)+'.png';
    a.click();
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
  function exportPDF(indices){
    document.getElementById('AN_expProgress').style.display='block';
    var fill=document.getElementById('AN_expProgFill');
    var txt=document.getElementById('AN_expProgTxt');
    var links=[]; var i=0;
    wbSavePage();
    function next(){
      if(i>=indices.length){
        txt.textContent='✅ তৈরি হয়ে গেছে!';
        links.forEach(function(h,n){setTimeout(function(){h.click();},n*200);});
        setTimeout(function(){document.getElementById('AN_expModal').classList.remove('AN_show');},600);
        return;
      }
      var idx=indices[i];
      fill.style.width=((i/indices.length)*100)+'%';
      txt.textContent='পেজ '+(idx+1)+' তৈরি হচ্ছে…';
      var tmpCv=document.createElement('canvas'); tmpCv.width=wbCanvas.width; tmpCv.height=wbCanvas.height;
      var tmpCtx=tmpCv.getContext('2d'); tmpCtx.fillStyle=wbState.bg; tmpCtx.fillRect(0,0,tmpCv.width,tmpCv.height);
      var savedStrokes=WB.getStrokes();
      WB.setStrokes(wbPages[idx]); WB.redraw();
      tmpCtx.drawImage(wbCanvas,0,0);
      WB.setStrokes(savedStrokes); WB.redraw();
      var a=document.createElement('a'); a.href=tmpCv.toDataURL('image/png'); a.download='whiteboard-p'+(idx+1)+'.png'; links.push(a);
      i++; setTimeout(next,50);
    }
    next();
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
  updatePgInfo();

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

})();
