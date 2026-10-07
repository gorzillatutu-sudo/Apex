function ACC(){return getComputedStyle(document.documentElement).getPropertyValue("--accent-c1").trim()||"#3aa4ff"}
/* Apex Flow - (1) Remove Background for video / photo layers  (2) After Effects style PEN TOOL with a glass trackpad
   BG  : A.BG.open() / A.BG.draw(c,el,l,sz,mode)   - layer.bgr = {on,c,t,s,e}  (key colour, tolerance, softness, edge choke)
   PEN : A.PEN.open(tool) / A.PEN.draw(c,l,k)      - layer.pn  = [{v:[{x,y,ix,iy,ox,oy}],z,c,w,f,fo,fe}]  (bezier paths on a Vector layer)  */
(function(){
"use strict";
var A=window.AX,S=A.S,E=A.E,X=A.X,HX=window.HX||{tick:function(){},snap:function(){},hold:function(){}};
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var tools=$("#tools"),canvasEl=$("#canvas"),ed=$("#editor"),app=$("#app");
function rem(){return parseFloat(getComputedStyle(document.documentElement).fontSize)||4.4}
function selL(){var id=E.sel();if(id==null||!E.M())return null;return E.find(id)||null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rgba(h,o){var r=h2r(h);return "rgba("+r[0]+","+r[1]+","+r[2]+","+clamp((o==null?100:o)/100,0,1)+")"}
function h2r(h){h=String(h||"#000000").replace("#","");if(h.length===3)h=h.replace(/./g,"$&$&");var n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]}
function r2h(r,g,b){return "#"+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}

/* =====================================================================
   1) REMOVE BACKGROUND
   Key colour is taken from the frame border (Auto) or from a tapped pixel (Pick). Distance is measured in chroma (Cb/Cr) plus a little
   luma, so shadows on the background are still removed. Tolerance = how far from the key colour is still "background",
   Softness = width of the soft edge, Edge = shrinks the cut-out (choke). Edge pixels get the background colour subtracted (no halo).
   ===================================================================== */
var BG=A.BG={raw:0},ST={};
BG.sample=function(el){
 var sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight;if(!sw||!sh)return null;
 var W=96,H=Math.max(8,Math.round(W*sh/sw)),cv=document.createElement("canvas");cv.width=W;cv.height=H;
 var g=cv.getContext("2d",{willReadFrequently:true}),d;
 try{g.drawImage(el,0,0,W,H);d=g.getImageData(0,0,W,H).data}catch(e){return null}
 var bw=Math.max(2,Math.round(W*.06)),bh=Math.max(2,Math.round(H*.06)),bins={},best=null,bn=0,px,py,i,k,b;
 for(py=0;py<H;py++)for(px=0;px<W;px++){
  if(!(px<bw||px>=W-bw||py<bh||py>=H-bh))continue;
  i=(py*W+px)*4;k=((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4);
  b=bins[k]||(bins[k]={n:0,r:0,g:0,b:0});b.n++;b.r+=d[i];b.g+=d[i+1];b.b+=d[i+2];
  if(b.n>bn){bn=b.n;best=b}}
 return best?r2h(Math.round(best.r/best.n),Math.round(best.g/best.n),Math.round(best.b/best.n)):null};
function erode(a,w,h,tmp){
 var x,y,i,v;
 for(y=0;y<h;y++){var r=y*w;for(x=0;x<w;x++){i=r+x;v=a[i];if(x>0&&a[i-1]<v)v=a[i-1];if(x<w-1&&a[i+1]<v)v=a[i+1];tmp[i]=v}}
 for(y=0;y<h;y++){var r2=y*w;for(x=0;x<w;x++){i=r2+x;v=tmp[i];if(y>0&&tmp[i-w]<v)v=tmp[i-w];if(y<h-1&&tmp[i+w]<v)v=tmp[i+w];a[i]=v}}}
/* called by media.js instead of drawImage; returns true when it drew the layer */
BG.draw=function(c,el,l,sz,mode){
 var b=l.bgr;if(!b||!b.on||(BG.raw&&BG.raw===l.i))return false;
 var sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight;if(!sw||!sh)return false;
 var cap=mode==="export"?1280:640,f=Math.min(1,cap/Math.max(sw,sh)),w=Math.max(2,Math.round(sw*f)),h=Math.max(2,Math.round(sh*f));
 var st=ST[l.i]||(ST[l.i]={cv:document.createElement("canvas"),key:""});
 var key=(l.mid||"")+"|"+(el.currentTime||0).toFixed(3)+"|"+b.c+"|"+b.t+"|"+b.s+"|"+(b.e||0)+"|"+w+"x"+h;
 if(st.key!==key||st.cv.width!==w||st.cv.height!==h){
  if(st.cv.width!==w||st.cv.height!==h){st.cv.width=w;st.cv.height=h;st.g=null}
  var g=st.g||(st.g=st.cv.getContext("2d",{willReadFrequently:true})),id;
  g.clearRect(0,0,w,h);
  try{g.drawImage(el,0,0,w,h);id=g.getImageData(0,0,w,h)}catch(e){return false}
  var d=id.data,n=w*h,bc=h2r(b.c),by=.299*bc[0]+.587*bc[1]+.114*bc[2],bcb=(bc[2]-by)*.564,bcr=(bc[0]-by)*.713;
  var t0=(+b.t||0)*1.25,inv=1/(2+(+b.s||0)*1.1);
  var al=(st.al&&st.al.length===n)?st.al:(st.al=new Uint8Array(n)),i,p,r,gg,bl,y,dcb,dcr,dy,a;
  for(i=0,p=0;i<n;i++,p+=4){
   r=d[p];gg=d[p+1];bl=d[p+2];y=.299*r+.587*gg+.114*bl;dcb=(bl-y)*.564-bcb;dcr=(r-y)*.713-bcr;dy=y-by;
   a=(Math.sqrt(dcb*dcb+dcr*dcr+dy*dy*.1)-t0)*inv;a=a<0?0:a>1?1:a;al[i]=(a*a*(3-2*a))*255}
  var ch=Math.round(+b.e||0);if(ch>0){var tmp=(st.tmp&&st.tmp.length===n)?st.tmp:(st.tmp=new Uint8Array(n));for(i=0;i<ch;i++)erode(al,w,h,tmp)}
  for(i=0,p=0;i<n;i++,p+=4){
   a=al[i]/255;
   if(a<=0){d[p+3]=0;continue}
   if(a<1){var ia=1-a;r=(d[p]-bc[0]*ia)/a;gg=(d[p+1]-bc[1]*ia)/a;bl=(d[p+2]-bc[2]*ia)/a;
    d[p]=r<0?0:r>255?255:r;d[p+1]=gg<0?0:gg>255?255:gg;d[p+2]=bl<0?0:bl>255?255:bl}
   d[p+3]=al[i]}
  g.putImageData(id,0,0);st.key=key}
 c.drawImage(st.cv,-sz[0]/2,-sz[1]/2,sz[0],sz[1]);return true};

/* ---- background panel ---- */
var bp=document.createElement("div");bp.className="glass mp sp bgp";bp.id="bgp";bp.setAttribute("aria-hidden","true");
var SLD=[["t","Tolerance",0,100],["s","Softness",0,100],["e","Edge",0,3]];
bp.innerHTML='<div class="mp-h"><b class="mp-title" style="display:block">Remove Background</b><button class="pp-k" id="bgX" type="button" aria-label="Done"><svg><use href="#i-check"/></svg></button></div>'+
 '<div class="bg-top"><button type="button" class="bg-b bg-on" id="bgOn"><i></i><span>Remove</span></button><button type="button" class="bg-b" id="bgAuto">Auto</button><button type="button" class="bg-b" id="bgPick">Pick</button><span class="bg-sw" id="bgSw"></span></div>'+
 SLD.map(function(s){return '<div class="bg-r"><span class="bg-l">'+s[1]+'</span><div class="sl uni bgs" data-k="'+s[0]+'" style="--f:0;--thw:9rem"><i class="sl-fill"></i><b class="sl-th"></b></div><span class="bg-v" data-v="'+s[0]+'"></span></div>'}).join("");
ed.appendChild(bp);
var bid=null;
function bl(){var l=bid!=null?E.find(bid):null;return l&&l.bgr?l:null}
function bgPaint(){
 var l=bl();if(!l)return;var b=l.bgr;
 $("#bgOn").classList.toggle("on",!!b.on);$("#bgSw").style.background=b.c;bp.classList.toggle("off",!b.on);
 SLD.forEach(function(s){var v=+b[s[0]]||0,sl=$('.bgs[data-k="'+s[0]+'"]',bp);sl.style.setProperty("--f",clamp((v-s[2])/(s[3]-s[2]),0,1));$('[data-v="'+s[0]+'"]',bp).textContent=Math.round(v)})}
function bgOpen(l){
 if(!l||(l.k!=="vid"&&l.k!=="img"))return;
 if(!l.bgr){E.push();var el=A.MD&&A.MD.el&&A.MD.el(l),c=el&&BG.sample(el)||"#00ff00";l.bgr={on:true,c:c,t:32,s:35,e:0};E.save();E.render();A.redraw();A.toast("Background removed - adjust Tolerance")}
 bid=l.i;bgPaint();bp.classList.add("on");bp.setAttribute("aria-hidden","false");tools.classList.add("mv")}
BG.open=function(){bgOpen(selL())};
BG.close=function(){
 if(!bp.classList.contains("on")&&!BG.raw)return;
 endPick();bp.classList.remove("on");bp.setAttribute("aria-hidden","true");if(!(PEN&&PEN.isOn()))tools.classList.remove("mv");bid=null};
BG.sync=function(){if(!bp.classList.contains("on"))return;var l=selL();if(!l||l.i!==bid||!l.bgr)BG.close();else bgPaint()};
$("#bgX").onclick=function(){BG.close()};
$("#bgOn").onclick=function(){var l=bl();if(!l)return;E.push();l.bgr.on=!l.bgr.on;E.save();E.render();bgPaint();A.redraw()};
$("#bgAuto").onclick=function(){var l=bl();if(!l)return;var el=A.MD&&A.MD.el&&A.MD.el(l),c=el&&BG.sample(el);
 if(!c){A.toast("Frame not ready");return}E.push();l.bgr.c=c;l.bgr.on=true;E.save();E.render();bgPaint();A.redraw()};
/* Pick: the layer is shown untouched, tap the background on the preview */
var picking=false;
function endPick(){if(!picking&&!BG.raw)return;picking=false;BG.raw=0;canvasEl.classList.remove("picking");bp.classList.remove("pick");$("#bgPick").classList.remove("on");A.redraw()}
function pickHit(e){
 e.stopPropagation();e.stopImmediatePropagation();e.preventDefault();
 if(e.type!=="pointerdown")return;
 var l=bl(),cv=$("#cv");if(!l||!cv){endPick();return}
 var r=cv.getBoundingClientRect(),px=Math.round((e.clientX-r.left)/r.width*cv.width),py=Math.round((e.clientY-r.top)/r.height*cv.height),d;
 try{d=cv.getContext("2d").getImageData(clamp(px-2,0,cv.width-5),clamp(py-2,0,cv.height-5),5,5).data}catch(x){endPick();return}
 var R=0,G=0,B=0,n=d.length/4,i;for(i=0;i<d.length;i+=4){R+=d[i];G+=d[i+1];B+=d[i+2]}
 E.push();l.bgr.c=r2h(Math.round(R/n),Math.round(G/n),Math.round(B/n));l.bgr.on=true;E.save();E.render();bgPaint();endPick()}
["pointerdown","pointerup","click","touchstart","touchend","mousedown","mouseup"].forEach(function(n){canvasEl.addEventListener(n,function(e){if(picking)pickHit(e)},true)});
$("#bgPick").onclick=function(){
 var l=bl();if(!l)return;if(picking){endPick();return}
 picking=true;BG.raw=l.i;canvasEl.classList.add("picking");$("#bgPick").classList.add("on");A.redraw();A.toast("Tap the background colour on the preview")};
/* sliders (same look as the other panels) */
$$(".bgs",bp).forEach(function(sl){
 var k=sl.dataset.k,def=SLD.filter(function(s){return s[0]===k})[0];
 sl.addEventListener("pointerdown",function(e){
  var l=bl();if(!l)return;e.preventDefault();sl.setPointerCapture(e.pointerId);sl.classList.add("drag");E.push();document.body.classList.add("sliding");
  var R=sl.getBoundingClientRect(),pad=4.5*rem(),hx=HX.slider?HX.slider():{move:function(){}},raf=0,px=e.clientX;
  function ap(cx){var f=clamp((cx-R.left-pad)/Math.max(1,R.width-2*pad),0,1),v=def[2]+(def[3]-def[2])*f;
   l.bgr[k]=k==="e"?Math.round(v):Math.round(v);hx.move(f,false,false);bgPaint();A.redraw()}
  function mv(ev){px=ev.clientX;if(!raf)raf=requestAnimationFrame(function(){raf=0;ap(px)})}
  function up(){if(raf){cancelAnimationFrame(raf);raf=0;ap(px)}document.body.classList.remove("sliding");sl.removeEventListener("pointermove",mv);sl.removeEventListener("pointerup",up);sl.removeEventListener("pointercancel",up);sl.classList.remove("drag");E.save();E.render()}
  sl.addEventListener("pointermove",mv);sl.addEventListener("pointerup",up);sl.addEventListener("pointercancel",up);ap(e.clientX)})});

/* =====================================================================
   2) PEN TOOL  (hold the Vector button  ->  Pen / Add Vertex / Delete Vertex / Convert Vertex / Mask Feather)
   A glass trackpad moves a cursor over the preview:  slide = move,  tap = click,  press-and-hold then slide = drag (pull bezier handles / move a vertex),
   or hold the round Click button with one finger and slide on the pad with another.
   ===================================================================== */
var PEN=A.PEN={};
var P={on:false,tool:"pen",lid:null,cur:-1,sel:null,cx:0,cy:0,col:"#ffffff",w:6,fill:false,act:null,btn:false,mp:null,mi:null,mlid:null};
var TN={pen:"Pen Tool",add:"Add Vertex Tool",del:"Delete Vertex Tool",conv:"Convert Vertex Tool",feather:"Mask Feather Tool"},
    TI={pen:"i-pen",add:"i-penadd",del:"i-pendel",conv:"i-penconv",feather:"i-penfeather"},TK={pen:"G",feather:"G"},
    PC=["#ffffff","#ff453a","#ff9f0a","#ffd60a","#30d158","#0a84ff","#bf5af2"],PW=[2,6,14,28],HR=22;
PEN.isOn=function(){return P.on};

/* ---- path <-> svg path data (also used by the renderer) ---- */
function seg(a,b){return (a.ox||a.oy||b.ix||b.iy)?"C"+(a.x+(a.ox||0))+" "+(a.y+(a.oy||0))+" "+(b.x+(b.ix||0))+" "+(b.y+(b.iy||0))+" "+b.x+" "+b.y:"L"+b.x+" "+b.y}
function penD(pa){
 var v=pa.v,i,d;if(!v||!v.length)return "";
 d="M"+v[0].x+" "+v[0].y;if(v.length===1)return d+"l.01 0";
 for(i=1;i<v.length;i++)d+=seg(v[i-1],v[i]);
 if(pa.z&&v.length>2)d+=seg(v[v.length-1],v[0])+"Z";
 return d}
function bz(a,b,t){
 var u=1-t,x1=a.x+(a.ox||0),y1=a.y+(a.oy||0),x2=b.x+(b.ix||0),y2=b.y+(b.iy||0);
 return [u*u*u*a.x+3*u*u*t*x1+3*u*t*t*x2+t*t*t*b.x,u*u*u*a.y+3*u*u*t*y1+3*u*t*t*y2+t*t*t*b.y]}

/* ---- renderer (called from media.js, local coordinates are layer px, already scaled by k) ---- */
PEN.draw=function(c,l,k){
 var ps=l.pn;if(!ps||!ps.length)return;
 ps.forEach(function(pa){
  var d=penD(pa);if(!d)return;var P2=new Path2D(d),fe=+pa.fe||0,doFill=!!(pa.f&&pa.v.length>=3),doStroke=pa.w>0&&pa.c&&pa.v.length>0;
  c.save();c.lineCap="round";c.lineJoin="round";
  var T=c.getTransform(),sc=Math.hypot(T.a,T.b)||1,BIG=8000,ga=c.globalAlpha;
  function feathered(col,o,fn){
   c.save();c.setTransform(T.a,T.b,T.c,T.d,T.e-BIG,T.f);c.shadowOffsetX=BIG;c.shadowOffsetY=0;c.shadowBlur=fe*sc*1.6;c.shadowColor=rgba(col,o);fn();c.restore()}
  if(doFill){var fo=pa.fo==null?55:pa.fo;
   if(fe>.2)feathered(pa.f,fo,function(){c.fillStyle=pa.f;c.globalAlpha=ga;c.fill(P2)});
   else{c.globalAlpha=ga*clamp(fo/100,0,1);c.fillStyle=pa.f;c.fill(P2);c.globalAlpha=ga}}
  if(doStroke){
   if(fe>.2)feathered(pa.c,100,function(){c.strokeStyle=pa.c;c.lineWidth=pa.w;c.globalAlpha=ga;c.stroke(P2)});
   else{c.strokeStyle=pa.c;c.lineWidth=pa.w;c.stroke(P2)}}
  c.restore()})};

/* ---- layer <-> screen mapping (the layer's own position / scale / rotation / parents at the playhead) ---- */
var M=new DOMMatrix(),MI=new DOMMatrix();
function qv(ll){var p=E.valueAt(ll,"pos",S.t),a=E.valueAt(ll,"anc",S.t),d3=E.is3d(ll),rr=E.valueAt(ll,"rot",S.t),D=Math.PI/180;return {x:p[0],y:p[1],ax:a[0],ay:a[1],s:E.valueAt(ll,"scl",S.t)[0]/100*(d3?(A.MD&&A.MD.zs?A.MD.zs(p[2]):1):1),r:rr[0],rx:d3?rr[1]*D:0,ry:d3?rr[2]*D:0,fx:ll.fh?-1:1,fy:ll.fv?-1:1}}
function rotQ(m,q){if(q.rx||q.ry){var t=E.m3(q.r*Math.PI/180,q.rx,q.ry);m.multiplySelf(new DOMMatrix([t[0],t[1],t[2],t[3],0,0]))}else m.rotateSelf(q.r)}
function refreshM(){
 var cw=canvasEl.clientWidth||1,ch=canvasEl.clientHeight||1,wh=X.canvasWH(),k=ch/wh[1],L=pl(),m=new DOMMatrix();
 function place(ll){var q=qv(ll);m.translateSelf(cw/2+q.x*k,ch/2+q.y*k);m.translateSelf(q.ax*k,q.ay*k);rotQ(m,q);m.scaleSelf(q.s*(q.fx||1),q.s*(q.fy||1));m.translateSelf(-q.ax*k,-q.ay*k)}
 if(L){var chain=[],p=L,n=0;while(p&&p.pr!=null&&n++<8){p=E.find(p.pr);if(p&&p!==L)chain.unshift(p);else break}
  chain.forEach(function(pp){place(pp);m.translateSelf(-cw/2,-ch/2)});place(L)}
 else m.translateSelf(cw/2,ch/2);
 m.scaleSelf(k,k);M=m;try{MI=m.inverse()}catch(e){MI=new DOMMatrix()}
 return k}
function S2(x,y){var p=M.transformPoint({x:x,y:y});return [p.x,p.y]}
function L2(x,y){var p=MI.transformPoint({x:x,y:y});return [+p.x.toFixed(1),+p.y.toFixed(1)]}
function pl(){var l=P.lid!=null?E.find(P.lid):null;return l&&l.k==="vec"?l:null}
function paths(L){return (L&&L.pn)||[]}
function isAct(L){return !L.h&&S.t>=L.s-1e-6&&S.t<=L.s+L.d+1e-6}
function ensureLayer(){
 var L=pl();
 if(L){if(!isAct(L)){A.toast("Move the playhead onto the vector layer");return null}if(!L.pn)L.pn=[];return L}
 L=E.addLayer({k:"vec",d:10,st:[],pn:[]});P.lid=L.i;refreshM();return L}

/* ---- hit testing ---- */
function hitV(L,px,py){
 var best=null,bd=HR;
 paths(L).forEach(function(pa,pi){pa.v.forEach(function(v,vi){var s=S2(v.x,v.y),d=Math.hypot(s[0]-px,s[1]-py);if(d<bd){bd=d;best={pi:pi,vi:vi}}})});
 return best}
function nearSeg(L,px,py){
 var best=null;
 paths(L).forEach(function(pa,pi){
  var n=pa.v.length,cnt=pa.z&&n>2?n:n-1,i,j;
  for(i=0;i<cnt;i++){var a=pa.v[i],b=pa.v[(i+1)%n];
   for(j=0;j<=40;j++){var t=j/40,q=bz(a,b,t),s=S2(q[0],q[1]),d=Math.hypot(s[0]-px,s[1]-py);if(!best||d<best.d)best={pi:pi,i:i,t:t,d:d}}}});
 return best}
function lerp(a,b,t){return a+(b-a)*t}
function splitSeg(pa,i,t){
 var n=pa.v.length,a=pa.v[i],b=pa.v[(i+1)%n],nv;
 var x0=a.x,y0=a.y,x1=a.x+(a.ox||0),y1=a.y+(a.oy||0),x2=b.x+(b.ix||0),y2=b.y+(b.iy||0),x3=b.x,y3=b.y;
 if(!(a.ox||a.oy||b.ix||b.iy)){nv={x:+lerp(x0,x3,t).toFixed(1),y:+lerp(y0,y3,t).toFixed(1),ix:0,iy:0,ox:0,oy:0}}
 else{
  var q0x=lerp(x0,x1,t),q0y=lerp(y0,y1,t),q1x=lerp(x1,x2,t),q1y=lerp(y1,y2,t),q2x=lerp(x2,x3,t),q2y=lerp(y2,y3,t),
   r0x=lerp(q0x,q1x,t),r0y=lerp(q0y,q1y,t),r1x=lerp(q1x,q2x,t),r1y=lerp(q1y,q2y,t),sx=lerp(r0x,r1x,t),sy=lerp(r0y,r1y,t);
  nv={x:+sx.toFixed(1),y:+sy.toFixed(1),ix:+(r0x-sx).toFixed(1),iy:+(r0y-sy).toFixed(1),ox:+(r1x-sx).toFixed(1),oy:+(r1y-sy).toFixed(1)};
  a.ox=+(q0x-x0).toFixed(1);a.oy=+(q0y-y0).toFixed(1);b.ix=+(q2x-x3).toFixed(1);b.iy=+(q2y-y3).toFixed(1)}
 pa.v.splice(i+1,0,nv);return i+1}
function makeSmooth(pa,vi){
 var n=pa.v.length,v=pa.v[vi],pv=(vi>0||pa.z)?pa.v[(vi-1+n)%n]:null,nx=(vi<n-1||pa.z)?pa.v[(vi+1)%n]:null;
 if(!pv&&!nx)return;
 var dx=(nx?nx.x:v.x)-(pv?pv.x:v.x),dy=(nx?nx.y:v.y)-(pv?pv.y:v.y),len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
 var dn=nx?Math.hypot(nx.x-v.x,nx.y-v.y):0,dp=pv?Math.hypot(pv.x-v.x,pv.y-v.y):0;
 if(!nx)dn=dp;if(!pv)dp=dn;
 v.ox=+(ux*dn/3).toFixed(1);v.oy=+(uy*dn/3).toFixed(1);v.ix=+(-ux*dp/3).toFixed(1);v.iy=+(-uy*dp/3).toFixed(1)}
function hasH(v){return !!(v.ix||v.iy||v.ox||v.oy)}
function reverse(pa){pa.v.reverse();pa.v.forEach(function(v){var ix=v.ix,iy=v.iy;v.ix=v.ox;v.iy=v.oy;v.ox=ix;v.oy=iy})}

/* ---- gestures (a "click" = down() then up()) ---- */
function curPath(L){return (L&&P.cur>=0)?paths(L)[P.cur]||null:null}
function pullHandles(v,lp){v.ox=+(lp[0]-v.x).toFixed(1);v.oy=+(lp[1]-v.y).toFixed(1);v.ix=-v.ox;v.iy=-v.oy}
function down(){
 refreshM();
 if(mpOn()){mpDown();return}
 var L=pl(),t=P.tool,lp=L2(P.cx,P.cy),hit=(L&&paths(L).length)?hitV(L,P.cx,P.cy):null,pa;
 P.act=null;
 if(t==="pen"){
  if(L&&!isAct(L)){A.toast("Move the playhead onto the vector layer");return}
  pa=curPath(L);if(pa&&pa.z){pa=null;P.cur=-1}
  if(pa){                                                    /* building a path */
   if(hit&&hit.pi===P.cur&&hit.vi===0&&pa.v.length>=3){E.push();pa.z=true;P.cur=-1;P.sel={pi:hit.pi,vi:0};E.save();A.redraw();HX.snap();ov();return}
   E.push();var v=nv(lp);pa.v.push(v);P.sel={pi:P.cur,vi:pa.v.length-1};P.act={k:"newv",v:v,x0:P.cx,y0:P.cy,ch:true};A.redraw();ov();return}
  if(hit){                                                   /* touching an existing vertex */
   pa=paths(L)[hit.pi];var n=pa.v.length;
   if(!pa.z&&(hit.vi===0||hit.vi===n-1)){E.push();if(hit.vi===0&&n>1)reverse(pa);P.cur=hit.pi;P.sel={pi:hit.pi,vi:pa.v.length-1};P.act={k:"none"};HX.snap();ov();return}
   E.push();var vv=pa.v[hit.vi];P.sel=hit;P.act={k:"move",v:vv,o:{x:vv.x,y:vv.y},l0:lp,ch:true};HX.tick();ov();return}
  var existed=!!L;L=ensureLayer();if(!L)return;if(existed)E.push();
  var v0=nv(L2(P.cx,P.cy));pa={v:[v0],z:false,c:P.col,w:P.w,f:P.fill?P.col:null,fo:55,fe:0};L.pn.push(pa);P.cur=L.pn.length-1;P.sel={pi:P.cur,vi:0};
  P.act={k:"newv",v:v0,x0:P.cx,y0:P.cy,ch:true};A.redraw();ov();return}
 if(!L||!paths(L).length){A.toast("Draw a path with the Pen Tool first");return}
 if(t==="add"){
  var sg=nearSeg(L,P.cx,P.cy);
  if(!sg||sg.d>HR*1.4){A.toast("Tap on the path");return}
  E.push();var ni=splitSeg(paths(L)[sg.pi],sg.i,sg.t);P.sel={pi:sg.pi,vi:ni};P.act={k:"none",ch:true};HX.snap();A.redraw();ov();return}
 if(t==="del"){
  if(!hit){A.toast("Tap a vertex");return}
  E.push();pa=paths(L)[hit.pi];pa.v.splice(hit.vi,1);
  if(!pa.v.length){L.pn.splice(hit.pi,1);P.cur=-1}else if(P.cur===hit.pi&&pa.v.length<1)P.cur=-1;
  if(pa.v.length<3)pa.z=false;
  P.sel=null;P.act={k:"none",ch:true};HX.snap();A.redraw();ov();return}
 if(t==="conv"){
  if(!hit){A.toast("Tap a vertex");return}
  E.push();P.sel=hit;P.act={k:"conv",v:paths(L)[hit.pi].v[hit.vi],pa:paths(L)[hit.pi],vi:hit.vi,x0:P.cx,y0:P.cy,dragged:false,ch:true};HX.tick();ov();return}
 if(t==="feather"){
  var pi=-1,sg2=nearSeg(L,P.cx,P.cy);
  if(sg2&&sg2.d<HR*2.2)pi=sg2.pi;else if(paths(L).length===1)pi=0;
  if(pi<0){A.toast("Drag on a path to feather it");return}
  E.push();pa=paths(L)[pi];P.sel={pi:pi,vi:0};P.act={k:"fe",pi:pi,f0:+pa.fe||0,x0:P.cx,ch:true};HX.tick();ov()}}
function nv(lp){return {x:lp[0],y:lp[1],ix:0,iy:0,ox:0,oy:0}}
function dragMove(){
 if(P.act&&P.act.mp){mpDrag();return}
 var a=P.act;if(!a||a.k==="none")return;var L=pl();if(!L)return;var lp=L2(P.cx,P.cy),k=refreshM();
 if(a.k==="newv"||a.k==="conv"){
  if(!a.dragged&&Math.hypot(P.cx-a.x0,P.cy-a.y0)<6)return;a.dragged=true;pullHandles(a.v,lp)}
 else if(a.k==="move"){a.v.x=+(a.o.x+lp[0]-a.l0[0]).toFixed(1);a.v.y=+(a.o.y+lp[1]-a.l0[1]).toFixed(1)}
 else if(a.k==="fe"){var pa=paths(L)[a.pi];if(!pa)return;pa.fe=clamp(Math.round(a.f0+(P.cx-a.x0)/k*.12),0,60);a.lab=pa.fe}
 A.redraw();ov()}
function up(){
 var a=P.act;P.act=null;if(!a)return;
 if(a.mp){mpUp(a);return}
 var L=pl();
 if(a.k==="conv"&&!a.dragged&&L){if(hasH(a.v)){a.v.ix=a.v.iy=a.v.ox=a.v.oy=0}else makeSmooth(a.pa,a.vi)}
 if(a.ch){E.save();E.render()}
 A.redraw();ov()}
PEN.sync=function(){
 if(!P.on)return;
 mpCheck();var L=pl();
 if(!L||P.cur>=paths(L).length)P.cur=-1;else if(P.cur>=0&&paths(L)[P.cur].z)P.cur=-1;
 if(P.sel&&(!L||!paths(L)[P.sel.pi]||!paths(L)[P.sel.pi].v[P.sel.vi]))P.sel=null;
 refreshM();ov();paintP()};

/* ---- overlay: path outline, vertices, handles, cursor ---- */
var svgNS="http://www.w3.org/2000/svg",shield=document.createElement("div");shield.className="pn-shield";canvasEl.appendChild(shield);
var osv=document.createElementNS(svgNS,"svg");osv.setAttribute("class","pn-ov");canvasEl.appendChild(osv);
function ov(){
 if(!P.on){osv.innerHTML="";return}
 var L=pl(),h="",cw=canvasEl.clientWidth,ch=canvasEl.clientHeight;
 osv.setAttribute("viewBox","0 0 "+cw+" "+ch);
 var MPon=mpOn();
 if(L&&!MPon)paths(L).forEach(function(pa,pi){
  var n=pa.v.length,i,d="";
  if(n>1){var p0=S2(pa.v[0].x,pa.v[0].y);d="M"+p0[0].toFixed(1)+" "+p0[1].toFixed(1);
   var cnt=pa.z&&n>2?n:n-1;
   for(i=0;i<cnt;i++){var a=pa.v[i],b=pa.v[(i+1)%n],s1=S2(a.x+(a.ox||0),a.y+(a.oy||0)),s2=S2(b.x+(b.ix||0),b.y+(b.iy||0)),e=S2(b.x,b.y);
    d+="C"+s1[0].toFixed(1)+" "+s1[1].toFixed(1)+" "+s2[0].toFixed(1)+" "+s2[1].toFixed(1)+" "+e[0].toFixed(1)+" "+e[1].toFixed(1)}
   if(pa.z&&n>2)d+="Z";
   h+='<path d="'+d+'" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="3.6"/><path d="'+d+'" fill="none" stroke="'+ACC()+'" stroke-width="1.7"/>'}
  var sv=P.sel&&P.sel.pi===pi?pa.v[P.sel.vi]:null;
  if(sv){var c0=S2(sv.x,sv.y);[[sv.ix,sv.iy],[sv.ox,sv.oy]].forEach(function(hh){if(!hh[0]&&!hh[1])return;var q=S2(sv.x+hh[0],sv.y+hh[1]);
    h+='<line x1="'+c0[0].toFixed(1)+'" y1="'+c0[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'" stroke="'+ACC()+'" stroke-width="1.5"/><circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4.6" fill="#fff" stroke="'+ACC()+'" stroke-width="1.6"/>'})}
  pa.v.forEach(function(v,vi){var s=S2(v.x,v.y),on=P.sel&&P.sel.pi===pi&&P.sel.vi===vi;
   if(pi===P.cur&&vi===0&&n>=3)h+='<circle cx="'+s[0].toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="13" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>';
   h+='<rect x="'+(s[0]-5).toFixed(1)+'" y="'+(s[1]-5).toFixed(1)+'" width="10" height="10" rx="1.5" fill="'+(on?ACC():"#fff")+'" stroke="'+(on?"#fff":ACC())+'" stroke-width="1.8"/>'})});
 if(MPon)h+=mpSvg(mpL(),true);
 var cx=P.cx,cy=P.cy;
 h+='<g transform="translate('+cx.toFixed(1)+' '+cy.toFixed(1)+')"><circle r="13" fill="rgba(0,0,0,.18)" stroke="#fff" stroke-width="1.8"/><path d="M-19 0H-6M6 0H19M0 -19V-6M0 6V19" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle r="2" fill="#fff"/>'+
  '<g transform="translate(14 14)"><rect x="-3" y="-3" width="32" height="32" rx="10" fill="rgba(20,26,36,.82)" stroke="rgba(255,255,255,.55)"/><svg x="3" y="3" width="22" height="22" viewBox="0 0 24 24" style="color:#fff"><use href="#'+TI[P.tool]+'"/></svg></g>'+
  (P.act&&P.act.k==="fe"?'<text x="18" y="-14" fill="#fff" font-size="15" font-weight="800" stroke="#000" stroke-width="3" paint-order="stroke">Feather '+(P.act.lab!=null?P.act.lab:P.act.f0)+'</text>':'')+'</g>';
 osv.innerHTML=h}


/* =====================================================================
   MOTION PATH (After Effects style)
   A layer with 2+ Position keyframes shows its path on the preview (lime dotted line, square keyframe vertices) whenever it is selected.
   With the pen tool group open (hold the Vector button) the same path becomes editable - the cursor / trackpad works exactly as on a shape:
     Pen Tool           touch a vertex = select + drag to move the keyframe;  drag a handle = bend the curve (the other side follows)
     Add Vertex Tool    tap on the path = add a new Position keyframe there (the shape of the path does not change)
     Delete Vertex Tool tap a vertex = remove that Position keyframe
     Convert Vertex     tap a vertex = smooth <-> corner;  press + drag from a vertex = pull out bezier handles;  drag a handle = move one side only
   The curve is stored on the keyframes (key.to = out tangent, key.ti = in tangent) and used by the preview and the export (editor.js valAt).
   The little button beside the tick in the pen panel switches between "motion path" and "shape path" for a Vector layer that has both.
   ===================================================================== */
var LIME="#b7f23a";
function mpL(){
 var id=E.sel();if(id==null||!E.M())return null;var l=E.find(id);
 return (l&&l.kf&&l.kf.pos&&l.kf.pos.length)?l:null}
function mpOn(){
 if(!P.on)return false;var l=mpL();if(!l||l.kf.pos.length<2)return false;
 if(P.mp===true)return true;if(P.mp===false)return false;
 return !(l.k==="vec"&&paths(l).length)}
function mpCheck(){
 var l=mpL();
 if(!l||l.i!==P.mlid){P.mlid=l?l.i:null;P.mi=null;if(P.act&&P.act.mp)P.act=null;if(!l||l.i!==P.lid)P.mp=null}
 if(P.mi!=null&&(!l||!l.kf.pos[P.mi]))P.mi=null}
function mpGeom(L){
 var cw=canvasEl.clientWidth||1,ch=canvasEl.clientHeight||1,wh=X.canvasWH(),k=ch/wh[1],m=new DOMMatrix(),chain=[],p=L,n=0,mi;
 while(p&&p.pr!=null&&n++<8){p=E.find(p.pr);if(p&&p!==L)chain.unshift(p);else break}
 chain.forEach(function(pp){var q=qv(pp);m.translateSelf(cw/2+q.x*k,ch/2+q.y*k);m.translateSelf(q.ax*k,q.ay*k);rotQ(m,q);m.scaleSelf(q.s,q.s);m.translateSelf(-q.ax*k,-q.ay*k);m.translateSelf(-cw/2,-ch/2)});
 try{mi=m.inverse()}catch(e){mi=new DOMMatrix()}
 var pts=L.kf.pos.map(function(kk,i){var a=E.valueAt(L,"anc",L.s+kk.t);return {k:kk,i:i,x:kk.v[0]+a[0],y:kk.v[1]+a[1],ax:a[0],ay:a[1]}});
 return {m:m,mi:mi,k:k,cw:cw,ch:ch,pts:pts}}
function mpS(G,x,y){var q=G.m.transformPoint({x:G.cw/2+x*G.k,y:G.ch/2+y*G.k});return [q.x,q.y]}
function mpC(G,sx,sy){var q=G.mi.transformPoint({x:sx,y:sy});return [(q.x-G.cw/2)/G.k,(q.y-G.ch/2)/G.k]}
function r1(v){return +v.toFixed(1)}
function hasT(t){return !!(t&&(t[0]||t[1]))}
/* the two handles of keyframe i that are really used (first key has no in-handle, last key no out-handle) */
function mpHandles(G,i){var q=G.pts[i],n=G.pts.length,o=[];
 if(i>0&&hasT(q.k.ti))o.push({nm:"ti",x:q.x+q.k.ti[0],y:q.y+q.k.ti[1]});
 if(i<n-1&&hasT(q.k.to))o.push({nm:"to",x:q.x+q.k.to[0],y:q.y+q.k.to[1]});
 return o}
function mpD(G,i){ /* svg path data of the whole motion path (screen px) */
 var d="",n=G.pts.length,j,a,b,c1,c2,e;
 for(j=0;j<n;j++){a=G.pts[j];
  if(j===0){e=mpS(G,a.x,a.y);d="M"+e[0].toFixed(1)+" "+e[1].toFixed(1);continue}
  b=G.pts[j-1];c1=mpS(G,b.x+((b.k.to&&b.k.to[0])||0),b.y+((b.k.to&&b.k.to[1])||0));c2=mpS(G,a.x+((a.k.ti&&a.k.ti[0])||0),a.y+((a.k.ti&&a.k.ti[1])||0));e=mpS(G,a.x,a.y);
  d+="C"+c1[0].toFixed(1)+" "+c1[1].toFixed(1)+" "+c2[0].toFixed(1)+" "+c2[1].toFixed(1)+" "+e[0].toFixed(1)+" "+e[1].toFixed(1)}
 return d}
/* svg for the overlay; edit = true -> selected vertex + handles are drawn */
function mpSvg(L,edit){
 if(!L)return"";var G=mpGeom(L),d=mpD(G),h="",n=G.pts.length;
 h+='<path d="'+d+'" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="0.1 6.5"/>';
 h+='<path d="'+d+'" fill="none" stroke="'+LIME+'" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 6.5"/>';
 var sel=edit?P.mi:null;
 if(sel!=null&&G.pts[sel]){var q=G.pts[sel],c0=mpS(G,q.x,q.y);
  mpHandles(G,sel).forEach(function(hh){var s=mpS(G,hh.x,hh.y);
   h+='<line x1="'+c0[0].toFixed(1)+'" y1="'+c0[1].toFixed(1)+'" x2="'+s[0].toFixed(1)+'" y2="'+s[1].toFixed(1)+'" stroke="'+LIME+'" stroke-width="1.6"/><circle cx="'+s[0].toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="5" fill="#fff" stroke="'+LIME+'" stroke-width="1.8"/>'})}
 G.pts.forEach(function(q,i){var s=mpS(G,q.x,q.y),on=sel===i;
  h+='<rect x="'+(s[0]-6).toFixed(1)+'" y="'+(s[1]-6).toFixed(1)+'" width="12" height="12" fill="'+(on?LIME:"rgba(0,0,0,.25)")+'" stroke="'+(on?"#fff":LIME)+'" stroke-width="2"/>'});
 /* where the layer is right now */
 var cp=E.valueAt(L,"pos",S.t),ca=E.valueAt(L,"anc",S.t),cs=mpS(G,cp[0]+ca[0],cp[1]+ca[1]);
 h+='<circle cx="'+cs[0].toFixed(1)+'" cy="'+cs[1].toFixed(1)+'" r="4.2" fill="#fff" stroke="'+LIME+'" stroke-width="2"/>';
 return h}
function mpHit(L,G){
 var best=null,bd=HR,s,d;
 if(P.mi!=null&&G.pts[P.mi]){mpHandles(G,P.mi).forEach(function(hh){s=mpS(G,hh.x,hh.y);d=Math.hypot(s[0]-P.cx,s[1]-P.cy);if(d<bd){bd=d;best={i:P.mi,h:hh.nm}}});if(best)return best}
 bd=HR;G.pts.forEach(function(q,i){s=mpS(G,q.x,q.y);d=Math.hypot(s[0]-P.cx,s[1]-P.cy);if(d<bd){bd=d;best={i:i,h:null}}});
 return best}
function bzv(p0,c1,c2,p1,t){var u=1-t;return [u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p1[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p1[1]]}
function mpSeg(G,i){ /* control points (comp px) of the segment i -> i+1 */
 var a=G.pts[i],b=G.pts[i+1],o=a.k.to||[0,0],n=b.k.ti||[0,0];
 return [[a.x,a.y],[a.x+(o[0]||0),a.y+(o[1]||0)],[b.x+(n[0]||0),b.y+(n[1]||0)],[b.x,b.y]]}
function mpNear(L,G){
 var best=null,i,j;
 for(i=0;i<G.pts.length-1;i++){var c=mpSeg(G,i);
  for(j=0;j<=40;j++){var t=j/40,q=bzv(c[0],c[1],c[2],c[3],t),s=mpS(G,q[0],q[1]),d=Math.hypot(s[0]-P.cx,s[1]-P.cy);if(!best||d<best.d)best={i:i,t:t,d:d}}}
 return best}
function lrp(a,b,t){return a+(b-a)*t}
/* new Position keyframe on the path (de Casteljau split, the curve keeps its exact shape; the time is where the layer already is on the path) */
function mpSplit(L,G,sg){
 var ks=L.kf.pos,a=ks[sg.i],b=ks[sg.i+1],c=mpSeg(G,sg.i),t=sg.t,i;
 var q0=[lrp(c[0][0],c[1][0],t),lrp(c[0][1],c[1][1],t)],q1=[lrp(c[1][0],c[2][0],t),lrp(c[1][1],c[2][1],t)],q2=[lrp(c[2][0],c[3][0],t),lrp(c[2][1],c[3][1],t)],
  r0=[lrp(q0[0],q1[0],t),lrp(q0[1],q1[1],t)],r1_=[lrp(q1[0],q2[0],t),lrp(q1[1],q2[1],t)],sp=[lrp(r0[0],r1_[0],t),lrp(r0[1],r1_[1],t)];
 var fy=E.spFrac?E.spFrac(a,b,t):t,u=fy;
 if(a.e&&window.ApexCurve){var lo=0,hi=1;for(i=0;i<28;i++){var m=(lo+hi)/2;if(window.ApexCurve(m,a.e)<fy)lo=m;else hi=m}u=(lo+hi)/2}
 var tn=+(a.t+(b.t-a.t)*clamp(u,.02,.98)).toFixed(3),an=E.valueAt(L,"anc",L.s+tn),
  z=lrp(a.v[2]||0,b.v[2]||0,fy);
 var nk={t:tn,v:[r1(sp[0]-an[0]),r1(sp[1]-an[1]),r1(z)]};
 var oldTo=a.to,oldTi=b.ti,straight=!(hasT(oldTo)||hasT(oldTi));
 if(!straight){
  a.to=[r1(q0[0]-c[0][0]),r1(q0[1]-c[0][1])];nk.ti=[r1(r0[0]-sp[0]),r1(r0[1]-sp[1])];
  nk.to=[r1(r1_[0]-sp[0]),r1(r1_[1]-sp[1])];b.ti=[r1(q2[0]-c[3][0]),r1(q2[1]-c[3][1])]}
 if(a.e)nk.e=JSON.parse(JSON.stringify(a.e));
 ks.splice(sg.i+1,0,nk);return sg.i+1}
function mpSmooth(G,i){
 var n=G.pts.length,q=G.pts[i],pv=i>0?G.pts[i-1]:null,nx=i<n-1?G.pts[i+1]:null;if(!pv&&!nx)return;
 var dx=(nx?nx.x:q.x)-(pv?pv.x:q.x),dy=(nx?nx.y:q.y)-(pv?pv.y:q.y),len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
 var dn=nx?Math.hypot(nx.x-q.x,nx.y-q.y):0,dp=pv?Math.hypot(pv.x-q.x,pv.y-q.y):0;
 q.k.to=nx?[r1(ux*dn/3),r1(uy*dn/3)]:[0,0];q.k.ti=pv?[r1(-ux*dp/3),r1(-uy*dp/3)]:[0,0]}
function mpClean(k){if(!hasT(k.to))delete k.to;if(!hasT(k.ti))delete k.ti}
function mpDown(){
 var L=mpL();if(!L)return;var G=mpGeom(L),t=P.tool,ks=L.kf.pos,h=mpHit(L,G),q;P.act=null;
 if(t==="feather"){A.toast("Feather is for shape paths");return}
 if(t==="add"){var sg=mpNear(L,G);if(!sg||sg.d>HR*1.4){A.toast("Tap on the motion path");return}
  E.push();P.mi=mpSplit(L,G,sg);P.act={mp:true,k:"none",ch:true};HX.snap();A.redraw();ov();up_();return}
 if(t==="del"){if(!h||h.h){A.toast("Tap a keyframe vertex");return}
  if(ks.length<=2){A.toast("A path needs 2 keyframes");return}
  E.push();ks.splice(h.i,1);P.mi=null;P.act={mp:true,k:"none",ch:true};HX.snap();A.redraw();ov();up_();return}
 if(!h){P.mi=null;ov();return}
 q=G.pts[h.i];P.mi=h.i;
 if(h.h){E.push();P.act={mp:true,k:"hdl",G:G,L:L,i:h.i,nm:h.h,one:(t==="conv"),ch:true};HX.tick();ov();return}
 if(t==="conv"){E.push();P.act={mp:true,k:"conv",G:G,L:L,i:h.i,x0:P.cx,y0:P.cy,dragged:false,ch:true};HX.tick();ov();return}
 E.push();P.act={mp:true,k:"mv",G:G,L:L,i:h.i,c0:mpC(G,P.cx,P.cy),v0:ks[h.i].v.slice(),ch:true};HX.tick();ov()}
function up_(){var a=P.act;P.act=null;if(a&&a.ch){E.save();E.render()}ov();mpShow()}
function mpDrag(){
 var a=P.act;if(!a||!a.mp||a.k==="none")return;var L=a.L,ks=L.kf.pos,k=ks[a.i];if(!k){P.act=null;return}
 var G=a.G,c=mpC(G,P.cx,P.cy),q=G.pts[a.i],n=ks.length;
 if(a.k==="mv"){k.v[0]=r1(a.v0[0]+c[0]-a.c0[0]);k.v[1]=r1(a.v0[1]+c[1]-a.c0[1])}
 else if(a.k==="hdl"){
  var off=[r1(c[0]-q.x),r1(c[1]-q.y)],other=a.nm==="to"?"ti":"to",ot=k[other];
  k[a.nm]=off;
  if(!a.one&&((other==="ti"&&a.i>0)||(other==="to"&&a.i<n-1))){ /* pen tool: the opposite handle follows (same line, keeps its own length) */
   var ol=hasT(ot)?Math.hypot(ot[0],ot[1]):Math.hypot(off[0],off[1]),ln=Math.hypot(off[0],off[1])||1;k[other]=[r1(-off[0]/ln*ol),r1(-off[1]/ln*ol)]}}
 else if(a.k==="conv"){
  if(!a.dragged&&Math.hypot(P.cx-a.x0,P.cy-a.y0)<6)return;a.dragged=true;
  var o2=[r1(c[0]-q.x),r1(c[1]-q.y)];
  if(a.i<n-1){k.to=o2;k.ti=a.i>0?[-o2[0],-o2[1]]:[0,0]}else{k.ti=o2;k.to=[0,0]}}
 A.redraw();ov();mpShow()}
function mpUp(a){
 var L=a.L,k=L&&L.kf&&L.kf.pos&&L.kf.pos[a.i];
 if(a.k==="conv"&&!a.dragged&&k){if(hasT(k.to)||hasT(k.ti)){delete k.to;delete k.ti}else mpSmooth(a.G,a.i)}
 if(k)mpClean(k);
 if(a.ch){E.save();E.render()}
 A.redraw();ov();mpShow()}

/* ---- always-on display: the path of the selected layer (not editable here) ---- */
var msv=document.createElementNS(svgNS,"svg");msv.setAttribute("class","mp-ov");canvasEl.appendChild(msv);
function mpShow(){
 var L=mpL();
 if(!L||L.kf.pos.length<2||(P.on&&mpOn())){msv.innerHTML="";return}
 var cw=canvasEl.clientWidth,ch=canvasEl.clientHeight;msv.setAttribute("viewBox","0 0 "+cw+" "+ch);msv.innerHTML=mpSvg(L,false)}

/* ---- panel ---- */
var pp=document.createElement("div");pp.className="glass mp pnp";pp.id="pnp";pp.setAttribute("aria-hidden","true");
pp.innerHTML='<div class="pn-h"><div class="pn-tools" id="pnT">'+Object.keys(TN).map(function(t){return '<button type="button" class="pn-t" data-t="'+t+'" aria-label="'+TN[t]+'"><svg><use href="#'+TI[t]+'"/></svg></button>'}).join("")+'</div><button class="pp-k pn-mpb" id="pnMP" type="button" aria-label="Motion path" style="display:none"><svg viewBox="0 0 24 24"><path d="M3.5 19.5C8 19.5 7 5 12 5s4 14.500 8.500 14.500" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-dasharray="0.1 3.600"/><rect x="2" y="17.500" width="4" height="4" rx=".8" fill="currentColor"/><rect x="18" y="17.500" width="4" height="4" rx=".8" fill="currentColor"/><rect x="10" y="3" width="4" height="4" rx=".8" fill="currentColor"/></svg></button><button class="pp-k" id="pnX" type="button" aria-label="Done"><svg><use href="#i-check"/></svg></button></div>'+
 '<div class="pn-m"><div class="pn-pad" id="pnPad"><span class="pn-hint">Trackpad</span><span class="pn-hint2">slide = move &middot; tap = click &middot; hold + slide = drag</span></div>'+
 '<div class="pn-side"><button type="button" class="pn-click" id="pnClick" aria-label="Click (hold to drag)"><svg><use href="#i-pen"/></svg></button><div class="pn-s2"><button type="button" class="pn-s" id="pnClose">Close</button><button type="button" class="pn-s" id="pnUndo" aria-label="Undo"><svg><use href="#i-undo"/></svg></button></div></div></div>'+
 '<div class="pn-st" id="pnC">'+PC.map(function(c){return '<button type="button" class="pn-sw" data-c="'+c+'" aria-label="'+c+'"><i style="background:'+c+'"></i></button>'}).join("")+'<label class="pn-sw cust" aria-label="Custom colour"><input type="color" id="pnIn" value="#ffffff"><svg><use href="#i-plus"/></svg></label></div>'+
 '<div class="pn-st2" id="pnW">'+PW.map(function(w){return '<button type="button" class="pn-w" data-w="'+w+'" aria-label="Width '+w+'"><i style="--d:'+(.7+w*.17)+'rem"></i></button>'}).join("")+'<button type="button" class="pn-w pn-fill" id="pnFill"><b>Fill</b></button></div>';
ed.appendChild(pp);
function paintP(){
 $$("#pnT .pn-t").forEach(function(b){b.classList.toggle("on",b.dataset.t===P.tool)});
 $$("#pnC [data-c]").forEach(function(b){b.classList.toggle("on",b.dataset.c===P.col)});$("#pnC .cust").classList.toggle("on",PC.indexOf(P.col)<0);$("#pnIn").value=P.col;
 $$("#pnW [data-w]").forEach(function(b){b.classList.toggle("on",+b.dataset.w===P.w)});$("#pnFill").classList.toggle("on",P.fill);
 $("#pnClick use").setAttribute("href","#"+TI[P.tool]);
 var mb=$("#pnMP"),ml=mpL();mb.style.display=(ml&&ml.kf.pos.length>=2)?"":"none";mb.classList.toggle("on",mpOn())}
function tgt(){var L=pl();if(!L)return null;var pi=P.cur>=0?P.cur:(P.sel?P.sel.pi:-1);return paths(L)[pi]||null}
function restyle(fn){var pa=tgt();if(!pa)return;E.push();fn(pa);E.save();E.render();A.redraw();ov()}
$("#pnT").addEventListener("click",function(e){var b=e.target.closest("[data-t]");if(!b)return;P.tool=b.dataset.t;P.act=null;HX.tick();paintP();ov()});
$("#pnC").addEventListener("click",function(e){var b=e.target.closest("[data-c]");if(!b)return;P.col=b.dataset.c;paintP();restyle(function(pa){pa.c=P.col;if(pa.f)pa.f=P.col})});
$("#pnIn").addEventListener("input",function(){P.col=this.value;paintP();var pa=tgt();if(pa){pa.c=P.col;if(pa.f)pa.f=P.col;A.redraw();ov()}});
$("#pnIn").addEventListener("change",function(){if(tgt()){E.save();E.render()}});
$("#pnW").addEventListener("click",function(e){var b=e.target.closest("[data-w]");if(!b)return;P.w=+b.dataset.w;paintP();restyle(function(pa){pa.w=P.w})});
$("#pnFill").onclick=function(){P.fill=!P.fill;paintP();restyle(function(pa){pa.f=P.fill?(pa.c||P.col):null})};
$("#pnClose").onclick=function(){
 var L=pl();if(!L){A.toast("Draw a path first");return}
 var pi=P.cur>=0?P.cur:(P.sel?P.sel.pi:paths(L).length-1),pa=paths(L)[pi];
 if(!pa||pa.v.length<3){A.toast("A closed path needs 3+ vertices");return}
 E.push();pa.z=!pa.z;if(pa.z&&P.cur===pi)P.cur=-1;E.save();E.render();A.redraw();ov();HX.snap()};
$("#pnUndo").onclick=function(){var b=$("#btnUndo");if(b&&b.onclick)b.onclick();setTimeout(function(){PEN.sync()},0)};
$("#pnX").onclick=function(){PEN.close()};
$("#pnMP").onclick=function(){var l=mpL();if(!l)return;P.mp=!mpOn();P.mi=null;P.act=null;HX.tick();A.toast(P.mp?"Motion path":"Shape path");paintP();ov();mpShow()};

/* trackpad */
var pad=$("#pnPad"),pid=null,lx=0,ly=0,mv=0,t0=0,ht=0,dragging=false;
function moveCur(dx,dy){
 var g=1.25+Math.min(1.3,Math.hypot(dx,dy)/12),cw=canvasEl.clientWidth,ch=canvasEl.clientHeight;
 P.cx=clamp(P.cx+dx*g,0,cw);P.cy=clamp(P.cy+dy*g,0,ch);
 if(P.act)dragMove();else ov()}
pad.addEventListener("pointerdown",function(e){
 if(pid!=null)return;e.preventDefault();pid=e.pointerId;try{pad.setPointerCapture(pid)}catch(x){}
 lx=e.clientX;ly=e.clientY;mv=0;t0=Date.now();dragging=false;pad.classList.add("on");clearTimeout(ht);
 ht=setTimeout(function(){if(pid!=null&&mv<7&&!P.btn&&!P.act){dragging=true;HX.hold();down()}},300)});
pad.addEventListener("pointermove",function(e){
 if(e.pointerId!==pid)return;var dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;mv+=Math.hypot(dx,dy);moveCur(dx,dy)});
function padEnd(e){
 if(e.pointerId!==pid)return;clearTimeout(ht);pid=null;pad.classList.remove("on");
 if(dragging){dragging=false;up()}
 else if(!P.btn&&mv<9&&Date.now()-t0<320&&e.type==="pointerup"){down();up()}}
pad.addEventListener("pointerup",padEnd);pad.addEventListener("pointercancel",padEnd);
var ck=$("#pnClick");
ck.addEventListener("pointerdown",function(e){e.preventDefault();try{ck.setPointerCapture(e.pointerId)}catch(x){}P.btn=true;ck.classList.add("on");HX.tick();down()});
function ckEnd(){if(!P.btn)return;P.btn=false;ck.classList.remove("on");up()}
ck.addEventListener("pointerup",ckEnd);ck.addEventListener("pointercancel",ckEnd);
/* touching the preview itself just parks the cursor there */
function shPos(e){var r=canvasEl.getBoundingClientRect();P.cx=clamp(e.clientX-r.left,0,r.width);P.cy=clamp(e.clientY-r.top,0,r.height);if(P.act)dragMove();else ov()}
var shDown=false;
shield.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();shDown=true;try{shield.setPointerCapture(e.pointerId)}catch(x){}shPos(e)});
shield.addEventListener("pointermove",function(e){if(shDown)shPos(e)});
["pointerup","pointercancel"].forEach(function(n){shield.addEventListener(n,function(){shDown=false})});

PEN.open=function(tool){
 if(tool&&TN[tool])P.tool=tool;
 if(P.on){paintP();ov();return}
 var l=selL(),vx=$("#vpX");
 if(vx&&$("#vp")&&$("#vp").classList.contains("on"))vx.click();
 BG.close();
 P.lid=(l&&l.k==="vec")?l.i:null;P.cur=-1;P.sel=null;P.act=null;P.btn=false;P.mp=null;P.mi=null;P.mlid=l?l.i:null;P.on=true;
 pp.classList.add("on");pp.setAttribute("aria-hidden","false");tools.classList.add("mv");canvasEl.classList.add("drawing","penning");
 P.cx=canvasEl.clientWidth/2;P.cy=canvasEl.clientHeight/2;
 refreshM();paintP();ov();A.toast(TN[P.tool])};
PEN.close=function(){
 if(!P.on)return;
 P.on=false;P.act=null;P.cur=-1;P.sel=null;clearTimeout(ht);pid=null;dragging=false;
 pp.classList.remove("on");pp.setAttribute("aria-hidden","true");canvasEl.classList.remove("drawing","penning");
 if(!bp.classList.contains("on"))tools.classList.remove("mv");
 osv.innerHTML="";flyClose();A.redraw();mpShow()};

/* ---- hold the Vector button: tool flyout (like the After Effects tool group) ---- */
var fly=document.createElement("div");fly.className="penfly";fly.id="penfly";
fly.innerHTML=Object.keys(TN).filter(function(t){return t!=="add"&&t!=="del"}).map(function(t){return '<button type="button" data-t="'+t+'"><i class="pf-dot"></i><svg><use href="#'+TI[t]+'"/></svg><span>'+TN[t]+'</span></button>'}).join("");
app.appendChild(fly);
function flyHi(t){$$("button",fly).forEach(function(b){b.classList.toggle("hi",b.dataset.t===t)})}
function flyOpen(btn){
 $$("button",fly).forEach(function(b){b.classList.toggle("cur",b.dataset.t===P.tool)});flyHi(null);
 fly.classList.add("on");
 var ar=app.getBoundingClientRect(),br=btn.getBoundingClientRect(),fw=fly.offsetWidth;
 fly.style.left=clamp(br.left-ar.left-fw*.18,1.6*rem(),Math.max(1.6*rem(),ar.width-fw-1.6*rem()))+"px";
 fly.style.bottom=(ar.bottom-br.top+1.2*rem())+"px"}
function flyClose(){fly.classList.remove("on")}
PEN.close.fly=flyClose;
function itemAt(e){var el=document.elementFromPoint(e.clientX,e.clientY);return el&&el.closest?el.closest("#penfly button"):null}
var lp={t:0,held:false,sup:false,x:0,y:0};
tools.addEventListener("pointerdown",function(e){
 lp.sup=false;
 var b=e.target.closest&&e.target.closest("#toolPill button[data-a=\"vec\"]");if(!b)return;
 lp.held=false;lp.x=e.clientX;lp.y=e.clientY;clearTimeout(lp.t);
 lp.t=setTimeout(function(){lp.held=true;lp.sup=true;HX.hold();flyOpen(b)},420)},true);
document.addEventListener("pointermove",function(e){
 if(!lp.held){if(lp.t&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>12){clearTimeout(lp.t);lp.t=0}return}
 var it=itemAt(e);flyHi(it?it.dataset.t:null)},true);
["pointerup","pointercancel"].forEach(function(n){document.addEventListener(n,function(e){
 if(!lp.t&&!lp.held)return;
 clearTimeout(lp.t);lp.t=0;
 if(lp.held){lp.held=false;var it=n==="pointerup"?itemAt(e):null;if(it){flyClose();PEN.open(it.dataset.t)}}},true)});
tools.addEventListener("click",function(e){if(lp.sup){lp.sup=false;e.stopPropagation();e.preventDefault()}},true);
fly.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;flyClose();PEN.open(b.dataset.t)});
document.addEventListener("pointerdown",function(e){if(fly.classList.contains("on")&&!e.target.closest("#penfly")&&!lp.held&&!(e.target.closest&&e.target.closest("#toolPill button[data-a=\"vec\"]")))flyClose()},true);

/* ---- keep everything in step with the editor ---- */
var pr=A.onRender;A.onRender=function(){if(pr)pr.apply(this,arguments);BG.sync();PEN.sync();mpShow()};
var pt=A.onT;A.onT=function(){if(pt)pt.apply(this,arguments);if(P.on){refreshM();ov()}mpShow()};
var prd=A.redraw;A.redraw=function(){var r=prd.apply(this,arguments);if(!P.act)mpShow();return r};
window.addEventListener("resize",function(){if(P.on){refreshM();ov()}mpShow()});
})();
