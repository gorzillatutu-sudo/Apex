/* Apex Cut mobile - project settings glass panel (ratio / resolution / fps / background / preview quality / labels) */
(function(){
var A=window.AX,S=A.S,KEY="apexcut.projects.v1",ed=document.getElementById("editor"),$=function(q){return document.querySelector(q)};
var RT=[["16:9",16,9],["9:16",9,16],["1:1",1,1],["4:3",4,3],["4:5",4,5],["3:4",3,4],["21:9",21,9]],
 RES=["720p","1080p","4K"],FPS=["24fps","30fps","60fps"],PQ=["Full","Half","Third","Quarter","Auto"],
 BG=["transparent","#0b0d12","#ffffff","#1c1a44","#58000f","#0f3d2e","#6b8f52"];
var GRC=[["third","3 \u00D7 3"],["quarter","4 \u00D7 4"],["golden","Golden"],["center","Center"],["diag","Diagonal"],["safe","Safe 90%"],["safe2","Safe 80%"]];
var scrim=document.createElement("div");scrim.className="ps-scrim";
var ps=document.createElement("div");ps.className="glass ps";ps.setAttribute("aria-hidden","true");
ed.appendChild(scrim);ed.appendChild(ps);

/* move by the header, resize from the bottom-right corner (shared helper, spot + size remembered) */
var PW=A.panelWin(ps,{key:"apexcut.ps.win",drag:".ps-h"});
function place(){PW.place()}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S.projects))}catch(e){}}
function labelsOff(){try{return localStorage.getItem("apex-nolabels")==="1"}catch(e){return false}}
function setLabels(off){document.body.classList.toggle("nolabels",off);try{localStorage.setItem("apex-nolabels",off?"1":"0")}catch(e){}}
setLabels(labelsOff());
function arOn(){try{return localStorage.getItem("apexcut.autoArrange")!=="0"}catch(e){return true}}
function applyBg(p){var c=$("#canvas");if(!c||!p||!p.cbg)return;c.classList.toggle("transp",p.cbg==="transparent");c.style.background=p.cbg==="transparent"?"":p.cbg}
function applyPQ(p){var c=$("#canvas");if(c)c.setAttribute("data-pq",(p&&p.pq)||"Full")}
function chips(list,cur,attr){return list.map(function(v){return '<button type="button" class="ps-c'+(v===cur?" on":"")+'" data-'+attr+'="'+v+'">'+v+'</button>'}).join("")}
function render(){
 var p=S.cur;if(!p)return;
 var rs=RT.map(function(r){var s=7/Math.max(r[1],r[2]);return '<button type="button" class="ps-c'+(r[0]===p.ratio?" on":"")+'" data-ra="'+r[0]+'"><i style="width:'+(r[1]*s)+'rem;height:'+(r[2]*s)+'rem"></i>'+r[0]+'</button>'}).join("");
 var bg=p.cbg||BG[1];
 ps.innerHTML='<div class="ps-h"><div><b>Project Settings</b><small>'+p.name+'</small></div><button type="button" class="pp-k" id="psX" aria-label="Close"><svg><use href="#i-x"/></svg></button></div>'+
 '<div class="ps-s">Aspect</div><div class="ps-row ps-rt">'+rs+'</div>'+
 '<div class="ps-s">Resolution</div><div class="ps-row">'+chips(RES,p.res,"re")+'</div>'+
 '<div class="ps-s">Frame rate</div><div class="ps-row">'+chips(FPS,p.fps,"fp")+'</div>'+
 '<div class="ps-s">Background</div><div class="ps-row ps-sws">'+BG.map(function(c){return '<button type="button" class="ps-sw'+(c==="transparent"?" tp":"")+(c===bg?" on":"")+'" data-bg="'+c+'" '+(c==="transparent"?'style=""':'style="background:'+c+'"')+'></button>'}).join("")+'<label class="ps-sw pk"><input type="color" id="psCol" value="'+(/^#[0-9a-f]{6}$/i.test(bg)?bg:"#0b0d12")+'"></label></div>'+
 '<div class="ps-s">Preview quality</div><div class="ps-row" style="flex-wrap:wrap">'+PQ.map(function(v){return '<button type="button" class="ps-c'+(v===(p.pq||"Full")?" on":"")+'" data-pq="'+v+'" style="flex:1 1 30%">'+v+'</button>'}).join("")+'</div>'+
 '<div class="ps-s">Grid</div><div class="ps-row" style="flex-wrap:wrap">'+GRC.map(function(q){return '<button type="button" class="ps-c'+((p.grid||[]).indexOf(q[0])>=0?" on":"")+'" data-gd="'+q[0]+'" style="flex:1 1 30%">'+q[1]+'</button>'}).join("")+'</div>'+
 '<div class="ps-tg"><span>Property labels</span><button type="button" class="ps-sw2'+(labelsOff()?"":" on")+'" id="psLb" aria-label="Property labels"></button></div>'+
 '<div class="ps-tg"><span>Auto Arrange text layers</span><button type="button" class="ps-sw2'+(arOn()?" on":"")+'" id="psAr" aria-label="Auto Arrange text layers"></button></div>'}
function open(){if(!S.cur)return;render();ps.classList.add("on");place();scrim.classList.add("on");ps.setAttribute("aria-hidden","false")}
function close(){ps.classList.remove("on");scrim.classList.remove("on");ps.setAttribute("aria-hidden","true")}
function relayout(){window.dispatchEvent(new Event("resize"));try{A.setT(S.t)}catch(e){}}
ps.addEventListener("click",function(e){
 var t=e.target.closest("button");if(!t)return;var p=S.cur;
 if(t.id==="psX"){close();return}
 if(t.id==="psLb"){setLabels(!labelsOff());render();return}
 if(t.id==="psAr"){try{localStorage.setItem("apexcut.autoArrange",arOn()?"0":"1")}catch(x){}render();return}
 if(t.dataset.ra){p.ratio=t.dataset.ra;persist();render();relayout();return}
 if(t.dataset.gd){var gl=p.grid||(p.grid=[]),gi=gl.indexOf(t.dataset.gd);if(gi>=0)gl.splice(gi,1);else gl.push(t.dataset.gd);if(window.AX&&AX.GRID)AX.GRID.apply(p)}
 else if(t.dataset.re){p.res=t.dataset.re}else if(t.dataset.fp){p.fps=t.dataset.fp}
 else if(t.dataset.bg){p.cbg=t.dataset.bg;applyBg(p)}
 else if(t.dataset.pq){p.pq=t.dataset.pq;applyPQ(p)}else return;
 persist();render()});
ps.addEventListener("input",function(e){if(e.target.id==="psCol"){S.cur.cbg=e.target.value;applyBg(S.cur);persist()}});
ps.addEventListener("change",function(e){if(e.target.id==="psCol")render()});
scrim.addEventListener("click",close);
/* gear button opens this panel (text-layer mode keeps its own cancel behaviour) */
var er=$(".ed-right");
er.addEventListener("click",function(e){var b=e.target.closest("#edSettings");if(!b||ed.classList.contains("lsel")||ed.classList.contains("txsel"))return;e.stopImmediatePropagation();e.preventDefault();ps.classList.contains("on")?close():open()},true);
/* property label hide chip */
document.addEventListener("click",function(e){var h=e.target.closest(".plh");if(!h)return;e.stopImmediatePropagation();e.preventDefault();setLabels(true);try{A.toast("Labels hidden \u2014 turn back on in Project Settings")}catch(x){}},true);

/* apply saved background / quality whenever a project opens */
if(window.AX&&AX.open){var o=AX.open;AX.open=function(p){var r=o.apply(this,arguments);applyBg(p);applyPQ(p);if(AX.GRID)AX.GRID.apply(p);close();return r}}
})();
