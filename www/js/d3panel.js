/* Apex Cut mobile - floating 3D switch (beside the eye tab of the selected layer): tap = 3D on / off (lit in theme colour), hold = glass 3D Options panel
   Geometry: Bevel Style, Bevel Depth, Extrusion Depth  |  Material: Casts Shadows, Accepts Shadows, Accepts Lights, Shadow Color, Specular Intensity, Specular Shininess, Metal
   values live in layer.d3o and are drawn by media.js (real extruded 3D). */
(function(){
"use strict";
var A=window.AX,E=A.E,MD=A.MD,$=function(s,r){return (r||document).querySelector(s)};
var app=$("#app"),lanes=$("#lanes"),P=document.createElement("div");
P.className="gmenu d3p";P.id="d3p";app.appendChild(P);
var BS=["None","Angular","Concave","Convex"];
var SL=[["bd","Bevel Depth",0,50,1,""],["ext","Extrusion Depth",0,400,1,""],null,null,null,null,["si","Specular Intensity",0,100,0,"%"],["ss","Specular Shininess",0,100,0,"%"],["mt","Metal",0,100,0,"%"]];
var TG=[["cs","Casts Shadows"],["as","Accepts Shadows"],["al","Accepts Lights"]];
function cur(){var i=E.sel();return i!=null&&!E.msel().length?E.find(i):null}
function fmt(v,d,u){return (d?(+v).toFixed(1):Math.round(v))+u}
function slider(s,o){var v=o[s[0]],f=(v-s[2])/(s[3]-s[2]);
 return '<div class="d3p-r"><label>'+s[1]+'</label><div class="sl uni" data-k="'+s[0]+'" style="--f:'+f+'"><div class="sl-fill"></div><div class="sl-th"></div></div><b>'+fmt(v,s[4],s[5])+'</b></div>'}
var CL={};try{CL=JSON.parse(localStorage.getItem("apexcut.d3cl")||"{}")||{}}catch(x){}
function sec(k,t){return '<div class="d3p-g'+(CL[k]?" cl":"")+'" data-g="'+k+'"><button type="button" class="d3p-s" data-g="'+k+'"><svg><use href="#i-chev"/></svg><span>'+t+'</span></button><div class="d3p-gb">'}
function build(l){
 var sb=$(".d3p-b",P),sv=sb?sb.scrollTop:0,o=MD.d3o(l),h='<div class="d3p-h"><svg><use href="#i-3d"/></svg><span>3D Options</span><button type="button" class="pp-k d3p-x" aria-label="Close"><svg><use href="#i-x"/></svg></button></div><div class="d3p-b">';
 h+=sec("geo","Geometry Options")+'<div class="d3p-r"><label>Bevel Style</label><div class="d3p-seg">'+BS.map(function(n,i){return '<button type="button" data-bs="'+i+'" class="'+(o.bs===i?"cur":"")+'">'+n+'</button>'}).join("")+'</div></div>';
 h+=slider(SL[0],o)+slider(SL[1],o)+'</div>';
 h+=sec("mat","Material Options");
 TG.forEach(function(t){h+='<div class="d3p-r"><label>'+t[1]+'</label><button type="button" class="ps-sw2'+(o[t[0]]?" on":"")+'" data-t="'+t[0]+'" aria-label="'+t[1]+'"></button></div>'});
 h+='<div class="d3p-r"><label>Shadow Color</label><input type="color" class="d3p-c" value="'+o.sc+'"></div>';
 h+=slider(SL[6],o)+slider(SL[7],o)+slider(SL[8],o)+'</div></div>';
 P.innerHTML=h;sb=$(".d3p-b",P);if(sb)sb.scrollTop=sv;P.classList.toggle("off",!E.is3d(l))}
var pw=null;
function openP(){
 var l=cur();if(!l||l.k==="aud")return;
 build(l);
 var ar=app.getBoundingClientRect(),hb=$(".ed-top").getBoundingClientRect();
 P.classList.add("on");
 if(!pw&&A.panelWin)pw=A.panelWin(P,{key:"apexcut.d3panel",drag:".d3p-h",root:app});
 if(pw)pw.place()}
function closeP(){P.classList.remove("on")}
function toggle3d(){
 var l=cur();if(!l||l.k==="aud")return;
 E.push();l.d3=!E.is3d(l);E.save();E.render();if(A.redraw)A.redraw();
 A.toast(l.d3?"3D layer on":"3D layer off");try{HX.snap()}catch(x){}
 if(P.classList.contains("on"))P.classList.toggle("off",!l.d3)}
/* ---- floating switch: tap / hold ---- */
var tm=0,held=false,sx=0,sy=0;
lanes.addEventListener("pointerdown",function(e){
 var b=e.target.closest(".d3b");if(!b)return;held=false;clearTimeout(tm);sx=e.clientX;sy=e.clientY;
 tm=setTimeout(function(){held=true;try{HX.hold()}catch(x){}P.classList.contains("on")?closeP():openP()},420)},true);
lanes.addEventListener("pointermove",function(e){if(tm&&Math.hypot(e.clientX-sx,e.clientY-sy)>14)clearTimeout(tm)},true);
["pointerup","pointercancel"].forEach(function(n){lanes.addEventListener(n,function(){clearTimeout(tm)},true)});
lanes.addEventListener("contextmenu",function(e){if(e.target.closest(".d3b"))e.preventDefault()});
lanes.addEventListener("click",function(e){
 var b=e.target.closest(".d3b");if(!b)return;e.stopPropagation();
 if(held){held=false;return}toggle3d()},true);
document.addEventListener("pointerdown",function(e){if(P.classList.contains("on")&&!e.target.closest("#d3p")&&!e.target.closest(".d3b")&&!e.target.closest(".pw-rz"))closeP()},true);
var prev=A.onRender;A.onRender=function(){if(prev)prev.apply(this,arguments);var l=cur();if(!l||l.k==="aud")closeP()};
/* ---- panel edits (one undo step per gesture) ---- */
function set(k,v,live){var l=cur();if(!l)return;l.d3o=l.d3o||{};l.d3o[k]=v;if(live){if(A.redraw)A.redraw()}else{E.save();if(A.redraw)A.redraw()}}
P.addEventListener("click",function(e){
 if(e.target.closest(".d3p-x")){closeP();return}
 var gs=e.target.closest(".d3p-s");if(gs){var g=gs.parentNode,k=g.dataset.g;CL[k]=g.classList.toggle("cl")?1:0;try{localStorage.setItem("apexcut.d3cl",JSON.stringify(CL))}catch(x){}if(pw)pw.place();return}
 var l=cur();var b;if(!l)return;b=e.target.closest("button");if(!b)return;
 if(b.dataset.bs!=null){E.push();set("bs",+b.dataset.bs);build(l)}
 else if(b.dataset.t){E.push();var o=MD.d3o(l);set(b.dataset.t,o[b.dataset.t]?0:1);build(l)}});

P.addEventListener("input",function(e){if(!e.target.classList.contains("d3p-c"))return;var l=cur();if(!l)return;if(!P._cu){E.push();P._cu=1}set("sc",e.target.value,true)});
P.addEventListener("change",function(e){if(e.target.classList.contains("d3p-c")){P._cu=0;E.save();E.render()}});
P.addEventListener("pointerdown",function(e){
 var s=e.target.closest(".sl");if(!s||!P.contains(s))return;var l=cur();if(!l)return;
 e.preventDefault();e.stopPropagation();
 var d=SL.filter(function(x){return x&&x[0]===s.dataset.k})[0],th=$(".sl-th",s),val=$("b",s.parentNode);E.push();
 function mv(ev){var r=s.getBoundingClientRect(),w=th.offsetWidth,f=Math.max(0,Math.min(1,(ev.clientX-r.left-w/2)/Math.max(1,r.width-w))),
  v=d[2]+f*(d[3]-d[2]);v=d[4]?Math.round(v*10)/10:Math.round(v);s.style.setProperty("--f",f);val.textContent=fmt(v,d[4],d[5]);set(d[0],v,true)}
 s.classList.add("drag");mv(e);
 function end(){window.removeEventListener("pointermove",mv,true);window.removeEventListener("pointerup",end,true);window.removeEventListener("pointercancel",end,true);s.classList.remove("drag");E.save();E.render()}
 window.addEventListener("pointermove",mv,true);window.addEventListener("pointerup",end,true);window.addEventListener("pointercancel",end,true)},true);
})();
