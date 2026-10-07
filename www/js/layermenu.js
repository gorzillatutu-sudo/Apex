/* Apex Cut mobile - layer menu: select any layer -> Export morphs into 3 dots (smooth swap) and opens a glass menu:
   Flip Horizontally / Flip Vertically / Fit to Comp / Fill to Comp + color tag swatches (layer.lc) */
(function(){
"use strict";
var A=window.AX,E=A.E,S=A.S,X=A.X,$=function(s,r){return (r||document).querySelector(s)};
var ed=$("#editor"),btn=$("#edExport"),app=$("#app"),tb=$("#txBar");
var TAGS=["#ff3b14","#e0405c","#f0903c","#ffd95a","#5fe0c0","#4fb8ff","#1f6fe0"];

/* ---------- header state: single visual layer selected -> dots ---------- */
function cur(){var i=E.sel();return i!=null&&!E.msel().length?E.find(i):null}
function menuOk(){var l=cur();return !!(l&&l.k!=="aud")}
var dm=document.createElement("div");dm.className="gmenu pmenu dmenu";dm.id="dmenu";app.appendChild(dm);
function closeMenu(){dm.classList.remove("on");btn.classList.remove("dm-open")}
function upd(){var ok=menuOk();ed.classList.toggle("dsel",ok);if(!ok)closeMenu()}
var prev=A.onRender;A.onRender=function(){if(prev)prev.apply(this,arguments);upd()};

/* ---------- menu ---------- */
var ITEMS=[["fh","i-fliph","Flip Horizontally"],["fv","i-flipv","Flip Vertically"],["fit","i-fitc","Fit to Comp"],["fill","i-fillc","Fill to Comp"]];
function build(){
 var l=cur();if(!l)return false;
 var h=ITEMS.map(function(it){var on=(it[0]==="fh"&&l.fh)||(it[0]==="fv"&&l.fv);
  return '<button type="button" class="dm-it'+(on?" cur":"")+'" data-a="'+it[0]+'"><svg><use href="#'+it[1]+'"/></svg><span>'+it[2]+'</span></button>'}).join("");
 h+='<div class="dm-sep"></div><div class="dm-tags">'+TAGS.map(function(c){return '<button type="button" class="dm-sw'+(l.lc===c?" on":"")+'" data-c="'+c+'" style="--c:'+c+'" aria-label="Color tag"></button>'}).join("")+'</div>';
 dm.innerHTML=h;return true}
function openMenu(){
 if(!build())return;
 var gb=btn.getBoundingClientRect(),ar=app.getBoundingClientRect(),hb=$(".ed-top").getBoundingClientRect();
 dm.style.top=(hb.bottom-ar.top+4)+"px";dm.style.right=Math.max(8,ar.right-gb.right)+"px";dm.style.left="auto";
 dm.classList.add("on");btn.classList.add("dm-open")}

var wasOpen=false,wasSz=false;
btn.addEventListener("pointerdown",function(){wasOpen=dm.classList.contains("on");wasSz=tb.classList.contains("sz")});
var oldClick=btn.onclick;
btn.onclick=function(e){
 if(menuOk()&&!wasSz&&!ed.classList.contains("szon")){wasOpen?closeMenu():openMenu();wasOpen=false;return}
 return oldClick&&oldClick.call(this,e)};
document.addEventListener("pointerdown",function(e){if(dm.classList.contains("on")&&!e.target.closest("#dmenu")&&!e.target.closest("#edExport"))closeMenu()},true);

/* ---------- actions (undo-able, keyframe aware) ---------- */
function kfAt(l,p){var t=S.t-l.s;return ((l.kf&&l.kf[p])||[]).filter(function(k){return Math.abs(k.t-t)<.06})[0]}
function setProps(l,o){
 E.push();l.v=l.v||{};
 Object.keys(o).forEach(function(p){var arr=o[p];l.v[p]=arr.slice();var k=kfAt(l,p);
  if(k)k.v=arr.slice();
  else if(l.kf&&l.kf[p]&&l.kf[p].length){var t=S.t-l.s;if(t>=0&&t<=l.d){l.kf[p].push({t:+t.toFixed(2),v:arr.slice()});l.kf[p].sort(function(x,y){return x.t-y.t})}}})}
function done(){E.save();E.render();if(A.redraw)A.redraw()}
function flip(l,ax){E.push();var k=ax==="h"?"fh":"fv";if(l[k])delete l[k];else l[k]=1;done();A.toast((ax==="h"?"Flipped horizontally":"Flipped vertically")+(l[k]?"":" (off)"))}
function toComp(l,mode){
 var wh=X.canvasWH(),b=(A.MD&&A.MD.box)?A.MD.box(l):[wh[0],wh[1]];if(!b||!b[0]||!b[1])return;
 var r=(E.valueAt(l,"rot",S.t)[0]||0)*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),
  bw=b[0]*c+b[1]*s,bh=b[0]*s+b[1]*c,fw=wh[0]/bw,fh=wh[1]/bh,sc=mode==="fit"?Math.min(fw,fh):Math.max(fw,fh),
  an=E.valueAt(l,"anc",S.t),fx=l.fh?-1:1,fy=l.fv?-1:1,
  /* scaled+rotated anchor offset, so the layer's centre lands on the canvas centre */
  ux=fx*sc*an[0],uy=fy*sc*an[1],rx=ux*Math.cos(r)-uy*Math.sin(r),ry=ux*Math.sin(r)+uy*Math.cos(r);
 setProps(l,{scl:[+(sc*100).toFixed(2)],pos:[+(-(an[0]-rx)).toFixed(1),+(-(an[1]-ry)).toFixed(1),0]});done();
 A.toast(mode==="fit"?"Fit to Comp":"Fill to Comp")}
function tag(l,c){E.push();if(l.lc===c)delete l.lc;else l.lc=c;E.save();E.render();A.toast(l.lc?"Color tag set":"Color tag removed")}

dm.addEventListener("click",function(e){
 var l=cur();if(!l){closeMenu();return}
 var sw=e.target.closest(".dm-sw");
 if(sw){tag(l,sw.dataset.c);build();return}            /* menu stays open so colors can be compared */
 var b=e.target.closest(".dm-it");if(!b)return;
 var a=b.dataset.a;closeMenu();
 if(a==="fh")flip(l,"h");else if(a==="fv")flip(l,"v");else toComp(l,a)});
upd();
})();
