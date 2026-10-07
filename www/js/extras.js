/* Apex Cut mobile - glass tool panel (context-aware), hold-to-add / hold-to-transform, transform panel with keyframes, pinch zoom, graph-editor fit */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var A=window.AX,S=A.S,E=A.E,tools=$("#tools"),pill=$("#toolPill"),fab=$("#btnAdd"),mp=$("#mp"),tl=$("#tl");
var VIS=function(k){return k!=="aud"&&k!=="txt"};

/* ---------- graph editor scales itself to the phone ---------- */
window.ApexFit=function(el){var s=Math.min(1,(window.innerWidth-20)/372);el.style.zoom=s;el.__apexScale=1;return function(){el.style.zoom=""}};

/* ---------- bottom pill: nothing selected = normal tools, layer selected = In trim / Split / Out trim / Delete ---------- */
var BT={
 edit:["i-edit","Edit"],cut:["i-cut","Split"],dup:["i-layout","Duplicate"],del:["i-trash","Delete"],etxt:["i-text","Edit text"],
 trimin:["i-trimin","Trim in point"],split:["i-split","Split"],trimout:["i-trimout","Trim out point"],
 fill:["i-fill","Color & Fill"],border:["i-border","Border & Shadow"],blend:["i-blend","Blending"],fx:["i-fx","Effects"],shape:["i-shape","Shapes"],eshape:["i-edit","Edit shape"],tcolor:["i-tcolor","Text color"],tanim:["i-tanim","Text animator"],
 nul:["i-null","Null"],adj:["i-adjl","Adjustment layer"],vec:["i-vec","Vector drawing"],sol:["i-solid","Solid layer"],extract:["i-extract","Extract audio"],bgr:["i-bgr","Remove background"]};
var SETS={none:["nul","adj","vec","sol","border","blend","fx","shape"],selA:["trimin","split","trimout","del","vec"],sel:["trimin","split","trimout","del","vec","border","blend","fx"],selJ:["trimin","split","trimout","del","vec","fx"],selt:["etxt","tcolor","tanim","trimin","split","trimout","del","vec","border","blend","fx"],selS:["fill","trimin","split","trimout","del","vec","border","blend","fx"],selSh:["eshape","fill","trimin","split","trimout","del","vec","border","blend","fx"],selV:["extract","trimin","split","trimout","del","vec","border","blend","fx"],selM:["extract","vec"],selB:["bgr","trimin","split","trimout","del","vec","border","blend","fx"],selVB:["bgr","extract","trimin","split","trimout","del","vec","border","blend","fx"],selVec:["vec","trimin","split","trimout","del","border","blend","fx"]};
var curSet="";
function kindSet(){var l=E.M()&&E.sel()&&E.find(E.sel());
 if(l)return l.k==="txt"?"selt":l.k==="shp"?"selSh":l.k==="sol"?"selS":(l.k==="aud"||l.k==="nul")?"selA":l.k==="adj"?"selJ":l.k==="vec"?"selVec":(l.k==="vid"||l.k==="img")?(E.hasAud(l)?"selVB":"selB"):E.hasAud(l)?"selV":"sel";
 var ms=E.M()?E.msel():[];
 if(ms&&ms.length&&ms.some(function(i){return E.hasAud(E.find(i))}))return "selM";
 return "none"}
function buildPanel(){
 var k=kindSet();if(k===curSet)return;curSet=k;
 pill.classList.toggle("four",SETS[k].length<=4);fab.classList.toggle("sel",k!=="none"&&k!=="selM");
 pill.innerHTML=SETS[k].map(function(a){var b=BT[a];return '<button data-a="'+a+'" aria-label="'+b[1]+'"><svg><use href="#'+b[0]+'"/></svg></button>'}).join("");
 pill.scrollLeft=0;layPill()}
/* only 4 icons fit in the pill; the rest scroll sideways */
function layPill(){var w=pill.clientWidth;if(!w||SETS[curSet].length<=4){pill.style.removeProperty("--pg");return}
 var r=rem(),g=(w-2*1.2*r-4*11.6*r)/3;pill.style.setProperty("--pg",Math.max(0,g)+"px")}
window.addEventListener("resize",function(){layPill()});
A.onRender=function(){var l=E.sel()?E.find(E.sel()):null;if(!l)closeMP(false);if(l){closeSP();closeVP()}if(!l||l.k!=="txt")closeCP();if(!l||(l.k!=="shp"&&l.k!=="sol"))closeFP();buildPanel();txUI();preview();if(A.XP)A.XP.sync();if(A.SE)A.SE.sync();if(A.TE)A.TE.sync();if(A.TA)A.TA.sync();if(mp.classList.contains("on")&&!dragging)mpRender();if(fp.classList.contains("on")&&!fdrag)fpRender()};
pill.addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b)return;var a=b.dataset.a;if(a!=="eshape"&&A.SE)A.SE.close();
 if(a==="edit")A.toast("Tap a layer to edit it");
 else if(a==="cut"||a==="split")E.split();
 else if(a==="trimin")E.trimIn();
 else if(a==="trimout")E.trimOut();
 else if(a==="dup")E.dup();
 else if(a==="del")E.del();
 else if(a==="extract")E.extract();
 else if(a==="eshape"){if(A.SE)A.SE.open()}
 else if(a==="shape")openSP();
 else if(a==="tcolor")openCP();
 else if(a==="tanim"){if(A.TA)A.TA.open()}
 else if(a==="fill")openFP();
 else if(a==="vec"){var sl0=E.sel()!=null&&E.find(E.sel());if(A.PEN&&(sl0||(E.msel&&E.msel().length)))A.PEN.open();else openVP()}
 else if(a==="bgr"){if(A.BG)A.BG.open()}
 else if(a==="nul"||a==="adj"||a==="sol"){E.addLayer(a==="sol"?{k:"sol",fill:{m:"solid",c:"#7c6cff",o:100}}:{k:a},true);A.toast(BT[a][1]+" added")}
 else if(a==="etxt"){if(A.TE)A.TE.open()}
 else if(a==="border"||a==="blend"||a==="fx"){if(A.XP)A.XP.open(a)}
});

/* blue switch: tap = show / hide the pill, hold = add menu (no layer) or transform panel (layer selected) */
var hold=0,held=false;
function setOpen(o){tools.classList.toggle("open",o);pill.setAttribute("aria-hidden",o?"false":"true");if(!o){if(A.SE)A.SE.close();closeMP(false);closeSP();closeCP();closeFP();closeVP();if(A.BG)A.BG.close();if(A.PEN)A.PEN.close();if(A.XP)A.XP.close(false);if(A.TA)A.TA.close(false)}else layPill()}
fab.onclick=null;
fab.addEventListener("pointerdown",function(e){held=false;clearTimeout(hold);hold=setTimeout(function(){held=true;HX.hold();
 if(E.sel()&&E.find(E.sel()))openMP("a");else E.openAdd(fab)},420)});
["pointerup","pointercancel","pointerleave"].forEach(function(n){fab.addEventListener(n,function(){clearTimeout(hold)})});
fab.addEventListener("click",function(e){e.stopPropagation();if(held){held=false;return}setOpen(!tools.classList.contains("open"))});
fab.addEventListener("contextmenu",function(e){e.preventDefault()});

/* ---------- transform panel (Position / Scale / Rotate / Opacity + Anchor & Align) ---------- */
var UN={pos:"",anc:"",scl:"%",rot:"\u00B0",opa:"%",lvl:" dB",fin:" s",fout:" s"};
var D={ /* slider definitions. mid = value at the centre notch (two-sided scale), tick = notch on a plain linear scale */
 pos:[{t:"Pos X",min:-1000,max:1000,mid:0,step:1},{t:"Pos Y",min:-1000,max:1000,mid:0,step:1},{t:"Pos Z",min:-1000,max:1000,mid:0,step:1}],
 scl:[{t:"Scale",min:0,max:400,mid:100,step:1}],
 rot:[{t:"Rotate",min:-360,max:360,mid:0,step:1},{t:"X Rotation",min:-360,max:360,mid:0,step:1},{t:"Y Rotation",min:-360,max:360,mid:0,step:1}],
 opa:[{t:"Opacity",min:0,max:100,step:1}],
 anc:[{t:"Anchor X",min:-1000,max:1000,mid:0,step:1},{t:"Anchor Y",min:-1000,max:1000,mid:0,step:1}],
 lvl:[{t:"Level",min:-40,max:10,tick:0,step:.5}],
 fin:[{t:"Fade In",min:0,max:5,step:.1}],
 fout:[{t:"Fade Out",min:0,max:5,step:.1}]};
var TABP={a:["pos","scl","rot","opa"],n:["anc"],u:["lvl","fin","fout"]};
var tab="a",dragging=false,pushed=false,posAx=0,rotAx=1;
var CUBE='<svg class="a3"><use href="#i-3d"/></svg>',ROTO=[[1,"X"],[2,"Y"],[0,"Z"]];   /* rotation chips: X, Y, Z -> array index 1, 2, 0 */
function is3(l){return E.is3d(l)}
function curL(){return E.find(E.sel())}
function vals(l,p){return E.valueAt(l,p,S.t)}
function kfAt(l,p){var t=S.t-l.s;return ((l.kf&&l.kf[p])||[]).filter(function(k){return Math.abs(k.t-t)<.06})[0]}
function fmtV(p,d,v){return (+v).toFixed(d.step<1?1:0)+UN[p]}
function v2f(d,v){var m=d.mid,f;if(m!=null)f=v<=m?.5*(v-d.min)/(m-d.min):.5+.5*(v-m)/(d.max-m);else f=(v-d.min)/(d.max-d.min);return Math.max(0,Math.min(1,f))}
function f2v(d,f){f=Math.max(0,Math.min(1,f));var m=d.mid;return m!=null?(f<.5?d.min+(m-d.min)*f*2:m+(d.max-m)*(f-.5)*2):d.min+(d.max-d.min)*f}
function notch(d){return d.mid!=null?d.mid:d.tick}
function rem(){var p=window.__apexRemProbe;if(!p||!p.isConnected){p=window.__apexRemProbe=document.createElement("div");p.style.cssText="position:absolute;left:-9999px;top:0;width:100rem;height:0;visibility:hidden;pointer-events:none";(document.body||document.documentElement).appendChild(p)}var w=p.getBoundingClientRect().width/100;return w>0?w:(parseFloat(getComputedStyle(document.documentElement).fontSize)||4)}
function paint(sl,v){
 var d=D[sl.dataset.p][+sl.dataset.i],f=v2f(d,v),n=notch(d),c=n!=null?v2f(d,n):0;
 sl.style.setProperty("--f",f);sl.style.setProperty("--c",c);sl.style.setProperty("--a",Math.min(c,f));sl.style.setProperty("--b",Math.max(c,f));
 sl.classList.toggle("snap",n!=null&&Math.abs(v-n)<1e-6);sl.classList.toggle("uni",n==null)}
function canvasWH(){var m=/^(\d+):(\d+)$/.exec((S.cur&&S.cur.ratio)||"16:9"),w=m?+m[1]:16,h=m?+m[2]:9;return w>=h?[1080*w/h,1080]:[1080,1080*h/w]}

function posHTML(){
 var l=curL(),v=vals(l,"pos"),d3=is3(l),n=d3?3:2,kb='<button class="pp-k kfb" data-p="pos" aria-label="Keyframe"><svg><use href="#i-key"/></svg></button>';
 if(posAx>=n)posAx=0;
 return '<div class="mp-r mp-pos" data-p="pos">'+kb+'<span class="mp-l">Position</span><div class="axs">'+["X","Y","Z"].slice(0,n).map(function(nm,i){
  return '<button type="button" class="ax'+(i===posAx?" on":"")+'" data-ax="'+i+'"><b>'+Math.round(v[i])+'</b><em>'+(i===2?CUBE:"")+nm+'</em></button>'}).join("")+
  '</div><div class="sl" data-p="pos" data-i="'+posAx+'"><i class="sl-fill"></i><i class="sl-tick"></i><b class="sl-th"></b></div></div>'}
/* 3D layers: Rotation row with X / Y / Z chips (cube icon on each) */
function rot3HTML(){
 var v=vals(curL(),"rot"),kb='<button class="pp-k kfb" data-p="rot" aria-label="Keyframe"><svg><use href="#i-key"/></svg></button>';
 return '<div class="mp-r mp-pos mp-rot3" data-p="rot">'+kb+'<span class="mp-l">Rotation</span><div class="axs">'+ROTO.map(function(o){
  return '<button type="button" class="ax'+(o[0]===rotAx?" on":"")+'" data-ax="'+o[0]+'"><b>'+Math.round(v[o[0]])+'</b><em>'+CUBE+o[1]+'</em></button>'}).join("")+
  '</div><div class="sl" data-p="rot" data-i="'+rotAx+'"><i class="sl-fill"></i><i class="sl-tick"></i><b class="sl-th"></b></div></div>'}
function rowHTML(p,i){
 if(p==="pos")return i===0?posHTML():"";
 if(p==="rot"){if(i!==0)return "";if(is3(curL()))return rot3HTML()}
 var d=D[p][i],v=vals(curL(),p)[i];
 return '<div class="mp-r" data-p="'+p+'">'+
  (i===0?'<button class="pp-k kfb" data-p="'+p+'" aria-label="Keyframe"><svg><use href="#i-key"/></svg></button>':'<i class="mp-sp"></i>')+
  '<span class="mp-l">'+d.t+'</span><div class="sl" data-p="'+p+'" data-i="'+i+'"><i class="sl-fill"></i><i class="sl-tick"></i><b class="sl-th"></b></div>'+
  '<output class="mp-v" data-p="'+p+'" data-i="'+i+'">'+fmtV(p,d,v)+'</output></div>'}
var PRE=[["TL",-1,-1,0],["TC",0,-1,-90],["TR",1,-1,180],["ML",-1,0,180],["C",0,0,null],["MR",1,0,0],["BL",-1,1,0],["BC",0,1,90],["BR",1,1,180]];
var ALN=[["l","i-al-l",0],["ch","i-al-c",0],["r","i-al-r",0],["t","i-al-l",90],["cv","i-al-m",0],["b","i-al-r",90]];
function mpRender(){
 var l=curL();if(!l)return;
 var aud=l.k==="aud",list=aud?TABP.u:TABP[tab];
 mp.classList.toggle("aud",aud);
 $("#mpTitle").textContent=aud?"Audio":"";
 $$("#mpTabs button").forEach(function(b){b.classList.toggle("on",b.dataset.t===tab)});
 var h="";list.forEach(function(p){D[p].forEach(function(d,i){h+=rowHTML(p,i)})});
 if(!aud&&tab==="n"){
  var a=vals(l,"anc"),wh=canvasWH();
  h+='<div class="mp-two"><div><div class="mp-sub">Preset Anchor</div><div class="mp-grid g3">'+PRE.map(function(q){
   var on=Math.abs(a[0]-q[1]*wh[0]/2)<1.5&&Math.abs(a[1]-q[2]*wh[1]/2)<1.5;
   return '<button class="mp-pb'+(on?" on":"")+'" data-pre="'+q[0]+'"><svg'+(q[3]?' style="transform:rotate('+q[3]+'deg)"':'')+'><use href="#'+(q[3]==null?"i-aim":"i-tri")+'"/></svg></button>'}).join("")+'</div></div>'+
   '<div><div class="mp-sub">Align to Canvas</div><div class="mp-grid g3">'+ALN.map(function(q){
   return '<button class="mp-pb" data-al="'+q[0]+'"><svg'+(q[2]?' style="transform:rotate('+q[2]+'deg)"':'')+'><use href="#'+q[1]+'"/></svg></button>'}).join("")+'</div></div></div>'}
 $("#mpB").innerHTML=h;
 $$("#mpB .sl").forEach(function(sl){paint(sl,vals(l,sl.dataset.p)[+sl.dataset.i])});applyH();
 kfState()}
function kfState(){var l=curL();if(!l)return;$$("#mpB .kfb").forEach(function(b){b.classList.toggle("on",!!kfAt(l,b.dataset.p))})}
function mpSync(){var l=curL();if(!l||dragging)return;
 $$("#mpB .sl").forEach(function(sl){var p=sl.dataset.p,i=+sl.dataset.i;showVal(sl,vals(l,p)[i])});
 [["pos",3],["rot",3]].forEach(function(o){if(!isChip(o[0],l))return;var v=vals(l,o[0]);for(var i=0;i<o[1];i++){var b=chipB(o[0],i);if(b)b.textContent=Math.round(v[i])}})}
A.onT=function(){if(mp.classList.contains("on")){kfState();mpSync()}preview()};

var prevOpen=false;
function openMP(t){
 var l=curL();if(!l)return;if(A.SE)A.SE.close();closeFP();if(A.XP)A.XP.close(false);
 tab=l.k==="aud"?"u":(t||"a");mpRender();
 mp.classList.add("on");mp.setAttribute("aria-hidden","false");tools.classList.add("mv")}
function closeMP(restore){
 if(!mp.classList.contains("on"))return;
 mp.classList.remove("on");mp.setAttribute("aria-hidden","true");tools.classList.remove("mv");
 if(restore!==false){tools.classList.add("open");pill.setAttribute("aria-hidden","false")}}
$("#mpX").onclick=function(){closeMP(true)};
$("#mpTabs").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||b.dataset.t===tab)return;tab=b.dataset.t;mpRender()});

/* custom slider: drag anywhere on the groove, snaps to the centre notch */
function applyVal(l,p,i,v){
 if(!pushed){E.push();pushed=true}
 var a=vals(l,p);a[i]=v;l.v=l.v||{};l.v[p]=a;E.setSelProp(l.i,p);
 var ks=l.kf&&l.kf[p];
 if(ks&&ks.length){var k=kfAt(l,p),t=S.t-l.s; /* animated property: editing between keys drops a new keyframe (like After Effects) */
  if(k)k.v=a.slice();else if(t>=-.001&&t<=l.d+.001){ks.push({t:+t.toFixed(2),v:a.slice()});ks.sort(function(x,y){return x.t-y.t})}}
 preview()}
function chipB(p,i){return $('#mpB .mp-r[data-p="'+p+'"] .ax[data-ax="'+i+'"] b')}
function isChip(p,l){return p==="pos"||(p==="rot"&&l&&is3(l))}
function showVal(sl,v){var p=sl.dataset.p,d=D[p][+sl.dataset.i];paint(sl,v);
 if(isChip(p,curL())){var c=chipB(p,sl.dataset.i);if(c)c.textContent=Math.round(v)}
 else sl.nextElementSibling.textContent=fmtV(p,d,v)}
$("#mpB").addEventListener("pointerdown",function(e){
 var sl=e.target.closest(".sl");if(!sl)return;e.preventDefault();
 var l=curL();if(!l)return;
 var p=sl.dataset.p,i=+sl.dataset.i,d=D[p][i],n=notch(d),wasSnap=false;
 dragging=true;pushed=false;sl.setPointerCapture(e.pointerId);sl.classList.add("drag");document.body.classList.add("sliding");
 var R=sl.getBoundingClientRect(),REM=rem(),SC=R.width/(sl.offsetWidth||R.width||1),hx=HX.slider(),raf=0,px=e.clientX;
 function apply(cx){
  var r=R,sc=SC,pad=5.2*REM*sc,f=(cx-r.left-pad)/Math.max(1,r.width-2*pad);f=Math.max(0,Math.min(1,f));
  var v=f2v(d,f),snap=false;
  if(n!=null&&Math.abs(f-v2f(d,n))*(r.width-2*pad)<2.6*REM*sc){v=n;snap=true}
  else v=Math.round(v/d.step)*d.step;
  v=+v.toFixed(2);
  hx.move(f,snap,wasSnap);
  wasSnap=snap;applyVal(l,p,i,v);showVal(sl,v)}
 function move(ev){px=ev.clientX;if(!raf)raf=requestAnimationFrame(function(){raf=0;apply(px)})}
 function up(){if(raf){cancelAnimationFrame(raf);raf=0;apply(px)}document.body.classList.remove("sliding");sl.removeEventListener("pointermove",move);sl.removeEventListener("pointerup",up);sl.removeEventListener("pointercancel",up);
  sl.classList.remove("drag");dragging=false;E.save();E.render();mpRender();A.redraw()}
 sl.addEventListener("pointermove",move);sl.addEventListener("pointerup",up);sl.addEventListener("pointercancel",up);apply(e.clientX)});
/* tap a value to type it (allows numbers beyond the slider range) */
$("#mpB").addEventListener("click",function(e){
 var o=e.target.closest(".mp-v");
 if(o){var l=curL(),p=o.dataset.p,i=+o.dataset.i,d=D[p][i];if(!l)return;
  A.askText(d.t,String(vals(l,p)[i])).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;
   v=(p==="pos"||p==="anc")?Math.max(-5000,Math.min(5000,v)):Math.max(d.min,Math.min(d.max,v));pushed=false;applyVal(l,p,i,v);E.save();E.render();mpRender()});return}
 var ax=e.target.closest(".ax");
 if(ax){var l2=curL(),ai=+ax.dataset.ax,row=ax.closest(".mp-r"),rp=row?row.dataset.p:"pos";if(!l2)return;
  var cur0=rp==="rot"?rotAx:posAx;
  if(ai!==cur0){if(rp==="rot")rotAx=ai;else posAx=ai;mpRender();return}
  var ttl=rp==="rot"?(["Z","X","Y"][ai]+" Rotation"):("Position "+"XYZ".charAt(ai));
  A.askText(ttl,String(vals(l2,rp)[ai])).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;
   v=rp==="rot"?Math.max(-720,Math.min(720,v)):Math.max(-5000,Math.min(5000,v));pushed=false;applyVal(l2,rp,ai,v);E.save();E.render();mpRender()});return}
 var k=e.target.closest(".kfb");if(k){toggleKf(k.dataset.p);return}
 var pb=e.target.closest("[data-pre]");if(pb){preset(pb.dataset.pre);return}
 var al=e.target.closest("[data-al]");if(al)align(al.dataset.al)});
function toggleKf(p){
 var l=curL();if(!l)return;var t=S.t-l.s;
 if(t<-.001||t>l.d+.001){A.toast("Move the playhead onto the layer");return}
 E.push();l.kf=l.kf||{};E.setSelProp(l.i,p);var a=l.kf[p]=l.kf[p]||[],k=kfAt(l,p);
 if(k)a.splice(a.indexOf(k),1);else{a.push({t:+t.toFixed(2),v:vals(l,p)});a.sort(function(x,y){return x.t-y.t})}
 if(!a.length)delete l.kf[p];
 l.x=true;E.render();E.save();kfState();A.toast(k?"Keyframe removed":"Keyframe added")}
function setProp(l,p,arr){E.push();l.v=l.v||{};l.v[p]=arr;var k=kfAt(l,p);if(k)k.v=arr.slice();else if(l.kf&&l.kf[p]&&l.kf[p].length){var t=S.t-l.s;if(t>=0&&t<=l.d){l.kf[p].push({t:+t.toFixed(2),v:arr.slice()});l.kf[p].sort(function(x,y){return x.t-y.t})}}E.save();E.render();mpRender();preview()}
function preset(c){
 var l=curL(),q=PRE.filter(function(x){return x[0]===c})[0],wh=canvasWH();if(!l||!q)return;
 setProp(l,"anc",[Math.round(q[1]*wh[0]/2),Math.round(q[2]*wh[1]/2)])}
function align(c){ /* layer is treated as full-frame media (no real size yet): flush to the canvas edge at its current scale */
 var l=curL(),wh=canvasWH();if(!l)return;
 var s=vals(l,"scl")[0]/100,p=vals(l,"pos"),bx=(A.MD&&A.MD.box)?A.MD.box(l):[wh[0],wh[1]],dx=(s*bx[0]-wh[0])/2,dy=(s*bx[1]-wh[1])/2;
 if(c==="ch")p[0]=0;else if(c==="l")p[0]=Math.round(dx);else if(c==="r")p[0]=Math.round(-dx);
 else if(c==="cv")p[1]=0;else if(c==="t")p[1]=Math.round(dy);else if(c==="b")p[1]=Math.round(-dy);
 setProp(l,"pos",p)}
$("#mpR").onclick=function(){
 var l=curL();if(!l)return;var list=l.k==="aud"?TABP.u:TABP[tab];
 E.push();l.v=l.v||{};list.forEach(function(p){l.v[p]=E.PDEF[p].slice();var k=kfAt(l,p);if(k)k.v=E.PDEF[p].slice()});
 E.save();E.render();mpRender();preview()};
/* tapping a property row in an expanded layer opens the panel on the matching tab */
A.closePanels=function(){closeMP(false);closeSP();closeCP();closeFP();closeVP();if(A.XP)A.XP.close(false)};
A.onProp=function(p,diamond){var l=curL();if(!l)return;if(!mp.classList.contains("on"))openMP(p==="anc"?"n":"a");else{tab=l.k==="aud"?"u":(p==="anc"?"n":"a");mpRender()}
 if(diamond&&D[p])toggleKf(p)};

/* ---------- shapes: panel with shape switches, tap = add a shape layer at the playhead ---------- */
var sp=$("#sp"),SHP=[
 ["circle","Circle",'<circle cx="12" cy="12" r="9.2" fill="currentColor"/>'],
 ["square","Square",'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="1.2" fill="currentColor"/>'],
 ["rounded","Rounded",'<rect x="3" y="3" width="18" height="18" rx="6" fill="currentColor"/>'],
 ["triangle","Triangle",'<path d="M12 3.4L21.2 19.6H2.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'],
 ["diamond","Diamond",'<path d="M12 2.4L21.6 12 12 21.6 2.4 12z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>'],
 ["pentagon","Pentagon",'<path d="M12 2.8l8.9 6.5-3.4 10.4H6.5L3.1 9.3z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'],
 ["hexagon","Hexagon",'<path d="M7.4 3.8h9.2L21.2 12l-4.6 8.2H7.4L2.8 12z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'],
 ["star","Star",'<path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.4 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'],
 ["heart","Heart",'<path d="M12 20.6C5 15.2 3 11.6 3 8.8A4.8 4.8 0 0112 6.6a4.8 4.8 0 019 2.2c0 2.8-2 6.4-9 11.8z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>'],
 ["arrow","Arrow",'<path d="M3 9.4h10V4.6L21.2 12 13 19.4v-4.8H3z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'],
 ["plus","Plus",'<path d="M9.4 3h5.2v6.4H21v5.2h-6.4V21H9.4v-6.4H3V9.4h6.4z" fill="currentColor"/>'],
 ["ring","Ring",'<circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" stroke-width="3.6"/>']];
function shSvg(id){var q=SHP.filter(function(x){return x[0]===id})[0]||SHP[0];return '<svg viewBox="0 0 24 24">'+q[2]+'</svg>'}
$("#spG").innerHTML=SHP.map(function(q){return '<button class="mp-pb" data-sh="'+q[0]+'" aria-label="'+q[1]+'">'+shSvg(q[0])+'</button>'}).join("");
function openSP(){if(A.SE)A.SE.close();closeMP(false);closeFP();closeVP();if(A.XP)A.XP.close(false);sp.classList.add("on");sp.setAttribute("aria-hidden","false");tools.classList.add("mv")}
function closeSP(){if(!sp.classList.contains("on"))return;sp.classList.remove("on");sp.setAttribute("aria-hidden","true");tools.classList.remove("mv")}
$("#spX").onclick=closeSP;
$("#spG").addEventListener("click",function(e){var b=e.target.closest("[data-sh]");if(!b)return;
 var q=SHP.filter(function(x){return x[0]===b.dataset.sh})[0],nl=E.addShape(q[0],q[1]);A.toast(q[1]+" added");
 if(nl&&A.SE){E.select(nl.i);closeSP();A.SE.open()}});
var shL=document.createElement("div");shL.className="shlayer";$("#canvas").appendChild(shL);
var solL=document.createElement("div");solL.className="sollayer";$("#canvas").insertBefore(solL,$("#canvas").firstChild);
var vcL=document.createElement("div");vcL.className="shlayer";$("#canvas").appendChild(vcL);
var gdL=document.createElement("div");gdL.className="shlayer gdlayer";$("#canvas").appendChild(gdL);
/* ---- fill helpers (shape + solid layers): none / solid colour / gradient (linear, radial, mirror) ---- */
var FD={g:{t:"lin",a:0,s:[{p:0,c:"#000000"},{p:1,c:"#ffffff"}]}};
function fl(l,dc){var f=l.fill||{};return {m:f.m||"solid",c:f.c||dc,o:f.o==null?100:f.o,g:f.g||FD.g}}
function rgba(h,o){var n=parseInt(String(h).replace("#",""),16)||0;return "rgba("+(n>>16)+","+((n>>8)&255)+","+(n&255)+","+(o/100)+")"}
function gstops(g){var s=g.s.slice().sort(function(a,b){return a.p-b.p});
 if(g.t==="mir"){var h=s.map(function(x){return {p:x.p/2,c:x.c}}),r=s.slice().reverse().map(function(x){return {p:1-x.p/2,c:x.c}});s=h.concat(r)}return s}
function cssFill(f){if(f.m==="none")return "transparent";if(f.m==="solid")return rgba(f.c,f.o);
 var st=gstops(f.g).map(function(x){return x.c+" "+(x.p*100).toFixed(1)+"%"}).join(",");
 return f.g.t==="rad"?"radial-gradient(circle closest-side at 50% 50%,"+st+")":"linear-gradient("+(f.g.a+90)+"deg,"+st+")"}
function cfill(c,f,x,y,w,h){if(f.m==="none")return null;if(f.m==="solid")return rgba(f.c,f.o);
 var g=f.g,gr;
 if(g.t==="rad"){gr=c.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.min(w,h)/2)}
 else{var a=g.a*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),L=.5*(Math.abs(dx)*w+Math.abs(dy)*h);gr=c.createLinearGradient(x+w/2-dx*L,y+h/2-dy*L,x+w/2+dx*L,y+h/2+dy*L)}
 gstops(g).forEach(function(q){gr.addColorStop(Math.max(0,Math.min(1,q.p)),q.c)});return gr}
function shSvgF(id,f,uid){
 var q=SHP.filter(function(x){return x[0]===id})[0]||SHP[0],body=q[2];
 if(f.m!=="grad")return '<svg viewBox="0 0 24 24">'+body+'</svg>';
 var gid="fg"+uid,st=gstops(f.g).map(function(x){return '<stop offset="'+x.p+'" stop-color="'+x.c+'"/>'}).join(""),d;
 if(f.g.t==="rad")d='<radialGradient id="'+gid+'" cx=".5" cy=".5" r=".5">'+st+'</radialGradient>';
 else{var a=f.g.a*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),L=.5*(Math.abs(dx)+Math.abs(dy));
  d='<linearGradient id="'+gid+'" x1="'+(.5-dx*L)+'" y1="'+(.5-dy*L)+'" x2="'+(.5+dx*L)+'" y2="'+(.5+dy*L)+'">'+st+'</linearGradient>'}
 return '<svg viewBox="0 0 24 24"><defs>'+d+'</defs>'+body.replace(/currentColor/g,"url(#"+gid+")")+'</svg>'}
/* freehand vector path (smoothed with quadratic midpoints) */
function pathD(p){if(!p||!p.length)return "";
 if(p.length<3)return "M"+p[0][0]+" "+p[0][1]+(p.length===1?"l.1 0":"L"+p[1][0]+" "+p[1][1]);
 var d="M"+p[0][0]+" "+p[0][1];for(var i=1;i<p.length-1;i++){var mx=(p[i][0]+p[i+1][0])/2,my=(p[i][1]+p[i+1][1])/2;d+="Q"+p[i][0]+" "+p[i][1]+" "+mx+" "+my}
 var z=p[p.length-1];return d+"L"+z[0]+" "+z[1]}
function tfm(q,k){return "translate("+(q.x*k)+"px,"+(q.y*k)+"px) rotate("+q.r+"deg) scale("+q.s+")"}
function shapesRender(){
 var M=E.M();if(!M){shL.innerHTML=solL.innerHTML=vcL.innerHTML=gdL.innerHTML="";return}
 var wh=canvasWH(),ch=$("#canvas").clientHeight||200,k=ch/wh[1],sl=E.sel();
 shL.innerHTML=M.L.filter(function(l){return l.k==="shp"&&active(l)}).map(function(l){
  var q=xform(l),f=fl(l,"#ffffff");
  return '<div class="shi'+(l.i===sl?" on":"")+'" style="transform:'+tfm(q,k)+';opacity:'+q.o+';color:'+(f.m==="solid"?rgba(f.c,f.o):"transparent")+'">'+shSvgF(l.sh,f,l.i)+'</div>'}).join("");
 solL.innerHTML=M.L.filter(function(l){return l.k==="sol"&&active(l)}).map(function(l){
  var q=xform(l);return '<div class="soli'+(l.i===sl?" on":"")+'" style="background:'+cssFill(fl(l,"#7c6cff"))+';opacity:'+q.o+';transform:'+tfm(q,k)+'"></div>'}).join("");
 vcL.innerHTML=M.L.filter(function(l){return l.k==="vec"&&active(l)}).map(function(l){
  var q=xform(l);return '<svg class="vci" viewBox="'+(-wh[0]/2)+' '+(-wh[1]/2)+' '+wh[0]+' '+wh[1]+'" style="transform:'+tfm(q,k)+';opacity:'+q.o+'">'+
   (l.st||[]).map(function(t){return '<path d="'+pathD(t.p)+'" fill="none" stroke="'+t.c+'" stroke-width="'+t.w+'" stroke-linecap="round" stroke-linejoin="round"/>'}).join("")+'</svg>'}).join("");
 gdL.innerHTML=M.L.filter(function(l){return (l.k==="nul"||l.k==="adj")&&active(l)}).map(function(l){
  var q=xform(l);return '<div class="gdi '+l.k+(l.i===sl?" on":"")+'" style="transform:'+tfm(q,k)+';opacity:'+Math.max(.35,q.o)+'"></div>'}).join("")}

/* ---------- canvas preview: every visible layer at the playhead, keyframes + graph curves evaluated live ---------- */
var txl=document.createElement("div");txl.className="txlayer";$("#canvas").appendChild(txl);
function canvasH1(){return canvasWH()[1]}
function active(l){return !l.h&&S.t>=l.s-1e-6&&S.t<=l.s+l.d+1e-6}
function xform(l){var p=E.valueAt(l,"pos",S.t),sc=E.valueAt(l,"scl",S.t)[0]/100*(A.MD&&A.MD.zs?A.MD.zs(p[2]):1),r=E.valueAt(l,"rot",S.t)[0],o=E.valueAt(l,"opa",S.t)[0]/100;return {x:p[0],y:p[1],s:sc,r:r,o:Math.max(0,Math.min(1,o))}}
function preview(){
 var ic=$("#canvas .appicon"),tp=$("#txPrev"),M=E.M();if(!ic||!M)return;
 if(A.redraw){ic.style.display="none";tp.style.display="none";shL.innerHTML=solL.innerHTML=vcL.innerHTML=gdL.innerHTML="";txl.innerHTML="";A.redraw();return}
 tp.style.display="none";shapesRender();
 var ch=$("#canvas").clientHeight||200,k=ch/canvasH1(),vs=M.L.filter(function(l){return l.k==="vid"});
 if(vs.length){var l=vs.filter(active)[0];
  if(!l){ic.style.visibility="hidden"}
  else{var q=xform(l);ic.style.visibility="";ic.style.transform="translate("+(q.x*k)+"px,"+(q.y*k)+"px) rotate("+q.r+"deg) scale("+q.s+")";ic.style.opacity=q.o}}
 else{ic.style.visibility="";ic.style.transform="";ic.style.opacity=""}
 var h="";
 M.L.filter(function(l){return l.k==="txt"&&active(l)}).forEach(function(l){var t=tf(l),q=xform(l);
  h+='<div class="txi" style="font-family:\''+t.f+'\',Roboto,\'Noto Sans Myanmar\',sans-serif;font-size:'+(t.s*ch/270)+'px;color:'+t.c+';text-align:'+(t.a==="l"?"left":t.a==="r"?"right":"center")+';opacity:'+q.o+';transform:translateY(-50%) translate('+(q.x*k)+'px,'+(q.y*k)+'px) rotate('+q.r+'deg) scale('+q.s+')">'+esc2(l.t||"Text")+'</div>'});
 txl.innerHTML=h}
function esc2(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]}).replace(/\n/g,"<br>")}

/* ---------- panel height: grab the top grip and drag up / down; contents rescale, size is remembered ---------- */
var HK="apexcut.mp.h",HDEF=64,mph=HDEF;
try{localStorage.removeItem(HK)}catch(x){}   /* v20: height now comes from the corner resize */
function hMax(){var ed=$("#editor").clientHeight/rem();return Math.max(40,ed-13-20-40)}
function applyH(){mph=Math.max(34,Math.min(hMax(),mph));mp.style.setProperty("--mph",mph+"rem");mp.style.setProperty("--k",Math.max(.62,Math.min(1.12,mph/HDEF)).toFixed(3))}
function saveH(){try{localStorage.setItem(HK,String(+mph.toFixed(1)))}catch(x){}}
A.mpWin=A.panelWin(mp,{key:"apexcut.mp.win",drag:".mp-grip,.mp-h"});


/* ---------- text layer: header swaps the project title for Font / size / align ---------- */
var FONTS=["Roboto","Noto Sans Myanmar","Georgia","Times New Roman","Courier New","Impact","Trebuchet MS","Verdana","Comic Sans MS"],TD={f:"Roboto",s:18,a:"c",c:"#ffffff"};
function tf(l){return Object.assign({},TD,l.tf||{})}
var fm=document.createElement("div");fm.className="gmenu card-menu fmenu";
function fbtn(f){return '<button type="button" data-f="'+f+'" style="font-family:\''+f+'\',Roboto,sans-serif">'+f+'</button>'}
function buildFM(){fm.innerHTML='<div class="fhead"><button type="button" class="fadd" data-add="1" aria-label="Add font"><svg><use href="#i-plus"/></svg>Add font</button></div>'+FONTS.map(fbtn).join("")+'<div class="fpad"></div>'}
buildFM();$("#app").appendChild(fm);
var fin=document.createElement("input");fin.type="file";fin.hidden=true;$("#app").appendChild(fin);
/* custom fonts: real FontFace + kept in IndexedDB so they survive a restart */
function fdb(cb){try{var r=indexedDB.open("apexcut-fonts",1);r.onupgradeneeded=function(){r.result.createObjectStore("f",{keyPath:"name"})};r.onsuccess=function(){cb(r.result)};r.onerror=function(){cb(null)}}catch(x){cb(null)}}
function regFont(name,buf){var ff=new FontFace(name,buf);return ff.load().then(function(f){document.fonts.add(f);if(FONTS.indexOf(name)<0)FONTS.push(name);buildFM();preview()})}
fdb(function(db){if(!db)return;var q=db.transaction("f").objectStore("f").getAll();q.onsuccess=function(){(q.result||[]).forEach(function(o){regFont(o.name,o.buf.slice(0)).catch(function(){})})}});
fin.onchange=function(){var f=fin.files&&fin.files[0];fin.value="";if(!f)return;
 if(!/\.(ttf|otf|woff2?|ttc)$/i.test(f.name)){A.toast("Pick a .ttf / .otf / .woff file");return}
 var name=f.name.replace(/\.[^.]+$/,"").replace(/[^\w \-\u1000-\u109F]/g,"").trim()||"Font",base=name,n=2;while(FONTS.indexOf(name)>=0)name=base+" "+(n++);
 f.arrayBuffer().then(function(buf){return regFont(name,buf.slice(0)).then(function(){
  fdb(function(db){if(db)try{db.transaction("f","readwrite").objectStore("f").put({name:name,buf:buf})}catch(x){}});
  setTf({f:name});A.toast("Font added: "+name)})}).catch(function(){A.toast("Could not load that font file")})};
var txSnap=null;
function txUI(){
 var l=E.sel()?E.find(E.sel()):null,on=!!(l&&l.k==="txt"),ed=$("#editor");
 if(on&&(!txSnap||txSnap.i!==l.i))txSnap={i:l.i,tf:l.tf?JSON.stringify(l.tf):null,t:l.t};if(!on)txSnap=null;
 ed.classList.toggle("txsel",on);$("#txBar").setAttribute("aria-hidden",on?"false":"true");
 if(!on){fm.classList.remove("on");tb.classList.remove("sz");return}
 var t=tf(l);$("#txFontV").textContent=t.f;$("#txFontV").style.fontFamily='"'+t.f+'",Roboto,sans-serif';$("#txSzV").textContent=t.s+"pt";$("#txSl").style.setProperty("--f",Math.max(0,Math.min(1,(t.s-6)/194)));
 $("#txAl use").setAttribute("href","#i-tal-"+t.a)}
function setTf(o){var l=curL();if(!l||l.k!=="txt")return;E.push();l.tf=Object.assign(tf(l),o);E.save();E.render()}
$("#txAl").onclick=function(){var l=curL();if(!l)return;var a=tf(l).a;setTf({a:a==="l"?"c":a==="c"?"r":"l"})};
var tb=$("#txBar"),SZ0=6,SZ1=200;
function szGeo(){var c=$("#txSz"),m=$("#txMid");tb.classList.remove("sz");var cw=c.getBoundingClientRect().width,w2=m.getBoundingClientRect().width+cw+1.4*rem();tb.style.setProperty("--dx",(cw/2-w2/2)+"px")}
function szPaint(v){$("#txSl").style.setProperty("--f",Math.max(0,Math.min(1,(v-SZ0)/(SZ1-SZ0))));$("#txSzV").textContent=Math.round(v)+"pt"}
function szOpen(){var l=curL();if(!l)return;fm.classList.remove("on");szGeo();void tb.offsetWidth;szPaint(tf(l).s);tb.classList.add("sz")}
function szClose(){tb.classList.remove("sz")}
$("#txSz").onclick=function(){var l=curL();if(!l)return;
 if(!tb.classList.contains("sz")){szOpen();return}
 A.askText("Font size (pt)",String(tf(l).s)).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;setTf({s:Math.round(Math.max(6,Math.min(400,v)))})})};
$("#txSl").addEventListener("pointerdown",function(e){var l=curL(),sl=this;if(!l||l.k!=="txt")return;e.preventDefault();sl.setPointerCapture(e.pointerId);sl.classList.add("drag");E.push();document.body.classList.add("sliding");
 var R=sl.getBoundingClientRect(),REM=rem(),hx=HX.slider(),raf=0,px=e.clientX;
 function ap(cx){var r=R,pad=3.8*REM,f=(cx-r.left-pad)/Math.max(1,r.width-2*pad);f=Math.max(0,Math.min(1,f));
  var v=Math.round(SZ0+(SZ1-SZ0)*f);hx.move(f,false,false);l.tf=Object.assign(tf(l),{s:v});szPaint(v);preview()}
 function mv(ev){px=ev.clientX;if(!raf)raf=requestAnimationFrame(function(){raf=0;ap(px)})}
 function up(){if(raf){cancelAnimationFrame(raf);raf=0;ap(px)}document.body.classList.remove("sliding");sl.removeEventListener("pointermove",mv);sl.removeEventListener("pointerup",up);sl.removeEventListener("pointercancel",up);sl.classList.remove("drag");E.save();E.render()}
 sl.addEventListener("pointermove",mv);sl.addEventListener("pointerup",up);sl.addEventListener("pointercancel",up);ap(e.clientX)});
document.addEventListener("pointerdown",function(e){if(tb.classList.contains("sz")&&!e.target.closest("#txSl,#txSz"))szClose()});
window.addEventListener("resize",szClose);
$("#txFont").onclick=function(e){e.stopPropagation();if(fm.classList.contains("on")){fm.classList.remove("on");return}
 var b=$("#txFont").getBoundingClientRect(),ar=$("#app").getBoundingClientRect(),cur=tf(curL()).f;
 $$("button",fm).forEach(function(x){x.classList.toggle("cur",x.dataset.f===cur)});
 fm.style.left=(b.left-ar.left)+"px";fm.style.width=b.width+"px";fm.style.top=(b.bottom-ar.top+6)+"px";fm.classList.add("on")};
fm.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;fm.classList.remove("on");if(b.dataset.add){fin.click();return}setTf({f:b.dataset.f})});
document.addEventListener("pointerdown",function(e){if(!e.target.closest(".fmenu")&&!e.target.closest("#txFont"))fm.classList.remove("on")});

/* ---------- pinch to zoom the timeline (two fingers) ---------- */
var ptr={},pinch=null;
tl.addEventListener("pointerdown",function(e){ptr[e.pointerId]=[e.clientX,e.clientY];
 var ids=Object.keys(ptr);if(ids.length>=2){var a=ptr[ids[0]],b=ptr[ids[1]];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:E.pps()};if(S.playing)A.stop();e.stopImmediatePropagation()}},true);
tl.addEventListener("pointermove",function(e){
 if(!ptr[e.pointerId])return;ptr[e.pointerId]=[e.clientX,e.clientY];
 if(pinch){e.stopImmediatePropagation();var ids=Object.keys(ptr);if(ids.length>=2){var a=ptr[ids[0]],b=ptr[ids[1]],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch.d>8)E.setPps(pinch.z*d/pinch.d)}}},true);
function pend(e){delete ptr[e.pointerId];if(!Object.keys(ptr).length)pinch=null}
tl.addEventListener("pointerup",pend,true);tl.addEventListener("pointercancel",pend,true);


/* ---------- text mode header: export -> check (done), gear -> x (cancel) ---------- */
function inText(){var l=E.sel()?E.find(E.sel()):null;return !!(l&&l.k==="txt")}
function txDone(){E.deselect()}
function txCancel(){var l=curL();if(l&&txSnap&&txSnap.i===l.i){if(txSnap.tf)l.tf=JSON.parse(txSnap.tf);else delete l.tf;l.t=txSnap.t;E.save()}E.deselect()}
/* gear -> parent link button while a layer is selected (js/features.js) */

/* ---------- text colour panel ---------- */
var cp=document.createElement("div");cp.className="glass mp sp cp";cp.id="cp";cp.setAttribute("aria-hidden","true");
var CC=["#ffffff","#000000","#ff453a","#ff9f0a","#ffd60a","#30d158","#64d2ff","#0a84ff","#bf5af2","#ff375f","#8e8e93","#ac8e68"];
cp.innerHTML='<div class="mp-h"><b class="mp-title" style="display:block">Text Color</b><button class="pp-k" id="cpX" aria-label="Close"><svg><use href="#i-x"/></svg></button></div><div class="sp-grid" id="cpG">'+
 '<label class="mp-pb sw cust" aria-label="Custom color"><input type="color" id="cpIn" value="#ffffff"><svg><use href="#i-plus"/></svg></label></div>';
$("#editor").appendChild(cp);
var CPH="apexcut.cpHidden",CPW="apexcut.wheelColors";
function lsj(k){try{var a=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(a)?a:[]}catch(x){return[]}}
function lsw(k,a){try{localStorage.setItem(k,JSON.stringify(a))}catch(x){}}
function hexOk(c){return /^#[0-9a-f]{6}$/i.test(String(c))}
function cpList(){var hid=lsj(CPH).map(function(c){return String(c).toLowerCase()}),sv=lsj(CPW).filter(hexOk).map(function(c){return c.toLowerCase()}).reverse(),out=CC.filter(function(c){return hid.indexOf(c)<0});
 sv.forEach(function(c){if(out.indexOf(c)<0)out.push(c)});return out}
function cpFill(){var cu=$("#cpG .cust");$$("#cpG .sw[data-c]").forEach(function(b){b.parentNode.removeChild(b)});
 cu.insertAdjacentHTML("beforebegin",cpList().map(function(c){return '<button type="button" class="mp-pb sw" data-c="'+c+'" aria-label="'+c+'"><i style="background:'+c+'"></i></button>'}).join(""))}
function cpDelColor(c){c=c.toLowerCase();lsw(CPW,lsj(CPW).filter(function(x){return String(x).toLowerCase()!==c}));
 if(CC.indexOf(c)>=0){var h=lsj(CPH);if(h.indexOf(c)<0)h.push(c);lsw(CPH,h)}cpFill();cpMark()}
document.addEventListener("apex-colors",function(){cpFill();cpMark()});
function cpMark(){var l=curL(),c=l&&l.k==="txt"?tf(l).c.toLowerCase():"";$$("#cpG .sw[data-c]").forEach(function(b){b.classList.toggle("on",b.dataset.c===c)});var i=$("#cpIn");if(c&&/^#[0-9a-f]{6}$/.test(c))i.value=c;$("#cpG .cust").classList.toggle("on",!!c&&cpList().indexOf(c)<0)}
function openCP(){if(A.SE)A.SE.close();closeMP(false);closeSP();closeFP();closeVP();if(A.XP)A.XP.close(false);cpFill();cpMark();cp.classList.add("on");cp.setAttribute("aria-hidden","false");tools.classList.add("mv")}
function closeCP(){if(!cp.classList.contains("on"))return;cp.classList.remove("on");cp.setAttribute("aria-hidden","true");tools.classList.remove("mv")}
$("#cpX").onclick=closeCP;
var cpHT=0,cpHeld=false;
function cpClr(){$$("#cpG .deling").forEach(function(b){b.classList.remove("deling");var d=b.querySelector(".cp-del");if(d)b.removeChild(d)})}
$("#cpG").addEventListener("pointerdown",function(e){var b=e.target.closest(".sw[data-c]");cpHeld=false;clearTimeout(cpHT);if(!b)return;
 if(!b.classList.contains("deling"))cpHT=setTimeout(function(){cpHeld=true;try{HX.hold()}catch(z){}cpClr();b.classList.add("deling");b.insertAdjacentHTML("beforeend",'<span class="cp-del"><svg><use href="#i-trash"/></svg></span>')},480)});
["pointerup","pointercancel","pointerleave"].forEach(function(n){$("#cpG").addEventListener(n,function(){clearTimeout(cpHT)})});
$("#cpG").addEventListener("scroll",function(){clearTimeout(cpHT)});
$("#cpG").addEventListener("contextmenu",function(e){if(e.target.closest(".sw"))e.preventDefault()});
$("#cpG").addEventListener("click",function(e){var b=e.target.closest("[data-c]");if(!b){cpClr();return}
 if(cpHeld){cpHeld=false;return}
 if(b.classList.contains("deling")){cpDelColor(b.dataset.c);return}
 cpClr();setTf({c:b.dataset.c});cpMark()});
cpFill();
var cpPush=false;
$("#cpIn").addEventListener("input",function(){var l=curL();if(!l||l.k!=="txt")return;if(!cpPush){E.push();cpPush=true}l.tf=Object.assign(tf(l),{c:this.value});preview();cpMark()});
$("#cpIn").addEventListener("change",function(){cpPush=false;E.save();E.render()});

/* ---------- multi-select header (eye tab long-press): Group / Mask Group / Invert Mask Group ---------- */
A.onMS=function(n){var on=n>0,ed=$("#editor");ed.classList.toggle("mssel",on);$("#msBar").setAttribute("aria-hidden",on?"false":"true");if(on)$("#msN").textContent=n+" layer"+(n>1?"s":"")+" selected"};
$("#msX").onclick=function(){E.msClear()};
$("#msD").onclick=function(){E.delAll()};$("#msG").onclick=function(){E.msApply("g")};$("#msM").onclick=function(){E.msApply("m")};$("#msI").onclick=function(){E.msApply("i")};

/* ---------- Color & Fill panel (shape + solid layers): none | colour | gradient ---------- */
var FPAL=["#ff4545","#f0b34c","#f7e46a","#1fd61f","#17dfe0","#3b4cf0","#d63fe0","#ffffff","#bbbbbb","#888888","#444444","#000000","#5db3d9","#98c79b","#0da6ff","#ff9d00","#f2f20a","#ff0000","#070707","#181818","#f7202c","#2b2b2b","#ff5a4d","#ff5a14","#ffc108","#ff5757","#dfe9ff","#d4f31a"],GSW=["#ffffff","#000000","#ff453a","#ff9f0a","#ffd60a","#30d158","#0a84ff","#bf5af2"],FSAVE=[],FSK="apexcut.fillpal";
try{FSAVE=JSON.parse(localStorage.getItem(FSK))||[]}catch(x){FSAVE=[]}
var fpSt=0,fdrag=false,fpush=false;
var fp=document.createElement("div");fp.className="glass mp sp fp";fp.id="fp";fp.setAttribute("aria-hidden","true");
fp.innerHTML='<div class="mp-h"><b class="mp-title" style="display:block">Color &amp; Fill</b><button class="pp-k" id="fpX" aria-label="Close"><svg><use href="#i-x"/></svg></button></div>'+
 '<div class="fp-tabs" id="fpT"><button type="button" data-m="none" aria-label="No fill"><svg><use href="#i-nofill"/></svg></button><button type="button" data-m="solid" aria-label="Color"><svg><use href="#i-bucket"/></svg></button><button type="button" data-m="grad" aria-label="Gradient"><i class="gi"></i></button></div><div class="fp-body" id="fpB"></div>';
$("#editor").appendChild(fp);
function fcur(){var l=curL();if(!l)return null;if(!l.fill)l.fill={m:"solid",c:l.k==="sol"?"#7c6cff":"#ffffff",o:100};return l.fill}
function fgrad(f){if(!f.g)f.g=JSON.parse(JSON.stringify(FD.g));return f.g}
function fpDo(m,cont){var f=fcur();if(!f)return;if(!cont||!fpush){E.push();if(cont)fpush=true}m(f);preview();if(!cont)E.save()}
function fpEnd(){fpush=false;E.save()}
function hx(c){var n=parseInt(String(c).slice(1),16)||0;return [n>>16,(n>>8)&255,n&255]}
function xh(a){return "#"+a.map(function(v){return ("0"+Math.round(v).toString(16)).slice(-2)}).join("")}
function gcolAt(g,p){var q=g.s.slice().sort(function(a,b){return a.p-b.p});if(p<=q[0].p)return q[0].c;if(p>=q[q.length-1].p)return q[q.length-1].c;
 for(var i=0;i<q.length-1;i++)if(p>=q[i].p&&p<=q[i+1].p){var u=(p-q[i].p)/Math.max(1e-6,q[i+1].p-q[i].p),a=hx(q[i].c),b=hx(q[i+1].c);return xh(a.map(function(v,j){return v+(b[j]-v)*u}))}return q[0].c}
function parseHex(x){x=String(x||"").trim();if(x.charAt(0)!=="#")x="#"+x;if(/^#[0-9a-f]{3}$/i.test(x))x="#"+x[1]+x[1]+x[2]+x[2]+x[3]+x[3];return /^#[0-9a-f]{6}$/i.test(x)?x.toLowerCase():null}
function fpRender(){
 var l=curL();if(!l)return;var f=fl(l,l.k==="sol"?"#7c6cff":"#ffffff"),h="";
 $$("#fpT button").forEach(function(b){b.classList.toggle("on",b.dataset.m===f.m)});
 if(f.m==="none")h='<div class="fp-none">No fill</div>';
 else if(f.m==="solid"){
  var pal=FPAL.concat(FSAVE),cur=f.c.toLowerCase();
  h='<div class="fp-solid"><div class="fp-main"><div class="fp-hex" id="fpHex" style="background:'+f.c+'"><span>'+f.c.toUpperCase()+' ('+Math.round(f.o)+'%)</span><button type="button" class="fp-add" id="fpAdd" aria-label="Save color"><svg><use href="#i-plus"/></svg></button></div>'+
   '<div class="fp-sw">'+pal.map(function(c){return '<button type="button" class="fp-c'+(c.toLowerCase()===cur?" on":"")+'" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>'}).join("")+'</div></div>'+
   '<div class="fp-side"><button type="button" id="fpEye" aria-label="Eyedropper"><svg><use href="#i-eyedrop"/></svg></button><button type="button" id="fpOp" aria-label="Opacity"><svg><use href="#i-opq"/></svg></button><label class="fp-pal" aria-label="Custom color"><input type="color" id="fpIn" value="'+f.c+'"><svg><use href="#i-palette"/></svg></label></div></div>'}
 else{
  var g=f.g;if(fpSt>=g.s.length)fpSt=0;var sc=g.s[fpSt].c.toLowerCase();
  h='<div class="fp-gt">'+[["lin","Linear"],["rad","Radial"],["mir","Mirror"]].map(function(t){return '<button type="button" data-gt="'+t[0]+'" class="'+(g.t===t[0]?"on":"")+'" aria-label="'+t[1]+'"><i class="gt-'+t[0]+'"></i></button>'}).join("")+'</div>'+
   '<div class="fp-gbar" id="fpGB"><i class="fp-gl" id="fpGL"></i>'+g.s.map(function(q,i){return '<b class="fp-st" data-i="'+i+'"></b>'}).join("")+'</div>'+
   '<div class="fp-gc">'+GSW.map(function(c){return '<button type="button" class="fp-c'+(c===sc?" on":"")+'" data-gc="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>'}).join("")+
   '<label class="fp-c cust" aria-label="Custom color"><input type="color" id="fpGIn" value="'+sc+'"><svg><use href="#i-plus"/></svg></label>'+
   '<button type="button" id="fpGDel" class="fp-del'+(g.s.length>2?"":" dis")+'" aria-label="Remove stop"><svg><use href="#i-trash"/></svg></button></div>'+
   (g.t==="mir"||g.t==="lin"?'<div class="fp-ga"><span>Angle</span><input type="range" id="fpAng" min="0" max="360" step="1" value="'+g.a+'"><output id="fpAngV">'+Math.round(g.a)+'\u00B0</output></div>':'')}
 $("#fpB").innerHTML=h;if(f.m==="grad")fpPaintG()}
function fpPaintG(){var l=curL(),gl=$("#fpGL");if(!l||!gl)return;var g=fl(l,"#ffffff").g;
 gl.style.background="linear-gradient(90deg,"+g.s.slice().sort(function(a,b){return a.p-b.p}).map(function(x){return x.c+" "+(x.p*100).toFixed(1)+"%"}).join(",")+")";
 $$("#fpGB .fp-st").forEach(function(b,i){var q=g.s[i];if(!q)return;b.style.left="calc(4.5rem + "+q.p+" * (100% - 9rem))";b.style.background=q.c;b.classList.toggle("on",i===fpSt)})}
function fpSelSync(){var l=curL();if(!l)return;var g=fl(l,"#ffffff").g,c=g.s[fpSt].c.toLowerCase(),i=$("#fpGIn");if(i)i.value=c;
 $$("#fpB [data-gc]").forEach(function(b){b.classList.toggle("on",b.dataset.gc===c)});fpPaintG()}
function openFP(){var l=curL();if(!l)return;if(A.SE)A.SE.close();closeMP(false);closeSP();closeCP();closeVP();if(A.XP)A.XP.close(false);fpSt=0;fpRender();fp.classList.add("on");fp.setAttribute("aria-hidden","false");tools.classList.add("mv")}
function closeFP(){if(!fp.classList.contains("on"))return;fp.classList.remove("on");fp.setAttribute("aria-hidden","true");tools.classList.remove("mv")}
$("#fpX").onclick=closeFP;
$("#fpT").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var f=fcur();if(!f||f.m===b.dataset.m)return;
 fpDo(function(f){f.m=b.dataset.m;if(f.m==="grad"){fgrad(f);fpSt=0}});fpRender()});
$("#fpB").addEventListener("click",function(e){
 var t=e.target,f=fcur(),b;if(!f)return;
 if((b=t.closest("[data-c]"))){fpDo(function(f){f.c=b.dataset.c;f.m="solid"});fpRender();return}
 if(t.closest("#fpAdd")){var c=f.c.toLowerCase();if(FPAL.concat(FSAVE).some(function(x){return x.toLowerCase()===c})){A.toast("Already in the palette");return}
  FSAVE.push(c);if(FSAVE.length>28)FSAVE.shift();try{localStorage.setItem(FSK,JSON.stringify(FSAVE))}catch(x){}A.toast("Color saved");fpRender();return}
 if(t.closest("#fpHex")){A.askText("Hex color",f.c.toUpperCase()).then(function(x){var v=parseHex(x);if(x==null)return;if(!v){A.toast("Use a hex like #9D4DE9");return}fpDo(function(f){f.c=v;f.m="solid"});fpRender()});return}
 if(t.closest("#fpOp")){A.askText("Opacity (%)",String(Math.round(f.o))).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;fpDo(function(f){f.o=Math.max(0,Math.min(100,v))});fpRender()});return}
 if(t.closest("#fpEye")){if(window.EyeDropper){new window.EyeDropper().open().then(function(r){var v=parseHex(r.sRGBHex);if(v){fpDo(function(f){f.c=v;f.m="solid"});fpRender()}}).catch(function(){})}else A.toast("Eyedropper isn't supported on this device");return}
 if((b=t.closest("[data-gt]"))){fpDo(function(f){fgrad(f).t=b.dataset.gt});fpRender();return}
 if((b=t.closest("[data-gc]"))){fpDo(function(f){fgrad(f).s[fpSt].c=b.dataset.gc});fpRender();return}
 if(t.closest("#fpGDel")){var g=fgrad(f);if(g.s.length<=2){A.toast("A gradient needs 2 stops");return}fpDo(function(f){var g=fgrad(f);g.s.splice(fpSt,1);fpSt=0});fpRender()}});
$("#fpB").addEventListener("input",function(e){var t=e.target;
 if(t.id==="fpIn"){var v=parseHex(t.value);if(v)fpDo(function(f){f.c=v;f.m="solid"},true);var hx2=$("#fpHex");if(hx2){hx2.style.background=t.value;hx2.firstChild.textContent=t.value.toUpperCase()+" ("+Math.round(fcur().o)+"%)"}}
 else if(t.id==="fpGIn"){var v2=parseHex(t.value);if(v2){fpDo(function(f){fgrad(f).s[fpSt].c=v2},true);fpPaintG()}}
 else if(t.id==="fpAng"){var a=+t.value;fpDo(function(f){fgrad(f).a=a},true);$("#fpAngV").textContent=a+"\u00B0"}});
$("#fpB").addEventListener("change",function(e){if(e.target.id==="fpIn"||e.target.id==="fpGIn"||e.target.id==="fpAng"){fpEnd();fpRender()}});
/* gradient bar: drag a stop, tap the bar to add one */
$("#fpB").addEventListener("pointerdown",function(e){
 var bar=e.target.closest("#fpGB");if(!bar||!curL())return;e.preventDefault();
 var f=fcur(),g=fgrad(f),st=e.target.closest(".fp-st"),r=bar.getBoundingClientRect(),pad=4.5*rem(),w=Math.max(1,r.width-2*pad);
 function pp(ev){return Math.max(0,Math.min(1,(ev.clientX-r.left-pad)/w))}
 if(!st){var p=+pp(e).toFixed(3);E.push();g.s.push({p:p,c:gcolAt(g,p)});fpSt=g.s.length-1;E.save();preview();fpRender();return}
 fpSt=+st.dataset.i;fpSelSync();fdrag=true;bar.setPointerCapture(e.pointerId);var moved=false;
 function mv(ev){if(!moved){moved=true;E.push()}g.s[fpSt].p=+pp(ev).toFixed(3);fpPaintG();preview()}
 function up(){bar.removeEventListener("pointermove",mv);bar.removeEventListener("pointerup",up);bar.removeEventListener("pointercancel",up);fdrag=false;if(moved)E.save()}
 bar.addEventListener("pointermove",mv);bar.addEventListener("pointerup",up);bar.addEventListener("pointercancel",up)});

/* ---------- Vector drawing: freehand strokes on the canvas, stored as a vector layer ---------- */
var VC=["#ffffff","#ff453a","#ff9f0a","#ffd60a","#30d158","#0a84ff","#bf5af2"],VW=[6,14,28,52],vecId=null,vc="#ffffff",vw=14,dr=null;
var vp=document.createElement("div");vp.className="glass mp sp vp";vp.id="vp";vp.setAttribute("aria-hidden","true");
vp.innerHTML='<div class="mp-h"><b class="mp-title" style="display:block">Vector Drawing</b><button class="pp-k" id="vpX" aria-label="Done"><svg><use href="#i-check"/></svg></button></div>'+
 '<div class="sp-grid vp-g" id="vpC">'+VC.map(function(c){return '<button type="button" class="mp-pb sw" data-c="'+c+'" aria-label="'+c+'"><i style="background:'+c+'"></i></button>'}).join("")+'<label class="mp-pb sw cust" aria-label="Custom color"><input type="color" id="vpIn" value="#ffffff"><svg><use href="#i-plus"/></svg></label></div>'+
 '<div class="sp-grid vp-g vp-w" id="vpW">'+VW.map(function(w){return '<button type="button" class="mp-pb sw wd" data-w="'+w+'" aria-label="Brush '+w+'"><i style="--d:'+(1.2+w*.115)+'rem"></i></button>'}).join("")+'</div>';
$("#editor").appendChild(vp);
var cap=document.createElement("div");cap.className="drawcap";$("#canvas").appendChild(cap);
function vpMark(){$$("#vpC [data-c]").forEach(function(b){b.classList.toggle("on",b.dataset.c===vc)});$$("#vpW [data-w]").forEach(function(b){b.classList.toggle("on",+b.dataset.w===vw)});$("#vpC .cust").classList.toggle("on",VC.indexOf(vc)<0);$("#vpIn").value=vc}
function openVP(){closeMP(false);closeSP();closeCP();closeFP();if(A.XP)A.XP.close(false);vecId=null;vpMark();vp.classList.add("on");vp.setAttribute("aria-hidden","false");tools.classList.add("mv");cap.classList.add("on");$("#canvas").classList.add("drawing");A.toast("Draw on the preview")}
function closeVP(){if(!vp.classList.contains("on"))return;vp.classList.remove("on");vp.setAttribute("aria-hidden","true");tools.classList.remove("mv");cap.classList.remove("on");$("#canvas").classList.remove("drawing");dr=null}
$("#vpX").onclick=closeVP;
$("#vpC").addEventListener("click",function(e){var b=e.target.closest("[data-c]");if(b){vc=b.dataset.c;vpMark()}});
$("#vpIn").addEventListener("input",function(){vc=this.value;vpMark()});
$("#vpW").addEventListener("click",function(e){var b=e.target.closest("[data-w]");if(b){vw=+b.dataset.w;vpMark()}});
function vpt(e){var r=cap.getBoundingClientRect(),wh=canvasWH();return [+((e.clientX-r.left-r.width/2)/r.width*wh[0]).toFixed(1),+((e.clientY-r.top-r.height/2)/r.height*wh[1]).toFixed(1)]}
cap.addEventListener("pointerdown",function(e){e.preventDefault();
 var l=vecId?E.find(vecId):null;
 if(l&&!active(l)){A.toast("Move the playhead onto the vector layer");return}
 if(!l){l=E.addLayer({k:"vec",d:10,st:[]});vecId=l.i}else E.push();
 var st={c:vc,w:vw,p:[vpt(e)]};l.st.push(st);dr={s:st};cap.setPointerCapture(e.pointerId);preview()});
cap.addEventListener("pointermove",function(e){if(!dr)return;var p=vpt(e),q=dr.s.p[dr.s.p.length-1];if(Math.hypot(p[0]-q[0],p[1]-q[1])<3)return;dr.s.p.push(p);preview()});
function dend(){if(!dr)return;dr=null;E.save();E.render()}
cap.addEventListener("pointerup",dend);cap.addEventListener("pointercancel",dend);

/* ---------- export: renders every layer frame by frame to a canvas and records it ---------- */
var SHP_P={};
SHP.forEach(function(q){var list=[],tags=q[2].match(/<(circle|rect|path)\b[^>]*>/g)||[];
 tags.forEach(function(t){var a={};t.replace(/([\w-]+)="([^"]*)"/g,function(m,k,v){a[k]=v});var pa=new Path2D();
  if(/^<circle/.test(t)){pa.arc(+a.cx,+a.cy,+a.r,0,Math.PI*2)}
  else if(/^<rect/.test(t)){var x=+a.x,y=+a.y,w=+a.width,h=+a.height,r=+(a.rx||0);if(pa.roundRect)pa.roundRect(x,y,w,h,r);else pa.rect(x,y,w,h)}
  else pa=new Path2D(a.d);
  list.push({p:pa,fill:a.fill!=="none",sw:a["stroke-width"]?+a["stroke-width"]:0,ring:a.fill==="none"})});
 SHP_P[q[0]]=list});
var STAR=new Path2D("M12 2.2c.8 4.9 2.2 7.1 3.6 7.7 1.4.6 3.4 1.1 6.2 2.1-2.8 1-4.8 1.5-6.2 2.1-1.4.6-2.8 2.8-3.6 7.7-.8-4.9-2.2-7.1-3.6-7.7-1.4-.6-3.4-1.1-6.2-2.1 2.8-1 4.8-1.5 6.2-2.1 1.4-.6 2.8-2.8 3.6-7.7z");
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function drawFrame(c,W,H,t){if(A.MD&&A.MD.draw){A.MD.draw(c,W,H,t,"export");return}
 var M=E.M(),g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#26214d");g.addColorStop(.55,"#352c70");g.addColorStop(1,"#8f78f7");
 c.globalAlpha=1;c.fillStyle=g;c.fillRect(0,0,W,H);
 var bg=c.createLinearGradient(0,H,0,H*.54);bg.addColorStop(0,"rgba(170,150,255,.65)");bg.addColorStop(1,"rgba(170,150,255,0)");
 c.fillStyle=bg;c.beginPath();c.moveTo(0,H);c.lineTo(W*.38,H*.66);c.lineTo(W*.62,H*.66);c.lineTo(W,H);c.closePath();c.fill();
 var k=H/canvasH1(),act=function(l){return !l.h&&t>=l.s-1e-6&&t<=l.s+l.d+1e-6},
  X=function(l){var p=E.valueAt(l,"pos",t),sc=E.valueAt(l,"scl",t)[0]/100*(A.MD&&A.MD.zs?A.MD.zs(p[2]):1);return {x:p[0]*k,y:p[1]*k,s:sc,r:E.valueAt(l,"rot",t)[0]*Math.PI/180,o:Math.max(0,Math.min(1,E.valueAt(l,"opa",t)[0]/100))}};
 M.L.filter(function(l){return l.k==="sol"&&act(l)}).forEach(function(l){var q=X(l),fs;c.save();c.globalAlpha=q.o;c.translate(W/2+q.x,H/2+q.y);c.rotate(q.r);c.scale(q.s,q.s);
  fs=cfill(c,fl(l,"#7c6cff"),-W/2,-H/2,W,H);if(fs){c.fillStyle=fs;c.fillRect(-W/2,-H/2,W,H)}c.restore()});
 var vs=M.L.filter(function(l){return l.k==="vid"}),vl=vs.filter(act)[0];
 if(!vs.length||vl){var q=vl?X(vl):{x:0,y:0,s:1,r:0,o:1},sz=W*.44,cx=W/2+q.x,cy=H/2-W*.09+q.y;
  c.save();c.globalAlpha=q.o;c.translate(cx,cy);c.rotate(q.r);c.scale(q.s,q.s);
  var ig=c.createLinearGradient(-sz/2,-sz/2,sz/2,sz/2);ig.addColorStop(0,"#c6b7ff");ig.addColorStop(1,"#8d73f5");
  c.shadowColor="rgba(130,100,255,.5)";c.shadowBlur=sz*.12;c.shadowOffsetY=sz*.05;c.fillStyle=ig;rr(c,-sz/2,-sz/2,sz,sz,sz*.24);c.fill();
  c.shadowColor="transparent";c.strokeStyle="rgba(255,255,255,.28)";c.lineWidth=sz*.012;c.stroke();
  c.translate(-sz*.35,-sz*.35);c.scale(sz*.7/24,sz*.7/24);c.fillStyle="#fff";c.strokeStyle="#fff";c.lineWidth=1.8;c.lineJoin="round";c.fill(STAR);c.stroke(STAR);c.restore()}
 M.L.filter(function(l){return l.k==="shp"&&act(l)}).forEach(function(l){var q=X(l),sz=W*.34,list=SHP_P[l.sh]||SHP_P.circle;
  c.save();c.globalAlpha=q.o;c.translate(W/2+q.x,H/2+q.y);c.rotate(q.r);c.scale(q.s*sz/24,q.s*sz/24);c.translate(-12,-12);var fs=cfill(c,fl(l,"#ffffff"),0,0,24,24);c.fillStyle=fs||"#fff";c.strokeStyle=fs||"#fff";c.lineJoin="round";
  if(fs)list.forEach(function(o){if(o.fill)c.fill(o.p);if(o.sw){c.lineWidth=o.sw;c.stroke(o.p)}});c.restore()});
 M.L.filter(function(l){return l.k==="vec"&&act(l)}).forEach(function(l){var q=X(l);c.save();c.globalAlpha=q.o;c.translate(W/2+q.x,H/2+q.y);c.rotate(q.r);c.scale(q.s*k,q.s*k);c.lineCap="round";c.lineJoin="round";
  (l.st||[]).forEach(function(t){c.strokeStyle=t.c;c.lineWidth=t.w;c.stroke(new Path2D(pathD(t.p)))});c.restore()});
 M.L.filter(function(l){return l.k==="txt"&&act(l)}).forEach(function(l){var q=X(l),tt=tf(l),fs=tt.s*H/270,lines=String(l.t||"Text").split("\n");
  c.save();c.globalAlpha=q.o;c.translate(W/2+q.x,H/2+q.y);c.rotate(q.r);c.scale(q.s,q.s);
  c.font=fs+'px "'+tt.f+'",Roboto,"Noto Sans Myanmar",sans-serif';c.fillStyle=tt.c;c.textBaseline="middle";c.textAlign=tt.a==="l"?"left":tt.a==="r"?"right":"center";
  var x=tt.a==="l"?-W*.44:tt.a==="r"?W*.44:0,lh=fs*1.2,y0=-(lines.length-1)*lh/2;lines.forEach(function(ln,i){c.fillText(ln,x,y0+i*lh)});c.restore()})}
var exo=document.createElement("div");exo.className="scrim dlg";exo.id="exo";
exo.innerHTML='<div class="glass card-dlg"><h3 id="exT">Exporting</h3><div class="exbar"><i id="exF"></i></div><div class="exs" id="exS"></div><div class="pfoot"><button class="create" id="exNo" type="button">Cancel</button><button class="create ready" id="exOk" type="button" style="display:none">Save</button></div></div>';
$("#app").appendChild(exo);
var exp={on:false,raf:0,rec:null,blob:null,ext:"mp4",cancel:false};
function exClose(){exo.classList.remove("on");exp.blob=null}
function projWH(){var m=/^(\d+):(\d+)$/.exec((S.cur&&S.cur.ratio)||"16:9"),w=m?+m[1]:16,h=m?+m[2]:9,sh=Math.min(1080,{"720p":720,"1080p":1080,"2K":1440,"4K":2160}[S.cur.res]||1080),W,H;
 if(w>=h){H=sh;W=Math.round(sh*w/h)}else{W=sh;H=Math.round(sh*h/w)}return [W-W%2,H-H%2]}
/* TURBO export (turbo.js): frames are rendered + encoded as fast as the phone can (no real-time recording). Returns true when it took over;
   if the device can not do it (no WebCodecs / AAC encoder) it falls back to the classic real-time export below */
function turboGo(M){
 A.stop();var dur=exDur(M);if(dur<.2){A.toast("Nothing to export");return true}
 var wh=projWH(),W=wh[0],H=wh[1],fps=exFps(),cv=document.createElement("canvas");cv.width=W;cv.height=H;var c=cv.getContext("2d");
 exp.on=true;exp.cancel=false;exp.rec={stop:function(){}};
 exShow("0%  \u00B7  "+W+"\u00D7"+H+" \u00B7 "+fps+"fps");
 A.TURBO.run({W:W,H:H,fps:fps,dur:dur,cv:cv,c:c,draw:drawFrame,hasAudio:!!(A.MD&&A.MD.hasAudio&&A.MD.hasAudio()),
  cancelled:function(){return exp.cancel},
  ui:function(p,txt){$("#exF").style.width=(Math.max(0,Math.min(1,p))*100).toFixed(1)+"%";$("#exS").textContent=txt||""}
 }).then(function(blob){
  exp.on=false;
  if(exp.cancel){exClose();return}
  if(blob===null){exClose();startExport(true);return}      /* not possible on this device -> classic export */
  if(!blob){exClose();return}
  exDone(blob,"mp4")
 }).catch(function(e){exp.on=false;exClose();if(!exp.cancel)A.toast("Export failed")});
 return true}
function startExport(noTurbo){
 var M=E.M();if(!M)return;if(exp.on)return;
 if(noTurbo!==true&&A.TURBO&&A.TURBO.ok()&&turboGo(M))return;
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){A.toast("Export is not supported in this browser");return}
 A.stop();var dur=Math.min(600,Math.max.apply(0,M.L.map(function(l){return l.s+l.d}).concat([0])));if(dur<.2){A.toast("Nothing to export");return}
 var wh=projWH(),W=wh[0],H=wh[1],fps=Math.max(10,Math.min(60,parseInt(S.cur.fps)||30)),cv=document.createElement("canvas");cv.width=W;cv.height=H;var c=cv.getContext("2d");
 var mimes=["video/mp4;codecs=avc1.640028,mp4a.40.2","video/mp4;codecs=avc1,mp4a.40.2","video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"],mime=mimes.filter(function(m){return MediaRecorder.isTypeSupported(m)})[0];
 if(!mime){A.toast("No video encoder available");return}
 if(A.MD)A.MD.exStart();drawFrame(c,W,H,0);var st=cv.captureStream(fps),rec,chunks=[];var at=A.MD&&A.MD.audioTrack&&A.MD.audioTrack();if(at)try{st.addTrack(at)}catch(x){}
 try{rec=new MediaRecorder(st,{mimeType:mime,videoBitsPerSecond:Math.round(Math.min(20e6,W*H*fps*.09))})}catch(x){A.toast("Could not start the encoder");return}
 exp.on=true;exp.cancel=false;exp.rec=rec;exp.ext=/mp4/.test(mime)?"mp4":"webm";
 $("#exT").textContent="Exporting";$("#exS").textContent="0%  ·  "+W+"×"+H+" · "+fps+"fps";$("#exF").style.width="0%";$("#exOk").style.display="none";$("#exNo").textContent="Cancel";exo.classList.add("on");
 rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
 rec.onstop=function(){exp.on=false;cancelAnimationFrame(exp.raf);if(A.MD)A.MD.exEnd();if(exp.cancel){exClose();return}
  var b=new Blob(chunks,{type:mime.split(";")[0]});exp.blob=b;$("#exT").textContent="Export ready";$("#exF").style.width="100%";
  $("#exS").textContent=(b.size/1048576).toFixed(1)+" MB · "+exp.ext.toUpperCase();$("#exOk").style.display="";$("#exNo").textContent="Close"};
 rec.start(250);var t0=performance.now();
 (function loop(now){if(!exp.on)return;var t=(now-t0)/1000;
  if(t>=dur){if(A.MD)A.MD.exTick(dur);drawFrame(c,W,H,dur);$("#exF").style.width="100%";setTimeout(function(){try{rec.stop()}catch(x){}},200);return}
  if(A.MD)A.MD.exTick(t);drawFrame(c,W,H,t);$("#exF").style.width=(t/dur*100).toFixed(1)+"%";$("#exS").textContent=Math.round(t/dur*100)+"%  ·  "+W+"\u00D7"+H+" · "+fps+"fps";exp.raf=requestAnimationFrame(loop)})(t0)}
$("#exNo").onclick=function(){if(exp.on){exp.cancel=true;try{exp.rec.stop()}catch(x){}exp.on=false;exClose()}else exClose()};
$("#exOk").onclick=function(){var b=exp.blob;if(!b)return;var nm=(S.cur.name||"Apex Cut").replace(/[^\w\-]+/g,"_")+"."+exp.ext,f;
 var vidX=/^(mp4|webm)$/.test(exp.ext),noun=vidX?"video":"file",C=window.Capacitor,nat=false,FS=null,GS=null,SH=null;
 try{nat=!!(C&&C.isNativePlatform&&C.isNativePlatform());if(nat){FS=C.Plugins&&C.Plugins.Filesystem;SH=C.Plugins&&C.Plugins.Share;GS=(C.Plugins&&C.Plugins.GallerySaver)||(C.registerPlugin&&C.registerPlugin("GallerySaver"))}}catch(x){}
 if(nat&&FS&&GS){ /* straight into the Gallery: Movies/Apex Cut (file is copied to the cache in 3 MB pieces, then the native plugin puts it in MediaStore) */
  var ok=$("#exOk"),CH=3*1024*1024,pos=0,first=true,uri=null;ok.disabled=true;
  function piece(){if(pos>=b.size)return Promise.resolve();var part=b.slice(pos,pos+CH);pos+=CH;
   return new Promise(function(res,rej){var rd=new FileReader();rd.onload=function(){res(String(rd.result).split(",")[1])};rd.onerror=rej;rd.readAsDataURL(part)}).then(function(b64){
    if(first){first=false;return FS.writeFile({path:nm,data:b64,directory:"CACHE"}).then(function(r){uri=r.uri})}
    return FS.appendFile({path:nm,data:b64,directory:"CACHE"})}).then(function(){$("#exS").textContent="Saving to Gallery\u2026 "+Math.min(99,Math.round(pos/b.size*100))+"%";return piece()})}
  piece().then(function(){if(!uri)throw new Error("empty");return GS.save({uri:uri,name:nm,mime:b.type||(vidX?"video/mp4":"application/octet-stream"),folder:"Apex Cut"})}).then(function(){
   try{FS.deleteFile({path:nm,directory:"CACHE"}).catch(function(){})}catch(x){}
   ok.disabled=false;exClose();A.toast(vidX?"Saved to Gallery \u00B7 Apex Cut folder":/^(png|gif)$/.test(exp.ext)?"Saved to Gallery \u00B7 Pictures/Apex Cut":"Saved to Downloads \u00B7 Apex Cut")}).catch(function(){
   ok.disabled=false;$("#exS").textContent=(b.size/1048576).toFixed(1)+" MB \u00B7 "+exp.ext.toUpperCase();
   if(SH&&uri){SH.share({title:nm,url:uri,dialogTitle:"Save / Share"}).catch(function(){});return}   /* native save refused -> share sheet as a fallback */
   A.toast("Could not save the "+noun)});
  return}
 if(nat&&FS&&SH){ /* old build without the Gallery plugin: share sheet */
  var rd2=new FileReader();rd2.onload=function(){var b64=String(rd2.result).split(",")[1];
   FS.writeFile({path:nm,data:b64,directory:"CACHE"}).then(function(r){return SH.share({title:nm,url:r.uri,dialogTitle:"Save / Share"})}).catch(function(e){if(!e||!/cancel/i.test(String(e.message||e)))A.toast("Could not save the "+noun)})};
  rd2.onerror=function(){A.toast("Could not save the "+noun)};rd2.readAsDataURL(b);return}
 function dl(){var u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=nm;document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(u)},4000);A.toast("Saved "+nm)}
 try{f=new File([b],nm,{type:b.type})}catch(x){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:nm}).catch(dl);else dl()};
/* --- helpers: zip (store), GIF (216-colour palette + LZW), FCP7 xml --- */
var CT=null;function crc32(u){if(!CT){CT=[];for(var n=0,c,k;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CT[n]=c>>>0}}var c=-1;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return (c^-1)>>>0}
function zipBlob(files){var parts=[],cen=[],off=0,cs=0;
 files.forEach(function(f){var nb=new TextEncoder().encode(f.n),cr=crc32(f.d),n=f.d.length,h=new DataView(new ArrayBuffer(30)),g=new DataView(new ArrayBuffer(46));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,cr,true);h.setUint32(18,n,true);h.setUint32(22,n,true);h.setUint16(26,nb.length,true);
  g.setUint32(0,0x02014b50,true);g.setUint16(4,20,true);g.setUint16(6,20,true);g.setUint16(8,0x800,true);g.setUint16(14,0x21,true);g.setUint32(16,cr,true);g.setUint32(20,n,true);g.setUint32(24,n,true);g.setUint16(28,nb.length,true);g.setUint32(42,off,true);
  parts.push(h.buffer,nb,f.d);cen.push(g.buffer,nb);off+=30+nb.length+n;cs+=46+nb.length});
 var e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return new Blob(parts.concat(cen,[e.buffer]),{type:"application/zip"})}
function lzw(px,o){var nb=9,next=258,dict=new Map(),buf=0,bl=0,blk=[];
 function flush(){if(blk.length){o.push(blk.length);for(var i=0;i<blk.length;i++)o.push(blk[i]);blk=[]}}
 function out(c){buf|=c<<bl;bl+=nb;while(bl>=8){blk.push(buf&255);buf>>>=8;bl-=8;if(blk.length===255)flush()}}
 out(256);var cur=px[0],i,k,v;
 for(i=1;i<px.length;i++){k=(cur<<8)|px[i];v=dict.get(k);
  if(v!==undefined){cur=v;continue}
  out(cur);dict.set(k,next++);if(next>(1<<nb)&&nb<12)nb++;
  if(next>=4095){out(256);dict.clear();next=258;nb=9}
  cur=px[i]}
 out(cur);out(257);if(bl>0)blk.push(buf&255);flush();o.push(0)}
function gifBlob(frames,W,H,fps){var o=[],d=Math.max(2,Math.round(100/fps)),r,g,b;
 function w16(v){o.push(v&255,(v>>8)&255)}
 o.push(71,73,70,56,57,97);w16(W);w16(H);o.push(0xF7,0,0);
 for(r=0;r<6;r++)for(g=0;g<6;g++)for(b=0;b<6;b++)o.push(r*51,g*51,b*51);
 for(r=216;r<256;r++)o.push(0,0,0);
 o.push(0x21,0xFF,11,78,69,84,83,67,65,80,69,50,46,48,3,1,0,0,0);
 frames.forEach(function(px){o.push(0x21,0xF9,4,0);w16(d);o.push(0,0,0x2C);w16(0);w16(0);w16(W);w16(H);o.push(0,8);lzw(px,o)});
 o.push(0x3B);return new Blob([new Uint8Array(o)],{type:"image/gif"})}

/* ---------- export picker: glass panel with the export functions (Video / Current Frame PNG / Image Sequence / GIF / XML) ---------- */
function rwh(sh){var m=/^(\d+):(\d+)$/.exec((S.cur&&S.cur.ratio)||"16:9"),w=m?+m[1]:16,h=m?+m[2]:9;return w>=h?[Math.round(sh*w/h),sh]:[sh,Math.round(sh*h/w)]}
function exFps(){return Math.max(10,Math.min(60,parseInt(S.cur.fps)||30))}
function exName(){return (S.cur.name||"Apex Cut").replace(/[^\w\-]+/g,"_")}
function exDone(b,ext){exp.blob=b;exp.ext=ext;$("#exT").textContent="Export ready";$("#exF").style.width="100%";$("#exS").textContent=(b.size/1048576).toFixed(1)+" MB \u00B7 "+ext.toUpperCase();$("#exOk").style.display="";$("#exNo").textContent="Close";exo.classList.add("on")}
function exShow(txt){$("#exT").textContent="Exporting";$("#exS").textContent=txt||"";$("#exF").style.width="0%";$("#exOk").style.display="none";$("#exNo").textContent="Cancel";exo.classList.add("on")}
function exDur(M){return Math.min(600,Math.max.apply(0,M.L.map(function(l){return l.s+l.d}).concat([0])))}
/* plays the project once in real time (same engine as the video export) and grabs a frame every 1/fps s */
function capture(fps,sh,per,fin,tag){
 var M=E.M();if(!M||exp.on)return;A.stop();var dur=exDur(M);if(dur<.2){A.toast("Nothing to export");return}
 var wh=rwh(sh),W=wh[0],H=wh[1],cv=document.createElement("canvas");cv.width=W;cv.height=H;var c=cv.getContext("2d",{willReadFrequently:true}),n=Math.floor(dur*fps)+1,i=0;
 if(A.MD)A.MD.exStart();exp.on=true;exp.cancel=false;exp.rec={stop:function(){}};exShow("0%  \u00B7  "+W+"\u00D7"+H+" \u00B7 "+fps+"fps");
 var t0=performance.now();
 (function loop(now){if(!exp.on){if(A.MD)A.MD.exEnd();return}
  if(i<n&&(now-t0)/1000>=i/fps){var t=Math.min(dur,i/fps);if(A.MD)A.MD.exTick(t);drawFrame(c,W,H,t);per(c,i,W,H);i++;
   $("#exF").style.width=(i/n*100).toFixed(1)+"%";$("#exS").textContent=Math.round(i/n*100)+"%  \u00B7  "+W+"\u00D7"+H+" \u00B7 "+fps+"fps"}
  if(i>=n){exp.on=false;if(A.MD)A.MD.exEnd();$("#exS").textContent="Packing\u2026";Promise.resolve(fin(W,H,fps)).then(function(b){exDone(b,tag)}).catch(function(){exClose();A.toast("Export failed")});return}
  exp.raf=requestAnimationFrame(loop)})(t0)}
function exFrame(){var M=E.M();if(!M)return;A.stop();var wh=projWH(),cv=document.createElement("canvas");cv.width=wh[0];cv.height=wh[1];
 try{drawFrame(cv.getContext("2d"),wh[0],wh[1],S.t||0)}catch(x){A.toast("Could not render the frame");return}
 cv.toBlob(function(b){if(!b){A.toast("Could not render the frame");return}exDone(b,"png")},"image/png")}
function exSeq(){var P=[];capture(15,360,function(c){P.push(new Promise(function(r){c.canvas.toBlob(r,"image/png")}))},function(){
 return Promise.all(P).then(function(bs){return Promise.all(bs.map(function(b){return b.arrayBuffer()}))}).then(function(ab){var nm=exName();return zipBlob(ab.map(function(a,i){return {n:nm+"_"+String(i+1).padStart(4,"0")+".png",d:new Uint8Array(a)}}))})},"zip")}
function exGif(){var F=[];capture(15,180,function(c,i,W,H){var d=c.getImageData(0,0,W,H).data,px=new Uint8Array(W*H),j,k=0;for(j=0;j<d.length;j+=4)px[k++]=36*(((d[j]+25)/51)|0)+6*(((d[j+1]+25)/51)|0)+(((d[j+2]+25)/51)|0);F.push(px)},function(W,H,fps){return gifBlob(F,W,H,fps)},"gif")}
function exXml(){var M=E.M();if(!M)return;var fps=exFps(),wh=projWH(),fr=function(s){return Math.round(s*fps)},esc=function(s){return String(s).replace(/[&<>"]/g,function(q){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[q]})},
  KN={vid:"Video",img:"Photo",aud:"Audio",txt:"Text",sol:"Solid",shp:"Shape"},rate="<rate><timebase>"+fps+"</timebase><ntsc>FALSE</ntsc></rate>",
  ls=M.L.filter(function(l){return KN[l.k]}),tot=fr(exDur(M)),idn=0;
 function track(l){var d=fr(l.d),nm=esc(l.nm||l.name||l.n||KN[l.k]);idn++;return "<track><clipitem id=\"clip"+idn+"\"><name>"+nm+"</name><enabled>TRUE</enabled><duration>"+d+"</duration>"+rate+"<start>"+fr(l.s)+"</start><end>"+(fr(l.s)+d)+"</end><in>0</in><out>"+d+"</out></clipitem></track>"}
 var x='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="seq1"><name>'+esc(S.cur.name||"Apex Cut")+'</name><duration>'+tot+'</duration>'+rate+'<media><video><format><samplecharacteristics><width>'+wh[0]+'</width><height>'+wh[1]+'</height></samplecharacteristics></format>'+
  ls.filter(function(l){return l.k!=="aud"}).map(track).join("")+'</video><audio>'+ls.filter(function(l){return l.k==="aud"}).map(track).join("")+'</audio></media></sequence></xmeml>';
 exDone(new Blob([x],{type:"application/xml"}),"xml")}
var EXI={
 vid:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3.500" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.500v5l4.500-2.500z" fill="currentColor"/></svg>',
 png:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15.500" cy="9.500" r="1.800" fill="currentColor"/><path d="M4 17.500l5-5 4 4 2.500-2.500L20 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
 seq:'<svg viewBox="0 0 24 24"><rect x="7.500" y="3" width="13.500" height="13.500" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.500 8v9.500a3 3 0 003 3H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.500 14l3-3 2 2 2-2 3 3" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 gif:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.600"/><text x="12" y="14.800" text-anchor="middle" font-size="7.400" font-weight="800" fill="currentColor" font-family="sans-serif">GIF</text></svg>',
 xml:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3.500" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.500 8.500L6.500 11l3 2.500M14.500 8.500l3 2.500-3 2.500" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16.500h18v1a3.500 3.500 0 01-3.500 3.500h-11A3.500 3.500 0 013 17.500z" fill="currentColor"/></svg>'};
var exm=document.createElement("div");exm.className="scrim dlg";exm.id="exm";$("#app").appendChild(exm);
var exPick="vid";
function exOpts(){var g=rwh(180),s=rwh(360);return [["vid","Video","MP4 \u00B7 "+projWH().join("\u00D7")+" \u00B7 "+exFps()+"fps"],["png","Current Frame as PNG","at the playhead"],["seq","Image Sequence","PNG "+Math.min(s[0],s[1])+"p 15fps (ZIP)"],["gif","GIF",g[0]+"x"+g[1]+" 15fps"],["xml","XML","for workflow integrations"]]}
function exmDraw(){exm.innerHTML='<div class="glass card-dlg"><h3>Export</h3><div class="exm-l">'+exOpts().map(function(o){return '<button type="button" class="exm-r'+(exPick===o[0]?" on":"")+'" data-k="'+o[0]+'"><i class="rd"></i>'+EXI[o[0]]+'<span class="exm-t"><b>'+o[1]+'</b><em>'+o[2]+'</em></span></button>'}).join("")+'</div><div class="pfoot"><button class="create" id="exmNo" type="button">Cancel</button><button class="create ready" id="exmGo" type="button">Export</button></div></div>'}
function exmClose(){exm.classList.remove("on")}
exm.addEventListener("click",function(e){var r=e.target.closest(".exm-r");if(r){exPick=r.dataset.k;exmDraw();return}
 if(e.target.closest("#exmNo")||e.target===exm){exmClose();return}
 if(e.target.closest("#exmGo")){exmClose();({vid:startExport,png:exFrame,seq:exSeq,gif:exGif,xml:exXml})[exPick]()}});
function exmOpen(){if(exp.on)return;exmDraw();exm.classList.add("on")}
(function(){var st=document.createElement("style");st.textContent=[
 "#exm .card-dlg{max-height:90%;overflow-y:auto;scrollbar-width:none}#exm .card-dlg::-webkit-scrollbar{display:none}",
 ".exm-l{display:flex;flex-direction:column;gap:2rem;margin-bottom:3.4rem}",
 ".exm-r{width:100%;display:flex;align-items:center;gap:3.2rem;padding:3.2rem 3.6rem;border-radius:5.6rem;text-align:left;color:#fff;background:rgba(255,255,255,.06);border:var(--glass-edge);transition:background .18s,border-color .18s,transform .12s}",
 ".exm-r:active{transform:scale(.98)}",
 ".exm-r.on{background:rgba(var(--glow-rgb),.18);border-color:rgba(110,175,255,.6);box-shadow:var(--glow-soft)}",
 ".exm-r .rd{flex:none;width:7rem;height:7rem;border-radius:50%;border:.7rem solid rgba(255,255,255,.38);position:relative}",
 ".exm-r.on .rd{border-color:transparent;background-image:var(--grad)}",
 ".exm-r.on .rd::after{content:'';position:absolute;inset:1.9rem;border-radius:50%;background:#fff}",
 ".exm-r>svg{flex:none;width:7.6rem;height:7.6rem;color:#cfe3ff}",
 ".exm-t{display:flex;flex-direction:column;gap:.8rem;min-width:0}",
 ".exm-t b{font-size:4.8rem;font-weight:700}.exm-t em{font-style:normal;font-size:3.5rem;opacity:.58}"].join("\n");document.head.appendChild(st)})();

/* text layer: the check only shows while the size slider is open - it closes the slider and the text stays selected */
var exSz=false;$("#edExport").addEventListener("pointerdown",function(){exSz=tb.classList.contains("sz")});
$("#edExport").onclick=function(){if(exSz){exSz=false;szClose();return}exmOpen()};

A.X={fl:fl,cfill:cfill,SHP_P:SHP_P,pathD:pathD,tf:tf,canvasWH:canvasWH,rr:rr,STAR:STAR};
A.closePanels=function(){closeMP(false);closeSP();closeCP();closeFP();closeVP()};
/* initial panel */
buildPanel();
})();

/* =====================================================================
   Glass colour wheel (Apex Cut 33 colour picker) - opens for EVERY custom-colour swatch (text colour, fill, gradient stop,
   vector brush, stroke / shadow colour, project background) instead of the phone's plain colour dialog.
   Hue ring in the middle, left arc = saturation, right arc = brightness, hex pill + blue "Add" button (saves the colour
   into a small row of saved colours inside the wheel; hold a saved colour to remove it).
   ===================================================================== */
(function(){
"use strict";
var NS="http://www.w3.org/2000/svg",C=170,AR=157,RING_IN=75,RING_OUT=105,HUE_OFF=40,KEY="apexcut.wheelColors",SKEY="apexcut.wheelScale",SMIN=.55,cur=null;
function rem(){return parseFloat(getComputedStyle(document.documentElement).fontSize)||10}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function hsv2rgb(h,s,v){h=((h%360)+360)%360;var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;
 if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
 return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]}
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;
 if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}
 return {h:h,s:mx?d/mx:0,v:mx}}
function toHex(rgb){return "#"+rgb.map(function(n){var t=n.toString(16);return t.length<2?"0"+t:t}).join("").toUpperCase()}
function parseHex(t){t=String(t||"").trim().replace(/^#/,"");if(/^[0-9a-f]{3}$/i.test(t))t=t.replace(/(.)/g,"$1$1");if(!/^[0-9a-f]{6}$/i.test(t))return null;
 return [parseInt(t.substr(0,2),16),parseInt(t.substr(2,2),16),parseInt(t.substr(4,2),16)]}
function pt(a,r){var t=a*Math.PI/180;return [C+r*Math.cos(t),C+r*Math.sin(t)]}
function arc(a1,a2){if(Math.abs(a2-a1)<.05)a2=a1+(a2>=a1?.05:-.05);var p1=pt(a1,AR),p2=pt(a2,AR);
 return "M"+p1[0].toFixed(2)+" "+p1[1].toFixed(2)+" A"+AR+" "+AR+" 0 "+(Math.abs(a2-a1)>180?1:0)+" "+(a2>a1?1:0)+" "+p2[0].toFixed(2)+" "+p2[1].toFixed(2)}
function leftAng(p){return 108+144*p}
function rightAng(p){return 72-144*p}
function el(tag,at){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);return e}
function saved(){try{var a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)?a.filter(function(c){return parseHex(c)}).slice(0,8):[]}catch(e){return[]}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(0,8)))}catch(e){}}
function wsGet(){try{var v=parseFloat(localStorage.getItem(SKEY));return isFinite(v)?clamp(v,SMIN,2):1}catch(e){return 1}}
function wsSet(v){try{localStorage.setItem(SKEY,String(+v.toFixed(3)))}catch(e){}}
/* corner-resizable card: the whole card (wheel, hex pill, Add button, saved colours) scales together */
(function(){var st=document.createElement("style");st.textContent=[
 ".cpw-card{position:relative;padding-top:8rem!important}",
 ".cpw-grip{position:absolute;top:2.4rem;left:50%;width:16rem;height:1.8rem;margin-left:-8rem;border-radius:1rem;background:rgba(255,255,255,.34);pointer-events:none}",
 ".cpw-card.mv{opacity:.94}",
 ".cpw-rs{position:absolute;right:2.4rem;bottom:2.4rem;width:10rem;height:10rem;padding:0;border:0;border-radius:3.4rem;background:transparent;display:grid;place-items:end;z-index:4;touch-action:none;-webkit-tap-highlight-color:transparent}",
 ".cpw-rs svg{width:5.2rem;height:5.2rem;fill:none;stroke:rgba(255,255,255,.7);stroke-width:1.9;stroke-linecap:round;transition:stroke 84ms ease}",
 ".cpw-rs:active svg,.cpw-card.rs .cpw-rs svg{stroke:#fff}"].join("\n");document.head.appendChild(st)})();

function close(){
 if(!cur)return;var c=cur;cur=null;
 if(c.overlay.parentNode)c.overlay.parentNode.removeChild(c.overlay);
 if(c.changed){try{c.inp.dispatchEvent(new Event("change",{bubbles:true}))}catch(e){}}}

function open(inp){
 if(cur)close();
 var rgb0=parseHex(inp.value)||[10,132,255],st=rgb2hsv(rgb0[0],rgb0[1],rgb0[2]);if(st.s<.02&&st.v>.02)st.s=.02;
 var ov=document.createElement("div");ov.className="cpw-ov";
 var card=document.createElement("div");card.className="glass cpw-card";
 card.innerHTML='<i class="cpw-grip"></i><div class="cpw-stage"><i class="cpw-disc"></i><i class="cpw-ring"></i><i class="cpw-mid"></i><i class="cpw-dot"></i></div>'+
  '<div class="cpw-row"><label class="cpw-hex"><input type="text" spellcheck="false" maxlength="7" autocomplete="off" aria-label="Hex colour"></label>'+
  '<button type="button" class="cpw-add" aria-label="Add colour"><svg><use href="#i-plus"/></svg><span>Add</span></button></div><div class="cpw-sv"></div>';
 var rs=document.createElement("button");rs.type="button";rs.className="cpw-rs";rs.setAttribute("aria-label","Resize");rs.innerHTML='<svg viewBox="0 0 16 16"><path d="M14 5L5 14M14 10L10 14"/></svg>';card.appendChild(rs);
 var wsc=wsGet(),px=0,py=0,PK="apexcut.wheelPos",lastTap=0;
 try{var pj=JSON.parse(localStorage.getItem(PK)||"null");if(pj&&isFinite(pj.x)&&isFinite(pj.y)){px=+pj.x;py=+pj.y}}catch(x){}
 function posApply(){var o=card.parentNode;if(!o)return;card.style.translate=px.toFixed(1)+"px "+py.toFixed(1)+"px";
  var r=card.getBoundingClientRect(),or=o.getBoundingClientRect(),M=8,dx=0,dy=0;
  if(r.width>or.width-2*M)dx=(or.left+or.width/2)-(r.left+r.width/2);else if(r.left<or.left+M)dx=or.left+M-r.left;else if(r.right>or.right-M)dx=or.right-M-r.right;
  if(r.height>or.height-2*M)dy=(or.top+or.height/2)-(r.top+r.height/2);else if(r.top<or.top+M)dy=or.top+M-r.top;else if(r.bottom>or.bottom-M)dy=or.bottom-M-r.bottom;
  if(dx||dy){px+=dx;py+=dy;card.style.translate=px.toFixed(1)+"px "+py.toFixed(1)+"px"}}
 function posSave(){try{localStorage.setItem(PK,JSON.stringify({x:+px.toFixed(1),y:+py.toFixed(1)}))}catch(x){}}
 card.addEventListener("pointerdown",function(e){
  if(e.target.closest(".cpw-stage,.cpw-row,.cpw-sv,.cpw-rs"))return;
  e.preventDefault();var sx=e.clientX,sy=e.clientY,x0=px,y0=py,moved=false;card.classList.add("mv");
  function mv(ev){var dx=ev.clientX-sx,dy=ev.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;px=x0+dx;py=y0+dy;posApply()}
  function end(){window.removeEventListener("pointermove",mv,true);window.removeEventListener("pointerup",end,true);window.removeEventListener("pointercancel",end,true);card.classList.remove("mv");
   if(moved){posSave();lastTap=0}else{var n=Date.now();if(n-lastTap<320){px=0;py=0;posApply();posSave();lastTap=0}else lastTap=n}}
  window.addEventListener("pointermove",mv,true);window.addEventListener("pointerup",end,true);window.addEventListener("pointercancel",end,true)});
 function wsMax(){var o=card.parentNode,m=3*(rem()||4);
  if(!o||!card.offsetWidth)return 2;return clamp(Math.min((o.clientWidth-m)/card.offsetWidth,(o.clientHeight-m)/card.offsetHeight),SMIN,2)}
 function wsApply(v){wsc=clamp(v,SMIN,wsMax());if("scale" in card.style)card.style.scale=String(wsc);else card.style.transform="scale("+wsc+")";posApply()}
 rs.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();try{rs.setPointerCapture(e.pointerId)}catch(x){}
  var r=card.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d0=Math.hypot(e.clientX-cx,e.clientY-cy)||1,s0=wsc;card.classList.add("rs");
  function mv(ev){wsApply(s0*Math.hypot(ev.clientX-cx,ev.clientY-cy)/d0)}
  function end(){rs.removeEventListener("pointermove",mv);rs.removeEventListener("pointerup",end);rs.removeEventListener("pointercancel",end);card.classList.remove("rs");wsSet(wsc)}
  rs.addEventListener("pointermove",mv);rs.addEventListener("pointerup",end);rs.addEventListener("pointercancel",end)});
 var stage=card.querySelector(".cpw-stage"),dot=card.querySelector(".cpw-dot"),input=card.querySelector(".cpw-hex input"),addBtn=card.querySelector(".cpw-add"),sv=card.querySelector(".cpw-sv"),addT=0;
 var svg=el("svg",{"class":"cpw-svg",viewBox:"0 0 340 340"}),defs=el("defs",{});
 var gl=el("linearGradient",{id:"cpwGL",gradientUnits:"userSpaceOnUse",x1:0,y1:21,x2:0,y2:319}),gl0=el("stop",{offset:"0"}),gl1=el("stop",{offset:"1"});gl.appendChild(gl0);gl.appendChild(gl1);
 var gr=el("linearGradient",{id:"cpwGR",gradientUnits:"userSpaceOnUse",x1:0,y1:21,x2:0,y2:319});
 gr.appendChild(el("stop",{offset:"0","stop-color":"#ffffff"}));gr.appendChild(el("stop",{offset:"1","stop-color":"#2c2f36"}));
 defs.appendChild(gl);defs.appendChild(gr);svg.appendChild(defs);
 svg.appendChild(el("path",{"class":"cpw-track",d:arc(leftAng(0),leftAng(1)),stroke:"url(#cpwGL)"}));
 svg.appendChild(el("path",{"class":"cpw-track",d:arc(rightAng(0),rightAng(1)),stroke:"url(#cpwGR)"}));
 var actL=el("path",{"class":"cpw-act",stroke:"url(#cpwGL)"}),actR=el("path",{"class":"cpw-act",stroke:"url(#cpwGR)"});svg.appendChild(actL);svg.appendChild(actR);
 var hH=el("circle",{"class":"cpw-h",r:10}),hS=el("circle",{"class":"cpw-h",r:9}),hV=el("circle",{"class":"cpw-h",r:9});svg.appendChild(hH);svg.appendChild(hS);svg.appendChild(hV);
 stage.appendChild(svg);
 function place(c,a,r){var q=pt(a,r);c.setAttribute("cx",q[0].toFixed(2));c.setAttribute("cy",q[1].toFixed(2))}
 var me={overlay:ov,inp:inp,changed:false};
 function paint(skipInput){
  var hex=toHex(hsv2rgb(st.h,st.s,st.v));dot.style.background=hex;
  gl0.setAttribute("stop-color",toHex(hsv2rgb(st.h,1,1)));gl1.setAttribute("stop-color",toHex(hsv2rgb(st.h,.1,1)));
  actL.setAttribute("d",arc(leftAng(0),leftAng(st.s)));actR.setAttribute("d",arc(rightAng(0),rightAng(st.v)));
  place(hH,st.h+HUE_OFF-90,(RING_IN+RING_OUT)/2);place(hS,leftAng(st.s),AR);place(hV,rightAng(st.v),AR);
  hH.style.fill=toHex(hsv2rgb(st.h,1,1));hS.style.fill=toHex(hsv2rgb(st.h,st.s,1));hV.style.fill=toHex(hsv2rgb(0,0,st.v));
  if(!skipInput)input.value=hex;return hex}
 function emit(skipInput){
  var hex=paint(skipInput);me.changed=true;
  try{inp.value=hex.toLowerCase();inp.dispatchEvent(new Event("input",{bubbles:true}))}catch(e){}}
 /* pointer: hue ring / saturation arc (left) / brightness arc (right) */
 var mode=null;
 function setFrom(e){
  var rc=stage.getBoundingClientRect(),dx=e.clientX-(rc.left+rc.width/2),dy=e.clientY-(rc.top+rc.height/2),ang=Math.atan2(dy,dx)*180/Math.PI;if(ang<0)ang+=360;
  if(mode==="hue")st.h=((ang+90-HUE_OFF)%360+360)%360;
  else if(mode==="sat")st.s=clamp((ang-108)/144,0,1);
  else if(mode==="val"){var a2=ang>180?ang-360:ang;st.v=clamp((72-a2)/144,0,1)}
  emit()}
 stage.addEventListener("pointerdown",function(e){
  var rc=stage.getBoundingClientRect(),k=rc.width/340,dx=e.clientX-(rc.left+rc.width/2),dy=e.clientY-(rc.top+rc.height/2),r=Math.sqrt(dx*dx+dy*dy)/k;
  if(r>=RING_IN-14&&r<=RING_OUT+12)mode="hue";else if(r>=AR-30)mode=dx<0?"sat":"val";else return;
  e.preventDefault();e.stopPropagation();stage.classList.add("drag");try{stage.setPointerCapture(e.pointerId)}catch(x){}
  setFrom(e)});
 stage.addEventListener("pointermove",function(e){if(!mode)return;e.preventDefault();setFrom(e)});
 function up(){mode=null;stage.classList.remove("drag")}
 stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
 /* hex field */
 input.addEventListener("input",function(){var rgb=parseHex(input.value);if(!rgb)return;var n=rgb2hsv(rgb[0],rgb[1],rgb[2]);if(n.s>0)st.h=n.h;st.s=n.s;st.v=n.v;emit(true)});
 input.addEventListener("blur",function(){paint(false)});
 input.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();input.blur()}});
 /* saved colours */
 function drawSv(){var a=saved();sv.style.display=a.length?"":"none";
  sv.innerHTML=a.map(function(c){return '<button type="button" class="cpw-s" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>'}).join("")}
 var holdT=0,held=false;
 sv.addEventListener("pointerdown",function(e){var b=e.target.closest(".cpw-s");if(!b)return;held=false;clearTimeout(holdT);
  holdT=setTimeout(function(){held=true;store(saved().filter(function(c){return c!==b.dataset.c}));drawSv()},600)});
 function cancelHold(){clearTimeout(holdT)}
 sv.addEventListener("pointerup",cancelHold);sv.addEventListener("pointerleave",cancelHold);sv.addEventListener("pointercancel",cancelHold);
 sv.addEventListener("click",function(e){var b=e.target.closest(".cpw-s");if(!b||held){held=false;return}
  var rgb=parseHex(b.dataset.c);if(!rgb)return;var n=rgb2hsv(rgb[0],rgb[1],rgb[2]);if(n.s>0)st.h=n.h;st.s=n.s;st.v=n.v;emit()});
 addBtn.addEventListener("pointerdown",function(e){e.preventDefault()});
 addBtn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();
  var rgb=parseHex(input.value)||hsv2rgb(st.h,st.s,st.v),hex=toHex(rgb),a=saved(),had=a.indexOf(hex)>=0;
  if(!had){a.unshift(hex);store(a);drawSv();try{document.dispatchEvent(new Event("apex-colors"))}catch(z){}}
  addBtn.classList.add("done");addBtn.lastChild.textContent=had?"Saved":"Added";
  clearTimeout(addT);addT=setTimeout(function(){addBtn.classList.remove("done");addBtn.lastChild.textContent="Add"},1100)});
 ov.addEventListener("pointerdown",function(e){if(e.target===ov){e.preventDefault();close()}});
 ov.appendChild(card);(document.getElementById("app")||document.body).appendChild(ov);
 cur=me;drawSv();paint(false);wsApply(wsc)}

/* every <input type="color"> in the app opens the wheel instead of the system colour dialog */
document.addEventListener("click",function(e){var i=e.target;
 if(!i||i.tagName!=="INPUT"||i.type!=="color")return;
 e.preventDefault();e.stopImmediatePropagation();open(i)},true);
window.ApexWheel={open:open,close:close};
})();
