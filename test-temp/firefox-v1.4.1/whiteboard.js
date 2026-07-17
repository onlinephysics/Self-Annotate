(function(){
'use strict';

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

var _modalCb=null,_modal=document.getElementById('AN_modal'),_modalMsg=document.getElementById('AN_modalMsg');
document.getElementById('AN_modalOk').addEventListener('click',function(){_modal.classList.remove('show');if(_modalCb){_modalCb();_modalCb=null;}});
document.getElementById('AN_modalCancel').addEventListener('click',function(){_modal.classList.remove('show');_modalCb=null;});
_modal.addEventListener('click',function(e){if(e.target===_modal){_modal.classList.remove('show');_modalCb=null;}});
function AN_confirm(msg,cb){_modalMsg.textContent=msg;_modalCb=cb;_modal.classList.add('show');}

chrome.runtime.onMessage.addListener(function(msg){
  if(msg.type==='WB_IND_GROUPS_UPDATE'){
    GROUPS=msg.groups||DEFAULT_GROUPS;
    renderBar();
  }
  if(msg.type==='AN_THEME_UPDATE'){
    if(msg.defaultThickness){state.lw=msg.defaultThickness;updateThick();}
    if(msg.defaultBg){state.bg=msg.defaultBg;updateBgActive();WB.redraw();}
    if(msg.theme) applyTheme(msg.theme);
  }
});

function makeBoard(canvas, mode, getBg){
  var ctx=canvas.getContext('2d');
  var strokes=[],cur=null,drawing=false;
  var imageCache=new Map();
  var selectedStrokes=[],selectRect=null,isMoving=false,moveStart=null;
  var _moveOrig=[];
  var isPanning=false,panStart=null;
  var selActions=null;
  var _editInput=null;

  // Viewport state for zoom/pan
  var viewport={x:0,y:0,scale:1};

  function resize(){
    var dpr=window.devicePixelRatio||1,w,h;
    if(mode==='overlay'){w=window.innerWidth;h=window.innerHeight;}
    else{var body=canvas.parentElement;w=body.clientWidth;h=body.clientHeight;}
    canvas.width=w*dpr;canvas.height=h*dpr;
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    applyViewport();redraw();
  }
  function getCoord(e){
    var s=e.touches?e.touches[0]:e;
    var z=viewport.scale;
    if(mode==='overlay')return{x:(s.clientX+window.scrollX-viewport.x)/z,y:(s.clientY+window.scrollY-viewport.y)/z};
    var r=canvas.getBoundingClientRect();
    return{x:(s.clientX-r.left-viewport.x)/z,y:(s.clientY-r.top-viewport.y)/z};
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
  function getStrokeBBox(s){
    if(s.pts){var mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;for(var i=0;i<s.pts.length;i++){if(s.pts[i].x<mnX)mnX=s.pts[i].x;if(s.pts[i].y<mnY)mnY=s.pts[i].y;if(s.pts[i].x>mxX)mxX=s.pts[i].x;if(s.pts[i].y>mxY)mxY=s.pts[i].y;}return{x:mnX,y:mnY,w:mxX-mnX,h:mxY-mnY};}
    if(s.tool==='text'){var fs=Math.max(14,s.lw*3+12);return{x:s.sx,y:s.sy-fs,w:fs*(s.text||'').length*0.6,h:fs*1.2};}
    if(s.tool==='image')return{x:s.sx,y:s.sy,w:s.w,h:s.h};
    return{x:Math.min(s.sx,s.ex),y:Math.min(s.sy,s.ey),w:Math.abs(s.ex-s.sx),h:Math.abs(s.ey-s.sy)};
  }
  function hitTest(px,py){
    for(var i=strokes.length-1;i>=0;i--){var s=strokes[i];
      if(s.tool==='text'){var fs=Math.max(14,s.lw*3+12);var tw=fs*(s.text||'').length*0.6;if(px>=s.sx&&px<=s.sx+tw&&py>=s.sy-fs&&py<=s.sy+fs*0.2)return s;}
      if(s.tool==='image'){if(px>=s.sx&&px<=s.sx+s.w&&py>=s.sy&&py<=s.sy+s.h)return s;}
      if(s.pts){for(var j=0;j<s.pts.length;j++){if(Math.hypot(px-s.pts[j].x,py-s.pts[j].y)<12)return s;}}
      if(s.sx!==undefined){var bx=getStrokeBBox(s);if(bx&&px>=bx.x-3&&px<=bx.x+bx.w+3&&py>=bx.y-3&&py<=bx.y+bx.h+3)return s;}
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
  function selInRect(x1,y1,x2,y2){strokes.forEach(function(s){var bx=getStrokeBBox(s);if(bx&&bx.x+bx.w>=x1&&bx.x<=x2&&bx.y+bx.h>=y1&&bx.y<=y2)addSel(s);});}
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
    }else if(s.tool==='triangle'){
      var ct0=toCanvas(s.sx,s.sy),ce0=toCanvas(s.ex,s.ey);
      var bx0=ct0.x,by0=ct0.y,w0=ce0.x-ct0.x,h0=ce0.y-ct0.y;
      ctx.beginPath();ctx.moveTo(bx0+w0/2,by0);ctx.lineTo(bx0,by0+h0);ctx.lineTo(bx0+w0,by0+h0);ctx.closePath();ctx.stroke();
    }else if(s.tool==='pentagon'){
      var ct4=toCanvas(s.sx,s.sy),ce4=toCanvas(s.ex,s.ey);
      var cx4=(ct4.x+ce4.x)/2,cy4=(ct4.y+ce4.y)/2,r4=Math.min(Math.abs(ce4.x-ct4.x),Math.abs(ce4.y-ct4.y))/2;
      ctx.beginPath();
      for(var i4=0;i4<5;i4++){var a4=Math.PI/2+i4*2*Math.PI/5;if(i4===0)ctx.moveTo(cx4+r4*Math.cos(a4),cy4-r4*Math.sin(a4));else ctx.lineTo(cx4+r4*Math.cos(a4),cy4-r4*Math.sin(a4));}
      ctx.closePath();ctx.stroke();
    }else if(s.tool==='hexagon'){
      var ct5=toCanvas(s.sx,s.sy),ce5=toCanvas(s.ex,s.ey);
      var cx5=(ct5.x+ce5.x)/2,cy5=(ct5.y+ce5.y)/2,r5=Math.min(Math.abs(ce5.x-ct5.x),Math.abs(ce5.y-ct5.y))/2;
      ctx.beginPath();
      for(var i5=0;i5<6;i5++){var a5=Math.PI/2+i5*2*Math.PI/6;if(i5===0)ctx.moveTo(cx5+r5*Math.cos(a5),cy5-r5*Math.sin(a5));else ctx.lineTo(cx5+r5*Math.cos(a5),cy5-r5*Math.sin(a5));}
      ctx.closePath();ctx.stroke();
    }else if(s.tool==='roundrect'){
      var ct6=toCanvas(s.sx,s.sy),ce6=toCanvas(s.ex,s.ey);
      var x6=ct6.x,y6=ct6.y,w6=ce6.x-ct6.x,h6=ce6.y-ct6.y,rad6=Math.min(Math.abs(w6),Math.abs(h6),20);
      ctx.beginPath();ctx.roundRect(x6,y6,w6,h6,rad6);ctx.stroke();
    }else if(s.tool==='diamond'){
      var ct7=toCanvas(s.sx,s.sy),ce7=toCanvas(s.ex,s.ey);
      var cx7=(ct7.x+ce7.x)/2,cy7=(ct7.y+ce7.y)/2;
      ctx.beginPath();ctx.moveTo(cx7,ct7.y);ctx.lineTo(ce7.x,cy7);ctx.lineTo(cx7,ce7.y);ctx.lineTo(ct7.x,cy7);ctx.closePath();ctx.stroke();
    }else if(s.tool==='star'){
      var ct8=toCanvas(s.sx,s.sy),ce8=toCanvas(s.ex,s.ey);
      var cx8=(ct8.x+ce8.x)/2,cy8=(ct8.y+ce8.y)/2,rOuter8=Math.min(Math.abs(ce8.x-ct8.x),Math.abs(ce8.y-ct8.y))/2,rInner8=rOuter8*0.4;
      ctx.beginPath();
      for(var i8=0;i8<5;i8++){var a8=Math.PI/2+i8*2*Math.PI/5;if(i8===0)ctx.moveTo(cx8+rOuter8*Math.cos(a8),cy8-rOuter8*Math.sin(a8));ctx.lineTo(cx8+rInner8*Math.cos(a8+Math.PI/5),cy8-rInner8*Math.sin(a8+Math.PI/5));ctx.lineTo(cx8+rOuter8*Math.cos(a8+2*Math.PI/5),cy8-rOuter8*Math.sin(a8+2*Math.PI/5));}
      ctx.closePath();ctx.stroke();
    }else if(s.tool==='righttri'){
      var ct9=toCanvas(s.sx,s.sy),ce9=toCanvas(s.ex,s.ey);
      ctx.beginPath();ctx.moveTo(ct9.x,ct9.y);ctx.lineTo(ce9.x,ce9.y);ctx.lineTo(ct9.x,ce9.y);ctx.closePath();ctx.stroke();
    }else if(s.tool==='text'){
      var ct=toCanvas(s.sx,s.sy);
      ctx.globalAlpha=(alphaForce!==undefined)?alphaForce:1;
      ctx.font='bold '+Math.max(14,s.lw*3+12)+'px Hind Siliguri,Arial';
      ctx.fillText(s.text,ct.x,ct.y);
    }else if(s.tool==='image'){
      var img=imageCache.get(s);
      if(!img){img=new Image();var _s2=s;img.onload=function(){if(strokes.indexOf(_s2)>=0)redraw();};img.src=s.dataUrl;imageCache.set(s,img);}
      if(img.complete&&img.naturalWidth>0){var cp2=toCanvas(s.sx,s.sy);ctx.drawImage(img,cp2.x,cp2.y,s.w,s.h);}
    }
    ctx.restore();
  }
  function redraw(){
    var dpr=window.devicePixelRatio||1,w=canvas.width/dpr,h=canvas.height/dpr;
    ctx.clearRect(0,0,w,h);
    if(getBg){ctx.fillStyle=getBg();ctx.fillRect(0,0,w,h);}
    for(var i=0;i<strokes.length;i++)drawOne(strokes[i],strokes[i]._alpha!==undefined?strokes[i]._alpha:undefined);
    if(cur)drawOne(cur);
    ctx.save();
    selectedStrokes.forEach(function(s){var bx=getStrokeBBox(s);if(bx){var p2=toCanvas(bx.x,bx.y);ctx.strokeStyle='#3b82f6';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(p2.x-4,p2.y-4,bx.w+8,bx.h+8);ctx.setLineDash([]);}});
    if(selectRect){var rx=Math.min(selectRect.x1,selectRect.x2),ry=Math.min(selectRect.y1,selectRect.y2),rw=Math.abs(selectRect.x2-selectRect.x1),rh=Math.abs(selectRect.y2-selectRect.y1);ctx.fillStyle='rgba(59,130,246,0.08)';ctx.strokeStyle='rgba(59,130,246,0.6)';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.fillRect(rx,ry,rw,rh);ctx.strokeRect(rx,ry,rw,rh);ctx.setLineDash([]);}
    ctx.restore();
    updSelBtns();
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
      if(s.tool==='image')return !(px>=s.sx&&px<=s.sx+s.w&&py>=s.sy&&py<=s.sy+s.h);
      if(s.pts){for(var i=0;i<s.pts.length;i++)if(Math.hypot(s.pts[i].x-px,s.pts[i].y-py)<=r)return false;}
      else{if(Math.hypot((s.sx+s.ex)/2-px,(s.sy+s.ey)/2-py)<=r*2)return false;}
      return true;
    });
    redraw();
  }
  function onDown(tool,color,lw,e){
    var p=getCoord(e);
    if(tool==='eraser'){drawing=true;eraseAt(p.x,p.y,lw);return;}
    if(tool==='pan'){
      drawing=true;isPanning=true;panStart={x:e.clientX,y:e.clientY};
      canvas.style.cursor='grabbing';return;
    }
    if(tool==='select'){
      canvas.style.cursor='default';
      drawing=true;var hit=hitTest(p.x,p.y);
      if(hit){
        if(e.shiftKey){toggleSel(hit);}
        else if(!isSelected(hit)){clearSel();addSel(hit);}
        if(selectedStrokes.length>0){isMoving=true;moveStart=p;initMove();}
      }else{
        if(!e.shiftKey)clearSel();
        selectRect={x1:p.x,y1:p.y,x2:p.x,y2:p.y};
      }
      return;
    }
    drawing=true;canvas.style.cursor='crosshair';
    if(tool==='pen'||tool==='marker'||tool==='magic')cur={tool,color,lw,pts:[p]};
    else cur={tool,color,lw,sx:p.x,sy:p.y,ex:p.x,ey:p.y};
  }
  function onMove(tool,lw,e){
    if(!drawing)return;var p=getCoord(e);
    if(tool==='eraser'){eraseAt(p.x,p.y,lw);return;}
    if(tool==='pan'){
      if(isPanning){panBy(e.clientX-panStart.x,e.clientY-panStart.y);panStart={x:e.clientX,y:e.clientY};redraw();}
      return;
    }
    if(tool==='select'){
      if(selectRect){selectRect.x2=p.x;selectRect.y2=p.y;redraw();}
      else if(isMoving){applySelMove(p.x-moveStart.x,p.y-moveStart.y);redraw();}
      return;
    }
    if(!cur)return;
    if(tool==='pen'||tool==='marker'||tool==='magic')cur.pts.push(p);
    else{cur.ex=p.x;cur.ey=p.y;}
    redraw();
  }
  function onUp(tool){
    if(!drawing)return;drawing=false;
    if(tool==='pan'){isPanning=false;panStart=null;canvas.style.cursor='grab';redraw();return;}
    if(tool==='select'){
      if(selectRect){selInRect(Math.min(selectRect.x1,selectRect.x2),Math.min(selectRect.y1,selectRect.y2),Math.max(selectRect.x1,selectRect.x2),Math.max(selectRect.y1,selectRect.y2));selectRect=null;}
      isMoving=false;moveStart=null;redraw();return;
    }
    if(cur){strokes.push(cur);if(tool==='magic')scheduleFade(cur);cur=null;}
    redraw();
  }
  function pushText(color,lw,pos,text){strokes.push({tool:'text',color,lw,sx:pos.x,sy:pos.y,text});redraw();}
  function addImage(dataUrl,x,y,w,h){strokes.push({tool:'image',sx:x,sy:y,w,h,dataUrl});redraw();}
  function undo(){strokes.pop();redraw();}
  function clearAll(){strokes=[];cur=null;selectedStrokes=[];selectRect=null;redraw();}
  function getStrokes(){return strokes.slice();}
  function setStrokes(arr){strokes=arr?arr.slice():[];cur=null;selectedStrokes=[];selectRect=null;strokes.forEach(function(s){if(s.tool==='image'&&!imageCache.has(s)){var img=new Image();img.src=s.dataUrl;imageCache.set(s,img);}});redraw();}
  document.addEventListener('keydown',function(e){
    if(selectedStrokes.length===0)return;
    var tag=e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
    if(e.key==='Delete'||e.key==='Backspace'){strokes=strokes.filter(function(s){return selectedStrokes.indexOf(s)<0;});selectedStrokes=[];redraw();e.preventDefault();}
    if(e.key==='Escape'){selectedStrokes=[];redraw();}
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
  return{resize,redraw,onDown,onMove,onUp,pushText,addImage,undo,clear:clearAll,getStrokes,setStrokes,clearSel,getSel,setSel,getViewport,setViewport,zoomAtPoint,panBy};
}

var canvas=document.getElementById('wbCanvas');
var body=document.getElementById('wbBody');
var bar=document.getElementById('wbBar');

var state={tool:'pen',color:'#ef4444',lw:4,bg:'#1e293b'};
var WB=makeBoard(canvas,'window',function(){return state.bg;});
var _wbTextPos=null;

// Text popup handlers
document.getElementById('AN_wbTok').addEventListener('click',function(){
  var val=document.getElementById('AN_wbTinput').value.trim();
  if(val&&_wbTextPos)WB.pushText(state.color,state.lw,_wbTextPos,val);
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

// Paste & drag-drop
document.addEventListener('paste', function(e) {
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
        var r = canvas.getBoundingClientRect();
        WB.addImage(dataUrl, r.width/2-img.width/2, r.height/2-img.height/2, img.width, img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    break;
  }
});
canvas.addEventListener('dragover', function(e){e.preventDefault();document.getElementById('AN_dragGhost').classList.add('AN_on');});
canvas.addEventListener('dragleave',function(){document.getElementById('AN_dragGhost').classList.remove('AN_on');});
canvas.addEventListener('drop',function(e){
  e.preventDefault();document.getElementById('AN_dragGhost').classList.remove('AN_on');
  var file=e.dataTransfer.files[0];if(!file||file.type.indexOf('image')===-1)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    var dataUrl=ev.target.result,img=new Image();
    img.onload=function(){
      var r=canvas.getBoundingClientRect();
      WB.addImage(dataUrl,e.clientX-r.left-img.width/2,e.clientY-r.top-img.height/2,img.width,img.height);
    };
    img.src=dataUrl;
  };
  reader.readAsDataURL(file);
});

// Load default thickness and bg from storage
try {
  chrome.storage.local.get(['AN_defaultThickness','AN_defaultBg'], function(r) {
    if (r.AN_defaultThickness) {
      state.lw = r.AN_defaultThickness;
      updateThick();
    }
    if (r.AN_defaultBg) {
      state.bg = r.AN_defaultBg;
      updateBgActive();
    }
  });
} catch(e) {}

function fit(){
  WB.resize();
  WB.redraw();
}

var pages=[WB.getStrokes()],pageIdx=0;
function savePage(){pages[pageIdx]=WB.getStrokes();}
function loadPage(){WB.setStrokes(pages[pageIdx]);updatePgInfo();}
function updatePgInfo(){
  var n=document.getElementById('wbPgNum');if(n)n.textContent=pageIdx+1;
  var o=document.getElementById('wbPgOf');if(o)o.textContent='/'+pages.length;
}

function getSaveData(){
  savePage();
  var vp=WB.getViewport();
  return{
    version:1,format:'sswb',name:'Self Study Whiteboard',
    bg:state.bg,zoom:vp.scale,viewport:{x:vp.x,y:vp.y,scale:vp.scale},activePage:pageIdx,
    pages:pages.map(function(pg){return{strokes:pg};})
  };
}
function restoreFromData(data){
  if(!data||!data.pages||!data.pages.length)return;
  pages=data.pages.map(function(pg){return pg.strokes||[];});
  pageIdx=Math.min(data.activePage||0,pages.length-1);
  if(data.bg)state.bg=data.bg;
  var vp=data.viewport||{x:0,y:0,scale:1};
  if(data.zoom)vp.scale=Math.max(0.25,Math.min(5,data.zoom));
  var bgEls=document.querySelectorAll('.bgClr');
  bgEls.forEach(function(b){b.classList.toggle('bgActive',b.dataset.bg===state.bg);});
  loadPage();fit();WB.setViewport(vp);updateZoomDisplay();
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
    var transfer=localStorage.getItem('AN_wbTabTransfer');
    if(transfer){
      localStorage.removeItem('AN_wbTabTransfer');
      var dt=JSON.parse(transfer);
      if(dt.format==='sswb'){restoreFromData(dt);return;}
    }
    var saved=localStorage.getItem('AN_wbSave');
    if(saved){var data=JSON.parse(saved);if(data.format==='sswb')restoreFromData(data);}
  }catch(e){}
}

/* ── PDF generator ── */
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

/* ── Export functions ── */
function exportWB(indices){
  document.getElementById('wbExpProg').style.display='block';
  var fill=document.getElementById('wbExpProgFill');
  var txt=document.getElementById('wbExpProgTxt');
  var isSingle=indices.length===1;
  savePage();
  var allPages=[];
  function next(i){
    if(i>=indices.length){
      fill.style.width='100%';
      if(isSingle){
        txt.textContent='✅ PNG তৈরী…';
        var a=document.createElement('a');
        a.href=allPages[0].d;a.download='whiteboard-page'+(indices[0]+1)+'.png';
        a.click();
        setTimeout(function(){document.getElementById('wbExpModal').classList.remove('wbShow');document.getElementById('wbExpProg').style.display='none';fill.style.width='0';},200);
      }else{
        txt.textContent='✅ PDF তৈরী…';
        var blob=makePdfBlob(allPages);
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');a.href=url;a.download='whiteboard-pages.pdf';
        document.body.appendChild(a);a.click();
        setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);document.getElementById('wbExpModal').classList.remove('wbShow');document.getElementById('wbExpProg').style.display='none';fill.style.width='0';},200);
      }
      return;
    }
    var idx=indices[i];
    fill.style.width=((i/indices.length)*80)+'%';
    txt.textContent='পেজ '+(idx+1)+' প্রস্তুত…';
    var tmpCv=document.createElement('canvas');
    var iw=canvas.width,ih=canvas.height;
    tmpCv.width=iw;tmpCv.height=ih;
    var tmpCtx=tmpCv.getContext('2d');
    tmpCtx.fillStyle=state.bg;tmpCtx.fillRect(0,0,iw,ih);
    var savedStrokes=WB.getStrokes();
    var savedSel=WB.getSel();
    WB.clearSel();
    WB.setStrokes(pages[idx]);WB.redraw();
    tmpCtx.drawImage(canvas,0,0);
    WB.setStrokes(savedStrokes);WB.setSel(savedSel);WB.redraw();
    allPages.push({d:tmpCv.toDataURL(isSingle?'image/png':'image/jpeg',isSingle?1:0.92),w:iw,h:ih});
    setTimeout(function(){next(i+1);},30);
  }
  next(0);
}

/* ── Toolbar ── */
var TOOL_DEFS={
  pen:{dt:'pen',icon:'✏️',extra:'wbActive'},
  magic:{dt:'magic',icon:'✨'},
  marker:{dt:'marker',icon:'🖊️'},
  arrow:{dt:'arrow',icon:'➡️'},
  rect:{dt:'rect',icon:'⬜'},
  circle:{dt:'circle',icon:'⭕'},
  triangle:{dt:'triangle',icon:'△'},
  pentagon:{dt:'pentagon',icon:'⬠'},
  hexagon:{dt:'hexagon',icon:'⬡'},
  roundrect:{dt:'roundrect',icon:'▢'},
  diamond:{dt:'diamond',icon:'◇'},
  star:{dt:'star',icon:'★'},
  righttri:{dt:'righttri',icon:'⊿'},
  text:{dt:'text',icon:'T'},
  select:{dt:'select',icon:'👆'},
  eraser:{dt:'eraser',icon:'🧹'},
  pan:{dt:'pan',icon:'🤚'},
  undo:{id:'wbUndo',icon:'↩️',act:true},
  clear:{id:'wbClear',icon:'🗑️',act:true},
  zoom:{id:'wbZoomBtn',icon:'🔍',act:true},
  export:{id:'wbExport',icon:'⬇️',act:true},
  save:{id:'wbSave',icon:'💾',act:true},
  load:{id:'wbLoad',icon:'📂',act:true}
};

var DEFAULT_GROUPS=[
  {id:'g1',name:'Annotate',icon:'✏️',mode:'inline',btns:['pen','magic','marker','eraser','select','pan']},
  {id:'g2',name:'Shapes',  icon:'📐',mode:'flyout',btns:['arrow','rect','circle','triangle','pentagon','hexagon','roundrect','diamond','star','righttri']},
  {id:'g3',name:'More',    icon:'➕',mode:'flyout',btns:['text']},
  {id:'g4',name:'Style',   icon:'🎨',mode:'inline',btns:['colors','slider','bg']},
  {id:'g5',name:'Actions', icon:'⚡',mode:'inline',btns:['undo','clear','zoom']},
  {id:'g6',name:'File',    icon:'💾',mode:'flyout',btns:['save','load']}
];
var GROUPS=DEFAULT_GROUPS;

function renderBar(){
  var scrollEl=document.getElementById('wbScroll');
  var barEl=document.getElementById('wbBar');
  if(!scrollEl||!barEl)return;
  scrollEl.innerHTML='';
  barEl.querySelectorAll('.flyout-bar').forEach(function(f){f.remove();});

  GROUPS.forEach(function(grp,gi){
    if(gi>0){var sp=document.createElement('div');sp.className='wbSep';scrollEl.appendChild(sp);}

    if(grp.mode==='flyout'){
      var trig=document.createElement('button');
      trig.className='wbt';trig.title=grp.name;
      trig.style.position='relative';
      trig.innerHTML=(grp.icon||'📦')+'<span class="wbChev" style="position:absolute;bottom:1px;right:1px;width:4px;height:4px;border-right:1.5px solid #94a3b8;border-bottom:1.5px solid #94a3b8;transform:rotate(45deg);display:block;"></span>';

      var fly=document.createElement('div');
      fly.className='flyout flyout-bar';
      buildBtns(grp.btns,fly);

      trig.addEventListener('click',function(e){
        e.stopPropagation();
        var isOpen=fly.classList.contains('flyOpen');
        barEl.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});
        if(!isOpen){
          var tr=trig.getBoundingClientRect();
          var br=barEl.getBoundingClientRect();
          fly.style.left=(tr.left-br.left+tr.width/2)+'px';
          fly.style.bottom='calc(100% + 8px)';
          fly.style.transform='translateX(-50%)';
          fly.classList.add('flyOpen');
        }
      });

      scrollEl.appendChild(trig);
      barEl.appendChild(fly);
    } else {
      var wrap=document.createElement('div');
      wrap.style.cssText='display:flex;align-items:center;gap:3px;flex-shrink:0;';
      buildBtns(grp.btns,wrap);
      scrollEl.appendChild(wrap);
    }
  });
  if(!window._wbDocClose){
    window._wbDocClose=function(){barEl.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});};
    document.addEventListener('click',window._wbDocClose);
  }
  reattach();
  scrollEl.addEventListener('scroll',function(){barEl.querySelectorAll('.flyout-bar.flyOpen').forEach(function(f){f.classList.remove('flyOpen');});});
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
      var wrap=document.createElement('div');
      wrap.className='wbThickWrap';wrap.style.cssText='display:flex;align-items:center;gap:4px;';
      var dec=document.createElement('button');dec.className='wbThickBtn';dec.textContent='−';dec.title='Decrease';
      dec.addEventListener('click',function(){state.lw=Math.max(1,state.lw-1);updateThick();});
      var val=document.createElement('span');val.className='wbThickVal';val.id='wbThickVal';val.textContent=state.lw+'px';val.title='Click to type';
      val.addEventListener('click',function(){openNumpad(val);});
      var inc=document.createElement('button');inc.className='wbThickBtn';inc.textContent='+';inc.title='Increase';
      inc.addEventListener('click',function(){state.lw=state.lw+1;updateThick();});
      wrap.appendChild(dec);wrap.appendChild(val);wrap.appendChild(inc);
      container.appendChild(wrap);
      return;
    }
    if(key==='bg'){
      var lbl=document.createElement('span');lbl.className='bgLbl';lbl.textContent='BG:';
      container.appendChild(lbl);
      var bgDiv=document.createElement('div');bgDiv.className='wbBG';
      [['#9ca3af','ধূসর'],['#ffffff','সাদা'],['#1e293b','ডার্ক',true],['#fef9c3','হলুদ'],['#f0fdf4','সবুজ']].forEach(function(bg){
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
      zmOut.addEventListener('click',function(){var vp=WB.getViewport();WB.setViewport({x:vp.x,y:vp.y,scale:Math.max(0.25,vp.scale-0.25)});updateZoomDisplay();});
      var zmIn=document.createElement('button');zmIn.className='wbZoomBtn';zmIn.textContent='+';
      zmIn.addEventListener('click',function(){var vp=WB.getViewport();WB.setViewport({x:vp.x,y:vp.y,scale:Math.min(5,vp.scale+0.25)});updateZoomDisplay();});
      var zmVal=document.createElement('span');zmVal.className='wbZoomVal';zmVal.id='wbZoomVal';zmVal.textContent='100%';
      var zmSl=document.createElement('input');zmSl.type='range';zmSl.className='wbZoomSlider';zmSl.id='wbZoomSlider';
      zmSl.min=25;zmSl.max=500;zmSl.value=100;
      zmSl.addEventListener('input',function(){var vp=WB.getViewport();WB.setViewport({x:vp.x,y:vp.y,scale:+zmSl.value/100});updateZoomDisplay();});
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
        document.querySelectorAll('#wbBar .wbt, #wbScroll .wbt, .flyout-bar .wbt').forEach(function(b){b.classList.remove('wbActive');});
        btn.classList.add('wbActive');state.tool=d.dt;
        canvas.style.cursor=d.dt==='pan'?'grab':d.dt==='select'?'default':'crosshair';
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
  if(clearEl)clearEl.addEventListener('click',function(){AN_confirm('এই পেজ মুছে ফেলবো?',function(){
    if(pages.length<=1){WB.clear();savePage();}
    else{pages.splice(pageIdx,1);if(pageIdx>=pages.length)pageIdx=pages.length-1;loadPage();savePage();}
  });});
  var zoomBtn=document.getElementById('wbZoomBtn');
  if(zoomBtn)zoomBtn.addEventListener('click',function(){toggleZoom();});
  var saveBtn=document.getElementById('wbSave');
  if(saveBtn)saveBtn.addEventListener('click',function(){saveToFile();});
  var loadBtn=document.getElementById('wbLoad');
  if(loadBtn)loadBtn.addEventListener('click',function(){loadFromFile();});
  var exportBtn=document.getElementById('wbExport');
  if(exportBtn)exportBtn.addEventListener('click',function(){openExport();});
}
function updateZoomDisplay(){
  var vp=WB.getViewport();
  var el=document.getElementById('wbZoomVal');
  if(el)el.textContent=Math.round(vp.scale*100)+'%';
  var sl=document.getElementById('wbZoomSlider');
  if(sl)sl.value=Math.round(vp.scale*100);
}
function updateThick(){
  var val=document.getElementById('wbThickVal');
  if(val)val.textContent=state.lw+'px';
}
function updateBgActive(){
  document.querySelectorAll('.bgClr').forEach(function(b){b.classList.remove('bgActive');});
  document.querySelectorAll('.bgClr[data-bg="'+state.bg+'"]').forEach(function(b){b.classList.add('bgActive');});
}
function openNumpad(targetEl){
  var modal=document.getElementById('wbNumpadModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='wbNumpadModal';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);';
    modal.innerHTML='<div style="background:#1e293b;border-radius:16px;padding:20px;box-shadow:0 24px 64px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);width:min(280px,90vw);">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'+
        '<span style="font-size:14px;font-weight:800;color:#e2e8f0;">Thickness (px)</span>'+
        '<button id="wbNumpadClose" style="background:rgba(255,255,255,.08);border:none;color:#94a3b8;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>'+
      '</div>'+
      '<input id="wbNumpadInput" type="text" style="width:100%;padding:12px;font-size:18px;font-weight:700;text-align:center;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0f172a;color:#e2e8f0;outline:none;" maxlength="4" />'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;">'+
        ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(function(k){
          var isAction=k==='⌫'||k==='✓';
          return '<button class="wbNumpadKey" data-key="'+k+'" style="padding:14px 0;font-size:18px;font-weight:700;border:none;border-radius:10px;cursor:pointer;background:'+(isAction?'rgba(59,130,246,.15)':'rgba(255,255,255,.04)')+';color:'+(isAction?'#3b82f6':'#e2e8f0')+';transition:background .12s,transform .1s;">'+k+'</button>';
        }).join('')+
      '</div>'+
    '</div>';
    document.body.appendChild(modal);
    var input=document.getElementById('wbNumpadInput');
    modal.querySelectorAll('.wbNumpadKey').forEach(function(btn){
      btn.addEventListener('click',function(){
        var k=btn.dataset.key;
        if(k==='⌫'){input.value=input.value.slice(0,-1);}
        else if(k==='✓'){var v=parseInt(input.value)||1;state.lw=Math.max(1,v);updateThick();closeNumpad();}
        else if(input.value.length<4){input.value+=k;}
      });
    });
    document.getElementById('wbNumpadClose').addEventListener('click',closeNumpad);
    modal.addEventListener('click',function(e){if(e.target===modal)closeNumpad();});
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){var v=parseInt(input.value)||1;state.lw=Math.max(1,v);updateThick();closeNumpad();}});
  }
  var input=document.getElementById('wbNumpadInput');
  input.value=state.lw;
  modal.style.display='flex';
  input.focus();input.select();
  window._wbNumpadTarget=targetEl;
}
function closeNumpad(){
  var modal=document.getElementById('wbNumpadModal');
  if(modal)modal.style.display='none';
}
var _zoomVis=false;
function toggleZoom(){
  var el=document.getElementById('wbZoomBlock');
  if(!el)return;
  _zoomVis=!_zoomVis;
  el.style.display=_zoomVis?'flex':'none';
  if(_zoomVis)updateZoomDisplay();
}

function openWBText(e){
  var s=e.touches?e.touches[0]:e,r=canvas.getBoundingClientRect();
  _wbTextPos={x:s.clientX-r.left,y:s.clientY-r.top};
  var pop=document.getElementById('AN_wbTextpop');
  pop.style.left=Math.min(s.clientX+12,window.innerWidth-260)+'px';
  pop.style.top=Math.min(s.clientY-10,window.innerHeight-150)+'px';
  pop.classList.add('AN_show');
  document.getElementById('AN_wbTinput').focus();
}

var pinchDist=0, pinchCenter={x:0,y:0}, pinchStartScale=1;
canvas.addEventListener('mousedown',function(e){e.preventDefault();if(state.tool==='text'){openWBText(e);return;}WB.onDown(state.tool,state.color,state.lw,e);},{passive:false});
canvas.addEventListener('mousemove',function(e){e.preventDefault();WB.onMove(state.tool,state.lw,e);},{passive:false});
canvas.addEventListener('mouseup',function(){WB.onUp(state.tool);});
canvas.addEventListener('mouseleave',function(){WB.onUp(state.tool);});
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    var t1=e.touches[0], t2=e.touches[1];
    pinchCenter={x:(t1.clientX+t2.clientX)/2, y:(t1.clientY+t2.clientY)/2};
    var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
    pinchDist=Math.sqrt(dx*dx+dy*dy);
    pinchStartScale=WB.getViewport().scale;
    return;
  }
  if(state.tool==='text'){openWBText(e);return;}
  WB.onDown(state.tool,state.color,state.lw,e);
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    var t1=e.touches[0], t2=e.touches[1];
    var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(pinchDist>0){
      var newScale=Math.max(0.25,Math.min(5,pinchStartScale*(dist/pinchDist)));
      WB.zoomAtPoint(pinchCenter.x,pinchCenter.y,newScale);
      updateZoomDisplay();
    }
    pinchDist=dist;return;
  }
  WB.onMove(state.tool,state.lw,e);
},{passive:false});
canvas.addEventListener('touchend',function(e){
  if(e.touches.length<2) pinchDist=0;
  WB.onUp(state.tool);
});

document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){WB.undo();e.preventDefault();}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){saveToFile();e.preventDefault();}
  if((e.ctrlKey||e.metaKey)&&e.key==='o'){loadFromFile();e.preventDefault();}
});
window.addEventListener('resize',function(){fit();});
window.addEventListener('beforeunload',function(){saveLocal();});

/* ── Page sidebar ── */
document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('wbPgNew').addEventListener('click',function(){
    savePage();pages.push([]);pageIdx=pages.length-1;loadPage();
  });
  document.getElementById('wbPgPrev').addEventListener('click',function(){
    if(pageIdx>0){savePage();pageIdx--;loadPage();}
  });
  document.getElementById('wbPgNext').addEventListener('click',function(){
    if(pageIdx<pages.length-1){savePage();pageIdx++;loadPage();}
  });
  document.getElementById('wbPgDel').addEventListener('click',function(){
    AN_confirm('সব বোর্ড মুছে ফেলবো?',function(){WB.clear();pages=[[]];pageIdx=0;loadPage();savePage();});
  });
  document.getElementById('wbPgThumb').addEventListener('click',function(){
    savePage();buildThumbModal();document.getElementById('wbPgModal').classList.add('wbShow');
  });
  document.getElementById('wbPgModalClose').addEventListener('click',function(){document.getElementById('wbPgModal').classList.remove('wbShow');});
  document.getElementById('wbPgModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('wbShow');});
  document.getElementById('wbPgSideMin').addEventListener('click',function(){
    document.getElementById('wbPgSide').classList.add('wbPgHidden');
    document.getElementById('wbPgSideTab').classList.add('wbSideHidden');
    setTimeout(fit,50);
  });
  document.getElementById('wbPgSideTab').addEventListener('click',function(){
    document.getElementById('wbPgSide').classList.remove('wbPgHidden');
    this.classList.remove('wbSideHidden');
    setTimeout(fit,50);
  });
  document.getElementById('wbPgExport').addEventListener('click',function(){openExport();});
});

function buildThumbModal(){
  var grid=document.getElementById('wbPgThumbs');grid.innerHTML='';
  pages.forEach(function(pg,i){
    var div=document.createElement('div');div.className='wbPgThumb'+(i===pageIdx?' wbPgCur':'');
    var c=document.createElement('canvas');c.width=280;c.height=200;
    var tctx=c.getContext('2d');
    tctx.fillStyle=state.bg;tctx.fillRect(0,0,280,200);
    var tmpCv=document.createElement('canvas');tmpCv.width=canvas.width;tmpCv.height=canvas.height;
    var tmpCtx=tmpCv.getContext('2d');
    var savedStrokes=WB.getStrokes(),savedIdx=pageIdx;
    WB.setStrokes(pg);WB.redraw();
    tmpCtx.drawImage(canvas,0,0);
    tctx.drawImage(tmpCv,0,0,280,200);
    WB.setStrokes(savedStrokes);WB.redraw();
    var sp=document.createElement('span');sp.textContent='পেজ '+(i+1);
    div.appendChild(c);div.appendChild(sp);
    div.addEventListener('click',function(){
      pageIdx=i;loadPage();
      document.getElementById('wbPgModal').classList.remove('wbShow');
    });
    grid.appendChild(div);
  });
}

/* ── Export modal ── */
function openExport(){
  document.getElementById('wbExpSelArea').style.display='none';
  document.getElementById('wbExpProg').style.display='none';
  document.getElementById('wbExpModal').classList.add('wbShow');
}
document.getElementById('wbExpClose').addEventListener('click',function(){document.getElementById('wbExpModal').classList.remove('wbShow');});
document.getElementById('wbExpModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('wbShow');});
document.getElementById('wbExpPng').addEventListener('click',function(){exportWB([pageIdx]);});
document.getElementById('wbExpAll').addEventListener('click',function(){exportWB(pages.map(function(_,i){return i;}));});
document.getElementById('wbExpSel').addEventListener('click',function(){
  var area=document.getElementById('wbExpSelArea');
  area.style.display='block';
  var grid=document.getElementById('wbExpSelGrid');grid.innerHTML='';
  pages.forEach(function(pg,i){
    var div=document.createElement('div');div.className='wbExpSelTh wbSelChk';
    var c=document.createElement('canvas');c.width=140;c.height=100;
    var tctx=c.getContext('2d');tctx.fillStyle=state.bg;tctx.fillRect(0,0,140,100);
    var sp=document.createElement('span');sp.textContent='পেজ '+(i+1);
    div.appendChild(c);div.appendChild(sp);
    div.dataset.idx=i;
    div.addEventListener('click',function(){this.classList.toggle('wbSelChk');});
    grid.appendChild(div);
  });
});
document.getElementById('wbExpSelA').addEventListener('click',function(){document.querySelectorAll('.wbExpSelTh').forEach(function(d){d.classList.add('wbSelChk');});});
document.getElementById('wbExpSelN').addEventListener('click',function(){document.querySelectorAll('.wbExpSelTh').forEach(function(d){d.classList.remove('wbSelChk');});});
document.getElementById('wbExpSelGo').addEventListener('click',function(){
  var sel=[];
  document.querySelectorAll('.wbExpSelTh.wbSelChk').forEach(function(d){sel.push(+d.dataset.idx);});
  if(sel.length)exportWB(sel);
});

renderBar();
fit();
loadLocal();
try{chrome.storage.local.get(['WB_IND_groups'],function(r){
  if(r.WB_IND_groups){GROUPS=JSON.parse(r.WB_IND_groups);renderBar();}
});}catch(e){};
})();
