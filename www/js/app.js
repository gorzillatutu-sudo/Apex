/* Apex Cut mobile — UI layer (home / new-project glass panel / editor shell) */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

var RATIOS=[["16:9",16,9],["9:16",9,16],["1:1",1,1],["4:3",4,3],["4:5",4,5],["3:4",3,4],["21:9",21,9],["Custom",1,1]];
var RES=["720p","1080p","2K","4K"], FPS=["24fps","30fps","60fps","90fps","120fps"];
var KEY="apexcut.projects.v1";
var PPS=9.8; /* design px per second (matches 0.98rem/s in css) */

var seeds=[
 {id:"s4",name:"Project 4",ratio:"9:16",res:"1080p",fps:"30fps",bg:"linear-gradient(#1c1a44,#352c70)",kind:"star"},
 {id:"s3",name:"Project 3",ratio:"16:9",res:"1080p",fps:"30fps",bg:"linear-gradient(135deg,#4a2bc4,#171040)",kind:"plain"},
 {id:"s2",name:"Project 2",ratio:"9:16",res:"1080p",fps:"30fps",bg:"linear-gradient(#58000f,#86001b)",kind:"plain"},
 {id:"s1",name:"Project 1",ratio:"16:9",res:"1080p",fps:"30fps",bg:"linear-gradient(135deg,#6b8f52,#5b93c0 55%,#35506e)",kind:"plain"}
];
var BGS=["linear-gradient(#1c1a44,#352c70)","linear-gradient(135deg,#0f3d6e,#2b1a6b)","linear-gradient(135deg,#4a1d5e,#1a2a6e)"];

var S={projects:load(),panel:{ratio:0,res:"1080p",fps:"90fps",custom:null},cur:null,t:0,playing:false,raf:0,last:0,layers:[]};

function load(){try{var v=JSON.parse(localStorage.getItem(KEY));if(v&&v.length)return v}catch(e){}return seeds.slice()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S.projects))}catch(e){}}

/* ---------- toast ---------- */
var tt;function toast(m){var t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on")},1600)}

/* ---------- history / layers (Android back) ---------- */
function pushLayer(n){S.layers.push(n);history.pushState({l:n},"")}
window.addEventListener("popstate",function(){if(S.layers[S.layers.length-1]==="editor"&&window.AX&&AX.E&&AX.E.backStep&&AX.E.backStep()){history.pushState({l:"editor"},"");return}var n=S.layers.pop();if(n==="panel")hidePanel();else if(n==="settings")hideSet();else if(n==="editor")hideEditor()});

/* ---------- home ---------- */
function ratioOf(p){var m=/^(\d+):(\d+)$/.exec(p.ratio);return m?[+m[1],+m[2]]:[16,9]}
function durOf(p){ /* project length = end of the last top-level layer (saved by the timeline) */
 try{var m=JSON.parse(localStorage.getItem("apexcut.tl."+p.id));if(m&&m.L&&m.L.length){var e=0;m.L.forEach(function(l){e=Math.max(e,(+l.s||0)+(+l.d||0))});return e}}catch(x){}
 return 0}
function mmss(s){s=Math.round(s);return ("0"+Math.floor(s/60)).slice(-2)+":"+("0"+(s%60)).slice(-2)}
function renderGrid(){
 $("#grid").innerHTML=S.projects.map(function(p){
  var icon=p.kind==="plain"||p.snap?"":'<div class="appicon"><svg><use href="#i-star"/></svg></div>';
  return '<div class="card" data-id="'+p.id+'">'+
   '<div class="thumb'+(p.snap?" real":"")+'" style="'+(p.snap?"background:#05070b url("+p.snap+") center/"+(ratioOf(p)[0]/ratioOf(p)[1]>=1.3?"cover":"contain")+" no-repeat":"background:"+p.bg)+'">'+(p.kind!=="plain"&&!p.snap?'<div class="beam"></div>':'')+icon+
   '<span class="cplay"><svg><use href="#i-play"/></svg></span></div>'+
   '<div class="cinfo"><div class="ctx"><div class="cname">'+esc(p.name)+'</div>'+
   '<div class="cmeta"><svg><use href="#i-frame"/></svg><span>'+esc(p.res||"1080p")+' \u2022 '+mmss(durOf(p))+'</span></div></div>'+
   '<button class="cdots" data-dots="'+p.id+'" aria-label="More"><svg><use href="#s-dots"/></svg></button></div></div>';
 }).join("");
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
$("#grid").addEventListener("click",function(e){
 var d=e.target.closest("[data-dots]");
 if(d){e.stopPropagation();openCardMenu(d,d.dataset.dots);return}
 var c=e.target.closest(".card");if(c){var p=S.projects.filter(function(x){return x.id===c.dataset.id})[0];if(p)openEditor(p)}
});
var menuFor=null;
function openCardMenu(btn,id){
 var m=$("#cardMenu"),r=btn.getBoundingClientRect(),ar=$("#app").getBoundingClientRect();
 m.dataset.sure="";m.innerHTML='<button data-a="rename">Rename</button><button data-a="del" class="danger">Delete</button>';
 m.style.left=Math.max(8,Math.min(r.left+r.width/2-ar.left-80,ar.width-170))+"px";
 m.style.top=(r.bottom+4)+"px";menuFor=id;m.classList.add("on");
}
$("#cardMenu").addEventListener("click",function(e){
 var a=e.target.dataset.a;if(!a)return;if(a==="del"&&!this.dataset.sure){this.dataset.sure="1";e.target.textContent="Tap again";e.target.classList.add("sure");return}this.classList.remove("on");
 var i=S.projects.findIndex(function(x){return x.id===menuFor});if(i<0)return;
 if(a==="del"){S.projects.splice(i,1);save();renderGrid()}
 else{var pr=S.projects[i];askText("Rename",pr.name).then(function(n){if(n){pr.name=n.slice(0,24);save();renderGrid()}})}
});
document.addEventListener("pointerdown",function(e){if(!e.target.closest("#cardMenu")&&!e.target.closest("[data-dots]"))$("#cardMenu").classList.remove("on");
 if(!e.target.closest(".prow")&&!e.target.closest(".gmenu"))closeMenus()});

$("#btnFiles").onclick=function(){toast("Templates \u2014 coming soon")};
$("#btnAll").onclick=function(){var g=$("#grid");g.scrollTo({top:0,behavior:"smooth"})};

/* ---------- app settings panel (gear) : blurred backdrop like New Project ---------- */
function arOn(){try{return localStorage.getItem("apexcut.autoArrange")!=="0"}catch(e){return true}}
function lbOff(){try{return localStorage.getItem("apex-nolabels")==="1"}catch(e){return false}}
function syncSet(){$("#setAr").classList.toggle("on",arOn());$("#setLb").classList.toggle("on",!lbOff())}
function showSet(){syncSet();icLoad();$("#setScrim").classList.add("on")}
function hideSet(){$("#setScrim").classList.remove("on")}
$("#btnSettings").onclick=function(){showSet();pushLayer("settings")};
/* app icon: two launcher icons, switched by the native IconSwitcher plugin (Android build only) */
var IC=null;function icPlug(){try{var C=window.Capacitor;if(!C||!C.isNativePlatform||!C.isNativePlatform())return null;if(!IC)IC=(C.Plugins&&C.Plugins.IconSwitcher)||(C.registerPlugin&&C.registerPlugin("IconSwitcher"));return IC||null}catch(e){return null}}
function applyTheme(id){var r=document.documentElement;r.setAttribute("data-icon",id);var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=id==="prism"?"#0a0919":"#0a0d14";try{window.dispatchEvent(new Event("apex-theme"))}catch(e){}if(typeof draw==="function"){try{draw()}catch(e){}}}
function icMark(id){applyTheme(id);$$("#setIcons .set-icb").forEach(function(b){b.classList.toggle("on",b.dataset.ic===id)})}
function icLoad(){var cur="default";try{cur=localStorage.getItem("apexcut.icon")||"default"}catch(e){}icMark(cur);var P=icPlug();if(P&&P.get)P.get().then(function(r){if(r&&r.id){icMark(r.id);try{localStorage.setItem("apexcut.icon",r.id)}catch(e){}}}).catch(function(){})}
$("#setIcons").addEventListener("click",function(e){var b=e.target.closest(".set-icb");if(!b)return;var id=b.dataset.ic,P=icPlug();
 if(!P||!P.set){icMark(id);try{localStorage.setItem("apexcut.icon",id)}catch(x){}toast("Theme changed \u2014 the launcher icon itself changes in the installed Android app");return}
 P.set({id:id}).then(function(){icMark(id);try{localStorage.setItem("apexcut.icon",id)}catch(x){}toast("App icon + theme changed \u2014 your launcher may take a few seconds to update")}).catch(function(){toast("Could not change the app icon")})});
$("#setX").onclick=function(){history.back()};
$("#setScrim").addEventListener("click",function(e){if(e.target===this)history.back()});
$("#setAr").onclick=function(){try{localStorage.setItem("apexcut.autoArrange",arOn()?"0":"1")}catch(e){}syncSet()};
$("#setLb").onclick=function(){var off=!lbOff();document.body.classList.toggle("nolabels",off);try{localStorage.setItem("apex-nolabels",off?"1":"0")}catch(e){}syncSet()};

/* ---------- new project panel ---------- */
function renderRatios(){
 $("#ratios").innerHTML=RATIOS.map(function(r,i){
  var custom=r[0]==="Custom",label=custom&&S.panel.custom?S.panel.custom:r[0],ic;
  if(!custom){var s=7/Math.max(r[1],r[2]);ic='<b style="width:'+(r[1]*s)+'rem;height:'+(r[2]*s)+'rem"></b>'}
  else ic='<b class="dash" style="width:5rem;height:5rem"></b>';
  return '<button class="rt'+(i===S.panel.ratio?" sel":"")+'" data-i="'+i+'" type="button"><div class="ico">'+ic+'</div>'+label+'</button>';
 }).join("");
}
$("#ratios").addEventListener("click",function(e){
 var b=e.target.closest(".rt");if(!b)return;var i=+b.dataset.i;
 if(RATIOS[i][0]==="Custom"){
  askText("Custom ratio (W:H)",S.panel.custom||"5:7").then(function(v){
   var m=v&&/^\s*(\d{1,3})\s*[:x\/]\s*(\d{1,3})\s*$/.exec(v);
   if(!m){if(v)toast("Use W:H, e.g. 5:7");return}
   S.panel.custom=(+m[1])+":"+(+m[2]);S.panel.ratio=i;renderRatios()});
  return;
 }
 S.panel.ratio=i;renderRatios();
});
function buildMenu(id,list,key,out){
 var m=$("#"+id);
 m.innerHTML=list.map(function(o){return '<button type="button" class="'+(o===S.panel[key]?"cur":"")+'">'+o+'</button>'}).join("");
 $$("button",m).forEach(function(b){b.onclick=function(e){e.stopPropagation();S.panel[key]=b.textContent;$("#"+out).textContent=b.textContent;m.classList.remove("on");buildMenu(id,list,key,out)}});
}
function closeMenus(){$$(".gmenu:not(.card-menu)").forEach(function(m){m.classList.remove("on")})}
function toggleMenu(id){var m=$("#"+id),was=m.classList.contains("on");closeMenus();if(was)return;
 var b=$(id==="menuRes"?"#selRes":"#selFps").getBoundingClientRect(),ar=$("#app").getBoundingClientRect();
 m.style.left=(b.left-ar.left)+"px";m.style.width=b.width+"px";m.style.top=(b.bottom-ar.top+6)+"px";m.classList.add("on");
 if(m.getBoundingClientRect().bottom>ar.bottom-8)m.style.top=(b.top-ar.top-m.offsetHeight-6)+"px"}
$("#selRes").onclick=function(e){e.stopPropagation();toggleMenu("menuRes")};
$("#selFps").onclick=function(e){e.stopPropagation();toggleMenu("menuFps")};
$("#panel").addEventListener("pointerdown",function(e){if(!e.target.closest(".prow"))closeMenus()});
$("#pname").addEventListener("input",function(){$("#pCreate").classList.toggle("ready",this.value.trim().length>0)});

function showPanel(){
 buildMenu("menuRes",RES,"res","resV");buildMenu("menuFps",FPS,"fps","fpsV");
 S.panel.ratio=0;S.panel.custom=null;$("#resV").textContent=S.panel.res;$("#fpsV").textContent=S.panel.fps;
 $("#pname").value="";$("#pCreate").classList.remove("ready");renderRatios();
 $("#scrim").classList.add("on");
}
function hidePanel(){closeMenus();$("#scrim").classList.remove("on");$("#pname").blur()}
$("#btnNew").onclick=function(){showPanel();pushLayer("panel")};
$("#pCancel").onclick=function(){history.back()};
$("#scrim").addEventListener("click",function(e){if(e.target===this)history.back()});
$("#pCreate").onclick=function(){
 var name=$("#pname").value.trim();
 if(!name){var n=1;S.projects.forEach(function(p){var m=/^Project (\d+)$/.exec(p.name);if(m)n=Math.max(n,+m[1]+1)});name="Project "+n}
 var r=RATIOS[S.panel.ratio],rs=r[0]==="Custom"?S.panel.custom:r[0];
 var p={id:"p"+Date.now(),name:name.slice(0,24),ratio:rs,res:S.panel.res,fps:S.panel.fps,bg:BGS[S.projects.length%BGS.length],kind:"star"};
 S.projects.unshift(p);save();renderGrid();
 /* panel -> editor: swap the history entry */
 S.layers.pop();hidePanel();S.layers.push("editor");history.replaceState({l:"editor"},"");openEditor(p,true);
};

/* ---------- editor ---------- */
var barHeights=[10,22,32,16,28,36,20,12,26,34,18,30,38,24,14,28,34,20,10,26,32,16,24,36,18,28,22,12,30,26,16,34,20,28,14,32,22,10,26,36,18,24,30,16,28,34,20,12,26,32];
function buildTimeline(){}
function fmt(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2)}
/* playhead turns green while it sits on / sweeps across a marker */
var hitTm=0,holdUntil=0;
function setHit(on){var h=$("#head");if(h)h.classList.toggle("hit",on)}
function checkHit(a,b){
 var E=window.AX&&window.AX.E,M=E&&E.M&&E.M();if(!M||!M.K||!M.K.length){setHit(false);return}
 var lo=Math.min(a,b),hi=Math.max(a,b),near=false,cross=false;
 M.K.forEach(function(m){if(Math.abs(b-m)<=.06)near=true;if(a!==b&&m>=lo&&m<=hi)cross=true});
 if(cross){holdUntil=performance.now()+110;clearTimeout(hitTm);hitTm=setTimeout(function(){checkHit(S.t,S.t)},130)}
 setHit(near||performance.now()<holdUntil)}
/* --t is set ONLY on the few elements that use it (registered non-inheriting in css), so moving the playhead does not restyle every clip */
var LINS=null,RINE=null,MKLE=null;
function placeT(){var t=S.t;if(!LINS){LINS=$("#tl").getElementsByClassName("lin");RINE=$("#rin");MKLE=$("#mkl")}
 for(var i=0;i<LINS.length;i++)LINS[i].style.setProperty("--t",t);RINE.style.setProperty("--t",t);MKLE.style.setProperty("--t",t)}
function setT(v){var pv=S.t;S.t=Math.max(0,Math.min(600,v));placeT();$("#bubble").textContent=fmt(S.t);checkHit(pv,S.t);if(window.AX&&AX.onT)AX.onT()}
function fitCanvas(){
 if(!S.cur)return;var st=$("#stage"),c=$("#canvas"),r=ratioOf(S.cur),w=st.clientWidth,h=st.clientHeight;
 var cw=w,ch=w*r[1]/r[0];if(ch>h){ch=h;cw=h*r[0]/r[1]}
 c.style.width=cw+"px";c.style.height=ch+"px";
}
function openEditor(p,fresh){
 S.cur=p;$("#edTitle").textContent=p.name;buildTimeline();setT(0);if(window.AX&&AX.open)AX.open(p);
 $("#home").classList.add("off-l");$("#editor").classList.remove("off-r");
 requestAnimationFrame(fitCanvas);setTimeout(fitCanvas,260);
 if(!fresh)pushLayer("editor");
}
function snapCur(){ /* keep a real frame of the project for the home screen */
 try{var p=S.cur;if(!p||!window.AX||!AX.MD||!AX.MD.draw||!AX.E||!AX.E.M())return;var M=AX.E.M(),r=ratioOf(p);
  if(!M.L||!M.L.length){delete p.snap;save();return}
  var tm=S.t,cov=M.L.some(function(l){return !l.h&&tm>=l.s-1e-6&&tm<=l.s+l.d+1e-6});
  if(!cov)tm=Math.min.apply(0,M.L.map(function(l){return l.s}))+.05;
  var W=360,H=Math.max(2,Math.round(W*r[1]/r[0])),c=document.createElement("canvas");c.width=W;c.height=H;
  AX.MD.draw(c.getContext("2d"),W,H,tm,"export");p.snap=c.toDataURL("image/jpeg",.72);save()}catch(e){}}
function hideEditor(){stop();snapCur();renderGrid();$("#editor").classList.add("off-r");$("#home").classList.remove("off-l")}
$("#edBack").onclick=function(){if(window.AX&&AX.E&&AX.E.backStep&&AX.E.backStep())return;history.back()};
$("#edSettings").onclick=function(){toast(S.cur.ratio+" · "+S.cur.res+" · "+S.cur.fps)};
$("#edExport").onclick=function(){toast("Export — coming soon")};
window.addEventListener("resize",fitCanvas);

function play(){if(S.playing)return;
 var en=window.AX&&AX.MD?AX.MD.endT():0;if(en>0&&S.t>=en-.05)setT(0);
 S.playing=true;document.body.classList.add("fastui");S.last=performance.now();$("#playIco").innerHTML='<use href="#i-pause"/>';if(window.AX&&AX.onPlay)AX.onPlay();
 (function loop(n){if(!S.playing)return;var d=Math.min(.25,(n-S.last)/1000);S.last=n;setT(S.t+d);
  var e2=window.AX&&AX.MD?AX.MD.endT():0;if(S.t>=600||(e2>0&&S.t>=e2)){if(e2>0&&S.t>e2)setT(e2);stop();return}S.raf=requestAnimationFrame(loop)})(S.last)}
function stop(){var was=S.playing;S.playing=false;document.body.classList.remove("fastui");cancelAnimationFrame(S.raf);$("#playIco").innerHTML='<use href="#i-play"/>';if(was&&window.AX&&AX.onStop)AX.onStop()}
$("#btnPlay").onclick=function(){S.playing?stop():play()};
$("#btnPrev").onclick=function(){setT(S.t-1)};
$("#btnNext").onclick=function(){setT(S.t+1)};
$("#btnList").onclick=function(){toast("Layers — coming soon")};
$("#btnMark").onclick=function(){toast("Marker "+fmt(S.t))};
$("#btnUndo").onclick=function(){};$("#btnRedo").onclick=function(){};
$$(".eye").forEach(function(b){b.onclick=function(){var h=b.classList.toggle("hid");b.querySelector("use").setAttribute("href",h?"#i-eyeoff":"#i-eye");b.parentNode.classList.toggle("dim",h)}});

/* ---------- glass text dialog (replaces prompt()) ---------- */
function askText(title,val){return new Promise(function(res){
 var d=$("#dlg"),i=$("#dlgIn");$("#dlgT").textContent=title;i.value=val||"";d.classList.add("on");
 setTimeout(function(){i.focus();i.select()},260);
 function done(v){d.classList.remove("on");i.blur();d.onclick=i.onkeydown=$("#dlgOk").onclick=$("#dlgNo").onclick=null;res(v)}
 $("#dlgOk").onclick=function(){done(i.value.trim()||null)};$("#dlgNo").onclick=function(){done(null)};
 d.onclick=function(e){if(e.target===d)done(null)};
 i.onkeydown=function(e){if(e.key==="Enter")done(i.value.trim()||null)};
})}

window.AX={S:S,setT:setT,placeT:placeT,stop:stop,toast:toast,fmt:fmt,askText:askText,checkHit:checkHit};

renderGrid();
})();
