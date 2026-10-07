/* Apex Cut mobile - Border & Shadow / Blending / Effects glass panel (acts on the selected layer, or on every layer of a multi-selection)
   Effects page: collapsible effect cards (arrow hides the sliders) + "Add Effect" button -> Effect Browser page with the effects sorted into groups */
(function(){
"use strict";
var A=window.AX,E=A.E,S=A.S,FX=A.FX,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var ed=$("#editor"),tools=$("#tools"),pill=$("#toolPill");
var xp=document.createElement("div");xp.className="glass mp sp xp";xp.id="xp";xp.setAttribute("aria-hidden","true");
xp.innerHTML='<div class="mp-h"><div class="mp-tabs xp-tabs" id="xpTabs"></div><b class="xp-title" id="xpTitle"></b>'+
 '<button class="pp-k" id="xpR" type="button" aria-label="Reset"><svg viewBox="0 0 24 24"><path d="M4.500 12a7.500 7.500 0 107.500-7.500H8M10.500 1.800L7.700 4.500l2.800 2.700" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
 '<button class="pp-k" id="xpX" type="button" aria-label="Close"><svg><use href="#i-x"/></svg></button></div><div class="xp-body" id="xpB"></div>';
ed.appendChild(xp);
var mode="border",tab="b",on=false,drag=false,pushed=false,lastKey=null,brCat=null,collapsed={};
var BORDER_K={vid:1,img:1,sol:1,shp:1,txt:1},SHADOW_NO={aud:1,nul:1,adj:1},BLEND_NO={aud:1,nul:1,adj:1},FX_NO={aud:1,nul:1};
var SWC=["#ffffff","#000000","#ff453a","#ff9f0a","#ffd60a","#30d158","#64d2ff","#0a84ff","#bf5af2","#ff375f","#8e8e93","#ac8e68"];
var TITLES={border:"Border & Shadow",blend:"Blending",fx:"Effects"};

function targets(){var s=E.sel();if(s!=null){var l=E.find(s);return l?[l]:[]}return E.msel().map(E.find).filter(Boolean)}
function can(kind,l){return kind==="border"?!!BORDER_K[l.k]:kind==="shadow"?!SHADOW_NO[l.k]:kind==="blend"?!BLEND_NO[l.k]:!FX_NO[l.k]}
function each(kind,fn){var n=0;targets().forEach(function(l){if(can(kind,l)){fn(l);n++}});return n}
function gesture(){if(!pushed){E.push();pushed=true}}
function changed(){A.redraw()}
function done(){pushed=false;E.save();A.redraw()}

/* ---------- sliders (same glass slider as the transform panel) ---------- */
function v2f(d,v){var m=d.mid,f;if(m!=null)f=v<=m?.5*(v-d.min)/(m-d.min):.5+.5*(v-m)/(d.max-m);else f=(v-d.min)/(d.max-d.min);return Math.max(0,Math.min(1,f))}
function f2v(d,f){f=Math.max(0,Math.min(1,f));var m=d.mid;return m!=null?(f<.5?d.min+(m-d.min)*f*2:m+(d.max-m)*(f-.5)*2):d.min+(d.max-d.min)*f}
function rem(){return parseFloat(getComputedStyle(document.documentElement).fontSize)}
/* ruler geometry: u = px of finger travel per step (long ranges get a finer pitch), tick pitch follows it */
function geom(d){var st=d.step||1,n=Math.max(1,Math.round((d.max-d.min)/st)),R=rem(),u=R*Math.max(.35,Math.min(5,120/n)),k=n>=40?5:1;return {st:st,n:n,u:u,mn:u*k,mj:u*k*5}}
function s2v(d,s){var g=geom(d),v=d.min+Math.round(s)*g.st;return +Math.max(d.min,Math.min(d.max,v)).toFixed(3)}
function v2s(d,v){var g=geom(d);return Math.max(0,Math.min(g.n,(v-d.min)/g.st))}
function paintSl(sl,d,v){var g=geom(d);sl.style.setProperty("--off",(-v2s(d,v)*g.u).toFixed(2)+"px");sl.style.setProperty("--mn",g.mn.toFixed(2)+"px");sl.style.setProperty("--mj",g.mj.toFixed(2)+"px");
 var md=sl.querySelector(".xr-md");if(md&&d.mid!=null)md.style.left=(v2s(d,d.mid)*g.u).toFixed(2)+"px"}
function fmt(d,v){if(d.names)return d.names[Math.max(0,Math.min(d.names.length-1,Math.round(v)))];return (Math.round(v*10)/10)+(d.u||"")}
var lastId=null;
function sliderHTML(id,d,v,extra){
 return '<div class="xp-r xr'+(id===lastId?" on":"")+(extra||"")+'"><span class="xl">'+d.t+'</span><div class="xr-ruler xs" data-id="'+id+'" data-min="'+d.min+'" data-max="'+d.max+'"'+(d.mid!=null?' data-mid="'+d.mid+'"':"")+' data-step="'+(d.step||1)+'" data-u="'+(d.u||"")+'" data-t="'+d.t+'"'+(d.names?' data-names="'+d.names.join("|")+'"':"")+'><i class="xr-tk">'+(d.mid!=null?'<i class="xr-md"></i>':"")+'</i><i class="xr-ph"></i></div><output class="xv" data-id="'+id+'">'+fmt(d,v)+'</output></div>'}
function defOf(sl){return {min:+sl.dataset.min,max:+sl.dataset.max,mid:sl.dataset.mid!=null?+sl.dataset.mid:null,step:+sl.dataset.step||1,u:sl.dataset.u,t:sl.dataset.t,names:sl.dataset.names?sl.dataset.names.split("|"):null}}
function showV(sl,v){var d=defOf(sl);paintSl(sl,d,v);var o=sl.nextElementSibling;if(o)o.textContent=fmt(d,v)}
function initSliders(){$$("#xpB .xr-ruler").forEach(function(sl){var d=defOf(sl),v=getVal(sl.dataset.id);paintSl(sl,d,v)})}

/* ---------- value get / set by id ---------- */
/* ids: bd.w bd.o bd.r | sd.o sd.b sd.x sd.y | fx.<index>.<param> */
function first(){return targets()[0]}
function getVal(id){var l=first(),p=id.split(".");if(!l)return 0;
 if(p[0]==="bd")return (l.bd&&l.bd[p[1]]!=null)?l.bd[p[1]]:(p[1]==="w"?FX.BD.w:p[1]==="o"?100:0);
 if(p[0]==="sd")return (l.sd&&l.sd[p[1]]!=null)?l.sd[p[1]]:FX.SD[p[1]];
 if(p[0]==="fx"){var e=l.fx&&l.fx[+p[1]];return e&&e.v[p[2]]!=null?e.v[p[2]]:0}return 0}
function setVal(id,v){var p=id.split(".");gesture();
 if(p[0]==="bd")each("border",function(l){l.bd=l.bd||Object.assign({},FX.BD);l.bd[p[1]]=v;l.bd.on=true});
 else if(p[0]==="sd")each("shadow",function(l){l.sd=l.sd||Object.assign({},FX.SD);l.sd[p[1]]=v;l.sd.on=true});
 else if(p[0]==="fx"){var l0=first(),t=l0.fx[+p[1]].t,i=+p[1];each("fx",function(l){var e=l.fx&&l.fx[i];if(e&&e.t===t)e.v[p[2]]=v})}
 changed()}
function fxDef(id){var p=id.split("."),l=first(),e=l&&l.fx&&l.fx[+p[1]];if(!e)return null;var d=FX.byId[e.t];return d&&d.p.filter(function(q){return q.k===p[2]})[0]}

/* ---------- panel body ---------- */
function swatches(cur,attr){return '<div class="xp-sw">'+SWC.map(function(c){return '<button type="button" class="xs-c'+(c.toLowerCase()===String(cur).toLowerCase()?" on":"")+'" data-'+attr+'="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>'}).join("")+
 '<label class="xs-c cust'+(SWC.indexOf(String(cur).toLowerCase())<0?" on":"")+'" aria-label="Custom color"><input type="color" data-cc="'+attr+'" value="'+(/^#[0-9a-f]{6}$/i.test(cur)?cur:"#ffffff")+'"><svg><use href="#i-plus"/></svg></label></div>'}
function toggleRow(label,isOn,attr){return '<div class="xp-r xp-tg"><span class="xl wide">'+label+'</span><button type="button" class="ps-sw2'+(isOn?" on":"")+'" data-tg="'+attr+'" aria-label="'+label+'"></button></div>'}
function note(t){return '<div class="xp-note">'+t+'</div>'}

/* colour parameter of an effect (e.g. CC Light Sweep > Light Color) */
function colRow(i,p){var l=first(),e=l&&l.fx&&l.fx[i],cur=(e&&e.v[p.k])||p.v||"#ffffff";
 return '<div class="xp-r xp-col" data-fxi="'+i+'" data-fxk="'+p.k+'"><span class="xl">'+p.t+'</span>'+swatches(cur,"fc")+'</div>'}
function setFxV(i,k,v){var l0=first();if(!l0||!l0.fx||!l0.fx[i])return;var ty=l0.fx[i].t;each("fx",function(l){var e=l.fx&&l.fx[i];if(e&&e.t===ty)e.v[k]=v})}
function renderBorder(){
 var L=targets(),l=L[0],h="";
 if(tab==="b"){
  var ok=L.some(function(x){return can("border",x)});
  if(!ok)return note("Border isn't available for this layer type.<br>Use it on Video, Photo, Text, Shape or Solid layers.");
  var b=l.bd&&l.bd.on?l.bd:null,b2=b||FX.BD,isTxt=L.every(function(x){return x.k==="txt"}),isMed=L.some(function(x){return x.k==="vid"||x.k==="img"});
  h+=toggleRow("Border",!!b,"bd");
  h+='<div class="xp-dim'+(b?"":" off")+'">'+'<div class="xp-r xp-col"><span class="xl">Color</span>'+swatches(b2.c,"bc")+'</div>'+
   sliderHTML("bd.w",{t:"Width",min:0,max:80,u:""},getVal("bd.w"))+sliderHTML("bd.o",{t:"Opacity",min:0,max:100,u:"%"},getVal("bd.o"));
  if(!isTxt)h+='<div class="xp-r"><span class="xl">Position</span><div class="xp-ch">'+[["o","Outside"],["c","Center"],["i","Inside"]].map(function(q){return '<button type="button" class="xc'+(b2.p===q[0]?" on":"")+'" data-bp="'+q[0]+'">'+q[1]+'</button>'}).join("")+'</div></div>';
  if(isMed)h+=sliderHTML("bd.r",{t:"Corner",min:0,max:300,u:""},getVal("bd.r"));
  h+='</div>';return h}
 var ok2=L.some(function(x){return can("shadow",x)});
 if(!ok2)return note("Shadow isn't available for this layer type.");
 var s=l.sd&&l.sd.on?l.sd:null,s2=s||FX.SD;
 h+=toggleRow("Shadow",!!s,"sd");
 h+='<div class="xp-dim'+(s?"":" off")+'">'+'<div class="xp-r xp-col"><span class="xl">Color</span>'+swatches(s2.c,"sc")+'</div>'+
  sliderHTML("sd.o",{t:"Opacity",min:0,max:100,u:"%"},getVal("sd.o"))+sliderHTML("sd.b",{t:"Blur",min:0,max:120,u:""},getVal("sd.b"))+
  sliderHTML("sd.x",{t:"Offset X",min:-150,max:150,mid:0,u:""},getVal("sd.x"))+sliderHTML("sd.y",{t:"Offset Y",min:-150,max:150,mid:0,u:""},getVal("sd.y"))+'</div>';
 return h}
function renderBlend(){
 var L=targets(),l=L[0];if(!L.some(function(x){return can("blend",x)}))return note("Blending isn't available for this layer type.");
 var cur=l.bm||"normal";
 return '<div class="xp-grid">'+FX.BLEND.map(function(q){return '<button type="button" class="xc'+(cur===q[0]?" on":"")+'" data-bm="'+q[0]+'">'+q[1]+'</button>'}).join("")+'</div>'+note("The layer is mixed with everything underneath it.")}
function fkey(i){var l=first();return (l?l.i:"x")+"|"+i}
function renderFx(){
 var L=targets(),l=L[0];if(!L.some(function(x){return can("fx",x)}))return note("Effects aren't available for this layer type.");
 var list=l.fx||[],h="";
 if(!list.length)h+=note(l.k==="adj"?"Add an effect - it changes every layer below this Adjustment layer.":"No effects yet.<br>Tap Add Effect below.");
 list.forEach(function(e,i){var d=FX.byId[e.t];if(!d)return;var cl=!!collapsed[fkey(i)];
  h+='<div class="fxc'+(e.on===false?" dis":"")+(cl?" cl":"")+'"><div class="fxh"><button type="button" class="fxar" data-fxcl="'+i+'" aria-label="Show / hide sliders"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg></button><b data-fxcl="'+i+'">'+d.name+'</b><button type="button" class="pp-k'+(e.on===false?"":" on")+'" data-fxtg="'+i+'" aria-label="On / off"><svg><use href="#i-eye"/></svg></button><button type="button" class="pp-k" data-fxdel="'+i+'" aria-label="Remove"><svg><use href="#i-trash"/></svg></button></div>'+
   '<div class="fxs"><div class="fxs-in">'+d.p.map(function(p){return p.col?colRow(i,p):sliderHTML("fx."+i+"."+p.k,p,getVal("fx."+i+"."+p.k))}).join("")+'</div></div></div>'});
 h+='<div class="xp-addbar"><button type="button" class="xp-addfx" data-fxopen="1"><svg><use href="#i-star"/></svg>Add Effect</button></div>';
 return h}

/* ---------- Effect Browser (separate page) : effects sorted into groups ---------- */
var CATS=[
 ["col","Color & Light",/black|white|sepia|invert|hue|bright|contrast|satur|exposure|tint|colou?r|vibr|gamma|temperature|warm|cool|level|curve|glow|light|duotone|gr[ae]y|vintage|film|lut/i,"#ff9f0a","#ff375f"],
 ["edg","Drawing & Edge",/edge|outline|sketch|emboss|bevel|sharpen|poster|cartoon|toon|halftone|threshold|stroke|contour/i,"#30d158","#0a84ff"],
 ["blr","Blur",/blur|soft|focus/i,"#64d2ff","#5e5ce6"],
 ["wrp","Distortion/Warp",/warp|wave|ripple|twirl|swirl|bulge|pinch|squeeze|distort|fisheye|lens|stretch|spherize|liquid|shake/i,"#0a84ff","#bf5af2"],
 ["prc","Procedural",/noise|grain|pixel|mosaic|glitch|split|scan|vhs|static|rgb|chromatic|aberration|dither/i,"#bf5af2","#ff375f"],
 ["mov","Move/Transform",/mirror|flip|rotate|move|scale|zoom|shift|offset|tile|transform|slide/i,"#5e5ce6","#64d2ff"],
 ["rep","Repeat",/repeat|echo|clone|kaleido|trail|ghost/i,"#ff375f","#ff9f0a"],
 ["key","Matte/Mask/Key",/key|matte|mask|chroma|cutout|replace/i,"#ff6482","#bf5af2"],
 ["opa","Opacity/Visibility",/opacity|vignette|visib|flicker|blink|strobe|transparen|fade/i,"#8e8e93","#48484a"],
 ["oth","Other",null,"#56657a","#2c3646"]];
function groups(){var out=CATS.map(function(c){return {id:c[0],name:c[1],c1:c[3],c2:c[4],list:[]}});
 FX.DEF.forEach(function(d){if(d.hide)return;var k=out.length-1;for(var q=0;q<CATS.length-1;q++){if(CATS[q][2].test(d.name+" "+d.id)){k=q;break}}out[k].list.push(d)});
 return out.filter(function(g){return g.list.length})}
var pg=document.createElement("div");pg.className="fxpg";pg.id="fxPg";pg.setAttribute("aria-hidden","true");ed.appendChild(pg);
var brQ="",brS=false;
var BK='<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var SRCH='<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.2 15.2L20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
var XI='<svg><use href="#i-x"/></svg>';
var PV={leak:1,hue:1,ibl:1,dbl:1,pix:1,inv:1,glow:1,bw:1}; /* effects that have preview art in img/fx/<id>.jpg */
function tile(d,g,cls){var art=PV[d.id]?' style="background-image:url(img/fx/'+d.id+'.jpg)"':'',ph=PV[d.id]?'':' ph';
 return '<button type="button" class="fp-t'+(cls||"")+'" data-add="'+d.id+'" style="--c1:'+g.c1+';--c2:'+g.c2+'"><span class="fp-pv'+ph+'"'+art+'></span><em>'+d.name+'</em></button>'}
function brHead(){
 if(brS)return '<button type="button" class="pp-k" data-brsx="1" aria-label="Back">'+BK+'</button><input class="fp-in" id="fpIn" type="search" placeholder="Search effects" autocomplete="off" value="'+brQ.replace(/"/g,"&quot;")+'"><button type="button" class="pp-k" data-brx="1" aria-label="Close">'+XI+'</button>';
 var g=brCat!=null?groups().filter(function(x){return x.id===brCat})[0]:null;
 return (g?'<button type="button" class="pp-k" data-brback="1" aria-label="Back">'+BK+'</button>':'<button type="button" class="pp-k" data-brx="1" aria-label="Close">'+XI+'</button>')+
  '<b class="fp-ttl">'+(g?g.name:"Effect Browser")+'</b><button type="button" class="pp-k" data-brs="1" aria-label="Search">'+SRCH+'</button>'}
function brBody(){
 var G=groups(),gm={};G.forEach(function(g){g.list.forEach(function(d){gm[d.id]=g})});
 if(brS&&brQ.trim()){var q=brQ.trim().toLowerCase(),res=FX.DEF.filter(function(d){return !d.hide&&(d.name+" "+d.id).toLowerCase().indexOf(q)>=0});
  return res.length?'<div class="fp-grid">'+res.map(function(d){return tile(d,gm[d.id])}).join("")+'</div>':'<div class="xp-note">No effects found</div>'}
 if(brS)return '<div class="xp-note">Type to search effects</div>';
 if(brCat!=null){var g=G.filter(function(x){return x.id===brCat})[0];if(!g){brCat=null;return brBody()}
  return '<div class="fp-grid">'+g.list.map(function(d){return tile(d,g)}).join("")+'</div>'}
 return '<div class="fp-cats">'+G.map(function(g){return '<button type="button" class="fp-cat" data-cat="'+g.id+'" style="--c1:'+g.c1+';--c2:'+g.c2+'"><span>'+g.name+'</span><em>'+g.list.length+(g.list.length===1?' effect':' effects')+'</em></button>'}).join("")+'</div>'+
  '<div class="fp-grid">'+FX.DEF.filter(function(d){return !d.hide}).map(function(d){return tile(d,gm[d.id])}).join("")+'</div>'}
function renderBr(){pg.innerHTML='<div class="fp-h">'+brHead()+'</div><div class="fp-body" id="fpB">'+brBody()+'</div>'}
function openBr(){brCat=null;brS=false;brQ="";renderBr();pg.classList.add("on");pg.setAttribute("aria-hidden","false")}
function closeBr(){pg.classList.remove("on");pg.setAttribute("aria-hidden","true")}
function render(){
 var tabs=$("#xpTabs"),title=$("#xpTitle");
 if(mode==="border"){tabs.style.display="";title.style.display="none";tabs.innerHTML='<button type="button" data-t="b" class="'+(tab==="b"?"on":"")+'">Border</button><button type="button" data-t="s" class="'+(tab==="s"?"on":"")+'">Shadow</button>'}
 else{tabs.style.display="none";title.style.display="block";title.textContent=TITLES[mode]}
 var keep=$("#xpB").scrollTop,hs=(lastKey===tab+"|"+mode)?$$("#xpB .xp-add,#xpB .xp-ch").map(function(r){return r.scrollLeft}):[];lastKey=tab+"|"+mode;
 $("#xpB").innerHTML=mode==="border"?renderBorder():mode==="blend"?renderBlend():renderFx();
 $("#xpB").scrollTop=keep;
 $$("#xpB .xp-add,#xpB .xp-ch").forEach(function(r,i){if(hs[i])r.scrollLeft=hs[i]});initSliders()}

/* ---------- open / close ---------- */
function okFor(kind,l){return kind==="border"?(can("border",l)||can("shadow",l)):can(kind,l)}
function autoPick(kind){ /* nothing selected: take the top-most layer under the playhead */
 var M=E.M();if(!M)return null;var t=S.t;
 var c=M.L.filter(function(l){return !l.h&&t>=l.s-1e-6&&t<=l.s+l.d+1e-6&&okFor(kind,l)}).sort(function(a,b){return a.r-b.r});
 return c[0]||null}
function open(kind){
 mode=kind;if(kind==="border")tab="b";
 var L=targets();
 if(!L.length){var p=autoPick(kind);if(!p){A.toast("Select a layer first");return}E.select(p.i);L=targets()}
 if(!L.some(function(l){return okFor(kind,l)})){A.toast(TITLES[kind]+" isn't available for this layer");return}
 if(A.closePanels)A.closePanels();if(A.TE)A.TE.close(false);
 pushed=false;closeBr();render();xp.classList.add("on");xp.setAttribute("aria-hidden","false");tools.classList.add("mv");on=true}
function close(restore){
 closeBr();if(!on)return;on=false;xp.classList.remove("on");xp.setAttribute("aria-hidden","true");tools.classList.remove("mv");
 if(restore!==false){tools.classList.add("open");pill.setAttribute("aria-hidden","false")}}
function sync(){if(!on)return;if(!targets().length){close(false);return}if(!drag)render()}
A.XP={open:open,close:close,sync:sync,isOn:function(){return on}};
$("#xpX").onclick=function(){close(true)};

/* reset what the current page shows */
$("#xpR").onclick=function(){
 var L=targets();if(!L.length)return;E.push();
 L.forEach(function(l){if(mode==="border"){if(tab==="b")delete l.bd;else delete l.sd}else if(mode==="blend")delete l.bm;else l.fx=[]});
 E.save();render();A.redraw()};

/* ---------- interaction ---------- */
$("#xpTabs").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||b.dataset.t===tab)return;tab=b.dataset.t;render()});
$("#xpB").addEventListener("pointerdown",function(e){
 var sl=e.target.closest(".xr-ruler");if(!sl||sl.closest(".xp-dim.off"))return;e.preventDefault();
 var d=defOf(sl),id=sl.dataset.id,g=geom(d),REM=rem(),row=sl.closest(".xp-r");
 $$("#xpB .xp-r.on").forEach(function(r){r.classList.remove("on")});if(row)row.classList.add("on");lastId=id;
 var s=v2s(d,getVal(id)),lastV=null,lastX=e.clientX,lastT=performance.now(),vel=0,wasSnap=false,raf=0,hx=HX.slider(g.n*g.u),snapPos=d.mid!=null?v2s(d,d.mid):null;
 drag=true;pushed=false;sl.setPointerCapture(e.pointerId);sl.classList.add("drag");document.body.classList.add("sliding");
 function go(){raf=0;var snap=false,v;
  if(snapPos!=null&&Math.abs(s-snapPos)*g.u<2*REM){v=d.mid;snap=true}else v=s2v(d,s);
  if(v!==lastV){lastV=v;hx.move((v-d.min)/(d.max-d.min),snap,wasSnap);setVal(id,v);showV(sl,v)}
  wasSnap=snap}
 function mv(ev){ /* the ruler follows the finger; a quick swipe travels further than a slow one */
  var now=performance.now(),dx=ev.clientX-lastX,dt=Math.max(1,now-lastT);vel=vel*.7+(Math.abs(dx)/dt)*.3;lastX=ev.clientX;lastT=now;
  var boost=1+Math.min(3,vel*2.2);s=Math.max(0,Math.min(g.n,s-dx*boost/g.u));
  if(!raf)raf=requestAnimationFrame(go)}
 function up(){if(raf){cancelAnimationFrame(raf);raf=0;go()}document.body.classList.remove("sliding");sl.removeEventListener("pointermove",mv);sl.removeEventListener("pointerup",up);sl.removeEventListener("pointercancel",up);sl.classList.remove("drag");drag=false;done()}
 sl.addEventListener("pointermove",mv);sl.addEventListener("pointerup",up);sl.addEventListener("pointercancel",up)});
$("#xpB").addEventListener("click",function(e){
 var t=e.target,b;
 if((b=t.closest(".xv"))){if(b.closest(".xp-dim.off"))return;var id=b.dataset.id,sl=$('.xr-ruler[data-id="'+id+'"]',xp),d=defOf(sl);
  A.askText(d.t,String(getVal(id))).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;v=Math.max(d.min,Math.min(d.max,v));pushed=false;setVal(id,v);done();render()});return}
 if((b=t.closest("[data-tg]"))){var k=b.dataset.tg;E.push();
  if(k==="bd")each("border",function(l){if(l.bd&&l.bd.on)l.bd.on=false;else l.bd=Object.assign({},FX.BD,l.bd||{},{on:true})});
  else each("shadow",function(l){if(l.sd&&l.sd.on)l.sd.on=false;else l.sd=Object.assign({},FX.SD,l.sd||{},{on:true})});
  E.save();render();A.redraw();return}
 if((b=t.closest("[data-fc]"))){var fw=b.closest("[data-fxi]");if(fw){E.push();setFxV(+fw.dataset.fxi,fw.dataset.fxk,b.dataset.fc);E.save();render();A.redraw()}return}
 if((b=t.closest("[data-bc]"))){E.push();each("border",function(l){l.bd=Object.assign({},FX.BD,l.bd||{});l.bd.c=b.dataset.bc;l.bd.on=true});E.save();render();A.redraw();return}
 if((b=t.closest("[data-sc]"))){E.push();each("shadow",function(l){l.sd=Object.assign({},FX.SD,l.sd||{});l.sd.c=b.dataset.sc;l.sd.on=true});E.save();render();A.redraw();return}
 if((b=t.closest("[data-bp]"))){E.push();each("border",function(l){l.bd=Object.assign({},FX.BD,l.bd||{});l.bd.p=b.dataset.bp;l.bd.on=true});E.save();render();A.redraw();return}
 if((b=t.closest("[data-bm]"))){E.push();var v=b.dataset.bm;each("blend",function(l){if(v==="normal")delete l.bm;else l.bm=v});E.save();render();A.redraw();return}
 if((b=t.closest("[data-fxopen]"))){openBr();return}
 if((b=t.closest("[data-fxcl]"))){var ck=fkey(+b.dataset.fxcl);if(collapsed[ck])delete collapsed[ck];else collapsed[ck]=1;var card=b.closest(".fxc");if(card)card.classList.toggle("cl",!!collapsed[ck]);return}
 if((b=t.closest("[data-fxtg]"))){var i=+b.dataset.fxtg,ty=first().fx[i].t;E.push();var nv=first().fx[i].on===false;each("fx",function(l){var q=l.fx&&l.fx[i];if(q&&q.t===ty)q.on=nv});E.save();render();A.redraw();return}
 if((b=t.closest("[data-fxdel]"))){var j=+b.dataset.fxdel,ty2=first().fx[j].t;E.push();var l1=first(),nc={};Object.keys(collapsed).forEach(function(k){var p=k.split("|");if(l1&&p[0]==String(l1.i)){var n=+p[1];if(n<j)nc[k]=1;else if(n>j)nc[p[0]+"|"+(n-1)]=1}else nc[k]=1});collapsed=nc;each("fx",function(l){if(l.fx&&l.fx[j]&&l.fx[j].t===ty2)l.fx.splice(j,1)});E.save();render();A.redraw();return}
});
/* Effect Browser page clicks */
pg.addEventListener("click",function(e){var t=e.target,b;
 if((b=t.closest("[data-brx]"))){closeBr();return}
 if((b=t.closest("[data-brback]"))){brCat=null;renderBr();return}
 if((b=t.closest("[data-brs]"))){brS=true;brQ="";renderBr();var i=$("#fpIn",pg);if(i)i.focus();return}
 if((b=t.closest("[data-brsx]"))){brS=false;brQ="";renderBr();return}
 if((b=t.closest("[data-cat]"))){brCat=b.dataset.cat;renderBr();return}
 if((b=t.closest("[data-add]"))){E.push();var id2=b.dataset.add;each("fx",function(l){l.fx=l.fx||[];l.fx.push(FX.mk(id2))});E.save();closeBr();render();A.redraw();
  var bx=$("#xpB");setTimeout(function(){bx.scrollTop=bx.scrollHeight},30);return}});
pg.addEventListener("input",function(e){if(e.target.id==="fpIn"){brQ=e.target.value;var bd=$("#fpB",pg);if(bd)bd.innerHTML=brBody()}});
/* custom colour pickers */
$("#xpB").addEventListener("input",function(e){var t=e.target;if(!t.dataset||!t.dataset.cc)return;var v=t.value;
 if(t.dataset.cc==="fc"){var fw=t.closest("[data-fxi]");if(fw){gesture();setFxV(+fw.dataset.fxi,fw.dataset.fxk,v);changed()}return}
 if(t.dataset.cc==="bc")setProp("bd","c",v);else setProp("sd","c",v)});
$("#xpB").addEventListener("change",function(e){if(e.target.dataset&&e.target.dataset.cc){pushed=false;E.save();render()}});
function setProp(o,k,v){gesture();each(o==="bd"?"border":"shadow",function(l){l[o]=Object.assign({},o==="bd"?FX.BD:FX.SD,l[o]||{});l[o][k]=v;l[o].on=true});changed()}
(function(){var st=document.createElement("style");st.id="xpFxCss";st.textContent=[
".fxc .fxh{min-height:8.4rem}",
".fxc .fxh b{cursor:pointer}",
".fxc .fxar{flex:none;width:6rem;height:8.4rem;display:grid;place-items:center;color:#c9d1dc;margin-left:-1rem}",
".fxc .fxar svg{width:3.4rem;height:3.4rem;transition:transform .2s}",
".fxc:not(.cl) .fxar svg{transform:rotate(90deg)}",
".fxc{transition:padding-bottom .34s cubic-bezier(.3,.9,.3,1)}",
".fxc .fxs{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows .34s cubic-bezier(.3,.9,.3,1),opacity .26s ease}",
".fxc .fxs-in{min-height:0;overflow:hidden;padding:0 .4rem}",
".fxc.cl .fxs{grid-template-rows:0fr;opacity:0}",
".fxc.cl{padding-bottom:1.6rem}",
".fxc.cl .fxh{margin-bottom:0}",
".fxc .fxh{margin-bottom:.4rem;transition:margin-bottom .34s ease}",
".xp-addbar{position:sticky;bottom:-1rem;padding:1.6rem 0 1.2rem;margin-top:.4rem;background:none}",
".xp-addfx{width:100%;height:10rem;border-radius:3.6rem;display:flex;align-items:center;justify-content:center;gap:1.6rem;font-size:4.2rem;font-weight:800;color:#fff;background-image:var(--grad);border:var(--ib-edge);box-shadow:var(--glow-soft),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .12s}",
".xp-addfx svg{width:4.6rem;height:4.6rem}",
".xp-addfx:active{transform:scale(.97)}",
".fxpg{position:absolute;inset:0;z-index:75;display:none;flex-direction:column;color:#fff;padding:0 0 2rem;background-color:rgba(12,16,26,.70);-webkit-backdrop-filter:blur(30px) saturate(150%);backdrop-filter:blur(30px) saturate(150%)}",
".fxpg.on{display:flex;animation:fpIn .2s ease}",
"@keyframes fpIn{from{opacity:0;transform:translateY(2.4rem)}to{opacity:1;transform:none}}",
".fp-h{flex:none;display:flex;align-items:center;gap:2rem;padding:3.4rem 3rem 2.2rem}",
".fp-ttl{flex:1;text-align:center;font-size:4.6rem;font-weight:700}",
".fp-in{flex:1;min-width:0;height:9.2rem;border-radius:3.4rem;background:var(--inset-bg);border:var(--glass-edge);box-shadow:var(--inset-sh);color:#fff;font:inherit;font-size:4rem;padding:0 3rem;outline:0;-webkit-user-select:text;user-select:text}",
".fp-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;touch-action:pan-y;padding:0 0 4rem}",
".fp-body::-webkit-scrollbar{display:none}",
".fp-cats{display:grid;grid-template-columns:1fr 1fr;gap:2rem;padding:1rem 3rem 1.4rem}",
".fp-cat,.fp-pv{position:relative;overflow:hidden;border:var(--glass-edge);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(255,255,255,.08),0 .8rem 2.2rem rgba(0,0,0,.28);background-image:var(--glass-bg);}",
".fp-cat::before,.fp-pv::before{content:\"\";position:absolute;inset:0;background-image:linear-gradient(135deg,var(--c1),var(--c2));opacity:.34;pointer-events:none}",
".fp-cat{height:17rem;border-radius:3.6rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;color:#fff;transition:background-color .12s}",
".fp-cat:active{background-color:rgba(255,255,255,.16)}",
".fp-cat span,.fp-cat em{position:relative}",
".fp-cat span{font-size:4rem;font-weight:800;text-shadow:0 .2rem 1rem rgba(0,0,0,.45)}",
".fp-cat em{font-style:normal;font-size:3rem;font-weight:600;opacity:.8}",
".fp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2.4rem 2rem;padding:2rem 3rem}",
".fp-t{display:flex;flex-direction:column;align-items:center;gap:1.4rem;min-width:0;transition:transform .12s}",
".fp-t:active{transform:scale(.94)}",
".fp-pv{width:100%;aspect-ratio:1;border-radius:3rem;display:grid;place-items:center}",
".fp-pv b{position:relative;font-size:6.4rem;font-weight:800;color:#fff;text-shadow:0 .3rem 1rem rgba(0,0,0,.4)}",
".fp-t em{font-style:normal;font-size:3rem;font-weight:600;color:#e6ecf6;max-width:100%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
/* v23 - effect cards: rounded art on top + dark label bar (no backdrop blur inside the page, so nothing flickers on touch) */
".fp-grid{grid-template-columns:repeat(3,1fr);gap:3rem 2.4rem}",
".fp-t.fp-t{position:relative;gap:0;align-items:stretch;border-radius:3.4rem;overflow:hidden;background:linear-gradient(180deg,#2c2c30 0%,#17171a 100%);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1rem 2.6rem rgba(0,0,0,.5)}",
".fp-t .fp-pv{position:relative;display:block;width:100%;aspect-ratio:1/.9;border-radius:3.4rem 3.4rem 2.8rem 2.8rem;background-color:#111;background-size:cover;background-position:center;border:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 0 0 1px rgba(255,255,255,.1),0 .6rem 1.6rem rgba(0,0,0,.45);-webkit-backdrop-filter:none;backdrop-filter:none;overflow:hidden}",
".fp-t .fp-pv::before{opacity:0}",
".fp-t .fp-pv.ph::before{opacity:1;background-image:radial-gradient(120% 90% at 20% 15%,rgba(255,255,255,.55),transparent 55%),radial-gradient(90% 80% at 85% 95%,var(--c2),transparent 70%),linear-gradient(135deg,var(--c1),var(--c2))}",
".fp-t .fp-pv::after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 28%);pointer-events:none}",
".fp-t>em{display:block;line-height:9.4rem;height:9.4rem;padding:0 1.4rem;font-style:normal;font-size:2.8rem;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#fff;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
].join("\n");document.head.appendChild(st)})();
})();
