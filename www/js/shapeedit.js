/* Apex Cut mobile - Edit Shape: Size (X / Y) + Radius for shape layers.
   1) geometry: AX.X.shList(l) / AX.X.shBox(l) / AX.X.shSize(l)  -> used by the ONE canvas renderer (media.js) for preview + export
   2) UI: glass "Edit Shape" panel (ruler sliders). It opens right after a shape is added and from the Edit-shape button of a selected shape. */
(function(){
"use strict";
var A=window.AX,E=A.E,X=A.X,S=A.S,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};

/* ---------- geometry (24 x 24 box, centre 12,12) ---------- */
var POLY={
 square:[[3.6,3.6],[20.4,3.6],[20.4,20.4],[3.6,20.4]],
 rounded:[[3,3],[21,3],[21,21],[3,21]],
 triangle:[[12,3.4],[21.2,19.6],[2.8,19.6]],
 diamond:[[12,2.4],[21.6,12],[12,21.6],[2.4,12]],
 pentagon:[[12,2.8],[20.9,9.3],[17.5,19.7],[6.5,19.7],[3.1,9.3]],
 hexagon:[[7.4,3.8],[16.6,3.8],[21.2,12],[16.6,20.2],[7.4,20.2],[2.8,12]],
 star:[[12,2.6],[14.9,8.7],[21.5,9.5],[16.6,14.1],[17.9,20.7],[12,17.3],[6.1,20.7],[7.4,14.1],[2.5,9.5],[9.1,8.7]],
 arrow:[[3,9.4],[13,9.4],[13,4.6],[21.2,12],[13,19.4],[13,14.6],[3,14.6]],
 plus:[[9.4,3],[14.6,3],[14.6,9.4],[21,9.4],[21,14.6],[14.6,14.6],[14.6,21],[9.4,21],[9.4,14.6],[3,14.6],[3,9.4],[9.4,9.4]]};
var INF={triangle:1.06,diamond:1.03,pentagon:1.05,hexagon:1.05,star:1.05,arrow:1.04};   /* the old look had a round stroke around these shapes */
var DEFR={square:14,rounded:67,triangle:12,diamond:12,pentagon:12,hexagon:12,star:10,arrow:10,plus:10};
var NORAD={circle:1,ring:1,heart:1};
function n2(v){return (+v).toFixed(3)}
function sgOf(l){var s=l.shs||{};return {x:Math.max(1,+s.x||100),y:Math.max(1,+s.y||100),r:s.r==null?(DEFR[l.sh]==null?0:DEFR[l.sh]):Math.max(0,Math.min(100,+s.r))}}
function roundPoly(pts,rp){
 var n=pts.length,u=[],w=[],ln=[],i,d="",A0=[],B0=[];
 for(i=0;i<n;i++){var P=pts[(i+n-1)%n],V=pts[i],N=pts[(i+1)%n],a=Math.hypot(P[0]-V[0],P[1]-V[1]),b=Math.hypot(N[0]-V[0],N[1]-V[1]);
  var ux=(P[0]-V[0])/a,uy=(P[1]-V[1])/a,wx=(N[0]-V[0])/b,wy=(N[1]-V[1])/b,cs=Math.max(-1,Math.min(1,ux*wx+uy*wy)),th=Math.acos(cs),
   t=rp/100*Math.min(a,b)/2,r=t*Math.tan(th/2),sw=((-ux)*wy-(-uy)*wx)>0?1:0;
  if(t<1e-4||th<.02||th>Math.PI-.02){A0[i]=V;B0[i]=V;ln[i]=null;continue}
  A0[i]=[V[0]+ux*t,V[1]+uy*t];B0[i]=[V[0]+wx*t,V[1]+wy*t];ln[i]={r:r,sw:sw}}
 d="M"+n2(B0[0][0])+" "+n2(B0[0][1]);
 for(i=1;i<=n;i++){var k=i%n,q=ln[k];
  d+="L"+n2(A0[k][0])+" "+n2(A0[k][1]);
  if(q)d+="A"+n2(q.r)+" "+n2(q.r)+" 0 0 "+q.sw+" "+n2(B0[k][0])+" "+n2(B0[k][1])}
 return d+"Z"}
function ell(cx,cy,rx,ry){return "M"+n2(cx-rx)+" "+n2(cy)+"A"+n2(rx)+" "+n2(ry)+" 0 1 0 "+n2(cx+rx)+" "+n2(cy)+"A"+n2(rx)+" "+n2(ry)+" 0 1 0 "+n2(cx-rx)+" "+n2(cy)+"Z"}
function heart(sx,sy){var f=function(v){return n2(12+(v-12)*sx)},g=function(v){return n2(12+(v-12)*sy)};
 return "M"+f(12)+" "+g(20.6)+"C"+f(5)+" "+g(15.2)+" "+f(3)+" "+g(11.6)+" "+f(3)+" "+g(8.8)+"A"+n2(4.8*sx)+" "+n2(4.8*sy)+" 0 0 1 "+f(12)+" "+g(6.6)+"A"+n2(4.8*sx)+" "+n2(4.8*sy)+" 0 0 1 "+f(21)+" "+g(8.8)+"C"+f(21)+" "+g(11.6)+" "+f(19)+" "+g(15.2)+" "+f(12)+" "+g(20.6)+"Z"}
var CACHE={};
function geo(l){
 var g=sgOf(l),key=l.sh+"|"+g.x+"|"+g.y+"|"+g.r,c=CACHE[key];if(c)return c;
 var sx=g.x/100,sy=g.y/100,o;
 if(l.sh==="circle")o={d:ell(12,12,9.2*sx,9.2*sy),fill:true,sw:0,ring:false};
 else if(l.sh==="ring")o={d:ell(12,12,7.6*sx,7.6*sy),fill:false,sw:3.6,ring:true};
 else if(l.sh==="heart")o={d:heart(sx,sy),fill:true,sw:0,ring:false};
 else{var pts=POLY[l.sh]||POLY.square,inf=INF[l.sh]||1,cx=0,cy=0;
  pts.forEach(function(p){cx+=p[0];cy+=p[1]});cx/=pts.length;cy/=pts.length;
  var q=pts.map(function(p){return [12+((cx+(p[0]-cx)*inf)-12)*sx,12+((cy+(p[1]-cy)*inf)-12)*sy]});
  o={d:roundPoly(q,g.r),fill:true,sw:0,ring:false}}
 o.p=new Path2D(o.d);
 var res={list:[o],box:[12-12*sx,12-12*sy,24*sx,24*sy]};
 var kk=Object.keys(CACHE);if(kk.length>80)delete CACHE[kk[0]];
 CACHE[key]=res;return res}
/* list of {p:Path2D, fill, sw, ring} for a shape layer; layers that were never edited keep their original artwork */
X.shList=function(l){if(l.shs)return geo(l).list;return X.SHP_P[l.sh]||X.SHP_P.circle};
X.shBox=function(l){if(l.shs)return geo(l).box;return [0,0,24,24]};
X.shSize=function(l){var s=l.shs;return s?[Math.max(.01,(+s.x||100)/100),Math.max(.01,(+s.y||100)/100)]:[1,1]};
X.shGeoD=function(l){return l.shs?geo(l).list:null};

/* ---------- Edit Shape panel ---------- */
var ed=$("#editor"),tools=$("#tools"),HX=window.HX||{slider:function(){return {move:function(){}}}};
var es=document.createElement("div");es.className="glass mp sp es";es.id="es";es.setAttribute("aria-hidden","true");
es.innerHTML='<div class="mp-h"><b class="mp-title" style="display:block">Edit Shape</b><button class="pp-k" id="esR" aria-label="Reset"><svg viewBox="0 0 24 24"><path d="M4.500 12a7.500 7.500 0 107.500-7.500H8M10.500 1.800L7.700 4.500l2.800 2.700" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="pp-k" id="esX" aria-label="Close"><svg><use href="#i-x"/></svg></button></div>'+
 '<div class="es-body" id="esB"></div>';
ed.appendChild(es);
var PWIN=A.panelWin?A.panelWin(es,{key:"apexcut.es.win",drag:".mp-h"}):null;

var D={x:{t:"Size",min:1,max:500},y:{t:"Size",min:1,max:500},r:{t:"Radius",min:0,max:100}};
var row="size",ax="x",link=false,pushed=false,dragging=false;
var LK='<svg viewBox="0 0 24 24" fill="none"><path d="M3.27 12C2.48 11.05 2 9.83 2 8.5C2 5.48 4.47 3 7.5 3H12.5C15.52 3 18 5.48 18 8.5C18 11.52 15.53 14 12.5 14H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.98 21H11.5C8.48 21 6 18.52 6 15.5C6 12.48 8.47 10 11.5 10H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.73 12C21.52 12.95 22 14.17 22 15.5C22 18.52 19.53 21 16.5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function cur(){var l=E.sel()!=null?E.find(E.sel()):null;return l&&l.k==="shp"?l:null}
function val(l,k){return sgOf(l)[k]}
function setVals(l,o){l.shs=Object.assign({x:sgOf(l).x,y:sgOf(l).y,r:sgOf(l).r},l.shs||{},o)}
function fmt(v){return String(Math.round(v))}
function body(l){
 var noR=!!NORAD[l.sh],g=sgOf(l);
 return '<div class="es-r'+(row==="size"?" on":"")+'" data-row="size"><button type="button" class="es-lab'+(link?" lk":"")+'" data-lab="size"><span>Size</span>'+(link?LK:'')+'</button>'+
   '<div class="es-ruler" data-k="size"><i class="es-tk"></i><i class="es-ph"></i></div>'+
   '<div class="es-vals"><button type="button" class="es-v'+(row==="size"&&ax==="x"?" on":"")+'" data-ax="x"><em>X:</em><b>'+fmt(g.x)+'</b></button><button type="button" class="es-v'+(row==="size"&&ax==="y"?" on":"")+'" data-ax="y"><em>Y:</em><b>'+fmt(g.y)+'</b></button></div></div>'+
  '<div class="es-r'+(row==="rad"?" on":"")+(noR?" dis":"")+'" data-row="rad"><button type="button" class="es-lab" data-lab="rad"><span>Radius</span></button>'+
   '<div class="es-ruler" data-k="rad"><i class="es-tk"></i><i class="es-ph"></i></div>'+
   '<div class="es-vals one"><button type="button" class="es-v'+(row==="rad"?" on":"")+'" data-v="r"><b>'+(noR?"\u2013":fmt(g.r))+'</b></button></div></div>'}
function render(){var l=cur();if(!l)return;$("#esB").innerHTML=body(l);rulers(l)}
/* ruler: the tick pattern slides under the fixed centre mark while you drag */
function pxu(){return 1.1*rem()}
function rem(){var p=window.__apexRemProbe;if(!p||!p.isConnected){p=window.__apexRemProbe=document.createElement("div");p.style.cssText="position:absolute;left:-9999px;top:0;width:100rem;height:0;visibility:hidden;pointer-events:none";(document.body||document.documentElement).appendChild(p)}var w=p.getBoundingClientRect().width/100;return w>0?w:4}
function paintRuler(el,v){el.style.setProperty("--off",(-v*pxu()).toFixed(2)+"px")}
function rulers(l){$$("#esB .es-ruler").forEach(function(el){var k=el.dataset.k,v=k==="size"?val(l,ax):val(l,"r");paintRuler(el,v)})}
function showVals(l){var g=sgOf(l),b=$$("#esB .es-v b");b[0].textContent=fmt(g.x);b[1].textContent=fmt(g.y);b[2].textContent=NORAD[l.sh]?"\u2013":fmt(g.r)}
function apply(l,k,v,all){
 if(!pushed){E.push();pushed=true}
 if(k==="r"){setVals(l,{r:v})}
 else if(link&&all){var g=sgOf(l),b=k==="x"?g.x:g.y,f=v/Math.max(1,b);setVals(l,{x:Math.max(1,Math.min(500,g.x*f)),y:Math.max(1,Math.min(500,g.y*f))})}
 else setVals(l,{[k]:v});
 if(A.redraw)A.redraw()}
$("#esB").addEventListener("pointerdown",function(e){
 var rl=e.target.closest(".es-ruler");if(!rl)return;var l=cur();if(!l)return;
 var kind=rl.dataset.k;if(kind==="rad"&&NORAD[l.sh]){A.toast("Radius is for corner shapes");return}
 e.preventDefault();row=kind==="size"?"size":"rad";
 $$("#esB .es-r").forEach(function(r){r.classList.toggle("on",r.dataset.row===row)});
 $$("#esB .es-v").forEach(function(b){b.classList.toggle("on",kind==="size"?b.dataset.ax===ax:b.dataset.v==="r")});
 var key=kind==="size"?ax:"r",d=D[key],vcur=val(l,key),lastX=e.clientX,lastT=performance.now(),vel=0,hxS=HX.slider(),raf=0;
 dragging=true;pushed=false;rl.setPointerCapture(e.pointerId);rl.classList.add("drag");document.body.classList.add("sliding");
 function go(){raf=0;var lc=cur();if(!lc)return;var vr=Math.round(vcur);
  if(vr!==Math.round(val(lc,key))){apply(lc,key,vr,true);hxS.move(Math.max(0,Math.min(1,(vr-d.min)/(d.max-d.min))),false,false);showVals(lc)}
  paintRuler(rl,vcur)}
 function mv(ev){ /* content follows the finger; a quick swipe moves faster than a slow one */
  var now=performance.now(),dx=ev.clientX-lastX,dt=Math.max(1,now-lastT);vel=vel*.7+(Math.abs(dx)/dt)*.3;lastX=ev.clientX;lastT=now;
  var boost=1+Math.min(3,vel*2.2);vcur=Math.max(d.min,Math.min(d.max,vcur-dx*boost/pxu()));
  if(!raf)raf=requestAnimationFrame(go)}
 function up(){if(raf){cancelAnimationFrame(raf);raf=0}go();document.body.classList.remove("sliding");rl.removeEventListener("pointermove",mv);rl.removeEventListener("pointerup",up);rl.removeEventListener("pointercancel",up);rl.classList.remove("drag");dragging=false;
  if(pushed){E.save();E.render()}pushed=false;if(cur())render()}
 rl.addEventListener("pointermove",mv);rl.addEventListener("pointerup",up);rl.addEventListener("pointercancel",up)});
$("#esB").addEventListener("click",function(e){
 var l=cur();if(!l)return;
 var lab=e.target.closest(".es-lab");
 if(lab){if(lab.dataset.lab==="size"){if(row==="size"){link=!link;A.toast(link?"X and Y linked":"X and Y separate")}row="size"}else{row="rad";if(NORAD[l.sh])A.toast("Radius is for corner shapes")}render();return}
 var v=e.target.closest(".es-v");
 if(v){
  var key;if(v.dataset.v==="r"){key="r";row="rad"}else{key=v.dataset.ax;ax=key;row="size"}
  if(key==="r"&&NORAD[l.sh]){A.toast("Radius is for corner shapes");render();return}
  var wasOn=v.classList.contains("on");render();
  if(wasOn){var d=D[key];A.askText(key==="r"?"Radius":"Size "+key.toUpperCase(),String(Math.round(val(l,key)))).then(function(x){var n=parseFloat(x);if(x==null||isNaN(n))return;n=Math.max(d.min,Math.min(d.max,n));pushed=false;apply(l,key,n,true);E.save();E.render();pushed=false;render()})}}});
$("#esR").onclick=function(){var l=cur();if(!l)return;E.push();delete l.shs;E.save();E.render();render();if(A.redraw)A.redraw()};
$("#esX").onclick=function(){close()};

function closeOthers(){if(A.closePanels)A.closePanels()}
function open(){var l=cur();if(!l)return;closeOthers();row="size";if(!l.shs){/* first open: make the stored values explicit so the layer keeps its look */}render();es.classList.add("on");es.setAttribute("aria-hidden","false");tools.classList.add("mv")}
function close(){if(!es.classList.contains("on"))return;es.classList.remove("on");es.setAttribute("aria-hidden","true");tools.classList.remove("mv")}
function sync(){if(!es.classList.contains("on"))return;if(!cur()){close();return}if(!dragging&&!pushed)render()}
A.SE={open:open,close:close,sync:sync,isOpen:function(){return es.classList.contains("on")}};
})();
