/* Apex Cut mobile - Text Animator (After Effects style): animator properties + range selector + in/out timing.
   Panel opens from the text-layer pill (A icon); the renderer draws the text unit by unit (characters / words / lines). */
(function(){
"use strict";
var A=window.AX,E=A.E,S=A.S,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var ed=$("#editor"),tools=$("#tools"),pill=$("#toolPill");

/* ---------------- model ---------------- */
var PROPS={pos:{t:"Position",sl:[{k:0,t:"Position X",min:-600,max:600,mid:0},{k:1,t:"Position Y",min:-600,max:600,mid:0}],def:[0,60]},
 scl:{t:"Scale",sl:[{t:"Scale",min:0,max:300,mid:100,u:"%"}],def:50},
 rot:{t:"Rotation",sl:[{t:"Rotation",min:-360,max:360,mid:0,u:"\u00B0"}],def:-45},
 opa:{t:"Opacity",sl:[{t:"Opacity",min:0,max:100,u:"%"}],def:0},
 trk:{t:"Tracking",sl:[{t:"Tracking",min:-60,max:200,mid:0}],def:40}};
var ORDER=["pos","scl","rot","opa","trk"];
var SHAPES=[["sq","Square"],["up","Ramp Up"],["dn","Ramp Down"],["tri","Triangle"],["rnd","Round"]];
var PRESETS=[
 {n:"Fade Up",by:"c",p:{pos:[0,60],opa:0},sm:40,dir:"ltr",dur:1.2},
 {n:"Typewriter",by:"c",p:{opa:0},sm:6,dir:"ltr",dur:1.6},
 {n:"Pop",by:"c",p:{scl:0,opa:0},sm:50,dir:"ltr",dur:1.1},
 {n:"Slide",by:"w",p:{pos:[-160,0],opa:0},sm:45,dir:"ltr",dur:1.2},
 {n:"Drop",by:"c",p:{pos:[0,-140],rot:25,opa:0},sm:45,dir:"ltr",dur:1.2},
 {n:"Spin In",by:"c",p:{rot:-90,scl:40,opa:0},sm:50,dir:"ctr",dur:1.3},
 {n:"Scatter",by:"c",p:{pos:[0,80],rot:30,opa:0},sm:60,dir:"rnd",dur:1.4},
 {n:"Wide Track",by:"l",p:{trk:90,opa:0},sm:50,dir:"ltr",dur:1.4},
 {n:"Fade Out",by:"c",p:{opa:0},sm:40,dir:"ltr",dur:1.0,m:"out"}];
/* Range Start / End can be keyframed: T.kf = {s:[{t,v}],e:[{t,v}]}, t = seconds from the layer start (linear between keys) */
function rgAt(T,key,t){var ks=T&&T.kf&&T.kf[key];
 if(!ks||!ks.length)return T&&T.rg&&T.rg[key]!=null?T.rg[key]:(key==="s"?0:100);
 if(t<=ks[0].t)return ks[0].v;if(t>=ks[ks.length-1].t)return ks[ks.length-1].v;
 for(var i=0;i<ks.length-1;i++){var a=ks[i],b=ks[i+1];if(t>=a.t&&t<=b.t)return a.v+(b.v-a.v)*(t-a.t)/Math.max(1e-6,b.t-a.t)}
 return ks[ks.length-1].v}
function kfNear(T,key,t){var ks=T&&T.kf&&T.kf[key];return ks?ks.filter(function(k){return Math.abs(k.t-t)<.06})[0]:null}
function mk(){return {on:true,by:"c",p:{},rg:{s:0,e:100,sh:"sq",sm:30},tm:{m:"in",dir:"ltr",dur:1,del:0,loop:false}}}
function cur(){var l=E.sel()!=null?E.find(E.sel()):null;return l&&l.k==="txt"?l:null}
function ta(l,make){if(!l.ta&&make)l.ta=mk();return l.ta}

/* ---------------- renderer ---------------- */
function segs(str,by){
 if(by==="l")return [{s:str,sp:false}];
 if(by==="w"){var o=[];str.split(/(\s+)/).forEach(function(x){if(x!=="")o.push({s:x,sp:/^\s+$/.test(x)})});return o}
 var g;try{if(window.Intl&&Intl.Segmenter){g=[];var it=new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(str);for(var x of it)g.push(x.segment)}}catch(e){g=null}
 if(!g)g=Array.from(str);return g.map(function(x){return {s:x,sp:/^\s+$/.test(x)}})}
function sstep(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function shapeF(sh,t){return sh==="up"?t:sh==="dn"?1-t:sh==="tri"?1-Math.abs(2*t-1):sh==="rnd"?Math.sin(Math.PI*t):1}
function ease(p){return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2}
function draw(c,l,tl,cx,tt,fs,lines,x,y0,lh,hasBd){
 var T=l.ta,k=cx.k,by=T.by||"c",rg=T.rg||{},tm=T.tm||{},P=T.p||{},ga=c.globalAlpha;
 /* units */
 var rows=lines.map(function(ln){return segs(ln,by)}),n=0;
 rows.forEach(function(r){r.forEach(function(u){if(!u.sp)u.j=n++})});
 var N=Math.max(1,n);
 /* sweep progress */
 var mode=tm.m||"in",prog=1,loop=!!tm.loop,dur=Math.max(.05,tm.dur||1),t=tl-l.s-(tm.del||0);
 if(mode!=="none"){var p0=t/dur;if(loop&&p0>0)p0=p0%1;prog=ease(Math.max(0,Math.min(1,p0)))}
 var w=Math.max(4,rg.sm==null?30:rg.sm),dir=tm.dir||"ltr",rt0=tl-l.s,s0=rgAt(T,"s",rt0),e0=rgAt(T,"e",rt0);if(s0>e0){var sw0=s0;s0=e0;e0=sw0}
 function amt(u){
  var pos=(u.j+.5)/N*100,a=1;
  if(pos<s0-1e-6||pos>e0+1e-6)return 0;
  a=shapeF(rg.sh||"sq",e0>s0?Math.max(0,Math.min(1,(pos-s0)/(e0-s0))):1);
  if(mode==="none")return a;
  var q=dir==="rtl"?100-pos:dir==="ctr"?Math.abs(pos-50)*2:dir==="rnd"?hash(u.j+1)*100:pos,d;
  if(mode==="in"){var L=-w+(100+w)*prog;d=Math.max(0,Math.min(1,(q-L)/w))}
  else{var L2=-w+(100+2*w)*prog;d=Math.max(0,Math.min(1,(L2-q)/w))}
  return a*d}
 c.textBaseline="middle";c.textAlign="left";
 rows.forEach(function(r,ri){
  var yy=y0+ri*lh,lw=0;
  r.forEach(function(u){u.w=c.measureText(u.s).width;u.a=u.sp?0:amt(u);u.adv=u.w+(P.trk!=null&&!u.sp?P.trk*u.a*fs/100:0);lw+=u.adv});
  var xx=tt.a==="l"?x:tt.a==="r"?x-lw:x-lw/2;
  r.forEach(function(u){
   var a=u.a,ux=xx;xx+=u.adv;if(u.sp||!u.s)return;
   c.save();
   var pxv=P.pos?P.pos[0]*k*a:0,pyv=P.pos?P.pos[1]*k*a:0;
   c.translate(ux+u.w/2+pxv,yy+pyv);
   if(P.rot!=null)c.rotate(P.rot*a*Math.PI/180);
   if(P.scl!=null){var sc=1+(P.scl/100-1)*a;c.scale(Math.max(.0001,sc),Math.max(.0001,sc))}
   if(P.opa!=null)c.globalAlpha=ga*Math.max(0,Math.min(1,1+(P.opa/100-1)*a));
   if(hasBd&&l.bd.w>0){c.lineJoin="round";c.miterLimit=2;c.strokeStyle=A.FX.hexA(l.bd.c,l.bd.o);c.lineWidth=l.bd.w*k*2;c.strokeText(u.s,-u.w/2,0)}
   c.fillText(u.s,-u.w/2,0);
   c.restore()})})}

/* ---------------- panel ---------------- */
var xp=document.createElement("div");xp.className="glass mp sp xp tap";xp.id="ta";xp.setAttribute("aria-hidden","true");
xp.innerHTML='<div class="mp-h"><div class="mp-tabs xp-tabs" id="taTabs"><button type="button" data-t="a" class="on">Animator</button><button type="button" data-t="r">Range</button><button type="button" data-t="t">Timing</button></div>'+
 '<button class="pp-k" id="taR" type="button" aria-label="Remove animator"><svg><use href="#i-trash"/></svg></button>'+
 '<button class="pp-k" id="taX" type="button" aria-label="Close"><svg><use href="#i-x"/></svg></button></div><div class="xp-body" id="taB"></div>';
ed.appendChild(xp);
var on=false,tab="a",drag=false,pushed=false,lastTab=null;
function rem(){return parseFloat(getComputedStyle(document.documentElement).fontSize)}
function v2f(d,v){var m=d.mid,f;if(m!=null)f=v<=m?.5*(v-d.min)/(m-d.min):.5+.5*(v-m)/(d.max-m);else f=(v-d.min)/(d.max-d.min);return Math.max(0,Math.min(1,f))}
function f2v(d,f){f=Math.max(0,Math.min(1,f));var m=d.mid;return m!=null?(f<.5?d.min+(m-d.min)*f*2:m+(d.max-m)*(f-.5)*2):d.min+(d.max-d.min)*f}
function paint(sl,d,v){var f=v2f(d,v),c=d.mid!=null?v2f(d,d.mid):0;sl.style.setProperty("--f",f);sl.style.setProperty("--c",c);sl.style.setProperty("--a",Math.min(c,f));sl.style.setProperty("--b",Math.max(c,f));sl.classList.toggle("snap",d.mid!=null&&Math.abs(v-d.mid)<1e-6);sl.classList.toggle("uni",d.mid==null)}
function fmt(d,v){return (Math.round(v*10)/10)+(d.u||"")}
function sl(id,d,v,extra){return '<div class="xp-r"><span class="xl">'+d.t+'</span><div class="sl xs'+(d.mid!=null?" bi":"")+'" data-id="'+id+'" data-min="'+d.min+'" data-max="'+d.max+'"'+(d.mid!=null?' data-mid="'+d.mid+'"':"")+' data-step="'+(d.step||1)+'" data-u="'+(d.u||"")+'" data-t="'+d.t+'" style="--f:0;--c:0;--a:0;--b:0"><i class="sl-fill"></i><i class="sl-tick"></i><b class="sl-th"></b></div><output class="xv" data-id="'+id+'">'+fmt(d,v)+'</output>'+(extra||'')+'</div>'}
function dOf(el){return {min:+el.dataset.min,max:+el.dataset.max,mid:el.dataset.mid!=null?+el.dataset.mid:null,step:+el.dataset.step||1,u:el.dataset.u,t:el.dataset.t}}
function getV(id){var l=cur();if(!l||!l.ta)return 0;var T=l.ta,q=id.split(".");
 if(q[0]==="pos")return (T.p.pos||[0,0])[+q[1]];
 if(q[0]==="p")return T.p[q[1]]!=null?T.p[q[1]]:0;
 if(q[0]==="rg"){if(q[1]==="s"||q[1]==="e")return rgAt(T,q[1],S.t-l.s);return T.rg[q[1]]}if(q[0]==="tm")return T.tm[q[1]];return 0}
function setV(id,v){var l=cur();if(!l)return;var T=ta(l,true),q=id.split(".");
 if(!pushed){E.push();pushed=true}
 if(q[0]==="pos"){T.p.pos=T.p.pos||[0,0];T.p.pos[+q[1]]=v}
 else if(q[0]==="p")T.p[q[1]]=v;else if(q[0]==="rg"){var kk=q[1],ka=T.kf&&T.kf[kk];
  if(ka&&ka.length){var tn=+(S.t-l.s).toFixed(2),ko=kfNear(T,kk,tn);if(ko)ko.v=v;else if(tn>=0&&tn<=l.d){ka.push({t:tn,v:v});ka.sort(function(x,y){return x.t-y.t})}}
  else T.rg[kk]=v}
 else if(q[0]==="tm")T.tm[q[1]]=v;
 A.redraw()}
function done(){pushed=false;E.save();A.redraw();var l=cur();if(l&&l.ta&&l.ta.kf)E.render()}
function chips(list,curv,attr){return '<div class="xp-ch">'+list.map(function(q){return '<button type="button" class="xc'+(q[0]===curv?" on":"")+'" data-'+attr+'="'+q[0]+'">'+q[1]+'</button>'}).join("")+'</div>'}
function note(t){return '<div class="xp-note">'+t+'</div>'}
function kfBtn(T,l,key){var t=S.t-l.s,ks=T&&T.kf&&T.kf[key],st=kfNear(T,key,t)?" on":(ks&&ks.length?" has":"");
 return '<button type="button" class="pp-k kfb'+st+'" data-kf="'+key+'" aria-label="Keyframe"><svg><use href="#i-key"/></svg></button>'}
function toggleKf(key){var l=cur();if(!l)return;var t=S.t-l.s;
 if(t<-.001||t>l.d+.001){A.toast("Move the playhead onto the layer");return}
 t=+t.toFixed(2);E.push();var T=ta(l,true);T.kf=T.kf||{};var a=T.kf[key]=T.kf[key]||[],k=kfNear(T,key,t);
 if(k){a.splice(a.indexOf(k),1);if(!a.length){T.rg[key]=k.v;delete T.kf[key]}}
 else{a.push({t:t,v:rgAt(T,key,t)});a.sort(function(x,y){return x.t-y.t})}
 E.save();E.render();render();A.redraw();A.toast(k?"Keyframe removed":"Keyframe added")}
/* playhead moved / playing: update the Range sliders in place (no rebuild) */
function liveRange(){if(!on||tab!=="r"||drag)return;var l=cur(),T=l&&l.ta;if(!l)return;
 ["s","e"].forEach(function(key){var el=$('#taB .sl.xs[data-id="rg.'+key+'"]');if(!el)return;var d=dOf(el),v=T?getV("rg."+key):(key==="s"?0:100);paint(el,d,v);var o=el.nextElementSibling;if(o)o.textContent=fmt(d,v);
  var b=$('#taB .kfb[data-kf="'+key+'"]');if(b){var ks=T&&T.kf&&T.kf[key];b.classList.toggle("on",!!kfNear(T,key,S.t-l.s));b.classList.toggle("has",!!(ks&&ks.length)&&!kfNear(T,key,S.t-l.s))}})}
function render(){
 var l=cur(),T=l&&l.ta,h="";
 $$("#taTabs button").forEach(function(b){b.classList.toggle("on",b.dataset.t===tab)});
 if(!l){$("#taB").innerHTML=note("Select a text layer first.");return}
 var keep=$("#taB").scrollTop,hs=(lastTab===tab)?$$("#taB .xp-add,#taB .xp-ch").map(function(r){return r.scrollLeft}):[];lastTab=tab;
 if(tab==="a"){
  h+='<div class="xp-add">'+PRESETS.map(function(q,i){return '<button type="button" class="xc add pre'+(l.an===q.n?" on":"")+'" data-pre="'+i+'">'+q.n+'</button>'}).join("")+'</div>';
  if(!T){h+=note("Pick a preset above, or add a property below - like After Effects: Add > Animator.")}
  h+='<div class="xp-r xp-tg"><span class="xl wide">Animator</span><button type="button" class="ps-sw2'+(T&&T.on?" on":"")+'" data-tg="1" aria-label="Animator on / off"></button></div>';
  h+='<div class="xp-r"><span class="xl">Apply to</span>'+chips([["c","Characters"],["w","Words"],["l","Lines"]],T?T.by:"c","by")+'</div>';
  h+='<div class="xp-add">'+ORDER.map(function(k){return '<button type="button" class="xc add'+(T&&T.p[k]!=null?" on":"")+'" data-add="'+k+'">'+(T&&T.p[k]!=null?"\u2713 ":"+ ")+PROPS[k].t+'</button>'}).join("")+'</div>';
  var any=false;
  ORDER.forEach(function(k){if(!T||T.p[k]==null)return;any=true;
   h+='<div class="fxc"><div class="fxh"><b>'+PROPS[k].t+'</b><button type="button" class="pp-k" data-del="'+k+'" aria-label="Remove"><svg><use href="#i-trash"/></svg></button></div>';
   PROPS[k].sl.forEach(function(d){var id=k==="pos"?"pos."+d.k:"p."+k;h+=sl(id,d,getV(id))});h+='</div>'});
  if(T&&!any)h+=note("Add a property - it is applied to each character by the range selector.")}
 else if(tab==="r"){
  var R=(T&&T.rg)||mk().rg;
  h+=sl("rg.s",{t:"Start",min:0,max:100,u:"%"},T?getV("rg.s"):R.s,kfBtn(T,l,"s"))+sl("rg.e",{t:"End",min:0,max:100,u:"%"},T?getV("rg.e"):R.e,kfBtn(T,l,"e"));
  h+='<div class="xp-r xp-col"><span class="xl">Shape</span>'+chips(SHAPES,R.sh,"sh")+'</div>';
  h+=sl("rg.sm",{t:"Smoothness",min:0,max:100,u:"%"},R.sm);
  h+=note("Start / End choose which characters are affected. Tap the diamond to keyframe Start or End at the playhead. Smoothness softens the wave that moves through the text.")}
 else{
  var M=(T&&T.tm)||mk().tm;
  h+='<div class="xp-r xp-col"><span class="xl">Mode</span>'+chips([["in","In"],["out","Out"],["none","Static"]],M.m,"tm")+'</div>';
  h+='<div class="xp-r xp-col"><span class="xl">Direction</span>'+chips([["ltr","Left \u2192 Right"],["rtl","Right \u2192 Left"]],M.dir,"dr")+chips([["ctr","From center"],["rnd","Random"]],M.dir,"dr")+'</div>';
  h+=sl("tm.dur",{t:"Duration",min:.1,max:6,step:.1,u:" s"},M.dur)+sl("tm.del",{t:"Delay",min:0,max:6,step:.1,u:" s"},M.del||0);
  h+='<div class="xp-r xp-tg"><span class="xl wide">Loop</span><button type="button" class="ps-sw2'+(M.loop?" on":"")+'" data-loop="1" aria-label="Loop"></button></div>';
  h+=note("In: text builds up from the layer start (after Delay). Out: text breaks apart. Static: just the range, no motion.")}
 $("#taB").innerHTML=h;$("#taB").scrollTop=keep;
 $$("#taB .xp-add,#taB .xp-ch").forEach(function(r,i){if(hs[i])r.scrollLeft=hs[i]});
 $$("#taB .sl.xs").forEach(function(el){paint(el,dOf(el),getV(el.dataset.id))});
 $$("#taB .xp-add").forEach(function(r){r.style.touchAction="pan-x"})}
function open(){var l=cur();if(!l){A.toast("Select a text layer first");return}
 if(A.closePanels)A.closePanels();if(A.XP)A.XP.close(false);if(A.TE)A.TE.close(false);
 tab="a";pushed=false;lastTab=null;render();xp.classList.add("on");xp.setAttribute("aria-hidden","false");tools.classList.add("mv");on=true}
function close(restore){if(!on)return;on=false;xp.classList.remove("on");xp.setAttribute("aria-hidden","true");tools.classList.remove("mv");
 if(restore!==false){tools.classList.add("open");pill.setAttribute("aria-hidden","false")}}
function sync(){if(!on)return;if(!cur()){close(false);return}if(!drag)render()}
A.TA={open:open,close:close,sync:sync,draw:draw,isOn:function(){return on}};
var ot0=A.onT;A.onT=function(){if(ot0)ot0();liveRange()};
(function(){var st=document.createElement("style");st.textContent=".xp-r .pp-k.kfb{flex:none;width:7.6rem;height:7.6rem}.xp-r .pp-k.kfb svg{width:3.8rem;height:3.8rem}.pp-k.kfb.has:not(.on){box-shadow:inset 0 0 0 .35rem rgba(var(--c1-rgb),.8)}";document.head.appendChild(st)})();
var cp0=A.closePanels;A.closePanels=function(){if(cp0)cp0();close(false)};

function applyPreset(i){var q=PRESETS[i],l=cur();if(!l)return;E.push();
 var T=mk();T.by=q.by;T.p=JSON.parse(JSON.stringify(q.p));T.rg.sm=q.sm;T.tm.dir=q.dir;T.tm.dur=q.dur;T.tm.m=q.m||"in";
 l.ta=T;l.an=q.n;E.save();E.render();render();A.redraw()}
$("#taX").onclick=function(){close(true)};
$("#taR").onclick=function(){var l=cur();if(!l||!l.ta)return;E.push();delete l.ta;l.an="None";E.save();E.render();render();A.redraw();A.toast("Animator removed")};
$("#taTabs").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||b.dataset.t===tab)return;tab=b.dataset.t;render()});
$("#taB").addEventListener("pointerdown",function(e){
 var el=e.target.closest(".sl.xs");if(!el)return;e.preventDefault();
 var d=dOf(el),id=el.dataset.id;drag=true;pushed=false;el.setPointerCapture(e.pointerId);el.classList.add("drag");var ws=false;document.body.classList.add("sliding");
 var R=el.getBoundingClientRect(),REM=rem(),hx=HX.slider(),raf=0,px=e.clientX;
 function ap(cx){var r=R,pad=5.2*REM,f=(cx-r.left-pad)/Math.max(1,r.width-2*pad);f=Math.max(0,Math.min(1,f));hx.move(f,false,false);
  var v=f2v(d,f);v=Math.round(v/d.step)*d.step;
  v=+v.toFixed(2);
  if(id==="rg.s"){var l0=cur();v=Math.min(v,l0&&l0.ta?getV("rg.e"):100)}if(id==="rg.e"){var l1=cur();v=Math.max(v,l1&&l1.ta?getV("rg.s"):0)}
  setV(id,v);paint(el,d,v);var o=el.nextElementSibling;if(o)o.textContent=fmt(d,v)}
 function mv(ev){px=ev.clientX;if(!raf)raf=requestAnimationFrame(function(){raf=0;ap(px)})}
 function up(){if(raf){cancelAnimationFrame(raf);raf=0;ap(px)}document.body.classList.remove("sliding");el.removeEventListener("pointermove",mv);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);el.classList.remove("drag");drag=false;done()}
 el.addEventListener("pointermove",mv);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);ap(e.clientX)});
$("#taB").addEventListener("click",function(e){
 var t=e.target,b,l=cur();if(!l)return;
 if((b=t.closest(".xv"))){var id=b.dataset.id,el=$('.sl.xs[data-id="'+id+'"]',xp),d=dOf(el);
  A.askText(d.t,String(getV(id))).then(function(x){var v=parseFloat(x);if(x==null||isNaN(v))return;v=Math.max(d.min,Math.min(d.max,v));pushed=false;setV(id,v);done();render()});return}
 if((b=t.closest("[data-kf]"))){toggleKf(b.dataset.kf);return}
 if((b=t.closest("[data-pre]"))){applyPreset(+b.dataset.pre);return}
 if((b=t.closest("[data-tg]"))){E.push();var T=ta(l,true);T.on=!T.on;E.save();E.render();render();A.redraw();return}
 if((b=t.closest("[data-by]"))){E.push();ta(l,true).by=b.dataset.by;E.save();render();A.redraw();return}
 if((b=t.closest("[data-add]"))){var k=b.dataset.add;E.push();var T2=ta(l,true);T2.on=true;
  if(T2.p[k]!=null)delete T2.p[k];else T2.p[k]=JSON.parse(JSON.stringify(PROPS[k].def));
  if(!l.an||l.an==="None")l.an="Animator";E.save();E.render();render();A.redraw();return}
 if((b=t.closest("[data-del]"))){E.push();delete ta(l,true).p[b.dataset.del];E.save();render();A.redraw();return}
 if((b=t.closest("[data-sh]"))){E.push();ta(l,true).rg.sh=b.dataset.sh;E.save();render();A.redraw();return}
 if((b=t.closest("[data-tm]"))){E.push();ta(l,true).tm.m=b.dataset.tm;E.save();render();A.redraw();return}
 if((b=t.closest("[data-dr]"))){E.push();ta(l,true).tm.dir=b.dataset.dr;E.save();render();A.redraw();return}
 if((b=t.closest("[data-loop]"))){E.push();var T3=ta(l,true);T3.tm.loop=!T3.tm.loop;E.save();render();A.redraw();return}
});
})();
