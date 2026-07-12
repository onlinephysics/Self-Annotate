/* ══════════════════════════════════════════════════════════
   Self Annotate — Standalone Whiteboard (v1.3)
   Runs in its own extension tab — no webpage needed.
═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Theme / Dark Mode ── */
var AN_THEME='device';
function getDeviceDark(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;}
function applyTheme(theme){
  AN_THEME=theme;
  var dark=(theme==='dark')||(theme==='device'&&getDeviceDark());
  document.body.classList.toggle('AN_dark',dark);
  try{localStorage.setItem('AN_theme',theme);}catch(e){}
}
if(window.matchMedia){
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(){
    if(AN_THEME==='device')applyTheme('device');
  });
}
(function(){
  try{
    chrome.storage.local.get(['AN_theme'],function(r){
      applyTheme(r.AN_theme||'device');
    });
  }catch(e){
    var saved=(function(){try{return localStorage.getItem('AN_theme');}catch(e){}return null;})();
    applyTheme(saved||'device');
  }
})();

/* ── Confirm modal ── */
var _modalCb=null,_modal=document.getElementById('AN_modal'),_modalMsg=document.getElementById('AN_modalMsg');
document.getElementById('AN_modalOk').addEventListener('click',function(){_modal.classList.remove('show');if(_modalCb){_modalCb();_modalCb=null;}});
document.getElementById('AN_modalCancel').addEventListener('click',function(){_modal.classList.remove('show');_modalCb=null;});
_modal.addEventListener('click',function(e){if(e.target===_modal){_modal.classList.remove('show');_modalCb=null;}});
function AN_confirm(msg,cb){_modalMsg.textContent=msg;_modalCb=cb;_modal.classList.add('show');}

/* ── Drawing engine ── */
function makeBoard(canvas, mode, getBg, getZoom){
  var ctx=canvas.getContext('2d');
  var strokes=[],cur=null,drawing=false;

  function resize(){
    var dpr=window.devicePixelRatio||1,w,h;
    if(mode==='overlay'){w=window.innerWidth;h=window.innerHeight;}
    else{var body=canvas.parentElement;w=body.clientWidth;h=body.clientHeight;}
    canvas.width=w*dpr;canvas.height=h*dpr;
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redraw();
  }
  function getCoord(e){
    var s=e.touches?e.touches[0]:e;
    var z=getZoom?getZoom():1;
    if(mode==='overlay')return{x:(s.clientX+window.scrollX)/z,y:(s.clientY+window.scrollY)/z};
    var r=canvas.getBoundingClientRect();
    return{x:(s.clientX-r.left)/z,y:(s.clientY-r.top)/z};
  }
  function toCanvas(x,y){
    if(mode==='overlay')return{x:x-window.scrollX,y:y-window.scrollY};
    return{x:x,y:y};
  }
  function smoothPath(pts){
    if(!pts||pts.length<2)return;
    var p0=toCanvas(pts[0].x,pts[0].y);
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);
    if(pts.length===2){var p1=toCanvas(pts[1].x,pts[1].y);ctx.lineTo(p1.x,p1.y);}
    else{
      for(var i=1;i<pts.length-1;i++){
        var a=toCanvas(pts[i].x,pts[i].y),b=toCanvas(pts[i+1].x,pts[i+1].y);
        ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);
      }
      var last=toCanvas(pts[pts.length-1].x,pts[pts.length-1].y);
      ctx.lineTo(last.x,last.y);
    }
    ctx.stroke();
  }
  function drawOne(s,alphaForce){
    ctx.save();
    var alpha=(alphaForce!==undefined)?alphaForce:(s.tool==='marker')?0.38:1;
    ctx.globalAlpha=alpha;ctx.strokeStyle=s.color;ctx.fillStyle=s.color;
    ctx.lineWidth=s.lw;ctx.lineCap='round';ctx.lineJoin='round';
    if(s.tool==='pen'||s.tool==='marker'||s.tool==='magic'){smoothPath(s.pts);}
    else if(s.tool==='arrow'){
      var cs=toCanvas(s.sx,s.sy),ce=toCanvas(s.ex,s.ey);
      var dx=ce.x-cs.x,dy=ce.y-cs.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<4){ctx.restore();return;}
      var ang=Math.atan2(dy,dx),hw=Math.max(16,Math.min(26,dist*0.32));
      ctx.beginPath();ctx.moveTo(cs.x,cs.y);
      ctx.lineTo(ce.x-hw*0.75*Math.cos(ang),ce.y-hw*0.75*Math.sin(ang));ctx.stroke();
      ctx.beginPath();ctx.moveTo(ce.x,ce.y);
      ctx.lineTo(ce.x-hw*Math.cos(ang-0.42),ce.y-hw*Math.sin(ang-0.42));
      ctx.lineTo(ce.x-hw*Math.cos(ang+0.42),ce.y-hw*Math.sin(ang+0.42));
      ctx.closePath();ctx.fill();
    }else if(s.tool==='rect'){
      var cs2=toCanvas(s.sx,s.sy),ce2=toCanvas(s.ex,s.ey);
      ctx.strokeRect(cs2.x,cs2.y,ce2.x-cs2.x,ce2.y-cs2.y);
    }else if(s.tool==='circle'){
      var cs3=toCanvas(s.sx,s.sy),ce3=toCanvas(s.ex,s.ey);
      var rx=(ce3.x-cs3.x)/2,ry=(ce3.y-cs3.y)/2;
      ctx.beginPath();ctx.ellipse(cs3.x+rx,cs3.y+ry,Math.abs(rx)||1,Math.abs(ry)||1,0,0,Math.PI*2);ctx.stroke();
    }else if(s.tool==='text'){
      var ct=toCanvas(s.sx,s.sy);
      ctx.globalAlpha=(alphaForce!==undefined)?alphaForce:1;
      ctx.font='bold '+Math.max(14,s.lw*3+12)+'px Hind Siliguri,Arial';
      ctx.fillText(s.text,ct.x,ct.y);
    }
    ctx.restore();
  }
  function redraw(){
    var dpr=window.devicePixelRatio||1,w=canvas.width/dpr,h=canvas.height/dpr;
    ctx.clearRect(0,0,w,h);
    if(getBg){ctx.fillStyle=getBg();ctx.fillRect(0,0,w,h);}
    for(var i=0;i<strokes.length;i++)drawOne(strokes[i],strokes[i]._alpha!==undefined?strokes[i]._alpha:undefined);
    if(cur)drawOne(cur);
  }
  function scheduleFade(s){
    var SHOW=2000,FADE=800;
    setTimeout(function(){
      var t1=Date.now();
      (function fade(){
        var el=Date.now()-t1,a=Math.max(0,1-el/FADE);
        s._alpha=a;redraw();
        if(a>0)requestAnimationFrame(fade);
        else{strokes=strokes.filter(function(x){return x!==s;});redraw();}
      })();
    },SHOW);
  }
  function eraseAt(px,py,lw){
    var r=lw*4+12;
    strokes=strokes.filter(function(s){
      if(s.tool==='text')return Math.hypot(s.sx-px,s.sy-py)>r;
      if(s.pts){for(var i=0;i<s.pts.length;i++)if(Math.hypot(s.pts[i].x-px,s.pts[i].y-py)<=r)return false;}
      else{if(Math.hypot((s.sx+s.ex)/2-px,(s.sy+s.ey)/2-py)<=r*2)return false;}
      return true;
    });
    redraw();
  }
  function onDown(tool,color,lw,e){
    var p=getCoord(e);
    if(tool==='eraser'){drawing=true;eraseAt(p.x,p.y,lw);return;}
    drawing=true;
    if(tool==='pen'||tool==='marker'||tool==='magic')cur={tool,color,lw,pts:[p]};
    else cur={tool,color,lw,sx:p.x,sy:p.y,ex:p.x,ey:p.y};
  }
  function onMove(tool,lw,e){
    if(!drawing)return;var p=getCoord(e);
    if(tool==='eraser'){eraseAt(p.x,p.y,lw);return;}
    if(!cur)return;
    if(tool==='pen'||tool==='marker'||tool==='magic')cur.pts.push(p);
    else{cur.ex=p.x;cur.ey=p.y;}
    redraw();
  }
  function onUp(tool){
    if(!drawing)return;drawing=false;
    if(cur){strokes.push(cur);if(tool==='magic')scheduleFade(cur);cur=null;}
    redraw();
  }
  function pushText(color,lw,pos,text){strokes.push({tool:'text',color,lw,sx:pos.x,sy:pos.y,text});redraw();}
  function undo(){strokes.pop();redraw();}
  function clearAll(){strokes=[];cur=null;redraw();}
  function getStrokes(){return strokes.slice();}
  function setStrokes(arr){strokes=arr?arr.slice():[];cur=null;redraw();}
  return{resize,redraw,onDown,onMove,onUp,pushText,undo,clear:clearAll,getStrokes,setStrokes};
}

/* ── Canvas setup ── */
var canvas=document.getElementById('wbCanvas');
var body=document.getElementById('wbBody');
var bar=document.getElementById('wbBar');

var state={tool:'pen',color:'#ef4444',lw:6,bg:'#9ca3af',zoom:1};

var WB=makeBoard(canvas,'window',function(){return state.bg;},function(){return state.zoom;});

function fit(){
  var dpr=window.devicePixelRatio||1,w=body.clientWidth,h=body.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
  applyZoom();
  WB.redraw();
}
function applyZoom(){
  canvas.style.transform='scale('+(state.zoom||1)+')';
}

/* ── Multi-page ── */
var pages=[WB.getStrokes()],pageIdx=0;
function savePage(){pages[pageIdx]=WB.getStrokes();}
function loadPage(){WB.setStrokes(pages[pageIdx]);}

/* ── Save/Load ── */
function getSaveData(){
  savePage();
  return{
    version:1,format:'sswb',name:'Self Study Whiteboard',
    bg:state.bg,zoom:state.zoom,activePage:pageIdx,
    pages:pages.map(function(pg){return{strokes:pg};})
  };
}
function restoreFromData(data){
  if(!data||!data.pages||!data.pages.length)return;
  pages=data.pages.map(function(pg){return pg.strokes||[];});
  pageIdx=Math.min(data.activePage||0,pages.length-1);
  if(data.bg)state.bg=data.bg;
  if(data.zoom)state.zoom=Math.max(0.25,Math.min(5,data.zoom));
  loadPage();fit();updateZoomDisplay();
}
function saveToFile(){
  var data=getSaveData();
  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='whiteboard.sswb';
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
}
function loadFromFile(){
  var input=document.getElementById('wbFileInput');
  if(!input){
    input=document.createElement('input');
    input.id='wbFileInput';input.type='file';
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
        restoreFromData(data);
      }catch(err){AN_confirm('ফাইল লোড করতে সমস্যা হয়েছে।',function(){});}
    };
    reader.readAsText(file);
  };
  input.click();
}
function saveLocal(){
  try{localStorage.setItem('AN_wbSave',JSON.stringify(getSaveData()));}catch(e){}
}
function loadLocal(){
  try{
    var saved=localStorage.getItem('AN_wbSave');
    if(saved){var data=JSON.parse(saved);if(data.format==='sswb')restoreFromData(data);}
  }catch(e){}
}

/* ── Toolbar ── */
var TOOL_DEFS={
  pen:{dt:'pen',icon:'✏️',extra:'wbActive'},
  magic:{dt:'magic',icon:'✨'},
  marker:{dt:'marker',icon:'🖊️'},
  arrow:{dt:'arrow',icon:'➡️'},
  rect:{dt:'rect',icon:'⬜'},
  circle:{dt:'circle',icon:'⭕'},
  text:{dt:'text',icon:'T'},
  eraser:{dt:'eraser',icon:'🧹'},
  undo:{id:'wbUndo',icon:'↩️',act:true},
  clear:{id:'wbClear',icon:'🗑️',act:true},
  zoom:{id:'wbZoomBtn',icon:'🔍',act:true},
  save:{id:'wbSave',icon:'💾',act:true},
  load:{id:'wbLoad',icon:'📂',act:true}
};

var GROUPS=[
  {id:'g1',name:'Draw',  icon:'✏️',mode:'inline',btns:['pen','magic','marker']},
  {id:'g2',name:'Shapes',icon:'📐',mode:'flyout',btns:['arrow','rect','circle']},
  {id:'g3',name:'More',  icon:'➕',mode:'flyout',btns:['text','eraser']},
  {id:'g4',name:'Style', icon:'🎨',mode:'inline',btns:['colors','slider','bg']},
  {id:'g5',name:'Actions',icon:'⚡',mode:'inline',btns:['undo','clear','zoom']},
  {id:'g6',name:'File',  icon:'💾',mode:'flyout',btns:['save','load']}
];

function renderBar(){
  var scrollEl=document.getElementById('wbScroll');
  var bar=document.getElementById('wbBar');
  if(!scrollEl||!bar)return;
  scrollEl.innerHTML='';
  bar.querySelectorAll('.flyout-bar').forEach(function(f){f.remove();});

  GROUPS.forEach(function(grp,gi){
    if(gi>0){var sp=document.createElement('div');sp.className='wbSep';scrollEl.appendChild(sp);}

    if(grp.mode==='flyout'){
      var trig=document.createElement('button');
      trig.className='wbt';
      trig.title=grp.name;
      trig.innerHTML=(grp.icon||'📦')+'<span class="wbChev" style="position:absolute;bottom:1px;right:1px;width:4px;height:4px;border-right:1.5px solid #94a3b8;border-bottom:1.5px solid #94a3b8;transform:rotate(45deg);display:block;"></span>';

      var fly=document.createElement('div');
      fly.className='flyout flyout-bar';
      buildBtns(grp.btns,fly);

      trig.addEventListener('click',function(e){
        e.stopPropagation();
        var isOpen=fly.classList.contains('flyOpen');
        bar.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});
        if(!isOpen){
          var tr=trig.getBoundingClientRect();
          var br=bar.getBoundingClientRect();
          fly.style.left=(tr.left-br.left+tr.width/2)+'px';
          fly.style.bottom='calc(100% + 8px)';
          fly.style.transform='translateX(-50%)';
          fly.classList.add('flyOpen');
        }
      });

      scrollEl.appendChild(trig);
      bar.appendChild(fly);
    } else {
      var wrap=document.createElement('div');
      wrap.style.cssText='display:flex;align-items:center;gap:3px;flex-shrink:0;';
      buildBtns(grp.btns,wrap);
      scrollEl.appendChild(wrap);
    }
  });
  if(!window._wbDocClose){
    window._wbDocClose=function(){bar.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});};
    document.addEventListener('click',window._wbDocClose);
  }
  reattach();
  /* close flyouts on scroll */
  scrollEl.addEventListener('scroll',function(){bar.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});});
}

function buildBtns(btns,container){
  btns.forEach(function(key){
    if(key==='colors'){
      var cb=document.createElement('div');cb.className='wbColors';
      [['#ef4444',''],['#f59e0b',''],['#10b981',''],['#3b82f6',''],['#a855f7',''],
       ['#ffffff','border:1.5px solid rgba(255,255,255,.3)'],['#111827','']
      ].forEach(function(c,ci){
        var btn=document.createElement('button');
        btn.className='wbClr'+(ci===0?' wbClrActive':'');
        btn.dataset.c=c[0];
        btn.style.cssText='background:'+c[0]+(c[1]?';'+c[1]:'');
        btn.addEventListener('click',function(){
          container.querySelectorAll('.wbClr').forEach(function(b){b.classList.remove('wbClrActive');});
          btn.classList.add('wbClrActive');
          state.color=c[0];
        });
        cb.appendChild(btn);
      });
      container.appendChild(cb);
      return;
    }
    if(key==='slider'){
      var sl=document.createElement('input');
      sl.type='range';sl.id='wbSlider';sl.min=1;sl.max=28;sl.value=state.lw;
      sl.title='Thickness';
      sl.addEventListener('input',function(){state.lw=+sl.value;});
      container.appendChild(sl);
      return;
    }
    if(key==='bg'){
      var lbl=document.createElement('span');lbl.className='bgLbl';lbl.textContent='BG:';
      container.appendChild(lbl);
      var bgDiv=document.createElement('div');bgDiv.className='wbBG';
      [['#9ca3af','ধূসর',true],['#ffffff','সাদা'],['#1e293b','ডার্ক'],['#fef9c3','হলুদ'],['#f0fdf4','সবুজ']].forEach(function(bg){
        var btn=document.createElement('button');
        btn.className='bgClr'+(bg[2]?' bgActive':'');
        btn.dataset.bg=bg[0];btn.title=bg[1];
        btn.style.cssText='background:'+bg[0]+(bg[0]==='#ffffff'?';border:1.5px solid rgba(0,0,0,.15)':'')+';';
        btn.addEventListener('click',function(){
          container.querySelectorAll('.bgClr').forEach(function(b){b.classList.remove('bgActive');});
          btn.classList.add('bgActive');
          state.bg=bg[0];WB.redraw();
        });
        bgDiv.appendChild(btn);
      });
      container.appendChild(bgDiv);
      return;
    }
    if(key==='zoom'){
      var zb=document.createElement('div');zb.className='wbZoomBlock';zb.style.display='none';zb.id='wbZoomBlock';
      var zmOut=document.createElement('button');zmOut.className='wbZoomBtn';zmOut.textContent='−';
      zmOut.addEventListener('click',function(){state.zoom=Math.max(0.25,state.zoom-0.25);fit();updateZoomDisplay();});
      var zmIn=document.createElement('button');zmIn.className='wbZoomBtn';zmIn.textContent='+';
      zmIn.addEventListener('click',function(){state.zoom=Math.min(5,state.zoom+0.25);fit();updateZoomDisplay();});
      var zmVal=document.createElement('span');zmVal.className='wbZoomVal';zmVal.id='wbZoomVal';zmVal.textContent='100%';
      var zmSl=document.createElement('input');zmSl.type='range';zmSl.className='wbZoomSlider';zmSl.id='wbZoomSlider';
      zmSl.min=25;zmSl.max=500;zmSl.value=100;
      zmSl.addEventListener('input',function(){state.zoom=+zmSl.value/100;fit();updateZoomDisplay();});
      zb.appendChild(zmOut);zb.appendChild(zmSl);zb.appendChild(zmIn);zb.appendChild(zmVal);
      container.appendChild(zb);
      return;
    }
    var d=TOOL_DEFS[key];if(!d)return;
    var btn=document.createElement('button');
    if(d.act){
      btn.className='wbAct';btn.id=d.id;btn.textContent=d.icon;
    }else{
      btn.className='wbt'+(d.extra?' '+d.extra:'');
      btn.dataset.tool=d.dt;btn.textContent=d.icon;
      btn.addEventListener('click',function(){
        container.querySelectorAll('.wbt').forEach(function(b){b.classList.remove('wbActive');});
        btn.classList.add('wbActive');state.tool=d.dt;
        document.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});
      });
    }
    container.appendChild(btn);
  });
}

function reattach(){
  var undoEl=document.getElementById('wbUndo');
  if(undoEl)undoEl.addEventListener('click',function(){WB.undo();});
  var clearEl=document.getElementById('wbClear');
  if(clearEl)clearEl.addEventListener('click',function(){AN_confirm('এই পেজ মুছে ফেলবো?',function(){WB.clear();savePage();});});
  var zoomBtn=document.getElementById('wbZoomBtn');
  if(zoomBtn)zoomBtn.addEventListener('click',function(){toggleZoom();});
  var saveBtn=document.getElementById('wbSave');
  if(saveBtn)saveBtn.addEventListener('click',function(){saveToFile();});
  var loadBtn=document.getElementById('wbLoad');
  if(loadBtn)loadBtn.addEventListener('click',function(){loadFromFile();});
}
function updateZoomDisplay(){
  var el=document.getElementById('wbZoomVal');
  if(el)el.textContent=Math.round(state.zoom*100)+'%';
  var sl=document.getElementById('wbZoomSlider');
  if(sl)sl.value=Math.round(state.zoom*100);
}
var _zoomVis=false;
function toggleZoom(){
  var el=document.getElementById('wbZoomBlock');
  if(!el)return;
  _zoomVis=!_zoomVis;
  el.style.display=_zoomVis?'flex':'none';
  if(_zoomVis)updateZoomDisplay();
}

/* ── Canvas events ── */
var touchDist=0;
canvas.addEventListener('mousedown',function(e){e.preventDefault();WB.onDown(state.tool,state.color,state.lw,e);},{passive:false});
canvas.addEventListener('mousemove',function(e){e.preventDefault();WB.onMove(state.tool,state.lw,e);},{passive:false});
canvas.addEventListener('mouseup',function(){WB.onUp(state.tool);});
canvas.addEventListener('mouseleave',function(){WB.onUp(state.tool);});
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    touchDist=Math.sqrt(dx*dx+dy*dy);return;
  }
  WB.onDown(state.tool,state.color,state.lw,e);
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(touchDist>0){
      var newZoom=Math.max(0.25,Math.min(5,state.zoom*(dist/touchDist)));
      if(newZoom!==state.zoom){state.zoom=newZoom;fit();updateZoomDisplay();}
    }
    touchDist=dist;return;
  }
  WB.onMove(state.tool,state.lw,e);
},{passive:false});
canvas.addEventListener('touchend',function(){touchDist=0;WB.onUp(state.tool);});

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){WB.undo();e.preventDefault();}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){saveToFile();e.preventDefault();}
  if((e.ctrlKey||e.metaKey)&&e.key==='o'){loadFromFile();e.preventDefault();}
});

/* ── Window events ── */
window.addEventListener('resize',function(){fit();});
window.addEventListener('beforeunload',function(){saveLocal();});

/* ── Init ── */
renderBar();
fit();
loadLocal();
})();
