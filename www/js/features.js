/* Apex Cut mobile - header link (parent) button, group enter/exit UI, canvas grid */
(function(){
"use strict";
var A=window.AX,E=A.E,S=A.S,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var ed=$("#editor"),tl=$("#tl"),tb=$("#txBar"),gear=$("#edSettings"),b3=$("#ed3d");

/* ---------- header state: layer selected -> link icon, text size slider open -> check ---------- */
function single(){return E.sel()!=null&&!E.msel().length?E.find(E.sel()):null}
function upd(){
 var l=single();ed.classList.toggle("lsel",!!l);
 gear.classList.toggle("lk",!!(l&&l.pr!=null&&E.find(l.pr)));
 gear.setAttribute("aria-label",l?"Link to parent layer":"Project settings");
 ed.classList.toggle("ingrp",!!E.inGroup());
 ed.classList.toggle("no3d",!(l&&l.k!=="aud"));
 var on3=!!(l&&E.is3d(l));b3.classList.toggle("on",on3);b3.setAttribute("aria-pressed",on3?"true":"false");df.classList.toggle("is3",on3);
 if(!l||l.k!=="txt")closeDF();
 if(!l)closeMenu()}
var prev=A.onRender;A.onRender=function(){if(prev)prev.apply(this,arguments);upd()};
try{new MutationObserver(function(){ed.classList.toggle("szon",tb.classList.contains("sz"))}).observe(tb,{attributes:true,attributeFilter:["class"]})}catch(x){}
A.onGroup=function(){var g=E.inGroup();$("#edTitle").textContent=g?E.gtitle():(S.cur&&S.cur.name)||"Project";ed.classList.toggle("ingrp",!!g);closeMenu()};
var op=A.open;A.open=function(p){var r=op.apply(this,arguments);$("#edTitle").textContent=p.name;ed.classList.remove("ingrp");return r};

/* ---------- parent link menu ---------- */
var IC={vid:"i-vid",img:"i-img",aud:"i-vol",txt:"i-text",shp:"i-shape",sol:"i-solid",nul:"i-null",adj:"i-adjl",vec:"i-vec",grp:"i-group"};
var pm=document.createElement("div");pm.className="gmenu pmenu";pm.id="pmenu";$("#app").appendChild(pm);
function closeMenu(){pm.classList.remove("on")}
function isBelow(l,id){var n=0;while(l&&n++<12){if(l.i===id)return true;l=l.pr!=null?E.find(l.pr):null}return false}
function openMenu(){
 var l=single();if(!l)return;
 var list=E.siblings().filter(function(o){return o.k!=="aud"||true}).slice().sort(function(a,b){return (a.k==="aud")-(b.k==="aud")||a.r-b.r||a.s-b.s});
 var h='<button type="button" data-p="" class="'+(l.pr==null?"cur":"")+'"><svg><use href="#i-unlink"/></svg><span>None</span></button>';
 list.forEach(function(o){
  var bad=o.i===l.i||isBelow(o,l.i);
  h+='<button type="button" data-p="'+o.i+'" class="'+(l.pr===o.i?"cur":"")+(bad?" dis":"")+'"><svg><use href="#'+(IC[o.k]||"i-solid")+'"/></svg><span>'+E.lname(o).replace(/</g,"&lt;")+'</span></button>'});
 pm.innerHTML=h;
 var gb=gear.getBoundingClientRect(),ar=$("#app").getBoundingClientRect(),hb=$(".ed-top").getBoundingClientRect();
 pm.style.top=(hb.bottom-ar.top+4)+"px";pm.style.right=Math.max(8,ar.right-gb.right)+"px";pm.style.left="auto";
 pm.classList.add("on")}
/* ---------- 3D switch: header button (next to the link button); text layers get a small floating switch when the link button is held ---------- */
function toggle3d(){
 var l=single();if(!l||l.k==="aud")return;
 E.push();l.d3=!E.is3d(l);E.save();E.render();if(A.redraw)A.redraw();
 A.toast(l.d3?"3D layer on":"3D layer off");try{HX.snap()}catch(x){}}
b3.addEventListener("click",function(e){e.stopPropagation();toggle3d()});
var df=document.createElement("div");df.className="gmenu d3f";df.id="d3f";
df.innerHTML='<svg><use href="#i-3d"/></svg><span>3D</span><button type="button" class="ps-sw2" id="d3fSw" aria-label="3D layer"></button>';
$("#app").appendChild(df);
function closeDF(){df.classList.remove("on")}
function openDF(){
 var l=single();if(!l||l.k!=="txt")return;
 closeMenu();df.classList.toggle("is3",E.is3d(l));
 var gb=gear.getBoundingClientRect(),ar=$("#app").getBoundingClientRect(),hb=$(".ed-top").getBoundingClientRect();
 df.style.top=(hb.bottom-ar.top+4)+"px";df.style.right=Math.max(8,ar.right-gb.right)+"px";df.style.left="auto";
 df.classList.add("on")}
df.addEventListener("click",function(e){e.stopPropagation();toggle3d()});
var gHold=0,gHeld=false,gx=0,gy=0;
gear.addEventListener("pointerdown",function(e){
 gHeld=false;clearTimeout(gHold);gx=e.clientX;gy=e.clientY;var l=single();if(!l||l.k!=="txt")return;
 gHold=setTimeout(function(){gHeld=true;try{HX.hold()}catch(x){}openDF()},420)});
gear.addEventListener("pointermove",function(e){if(gHold&&Math.hypot(e.clientX-gx,e.clientY-gy)>14)clearTimeout(gHold)});
["pointerup","pointercancel","pointerleave"].forEach(function(n){gear.addEventListener(n,function(){clearTimeout(gHold)})});
gear.addEventListener("contextmenu",function(e){if(single()&&single().k==="txt")e.preventDefault()});
gear.onclick=function(e){if(gHeld){gHeld=false;e.stopPropagation();return}if(!single())return;e.stopPropagation();closeDF();pm.classList.contains("on")?closeMenu():openMenu()};
pm.addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b||b.classList.contains("dis"))return;
 var l=single();closeMenu();if(!l)return;
 var pid=b.dataset.p===""?null:+b.dataset.p;
 if(E.setParent(l.i,pid)){var po=pid==null?null:E.find(pid);A.toast(po?"Linked to "+E.lname(po):"Link removed")}});
document.addEventListener("pointerdown",function(e){if(pm.classList.contains("on")&&!e.target.closest("#pmenu")&&!e.target.closest("#edSettings"))closeMenu();
 if(df.classList.contains("on")&&!e.target.closest("#d3f")&&!e.target.closest("#edSettings"))closeDF()},true);

/* ---------- double-tap a group on the timeline = go inside ---------- */
(function(){
 var d0=null,lt=null;
 tl.addEventListener("pointerdown",function(e){
  var n=performance.now();
  if(lt&&n-lt.t<450&&Math.hypot(e.clientX-lt.x,e.clientY-lt.y)<45){
   var l=single();
   if(l&&l.k==="grp"&&l.i===lt.i){lt=null;d0=null;e.stopImmediatePropagation();e.preventDefault();E.enterGroup(l);return}}
  var c=e.target.closest?e.target.closest(".clip.gpc"):null;
  d0={x:e.clientX,y:e.clientY,t:n,i:c?+c.dataset.i:null}},true);
 tl.addEventListener("pointerup",function(e){
  if(!d0)return;var mv=Math.hypot(e.clientX-d0.x,e.clientY-d0.y),dt=performance.now()-d0.t,i=d0.i;d0=null;
  lt=(mv<=8&&dt<=380&&i!=null)?{i:i,x:e.clientX,y:e.clientY,t:performance.now()}:null},true);
})();

/* ---------- grid (preview only, never exported) ---------- */
var cvs=$("#canvas"),ov=document.createElement("div");ov.className="gridov";ov.id="gridOv";cvs.appendChild(ov);
var GR=[["third","3 \u00D7 3"],["quarter","4 \u00D7 4"],["golden","Golden"],["center","Center"],["diag","Diagonal"],["safe","Safe 90%"],["safe2","Safe 80%"]];
function ln(x1,y1,x2,y2,cls){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"'+(cls?' class="'+cls+'"':"")+'/>'}
function gridSvg(list){
 var h="";
 if(list.indexOf("third")>=0)h+=ln(33.333,0,33.333,100)+ln(66.667,0,66.667,100)+ln(0,33.333,100,33.333)+ln(0,66.667,100,66.667);
 if(list.indexOf("quarter")>=0)[25,50,75].forEach(function(v){h+=ln(v,0,v,100,"q")+ln(0,v,100,v,"q")});
 if(list.indexOf("golden")>=0){var a=38.2,b=61.8;h+=ln(a,0,a,100,"g")+ln(b,0,b,100,"g")+ln(0,a,100,a,"g")+ln(0,b,100,b,"g")}
 if(list.indexOf("center")>=0)h+=ln(50,0,50,100,"c")+ln(0,50,100,50,"c")+'<circle cx="50" cy="50" r="1.4" class="cc"/>';
 if(list.indexOf("diag")>=0)h+=ln(0,0,100,100,"d")+ln(100,0,0,100,"d");
 if(list.indexOf("safe")>=0)h+='<rect x="5" y="5" width="90" height="90" class="sf"/>';
 if(list.indexOf("safe2")>=0)h+='<rect x="10" y="10" width="80" height="80" class="sf s2"/>';
 return h?'<svg class="gsvg" viewBox="0 0 100 100" preserveAspectRatio="none">'+h+'</svg>':""}
function size(){var w=cvs.clientWidth;if(w)ov.style.setProperty("--u",(w/100)+"px")}
function apply(p){
 p=p||S.cur;if(!p){ov.innerHTML="";return}
 var g=(p.grid||[]).filter(function(x){return GR.some(function(q){return q[0]===x})});
 ov.innerHTML=gridSvg(g);
 ov.classList.toggle("on",!!ov.innerHTML);size()}
try{new ResizeObserver(size).observe(cvs)}catch(x){window.addEventListener("resize",size)}
A.GRID={apply:apply,GR:GR};
})();
