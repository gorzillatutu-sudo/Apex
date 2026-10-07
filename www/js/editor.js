/* Apex Cut mobile - timeline engine (move / trim / split / snap / markers / undo / divider, auto-scroll both axes) */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var A=window.AX,S=A.S,tl=$("#tl"),secV=$("#secV"),secA=$("#secA"),dv=$("#divider");
var HV=9.4,HS=12.4,HA=8.6,TOT=72.2,DEF=41.7,PAD=19.5,PADV=16,MAXT=600;
var KH=7.4,NM={img:"Photo",shp:"Shape",sol:"Solid",nul:"Null",adj:"Adjustment",vec:"Vector"},PN={pos:"Position",anc:"Anchor",scl:"Scale",rot:"Rotation",opa:"Opacity",lvl:"Level",fin:"Fade In",fout:"Fade Out"},PDEF={pos:[0,0,0],anc:[0,0],scl:[100],rot:[0,0,0],opa:[100],lvl:[0],fin:[0],fout:[0]},PU={pos:"",anc:"",scl:"%",rot:"\u00B0",opa:"%",lvl:" dB",fin:" s",fout:" s"};
var ROOT=null,stack=[],gtap=null,ENTER=false,LEAVE=false;
var foc=false,inFoc=false,svV=0,svA=0,pps=.98,fit=false,snapOn=true,sel=null,nid=10,hist=[],fut=[],M=null,split=null,cur=null,msel=[],selP={};
var BARS=[10,22,32,16,28,36,20,12,26,34,18,30,38,24,14,28,34,20,10,26,32,16,24,36,18,28,22,12,30,26,16,34,20,28,14,32,22,10,26,36,18,24,30,16,28,34,20,12,26,32];
function rem(){var p=window.__apexRemProbe;if(!p||!p.isConnected){p=window.__apexRemProbe=document.createElement("div");p.style.cssText="position:absolute;left:-9999px;top:0;width:100rem;height:0;visibility:hidden;pointer-events:none";(document.body||document.documentElement).appendChild(p)}var w=p.getBoundingClientRect().width/100;return w>0?w:(parseFloat(getComputedStyle(document.documentElement).fontSize)||4)}
function el(c,t){var e=document.createElement(t||"div");e.className=c;return e}
/* 3D layers: l.d3 = true. rot = [Z, X, Y] degrees (index 0 stays the old single "Rotate"); pos[2] = Z depth.
   Old projects have no d3 flag: a layer that already used a Z position counts as 3D so it keeps its look. */
function is3d(l){
 if(!l||l.k==="aud")return false;
 if(l.d3!=null)return !!l.d3;
 var z=(l.v&&l.v.pos&&l.v.pos[2])||0;
 if(!z&&l.kf&&l.kf.pos)z=l.kf.pos.some(function(k){return k.v&&k.v[2]})?1:0;
 return !!z}
/* orthographic projection of the layer plane after X, Y, Z rotation (radians): the 2x2 affine [a,b,c,d] of canvas transform(a,b,c,d,0,0) */
function m3(rz,rx,ry){
 var cg=Math.cos(rz),sg=Math.sin(rz),ca=Math.cos(rx),sa=Math.sin(rx),cb=Math.cos(ry),sb=Math.sin(ry);
 return [cg*cb,sg*cb,cg*sb*sa-sg*ca,sg*sb*sa+cg*ca]}
function fv(l,p){var v=valAt(l,p,S.t);if(!is3d(l)){if(p==="rot")v=v.slice(0,1);else if(p==="pos")v=v.slice(0,2)}return v.map(function(x){return +(+x).toFixed(1)}).join(", ")+PU[p]}
/* value of a property at absolute time t: static value, or keyframes interpolated (per-segment graph curve = key.e) */
function valAt(l,p,t){
 var d=PDEF[p],base=(l.v&&l.v[p])?l.v[p].slice():[],i;for(i=base.length;i<d.length;i++)base.push(d[i]);
 var ks=l.kf&&l.kf[p];if(!ks||!ks.length)return base;
 function nm(a){var r=(a||[]).slice();for(var j=r.length;j<d.length;j++)r.push(d[j]);return r}
 var lt=t-l.s;if(lt<=ks[0].t)return nm(ks[0].v);if(lt>=ks[ks.length-1].t)return nm(ks[ks.length-1].v);
 for(i=0;i<ks.length-1;i++){var a=ks[i],b=ks[i+1];
  if(lt>=a.t&&lt<=b.t){var u=(lt-a.t)/Math.max(1e-6,b.t-a.t),y=u;if(a.e&&window.ApexCurve)y=window.ApexCurve(u,a.e);
   var va=nm(a.v),vb=nm(b.v);
   if(p==="pos"&&((a.to&&(a.to[0]||a.to[1]))||(b.ti&&(b.ti[0]||b.ti[1])))){ /* curved motion path (spatial tangents a.to / b.ti) */
    var yc=y<0?0:y>1?1:y,sp=spAt(a,b,yc),ex=y-yc;return [sp[0]+(vb[0]-va[0])*ex,sp[1]+(vb[1]-va[1])*ex,va[2]+(vb[2]-va[2])*y]}
   return va.map(function(x,j){return x+(vb[j]-x)*y})}}
 return base}
/* ---- motion path: cubic bezier through position keyframes. a.to = out tangent of keyframe a, b.ti = in tangent of keyframe b (offsets from the keyframe, comp px).
   The eased time value y (0..1) travels along the curve by ARC LENGTH, so a linear segment keeps a constant speed along the path like After Effects ---- */
var SPW=typeof WeakMap==="function"?new WeakMap():null;
function spPt(a,b,t){
 var x0=a.v[0],y0=a.v[1],x3=b.v[0],y3=b.v[1],o=a.to||[0,0],n=b.ti||[0,0],x1=x0+(o[0]||0),y1=y0+(o[1]||0),x2=x3+(n[0]||0),y2=y3+(n[1]||0),u=1-t;
 return [u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3]}
function spLut(a,b){
 var key=[a.v[0],a.v[1],b.v[0],b.v[1],(a.to||[]).join(","),(b.ti||[]).join(",")].join("|"),c=SPW&&SPW.get(a);
 if(c&&c.k===key&&c.b===b)return c;
 var N=32,cum=[0],pr=spPt(a,b,0),i,q;
 for(i=1;i<=N;i++){q=spPt(a,b,i/N);cum.push(cum[i-1]+Math.hypot(q[0]-pr[0],q[1]-pr[1]));pr=q}
 c={k:key,b:b,cum:cum,N:N};if(SPW)SPW.set(a,c);return c}
function spAt(a,b,y){
 var c=spLut(a,b),tot=c.cum[c.N],N=c.N;
 if(tot<1e-6)return [a.v[0]+(b.v[0]-a.v[0])*y,a.v[1]+(b.v[1]-a.v[1])*y];
 var tg=y*tot,lo=0,hi=N;while(hi-lo>1){var m=(lo+hi)>>1;if(c.cum[m]<=tg)lo=m;else hi=m}
 var seg=c.cum[hi]-c.cum[lo],fr=seg>1e-9?(tg-c.cum[lo])/seg:0;return spPt(a,b,(lo+fr)/N)}
/* arc-length fraction (0..1) reached at curve parameter t (used when a keyframe is added on the path) */
function spFrac(a,b,t){var c=spLut(a,b),tot=c.cum[c.N];if(tot<1e-6)return t;var f=Math.max(0,Math.min(1,t))*c.N,i=Math.min(c.N-1,Math.floor(f));return (c.cum[i]+(c.cum[i+1]-c.cum[i])*(f-i))/tot}
function propsFor(ls,kind){
 var all=kind==="a"?["lvl","fin","fout"]:["pos","anc","scl","rot","opa"],L0=find(sel);L0=L0&&ls.indexOf(L0)>=0?L0:ls[0];
 if(!L0||!L0.kf)return all;
 var ks=all.filter(function(p){return L0.kf[p]&&L0.kf[p].length});if(!ks.length)return all;
 var sp=selP[L0.i];return sp&&ks.indexOf(sp)>=0?[sp]:ks}
function hasKF(l){return !!(l&&l.kf&&Object.keys(l.kf).some(function(p){return l.kf[p]&&l.kf[p].length}))}
function find(i){return M.L.filter(function(l){return l.i===i})[0]}
function fresh(){return {L:[],K:[],gc:0}}
function shiftAll(list,d){(list||[]).forEach(function(c){c.s=+(c.s+d).toFixed(4)})}
function save(){try{
 for(var i=stack.length-1;i>=0;i--)shiftAll(stack[i].g.ch,-stack[i].g.s);
 try{localStorage.setItem("apexcut.tl."+cur.id,JSON.stringify(ROOT||M))}finally{for(var j=0;j<stack.length;j++)shiftAll(stack[j].g.ch,stack[j].g.s)}
}catch(e){}}
function snap1(){return JSON.stringify({L:M.L,K:M.K})}
function push(){hist.push(snap1());if(hist.length>60)hist.shift();fut=[];ub()}
function restore(j){var o=JSON.parse(j);M.L=o.L;M.K=o.K;if(stack.length)stack[stack.length-1].g.ch=M.L;sel=null;msel=[];norm();quiet=true;try{render()}finally{quiet=false}marks();save();ub()}
function ub(){$("#btnUndo").style.opacity=hist.length?1:.4;$("#btnRedo").style.opacity=fut.length?1:.4}
$("#btnUndo").onclick=function(){if(hist.length){fut.push(snap1());restore(hist.pop())}};
$("#btnRedo").onclick=function(){if(fut.length){hist.push(snap1());restore(fut.pop())}};

/* rows: video area keeps an empty spare row on top, audio keeps one empty row at the bottom */
function norm(){
 function pack(arr,sp){var rs=arr.map(function(l){return l.r}).filter(function(x,i,z){return z.indexOf(x)===i}).sort(function(a,b){return a-b}),m={};
  rs.forEach(function(x,i){m[x]=i+sp});arr.forEach(function(l){l.r=m[l.r]});return rs.length+sp}
 M.nv=pack(M.L.filter(function(l){return l.k!=="aud"}),1);M.na=pack(M.L.filter(function(l){return l.k==="aud"}),0)+1;
}
function build(sec,kind,n){
 for(var r=0;r<n;r++){
  var ln=el("lane"),lin=el("lin"),ls=M.L.filter(function(l){return (l.k==="aud")===(kind==="a")&&l.r===r}),
   base=kind==="a"?HA:(r===0?HS:HV),hasK=ls.some(hasKF),open=hasK&&ls.some(function(l){return l.x}),PR=propsFor(ls,kind);
  ln.dataset.r=r;ln.dataset.k=kind;ln.dataset.base=base;ln.dataset.n=PR.length;ln.style.height=(base+(open?PR.length*KH:0))+"rem";lin.style.height=base+"rem";
  if(hasK){ln.classList.add("kf");if(open)ln.classList.add("open")}
  if(ENTER&&foc)ln.classList.add("fi");else if(LEAVE)ln.classList.add("fx");
  ls.forEach(function(l){lin.appendChild(clip(l))});ln.appendChild(lin);
  if(foc&&ls.some(function(l){return l.i===sel})){ /* focus mode: only the selected layer is shown, "<" goes back to all layers */
   ln.classList.add("fo")}
  if(ls.length){
   var hid=ls.every(function(l){return l.h}),mut=ls.every(function(l){return l.m}),tb=el("tab");tb.style.height=(base-.8)+"rem";
   var tgl=ls.filter(function(l){return l.i===sel})[0]||ls.filter(function(l){return l.lc})[0],tgc=tgl&&tgl.lc?tgl.lc:"";
   tb.innerHTML='<button class="eye'+(tgc?" tg":"")+(ls.some(function(l){return l.i===sel||msel.indexOf(l.i)>=0})?" sel":"")+(kind==="a"?(mut?" hid":""):(hid?" hid":""))+'" data-r="'+r+'" data-k="'+kind+'"'+(tgc?' style="--lc:'+tgc+'"':"")+'><svg><use href="#i-'+(kind==="a"?(mut?"mute":"vol"):(hid?"eyeoff":"eye"))+'"/></svg></button>'+((kind!=="a"&&tgl&&tgl.i===sel&&!msel.length&&tgl.k!=="aud")?'<button class="d3b'+(is3d(tgl)?" on":"")+'" data-i="'+tgl.i+'" aria-label="3D layer"><svg><use href="#i-3d"/></svg></button>':"")+(hasK?'<button class="tw'+(open?" open":"")+'" data-r="'+r+'" data-k="'+kind+'" aria-label="Show / hide keyframes"><svg><use href="#i-chev"/></svg></button>':"");
   ln.appendChild(tb);if(kind==="a"?mut:hid)ln.classList.add("dim");
   if(hasK)PR.forEach(function(p,i){
    var kin=el("lin kin");kin.style.top=(base+i*KH)+"rem";kin.style.height=KH+"rem";
    ls.forEach(function(l){((l.kf&&l.kf[p])||[]).forEach(function(k){var d=el("kfd"+(k.e||(function(a,j){return j>0&&a[j-1].e})(l.kf[p],l.kf[p].indexOf(k))?" ez":"")+(l.i===sel?" on":""));d.dataset.i=l.i;d.dataset.p=p;d.dataset.k=l.kf[p].indexOf(k);d.style.left="calc(var(--pps)*"+(l.s+k.t)+"rem)";kin.appendChild(d)})});
    ln.appendChild(kin);
    var L0=find(sel)&&ls.indexOf(find(sel))>=0?find(sel):ls[0],pb=el("plb","button");pb.dataset.p=p;pb.dataset.i=L0.i;pb.style.top=(base+i*KH)+"rem";pb.style.height=KH+"rem";
    pb.innerHTML="<b></b><span>"+PN[p]+" <i>"+fv(L0,p)+"</i></span><u class=\"plh\" aria-label=\"Hide labels\"></u>";ln.appendChild(pb)})}
  sec.appendChild(ln)}
 var p=el("pad");p.style.height=(kind==="a"?PAD:PADV)+"rem";sec.appendChild(p)
}
function gname(l){return (l.mg===1?"Group and Mask ":l.mg===2?"Group and Invert Mask ":"Group ")+(l.gn||1)}
function wave(l,mm){var n=Math.max(6,Math.min(500,Math.floor((l.d*pps-3)/1.05))),D=mm.dur||l.d,o=l.o||0,pk=mm.peaks,N=pk.length,h="";
 for(var j=0;j<n;j++){var a=Math.floor((o+j/n*l.d)/D*N),b=Math.max(a+1,Math.floor((o+(j+1)/n*l.d)/D*N)),m=0;for(var q=a;q<b&&q<N;q++)if(pk[q]>m)m=pk[q];h+='<i style="height:'+(1.2+m*.068)+'rem"></i>'}return h}
function clip(l){
 var mm=l.mid&&A.MD?A.MD.meta(l.mid):null;
 var e=el("clip "+(l.k==="grp"?"gpc":l.k)+(l.i===sel?" sel":"")+(msel.indexOf(l.i)>=0?" ms":"")+(l.k==="grp"&&l.mg?" mg"+l.mg:""));
 e.dataset.i=l.i;e.style.left="calc(var(--pps)*"+l.s+"rem)";e.style.width="calc(var(--pps)*"+l.d+"rem)";
 if(l.k==="grp")e.textContent=gname(l);
 else if((l.k==="vid"||l.k==="img")&&mm&&mm.thumb){e.classList.add("th");e.style.backgroundImage='url("'+mm.thumb+'")'}
 else if(l.k==="vid")e.innerHTML="<i></i><i></i><i></i><i></i>";
 else if(l.k==="txt")e.textContent=(l.t||"Text")+(l.an&&l.an!=="None"?" \u00B7 "+l.an:"");
 else if(NM[l.k])e.textContent=(l.k==="shp"&&l.sn)?l.sn:NM[l.k];
 else if(mm&&mm.peaks)e.innerHTML=wave(l,mm);
 else e.innerHTML=BARS.map(function(v){return '<i style="height:'+(v*.16+1.4)+'rem"></i>'}).join("");
 if(l.i===sel&&l.k!=="grp"){var cw=el("cin");if(e.classList.contains("th")){cw.classList.add("th");cw.style.backgroundImage=e.style.backgroundImage;e.style.backgroundImage=""}while(e.firstChild)cw.appendChild(e.firstChild);e.appendChild(cw)}
 if(!l.x&&hasKF(l)){var seen={};Object.keys(l.kf).forEach(function(p){var a=l.kf[p]||[];a.forEach(function(k,j){var q=(+k.t).toFixed(3),z=!!(k.e||(j>0&&a[j-1].e));if(seen[q]){if(z)seen[q].classList.add("ez");return}var m=el("kfi"+(z?" ez":""),"b");seen[q]=m;m.style.left="calc(var(--pps)*"+k.t+"rem)";e.appendChild(m)})})}
 if(l.k==="txt"&&l.ta&&l.ta.kf){var sn2={};["s","e"].forEach(function(key){(l.ta.kf[key]||[]).forEach(function(k){var q=(+k.t).toFixed(3);if(sn2[q])return;sn2[q]=1;var m=el("kfi tak","b");m.style.left="calc(var(--pps)*"+k.t+"rem)";e.appendChild(m)})})}
 if(l.lc){e.style.setProperty("--lc",l.lc);e.classList.add("tg");e.insertAdjacentHTML("beforeend",'<i class="tgb"></i>')}
 e.insertAdjacentHTML("beforeend",'<b class="h l"></b><b class="h r"></b>');return e}
/* ---- Auto text arrange (ported from Apex Cut 33): later start = higher up; same start = the LONGER one on top.
   Only text layers trade places with each other - every other layer keeps its row. */
function autoOn(){try{return localStorage.getItem("apexcut.autoArrange")!=="0"}catch(x){return true}}
var seenTx={},pendTx=null,pendTm=0,quiet=false;
function arrangeText(silent,ids,auto){
 var all=M.L.filter(function(l){return l.k==="txt"}),pick=all;
 if(ids)pick=all.filter(function(l){return ids.indexOf(l.i)>=0});
 else{var ts=targetsL().filter(function(l){return l.k==="txt"});if(ts.length>=2)pick=ts}
 if(pick.length<2){if(!silent)A.toast("Text layers are already in order");return 0}
 var eps=1/60,slots=pick.map(function(l){return l.r}).sort(function(a,b){return a-b}),
  order=pick.slice().sort(function(a,b){
   var ds=a.s-b.s;if(Math.abs(ds)>eps)return ds>0?-1:1;           /* later start = higher up */
   if(Math.abs(a.d-b.d)>1e-6)return a.d>b.d?-1:1;                  /* same start: longer = higher up */
   return a.r!==b.r?a.r-b.r:a.i-b.i}),
  nr={},placed=[];
 order.forEach(function(l,j){var r=slots[j];
  while(placed.some(function(o){return o.r===r&&l.s<o.s+o.d-.01&&l.s+l.d>o.s+.01}))r+=.01;   /* never put two overlapping clips in one row */
  nr[l.i]=r;placed.push({r:r,s:l.s,d:l.d})});
 var moved=pick.filter(function(l){return Math.abs(nr[l.i]-l.r)>1e-9}).length;
 if(!moved){if(!silent)A.toast("Text layers are already in order");return 0}
 push();pick.forEach(function(l){l.r=nr[l.i]});norm();render();save();if(A.redraw)A.redraw();
 if(!silent||moved)A.toast("Text layers arranged ("+moved+" moved)");return moved}
/* two or more NEW text layers appearing at once (import / paste) are arranged automatically */
function autoCheck(){
 if(!cur||stack.length)return;
 var cs={},fresh=[],prev=seenTx[cur.id];
 M.L.forEach(function(l){if(l.k==="txt"){cs[l.i]=1;if(prev&&!prev[l.i])fresh.push(l.i)}});
 seenTx[cur.id]=cs;
 if(!prev||quiet||!autoOn())return;
 if(fresh.length){if(!pendTx||pendTx.id!==cur.id)pendTx={id:cur.id,ids:[]};fresh.forEach(function(i){pendTx.ids.push(i)})}
 if(!pendTx)return;
 clearTimeout(pendTm);
 pendTm=setTimeout(function(){var p=pendTx;pendTx=null;if(!p||!cur||cur.id!==p.id||stack.length)return;
  var ids=p.ids.filter(function(i){return find(i)});if(ids.length>=2)arrangeText(true,ids,true)},450)}
function render(){
 var a=secV.scrollTop,b=secA.scrollTop;foc=!!(sel!=null&&!msel.length&&find(sel));
 if(!inFoc){svV=a;svA=b}else if(!foc){a=svV;b=svA}
 ENTER=foc&&!inFoc;LEAVE=!foc&&inFoc;secV.innerHTML=secA.innerHTML="";
 build(secV,"v",M.nv);build(secA,"a",M.na);
 $("#lanes").classList.toggle("focus",foc);
 secV.classList.toggle("nofo",foc&&!secV.querySelector(".lane.fo"));secA.classList.toggle("nofo",foc&&!secA.querySelector(".lane.fo"));
 inFoc=foc;secV.scrollTop=foc?0:a;secA.scrollTop=foc?0:b;marks();if(A.placeT)A.placeT();if(A.onRender)A.onRender();if(A.MD&&A.MD.sync)A.MD.sync();autoCheck()}
function fmtR(x){var m=Math.floor(x/60),ss=x-m*60;return m+":"+(ss<10?"0":"")+(Math.abs(ss-Math.round(ss))<1e-6?Math.round(ss):ss.toFixed(1))}
function marks(){ /* ruler: minor + major ticks, labels, marker flags; dashed marker lines through the lanes */
 var px=pps*rem(),st=[.5,1,2,5,10,15,30,60,120].filter(function(x){return x*px>=34})[0]||120,mn=st/5,end=Math.max.apply(0,M.L.map(function(l){return l.s+l.d}).concat([0])),tot,h="";
 if(end<.01)end=5;end=Math.min(MAXT,end);tot=Math.min(end,3000*mn);
 /* labels: only as many numbers as fit without touching (LS = label step, a multiple of the major step); zoomed out past LMAX seconds per label -> no numbers, ticks only; zoom in -> they come back */
 var LS=[.5,1,2,5,10,15,20,30,60,120],LMAX=20,ls=0,qi;
 for(qi=0;qi<LS.length;qi++){var cd=LS[qi],rr=cd/st,need=Math.abs(cd-Math.round(cd))>1e-6?14.5:12.5;if(rr>=1-1e-6&&Math.abs(rr-Math.round(rr))<1e-6&&cd*pps>=need){ls=cd;break}}
 if(ls>LMAX)ls=0;
 for(var i=0;i*mn<=tot+1e-6;i++){var t=i*mn,mj=i%5===0,lab=mj&&ls&&Math.abs(t/ls-Math.round(t/ls))<1e-6;h+='<i class="tk'+(mj?" maj":"")+'" style="left:calc(var(--pps)*'+t.toFixed(3)+'rem)"></i>'+(lab?'<b class="lb" style="left:calc(var(--pps)*'+t.toFixed(3)+'rem)">'+fmtR(t)+'</b>':"")}
 if(tot>=end-1e-6&&Math.abs(Math.round(end/mn)*mn-end)>1e-3)h+='<i class="tk maj end" style="left:calc(var(--pps)*'+end.toFixed(3)+'rem)"></i>';
 M.K.forEach(function(t){h+='<i class="mk" data-t="'+t+'" style="left:calc(var(--pps)*'+t+'rem)"></i>'});
 $("#rin").innerHTML=h;
 $("#mkl").innerHTML=M.K.map(function(t){return '<i style="left:calc(var(--pps)*'+t+'rem)"></i>'}).join("")}
function setPps(v){pps=Math.max(.25,Math.min(40,v));tl.style.setProperty("--pps",pps);if(M)marks()}

/* ---- divider: drag UP = hide video, DOWN = hide audio, double-tap = toggle ---- */
var dvHintEl=null,dvTxt="",dvH0=-1;
function applyDv(){
 var s=split==null?DEF:Math.max(0,Math.min(TOT,split));
 if(s!==dvH0){dvH0=s;secV.style.height=s+"rem";secA.style.height=(TOT-s)+"rem";dv.classList.toggle("on",s!==DEF)}
 var t=s<.2?"VIDEO HIDDEN":s<DEF-.2?"VIDEO COLLAPSED":s>TOT-.2?"AUDIO HIDDEN":s>DEF+.2?"AUDIO COLLAPSED":"AUDIO";
 if(t!==dvTxt){dvTxt=t;(dvHintEl||(dvHintEl=$("#dvHint"))).textContent=t}}
(function(){
 var st=null,last=0;
 function an(o){[secV,secA].forEach(function(x){x.classList.toggle("anim",o)})}
 function step(){
  if(!st)return;st.raf=0;var dy=st.cy-st.y;if(Math.abs(dy)>6)st.m=true;if(!st.m)return;
  var h=Math.max(0,Math.min(TOT,st.h+dy/st.rem)),tag="";
  if(h<3.4){h=0;tag="0"}else if(h>TOT-3.4){h=TOT;tag="T"}else if(Math.abs(h-DEF)<2.6){h=DEF;tag="D"}
  if(tag!==st.tag){st.tag=tag;if(tag)HX.snap()}
  var ns=Math.abs(h-DEF)<.01?null:h;if(ns!==split){split=ns;applyDv()}}
 dv.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();if(S.playing)A.stop();
  st={y:e.clientY,cy:e.clientY,h:split==null?DEF:split,m:false,raf:0,tag:"",rem:rem()};an(false);dv.classList.add("drag");document.body.classList.add("tdrag");dv.setPointerCapture(e.pointerId)});
 dv.addEventListener("pointermove",function(e){if(!st)return;st.cy=e.clientY;if(!st.raf)st.raf=requestAnimationFrame(step)});
 function end(){if(!st)return;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0;step()}var tap=!st.m;st=null;dv.classList.remove("drag");document.body.classList.remove("tdrag");
  if(tap){var n=Date.now();if(n-last<320){an(true);split=split==null?0:null;applyDv();last=0}else last=n}}
 dv.addEventListener("pointerup",end);dv.addEventListener("pointercancel",end);
})();

/* ---- snapping ---- */
var sl=el("snapline");tl.appendChild(sl);
function targets(skip){var t=[S.t,0].concat(M.K);var sk=Array.isArray(skip);M.L.forEach(function(o){if(sk?skip.indexOf(o)<0:o!==skip){t.push(o.s,o.s+o.d)}});return t}
function snapV(v,skip,len){
 sl.style.display="none";if(!snapOn)return v;
 var th=14/(pps*rem()),best=th,out=v,tg=null,T=targets(skip);
 T.forEach(function(t){[0,len].forEach(function(o){var df=Math.abs(v+o-t);if(df<best){best=df;out=t-o;tg=t}})});
 if(tg!=null){sl.style.left=(54+(tg-S.t)*pps)+"rem";sl.style.display="block"}return out}
/* ---- ruler marks while a layer is dragged / trimmed: in + out flags with their times, theme colour ---- */
var rmA=null,rmB=null;
function fmtD(x){x=Math.max(0,x);var m=Math.floor(x/60),ss=x-m*60;return m+":"+(ss<10?"0":"")+ss.toFixed(1)}
function rmShow(s,e,snapped){var r=$("#rin");if(!r)return;
 if(!rmA||rmA.parentNode!==r){rmHide();rmA=document.createElement("i");rmA.className="dmk";rmB=document.createElement("i");rmB.className="dmk out";r.appendChild(rmA);r.appendChild(rmB)}
 rmA.style.left="calc(var(--pps)*"+s.toFixed(3)+"rem)";rmB.style.left="calc(var(--pps)*"+e.toFixed(3)+"rem)";
 rmA.classList.toggle("snap",!!snapped);rmB.classList.toggle("snap",!!snapped)}
function rmHide(){[rmA,rmB].forEach(function(n){if(n&&n.parentNode)n.parentNode.removeChild(n)});rmA=rmB=null}
function overlapX(l,r,s,d,ex){return M.L.some(function(o){return o!==l&&ex.indexOf(o)<0&&((o.k==="aud")===(l.k==="aud"))&&o.r===r&&s<o.s+o.d-.01&&s+d>o.s+.01})}
function overlap(l,r,s,d){return M.L.some(function(o){return o!==l&&((o.k==="aud")===(l.k==="aud"))&&o.r===r&&s<o.s+o.d-.01&&s+d>o.s+.01})}

/* ---- pointer: move / trim / scrub / vertical scroll, with auto-scroll on both axes ---- */
tl.addEventListener("pointerdown",function(e){
 if(e.target.closest(".divider,.eye,.tw,.plb,.fxb,.d3b"))return;
 if(S.playing)A.stop();
 var kd=e.target.closest(".kfd");if(kd){kfDrag(e,kd);return}
 var c=e.target.closest(".clip"),h=e.target.closest(".h"),L=c&&find(+c.dataset.i),sec=e.target.closest(".sec"),
  mode=!c?"scrub":h?(h.classList.contains("l")?"tl":"tr"):"move",REM=rem(),
  p={x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,t0:S.t,sc0:sec?sec.scrollTop:0,moved:false,s:L&&L.s,d:L&&L.d,r:L&&L.r,ns:0,nd:0,dd:0,tr:L?L.r:0,hold:false,ht:0,dirty:false,
   gm:null,ge:null,lc:null,sr:null,sk:null,lastTr:null,hy:e.clientY,hsc:sec?sec.scrollTop:0,wasSnap:false},raf=0,lastT=0,tlR=tl.getBoundingClientRect();
 tl.setPointerCapture(e.pointerId);
 /* several layers selected and one of them is dragged -> the whole selection moves together (sideways + row order) */
 if(mode==="move"&&L&&msel.length>1&&msel.indexOf(L.i)>=0){
  var gm=msel.map(find).filter(Boolean);
  if(gm.length>1){p.gm=gm;p.gmin=Math.min.apply(0,gm.map(function(m){return m.s}));p.gmax=Math.max.apply(0,gm.map(function(m){return m.s+m.d}));
   p.ge=gm.map(function(m){return {l:m,el:tl.querySelector('.clip[data-i="'+m.i+'"]'),same:(m.k==="aud")===(L.k==="aud")}}).filter(function(g){return g.el})}}
 var isSel=!!(L&&mode==="move"&&(L.i===sel||msel.indexOf(L.i)>=0)),near=Math.abs(e.clientX-(tlR.left+54*REM))<REM*15;   /* grabbed close to the playhead -> slides sideways only; grabbed far away + press-and-hold -> row order only */   /* an already selected layer slides at once; the others need a short press-and-hold */
 function els(){return p.ge?p.ge.map(function(g){return g.el}):(c?[c]:[])}
 /* layer order: vertical move only unlocks after press-and-hold (so a sideways drag never changes the row) */
 if(mode==="move"&&!near)p.ht=setTimeout(function(){if(!p.moved){p.hold=true;p.hy=p.y;p.hsc=sec?sec.scrollTop:0;els().forEach(function(x){x.classList.add("lift")});HX.hold();p.dirty=true}},240);
 function cacheLanes(){if(p.lc)return;var secEl=L.k==="aud"?secA:secV;p.sk=secEl;p.sr=secEl.getBoundingClientRect();
  p.lc=$$(".lane",secEl).map(function(ln){var has=p.ge?p.ge.some(function(g){return ln.contains(g.el)}):ln.contains(c);if(has)ln.classList.add("up");return {el:ln,r:+ln.dataset.r,t:ln.offsetTop,b:ln.offsetTop+ln.offsetHeight}})}
 function ptRow(){ /* lane under the finger (same section), measured from cached geometry - no layout reads while dragging */
  cacheLanes();var yy=p.y-p.sr.top+p.sk.scrollTop,best=p.r,bd=1e9;
  p.lc.forEach(function(o){var d=yy<o.t?o.t-yy:yy>o.b?yy-o.b:0;if(d<bd){bd=d;best=o.r}});return best}
 function upd(){
  var ps=pps*REM,dt=S.t-p.t0;
  if(mode==="scrub"){A.setT(p.t0-(p.x-p.x0)/ps);if(sec)sec.scrollTop=p.sc0-(p.y-p.y0);return}
  var dx=(p.x-p.x0)/ps+dt,e=c;
  if(mode==="move"){
   var ns=p.hold?p.s:Math.max(0,snapV(Math.max(0,Math.min(MAXT-p.d,p.s+dx)),p.gm||L,p.d));if(p.hold)sl.style.display="none";
   var dd=ns-p.s;if(p.gm){dd=Math.max(-p.gmin,Math.min(MAXT-p.gmax,dd));ns=p.s+dd}
   p.ns=ns;p.dd=dd;
   var sn=sl.style.display==="block";if(sn&&!p.wasSnap)HX.tick();p.wasSnap=sn;
   if(p.hold)rmHide();else if(p.gm)rmShow(p.gmin+dd,p.gmax+dd,sn);else rmShow(ns,ns+p.d,sn);
   var tx=dd*ps,ty=0;
   if(p.hold){ty=(p.y-p.hy)+(sec.scrollTop-p.hsc);p.tr=ptRow();
    if(p.lastTr!==p.tr){if(p.lastTr!=null)HX.tick();p.lastTr=p.tr;p.lc.forEach(function(o){o.el.classList.toggle("tgt",o.r===p.tr)})}}
   else p.tr=p.r;
   if(p.ge)p.ge.forEach(function(g){g.el.style.transform="translate3d("+tx+"px,"+(g.same?ty:0)+"px,0)"});
   else e.style.transform="translate3d("+tx+"px,"+ty+"px,0)"
  }else if(mode==="tl"){
   var lo=(L.k==="vid"||L.k==="aud")&&L.md?p.s-(L.o||0):0,a=Math.max(0,lo,Math.min(p.s+p.d-.5,snapV(p.s+dx,L,0)));p.ns=a;p.nd=p.s+p.d-a;
   e.style.left="calc(var(--pps)*"+a+"rem)";e.style.width="calc(var(--pps)*"+p.nd+"rem)";rmShow(a,p.s+p.d,sl.style.display==="block")
  }else{
   var en=snapV(p.s+p.d+dx,L,0);en=Math.max(p.s+.5,Math.min(MAXT,en));if((L.k==="vid"||L.k==="aud")&&L.md)en=Math.min(en,p.s+(L.md-(L.o||0)));p.ns=p.s;p.nd=en-p.s;e.style.width="calc(var(--pps)*"+p.nd+"rem)";rmShow(p.s,en,sl.style.display==="block")}
 }
 function loop(n){
  var dt=Math.min(.05,(n-lastT)/1000||0);lastT=n;
  if(mode!=="scrub"){
   var r=tlR,z=REM*11,u=REM*7,v=0,y=0;
   if(p.x>r.right-z)v=Math.min(1,(p.x-(r.right-z))/z);else if(p.x<r.left+z)v=-Math.min(1,(r.left+z-p.x)/z);
   if(v&&!p.hold)A.setT(S.t+v*60*dt/Math.max(.4,pps));
   if(mode==="move"&&p.hold){cacheLanes();var sr=p.sr;
    if(p.y<sr.top+u)y=-Math.min(1,(sr.top+u-p.y)/u);else if(p.y>sr.bottom-u)y=Math.min(1,(p.y-(sr.bottom-u))/u);
    if(y)sec.scrollTop+=y*REM*90*dt}
   if((v&&!p.hold)||y)p.dirty=true}
  if(p.dirty){p.dirty=false;upd()}
  raf=requestAnimationFrame(loop)}
 function mv(ev){p.x=ev.clientX;p.y=ev.clientY;
  if(!p.moved){if(Math.hypot(p.x-p.x0,p.y-p.y0)<6)return;p.moved=true;if(!isSel)clearTimeout(p.ht);if(mode==="move"&&!p.hold&&!isSel&&!near)mode="scrub";
   document.body.classList.add("tdrag");
   if(mode!=="scrub"){push();if(mode==="move")els().forEach(function(x){x.classList.add("drag")})}
   raf=requestAnimationFrame(loop)}
  p.dirty=true}
 function up(){
  tl.removeEventListener("pointermove",mv);tl.removeEventListener("pointerup",up);tl.removeEventListener("pointercancel",up);cancelAnimationFrame(raf);clearTimeout(p.ht);
  if(p.dirty&&p.moved){p.dirty=false;upd()}
  document.body.classList.remove("tdrag");sl.style.display="none";rmHide();els().forEach(function(x){x.classList.remove("lift")});
  if(!p.moved){
   if(msel.length&&L){var mi=msel.indexOf(L.i);if(mi>=0)msel.splice(mi,1);else msel.push(L.i);render();msChange();return}
   if(L){sel=L.i}else sel=null;render();return}
  if(mode==="scrub")return;
  if(mode==="move"){
   if(p.gm){ /* whole selection: same time shift for all, same row shift for the ones in the dragged layer's section */
    var nrw=L.k==="aud"?M.na:M.nv,dr=p.hold?p.tr-p.r:0,lo2=-1e9,hi2=1e9;
    p.gm.forEach(function(m){if((m.k==="aud")===(L.k==="aud")){lo2=Math.max(lo2,-m.r);hi2=Math.min(hi2,nrw-1-m.r)}});
    dr=Math.max(lo2,Math.min(hi2,dr));var bad=false;
    p.gm.forEach(function(m){var nr=(m.k==="aud")===(L.k==="aud")?m.r+dr:m.r;if(overlapX(m,nr,Math.max(0,m.s+p.dd),m.d,p.gm))bad=true});
    if(bad){hist.pop();A.toast("Clips overlap");render();return}
    p.gm.forEach(function(m){if((m.k==="aud")===(L.k==="aud"))m.r+=dr;m.s=+Math.max(0,m.s+p.dd).toFixed(4)})}
   else{
    var r=p.tr;if(overlap(L,r,p.ns,L.d))r=p.r;
    if(overlap(L,r,p.ns,L.d)){hist.pop();A.toast("Clips overlap");render();return}
    L.s=p.ns;L.r=r}}
  else if(mode==="tl")shiftStart(L,p.ns-p.s);
  else L.d=p.nd;
  norm();render();save()}
 tl.addEventListener("pointermove",mv);tl.addEventListener("pointerup",up);tl.addEventListener("pointercancel",up);
});

/* ---- keyframe diamond: tap = pick layer + property and jump there, drag = move the keyframe in time ---- */
function kfDrag(e,kd){
 var l=find(+kd.dataset.i),p=kd.dataset.p,k=l&&l.kf&&l.kf[p]&&l.kf[p][+kd.dataset.k];if(!k)return;
 var x0=e.clientX,t0=k.t,moved=false,ps=pps*rem();tl.setPointerCapture(e.pointerId);
 function mv(ev){var dx=(ev.clientX-x0)/ps;
  if(!moved){if(Math.abs(ev.clientX-x0)<6)return;moved=true;push();kd.classList.add("drag")}
  var nt=Math.max(0,Math.min(l.d,t0+dx));
  if(snapOn){var th=14/ps,c=[S.t-l.s,0,l.d].concat((l.kf[p]||[]).filter(function(o){return o!==k}).map(function(o){return o.t}));
   c.forEach(function(q){if(Math.abs(nt-q)<th)nt=q})}
  k.t=+nt.toFixed(3);kd.style.left="calc(var(--pps)*"+(l.s+k.t)+"rem)";A.setT(S.t);if(A.onTL)A.onTL()}
 function up(){tl.removeEventListener("pointermove",mv);tl.removeEventListener("pointerup",up);tl.removeEventListener("pointercancel",up);
  if(!moved){sel=l.i;selP[l.i]=p;A.setT(l.s+k.t);render();return}
  l.kf[p].sort(function(a,b){return a.t-b.t});sel=l.i;selP[l.i]=p;render();save()}
 tl.addEventListener("pointermove",mv);tl.addEventListener("pointerup",up);tl.addEventListener("pointercancel",up)}

/* ---- eye tab: long-press = multi-select the row, tap while selecting = add / remove ---- */
var eyeT=0,eyeHeld=false;
function rowLayers(k,r){return M.L.filter(function(l){return (l.k==="aud")===(k==="a")&&l.r===r})}
function msToggleRow(k,r){var ls=rowLayers(k,r),all=ls.every(function(l){return msel.indexOf(l.i)>=0});
 ls.forEach(function(l){var i=msel.indexOf(l.i);if(all){if(i>=0)msel.splice(i,1)}else if(i<0)msel.push(l.i)});
 sel=null;render();msChange()}
function msChange(){if(A.onMS)A.onMS(msel.length);if(A.onRender)A.onRender()}
function msClear(){msel=[];render();msChange()}
/* Group = the selected layers collapse into ONE layer (children keep times relative to the group start).
   Mask Group = top child is the mask for the rest, Invert Mask Group = everything except the mask shape. */
function makeGroup(ls,mode){
 var gs=Math.min.apply(0,ls.map(function(l){return l.s})),ge=Math.max.apply(0,ls.map(function(l){return l.s+l.d})),
  vl=ls.filter(function(l){return l.k!=="aud"}).sort(function(a,b){return a.r-b.r}),al=ls.filter(function(l){return l.k==="aud"}).sort(function(a,b){return a.r-b.r}),
  minR=vl.length?vl[0].r:0;
 ls.forEach(function(l){if(l.pr!=null&&!ls.some(function(o){return o.i===l.pr}))delete l.pr});M.L.forEach(function(o){if(o.pr!=null&&ls.some(function(x){return x.i===o.pr}))delete o.pr});
 ls.forEach(function(l){M.L.splice(M.L.indexOf(l),1)});
 vl.forEach(function(l,j){l.r=j});al.forEach(function(l,j){l.r=j});
 ls.forEach(function(l){l.s=+(l.s-gs).toFixed(4);delete l.x});
 M.gc=(M.gc||0)+1;
 var g={i:nid++,k:"grp",s:+gs.toFixed(4),d:+(ge-gs).toFixed(4),r:minR,ch:vl.concat(al),gn:M.gc};if(mode)g.mg=mode;
 if(overlap(g,g.r,g.s,g.d))g.r=minR-.5;
 M.L.push(g);return g}
function ungroupL(g){
 M.L.splice(M.L.indexOf(g),1);var n=0;
 (g.ch||[]).forEach(function(c){
  c.s=+(g.s+c.s).toFixed(4);
  var lo=g.s,hi=g.s+g.d;if(c.s>=hi-1e-6||c.s+c.d<=lo+1e-6)return;   /* parts trimmed away from the group are dropped */
  if(c.s<lo)shiftStart(c,lo-c.s);if(c.s+c.d>hi)c.d=+(hi-c.s).toFixed(4);
  c.r=c.k==="aud"?1000+(c.r||0):g.r-.5+(c.r||0)*.01;M.L.push(c);n++});
 return n}
function msApply(kind){
 var ls=msel.map(find).filter(Boolean);if(!ls.length){A.toast("Select layers first");return}
 push();var one=ls.length===1&&ls[0].k==="grp",g0=ls[0];
 if(kind==="g"){
  if(one){ungroupL(g0);A.toast("Ungrouped")}
  else{var g=makeGroup(ls,0);A.toast("Grouped "+ls.length+" layer"+(ls.length>1?"s":"")+" - "+gname(g))}}
 else{var v=kind==="m"?1:2;
  if(one){if(g0.mg===v){delete g0.mg;A.toast("Mask removed")}else{g0.mg=v;A.toast(v===1?"Mask Group":"Invert Mask Group")}}
  else{makeGroup(ls,v);A.toast(v===1?"Mask Group":"Invert Mask Group")}}
 msel=[];sel=null;norm();render();save();msChange()}
function ungroupSel(){var gs=targetsL().filter(function(l){return l.k==="grp"});if(!gs.length){A.toast("Select a group first");return}
 push();gs.forEach(ungroupL);msel=[];sel=null;norm();render();save();msChange();A.toast("Ungrouped")}
function delAll(){var ls=targetsL();if(!ls.length){A.toast("Select a layer first");return}
 push();ls.forEach(function(l){M.L.splice(M.L.indexOf(l),1);M.L.forEach(function(o){if(o.pr===l.i)delete o.pr})});sel=null;msel=[];norm();render();save();msChange()}
$("#lanes").addEventListener("pointerdown",function(e){var b=e.target.closest(".eye");if(!b)return;eyeHeld=false;clearTimeout(eyeT);
 eyeT=setTimeout(function(){eyeHeld=true;HX.hold();
  if(S.playing)A.stop();msToggleRow(b.dataset.k,+b.dataset.r)},420)});
["pointerup","pointercancel"].forEach(function(n){$("#lanes").addEventListener(n,function(){clearTimeout(eyeT)})});
$("#lanes").addEventListener("scroll",function(){clearTimeout(eyeT)},true);

/* eye = hide row (video) | volume = mute row (audio) | chevron = expand properties | property row = pick layer + property */
$("#lanes").addEventListener("click",function(e){
 var fxb=e.target.closest(".fxb");if(fxb){desel();return}
 var pb=e.target.closest(".plb");
 if(pb){sel=+pb.dataset.i;selP[sel]=pb.dataset.p;msel=[];render();if(A.onProp)A.onProp(pb.dataset.p,!!e.target.closest("b"));return}
 var b=e.target.closest(".eye,.tw");if(!b)return;
 if(eyeHeld){eyeHeld=false;return}
 if(msel.length&&b.classList.contains("eye")){msToggleRow(b.dataset.k,+b.dataset.r);return}
 var k=b.dataset.k,r=+b.dataset.r,ls=M.L.filter(function(l){return (l.k==="aud")===(k==="a")&&l.r===r});
 if(b.classList.contains("tw")){var o=!ls.some(function(l){return l.x});ls.forEach(function(l){l.x=o});
  var ln=b.closest(".lane");if(ln){ln.classList.toggle("open",o);b.classList.toggle("open",o);ln.style.height=(+ln.dataset.base+(o?(+ln.dataset.n)*KH:0))+"rem"}
  save();return}
 push();
 if(false){}
 else{var f=k==="a"?"m":"h",h=!ls.every(function(l){return l[f]});ls.forEach(function(l){l[f]=h})}
 render();save()});

/* ---- controls ---- */
var sb=$("#btnSnap");sb.onclick=function(){snapOn=!snapOn;sb.classList.toggle("on",snapOn);A.toast(snapOn?"Snap on":"Snap off")};
$("#btnMark").onclick=function(){push();var i=M.K.findIndex(function(t){return Math.abs(t-S.t)<.15});if(i>=0){M.K.splice(i,1);A.toast("Marker removed")}else{M.K.push(+S.t.toFixed(2));M.K.sort(function(a,b){return a-b});A.toast("Marker "+A.fmt(S.t))}marks();save();if(A.checkHit)A.checkHit(S.t,S.t)};
function edges(){var t=[0].concat(M.K);M.L.forEach(function(l){t.push(l.s,l.s+l.d)});return t}
function stops(){
 var l=find(sel),mk=M.K.slice();
 if(l){var t=[l.s,l.s+l.d].concat(mk),sp=selP[l.i];
  if(l.kf)Object.keys(l.kf).forEach(function(p){if(sp&&l.kf[sp]&&l.kf[sp].length&&p!==sp)return;l.kf[p].forEach(function(k){t.push(+(l.s+k.t).toFixed(3))})});
  return t}
 return [0,Math.max.apply(0,M.L.map(function(x){return x.s+x.d}).concat([0]))].concat(mk)}
$("#btnPrev").onclick=function(){var e=stops(),b=e.filter(function(t){return t<S.t-.02});A.setT(b.length?Math.max.apply(0,b):Math.min.apply(0,e))};
$("#btnNext").onclick=function(){var e=stops(),b=e.filter(function(t){return t>S.t+.02});if(b.length)A.setT(Math.min.apply(0,b))};

function sp(){ /* split at playhead */
 var t=S.t,l=find(sel);if(!l||!(l.s+.1<t&&t<l.s+l.d-.1))l=M.L.filter(function(x){return x.s+.1<t&&t<x.s+x.d-.1})[0];
 if(!l){A.toast("Put the playhead on a clip");return}
 push();var b=JSON.parse(JSON.stringify(l));reid(b);shiftStart(b,t-l.s);l.d=+(t-l.s).toFixed(4);M.L.push(b);norm();render();save()}
function addShape(t,n){push();var l={i:nid++,k:"shp",sh:t,sn:n,r:0,s:Math.min(S.t,MAXT-10),d:10};M.L.push(l);norm();render();save();return l}
function targetsL(){var ids=msel.length?msel.slice():(sel?[sel]:[]);return ids.map(find).filter(Boolean)}
function regroup(b,gm){}
function reid(b){b.i=nid++;(b.ch||[]).forEach(reid)}
/* move a layer's start (trim in): media offset, group children and keyframes follow so nothing visually jumps */
function shiftStart(l,sh){
 l.s=+(l.s+sh).toFixed(4);l.d=+(l.d-sh).toFixed(4);
 if(l.k==="vid"||l.k==="aud")l.o=+Math.max(0,(l.o||0)+sh).toFixed(4);
 if(l.k==="grp")(l.ch||[]).forEach(function(c){c.s=+(c.s-sh).toFixed(4)});
 if(l.kf)Object.keys(l.kf).forEach(function(p){l.kf[p].forEach(function(k){k.t=+(k.t-sh).toFixed(3)})})}
function pickNew(cs){/* new layers are never auto-selected */}
/* Duplicate: copies of the selected layer(s) land right after them (one row above), keeping their relative layout */
function dup(){var ls=targetsL();if(!ls.length){A.toast("Select a layer first");return}
 push();var mn=Math.min.apply(0,ls.map(function(l){return l.s})),mx=Math.max.apply(0,ls.map(function(l){return l.s+l.d})),gm={},
  cs=ls.map(function(l){var b=JSON.parse(JSON.stringify(l));reid(b);b.s=Math.max(0,Math.min(MAXT-b.d,l.s+(mx-mn)));b.r=l.k==="aud"?l.r+.5:l.r-.5;delete b.x;regroup(b,gm);return b});
 cs.forEach(function(b){M.L.push(b)});pickNew(cs);norm();render();save();msChange();A.toast(cs.length>1?"Duplicated "+cs.length+" layers":"Layer duplicated")}
/* Copy / Paste: clipboard keeps the layers with start times relative to the first one; paste drops them at the playhead */
var CLIP=null;try{CLIP=JSON.parse(localStorage.getItem("apexcut.clip"))}catch(x){CLIP=null}
function copyL(){var ls=targetsL();if(!ls.length){A.toast("Select a layer first");return}
 var mn=Math.min.apply(0,ls.map(function(l){return l.s}));
 CLIP=ls.map(function(l){var b=JSON.parse(JSON.stringify(l));b.s=+(l.s-mn).toFixed(3);delete b.x;return b});
 try{localStorage.setItem("apexcut.clip",JSON.stringify(CLIP))}catch(x){}
 A.toast(ls.length>1?"Copied "+ls.length+" layers":"Layer copied")}
function pasteL(){if(!CLIP||!CLIP.length){A.toast("Nothing copied yet");return}
 push();var t=Math.max(0,Math.min(S.t,MAXT-1)),gm={},
  cs=CLIP.map(function(o){var b=JSON.parse(JSON.stringify(o));reid(b);b.s=Math.max(0,Math.min(MAXT-b.d,t+o.s));b.r=b.k==="aud"?1000+o.r:o.r-1000;regroup(b,gm);return b});
 cs.forEach(function(b){M.L.push(b)});pickNew(cs);norm();render();save();msChange();A.toast(cs.length>1?"Pasted "+cs.length+" layers":"Layer pasted")}
function selectAll(){if(!M.L.length){A.toast("No layers yet");return}
 sel=null;msel=M.L.map(function(l){return l.i});render();msChange();A.toast(msel.length+" layers selected")}
/* graph-side list button: glass menu */
var lm=el("gmenu lmenu");lm.innerHTML='<button data-a="all">Select all layers</button><button data-a="dup">Duplicate</button><button data-a="copy">Copy layer</button><button data-a="paste">Paste layer</button><button data-a="ungroup">Ungroup</button><button data-a="arr">Arrange text layers</button>';$("#app").appendChild(lm);
function openLM(btn){var r=btn.getBoundingClientRect(),ar=$("#app").getBoundingClientRect();
 lm.querySelector('[data-a="paste"]').classList.toggle("dis",!(CLIP&&CLIP.length));
 lm.classList.add("on");var w=lm.offsetWidth;lm.style.left=Math.max(8,Math.min(r.right-ar.left-w,ar.width-w-8))+"px";lm.style.top=(r.bottom-ar.top+8)+"px"}
$("#btnList").onclick=function(e){e.stopPropagation();if(lm.classList.contains("on"))lm.classList.remove("on");else openLM(this)};
lm.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;lm.classList.remove("on");var f={all:selectAll,dup:dup,copy:copyL,paste:pasteL,ungroup:ungroupSel,arr:function(){arrangeText(false)}}[b.dataset.a];if(f)f()});
document.addEventListener("pointerdown",function(e){if(!e.target.closest(".lmenu")&&!e.target.closest("#btnList"))lm.classList.remove("on")});
/* generic "add a layer at the playhead" (Null / Adjustment / Solid / Vector) */
function addLayer(o,pick){push();o.i=nid++;o.d=o.d||10;o.r=o.k==="aud"?999:0;o.s=Math.max(0,Math.min(S.t,MAXT-o.d));M.L.push(o);msel=[];norm();render();save();return o}
/* Extract audio: a video layer that still carries its own sound gets a separate Audio layer (same start / length), the video becomes silent */
function hasAud(l){if(!l||l.k!=="vid"||l.ha===false)return false;var m=l.mid&&A.MD?A.MD.meta(l.mid):null;return !(m&&m.na)}
function extractAudio(){
 var all=targetsL(),ls=all.filter(hasAud);
 if(!ls.length){A.toast(all.length?"This layer has no audio":"Select a video layer first");return}
 push();var cs=[];
 ls.forEach(function(l){
  l.ha=false;
  var a={i:nid++,k:"aud",s:l.s,d:l.d,r:0,from:l.i},r=null;
  if(l.mid){a.mid=l.mid;a.o=l.o||0;if(l.md)a.md=l.md;if(l.mn)a.mn=l.mn}
  if(l.v&&l.v.lvl)a.v={lvl:l.v.lvl.slice()};
  var rows=M.L.filter(function(o){return o.k==="aud"}).map(function(o){return o.r}).filter(function(x,i,z){return z.indexOf(x)===i}).sort(function(x,y){return x-y});
  for(var j=0;j<rows.length;j++){if(!overlap(a,rows[j],a.s,a.d)){r=rows[j];break}}
  a.r=r==null?(rows.length?rows[rows.length-1]+1:0):r;
  M.L.push(a);cs.push(a)});
 pickNew(cs);norm();render();save();msChange();
 A.toast(cs.length>1?"Audio extracted ("+cs.length+" layers)":"Audio extracted")}
function selectL(i){sel=i;msel=[];render()}
function ren(){var l=find(sel);if(!l||l.k!=="txt"){A.toast("Select a text layer");return}
 A.askText("Text",l.t).then(function(v){if(v){push();l.t=v;render();save()}})}
function del(){var l=find(sel);if(!l){A.toast("Select a layer first");return}push();M.L.splice(M.L.indexOf(l),1);M.L.forEach(function(o){if(o.pr===l.i)delete o.pr});sel=null;norm();render();save()}
function trimIn(){var l=find(sel),t=S.t;if(!l){A.toast("Select a layer first");return}
 if(!(t>l.s+.05&&t<l.s+l.d-.05)){A.toast("Put the playhead on the clip");return}
 push();shiftStart(l,t-l.s);
 norm();render();save()}
function trimOut(){var l=find(sel),t=S.t;if(!l){A.toast("Select a layer first");return}
 if(!(t>l.s+.05&&t<l.s+l.d-.05)){A.toast("Put the playhead on the clip");return}
 push();l.d=+(t-l.s).toFixed(3);norm();render();save()}
var ACT={cut:sp,layout:dup,style:ren,adjust:del};
$$("#toolPill button").forEach(function(b){b.addEventListener("click",function(){var f=ACT[b.dataset.tool];if(!f)return;f();
 setTimeout(function(){$$("#toolPill button").forEach(function(x){x.classList.toggle("on",x.dataset.tool==="edit")})},320)})});

/* + button: add a layer at the playhead */
var am=el("gmenu card-menu amenu");am.innerHTML='<button data-k="vid">Video</button><button data-k="img">Photo</button><button data-k="aud">Audio</button><button data-k="txt">Text</button>';$("#app").appendChild(am);
function openAdd(btn){var r=btn.getBoundingClientRect(),ar=$("#app").getBoundingClientRect();
 am.classList.add("on");am.style.left=Math.max(8,r.right-ar.left-am.offsetWidth)+"px";am.style.top=Math.max(8,r.top-ar.top-am.offsetHeight-8)+"px"}
/* real import: Video / Photo / Audio open the file picker; several files are laid end to end from the playhead */
function addMedia(ms){
 push();var t=Math.max(0,Math.min(S.t,MAXT-1)),first=null;
 ms.forEach(function(m){var d=m.k==="img"?5:Math.max(.5,Math.min(MAXT-t,m.dur||5)),l={i:nid++,k:m.k,mid:m.id,mn:m.name,r:m.k==="aud"?999:0,s:+t.toFixed(3),d:+d.toFixed(3)};
  if(m.k!=="img")l.md=+(m.dur||d).toFixed(3);
  if(m.k==="vid"&&m.na)l.ha=false;
  M.L.push(l);t+=d;first=first||l});
 msel=[];norm();render();save();A.setT(S.t);
 A.toast(ms.length>1?ms.length+" files added":(ms[0].k==="vid"?"Video":ms[0].k==="img"?"Photo":"Audio")+" added")}
am.addEventListener("click",function(e){var k=e.target.dataset.k;if(!k)return;am.classList.remove("on");
 if(k!=="txt"){if(A.MD)A.MD.pick(k,addMedia);return}
 push();
 var l={i:nid++,k:k,r:k==="aud"?999:0,s:Math.min(S.t,MAXT-10),d:k==="txt"?8:10};if(k==="txt")l.an="None";if(k==="txt")l.t="Text";
 M.L.push(l);norm();render();save()});
document.addEventListener("pointerdown",function(e){if(!e.target.closest(".gmenu")&&!e.target.closest("#btnAdd"))am.classList.remove("on")});

/* graph editor "Apply": stores the curve on every keyframe of the selected layer */
function applyEase(c){
 var l=find(sel),n=0;if(!l||!l.kf)return 0;push();
 var sp=selP[l.i],ps=Object.keys(l.kf).filter(function(p){return l.kf[p].length&&(!sp||!l.kf[sp]||!l.kf[sp].length||p===sp)}),lt=S.t-l.s,tol=.06,seg=0;
 /* playhead between two keyframes = that segment (both its keyframes show the curve); playhead on a keyframe = the segments on both sides of it */
 ps.forEach(function(p){var a=l.kf[p];for(var i=0;i<a.length-1;i++){
  var inside=lt>a[i].t+tol&&lt<a[i+1].t-tol,onEnd=Math.abs(lt-a[i].t)<=tol||Math.abs(lt-a[i+1].t)<=tol;
  if(inside||onEnd){a[i].e={mode:c.mode,h1:c.h1,h2:c.h2};n++;seg++}}});
 if(!seg)ps.forEach(function(p){l.kf[p].forEach(function(k,i,a){if(i<a.length-1){k.e={mode:c.mode,h1:c.h1,h2:c.h2};n++}})});
 if(!n){hist.pop();return 0}render();save();A.setT(S.t);return n}
function clearEase(){var l=find(sel),n=0;if(!l||!l.kf)return 0;push();Object.keys(l.kf).forEach(function(p){l.kf[p].forEach(function(k){if(k.e){delete k.e;n++}})});if(!n){hist.pop();return 0}render();save();return n}
function desel(){sel=null;msel=[];render();save();msChange()}

/* ---- group edit: double-tap a group = step inside it (its children are shown on the timeline at the same absolute time, playhead untouched) ---- */
function pvModel(){ /* what the preview / export sees while inside a group: root layers, groups on the path get their children back in group-relative time */
 function pv(list,d){if(d>=stack.length)return list;var g=stack[d].g;
  return list.map(function(l){if(l!==g)return l;var c=Object.assign({},g);
   c.ch=pv(g.ch,d+1).map(function(k){var kk=Object.assign({},k);kk.s=+(k.s-g.s).toFixed(4);return kk});return c})}
 return {L:pv(ROOT.L,0),K:ROOT.K,nv:ROOT.nv,na:ROOT.na,gc:ROOT.gc}}
function mkView(g){var v={L:g.ch,nv:0,na:0};
 Object.defineProperty(v,"K",{get:function(){return ROOT.K},set:function(x){ROOT.K=x}});
 Object.defineProperty(v,"gc",{get:function(){return ROOT.gc},set:function(x){ROOT.gc=x}});return v}
function resetView(){hist=[];fut=[];sel=null;msel=[];foc=false;inFoc=false;norm();render();marks();ub();if(A.onGroup)A.onGroup();if(A.redraw)A.redraw()}
function enterGroup(g){
 if(!g||g.k!=="grp")return false;if(S.playing)A.stop();
 g.ch=g.ch||[];stack.push({g:g,pm:M});shiftAll(g.ch,g.s);M=mkView(g);resetView();
 A.toast("Inside "+gname(g)+"  \u00B7  tap < to go back");return true}
function exitGroup(){
 if(!stack.length)return false;if(S.playing)A.stop();
 var t=stack.pop();shiftAll(t.g.ch,-t.g.s);M=t.pm;resetView();sel=t.g.i;norm();render();save();if(A.onRender)A.onRender();return true}
function backStep(){
 if(msel.length){msClear();return true}
 if(sel!=null){desel();return true}
 if(stack.length){exitGroup();return true}
 return false}
function lname(l){if(!l)return "";
 if(l.k==="grp")return gname(l);
 if(l.k==="txt")return String(l.t||"Text").split("\n")[0].slice(0,22)||"Text";
 if(l.k==="shp")return l.sn||"Shape";
 if(l.k==="vid"||l.k==="aud"||l.k==="img")return l.mn||(l.k==="vid"?"Video":l.k==="aud"?"Audio":"Photo");
 return NM[l.k]||"Layer"}
function descOf(l,id){ /* true if layer l (or one of its parents) is layer id */
 var n=0;while(l&&n++<12){if(l.i===id)return true;l=l.pr!=null?find(l.pr):null}return false}
function setParent(i,pid){var l=find(i);if(!l)return false;
 if(pid!=null&&(pid===i||descOf(find(pid),i))){A.toast("Can't link a layer to itself");return false}
 push();if(pid==null)delete l.pr;else l.pr=pid;save();render();if(A.redraw)A.redraw();return true}
A.E={is3d:is3d,m3:m3,arrangeText:arrangeText,delAll:delAll,extract:extractAudio,hasAud:hasAud,valueAt:valAt,deselect:desel,msel:function(){return msel},msClear:msClear,msApply:msApply,setSelProp:function(i,p){selP[i]=p},
 M:function(){return stack.length?pvModel():M},sel:function(){return sel},enterGroup:enterGroup,exitGroup:exitGroup,inGroup:function(){return stack.length},gtitle:function(){return stack.length?gname(stack[stack.length-1].g):""},backStep:backStep,lname:lname,siblings:function(){return M.L},setParent:setParent,parentOf:function(l){return l&&l.pr!=null?find(l.pr)||null:null},find:find,push:push,save:save,render:render,setPps:setPps,pps:function(){return pps},
 addShape:addShape,addLayer:addLayer,select:selectL,selectAll:selectAll,copy:copyL,paste:pasteL,split:sp,trimIn:trimIn,trimOut:trimOut,dup:dup,ren:ren,del:del,openAdd:openAdd,applyEase:applyEase,clearEase:clearEase,fv:fv,PN:PN,PDEF:PDEF,PU:PU,snapOn:function(){return snapOn}};
A.E.spPt=spPt;A.E.spFrac=spFrac;
A.open=function(p){
 cur=p;stack=[];gtap=null;try{M=JSON.parse(localStorage.getItem("apexcut.tl."+p.id))}catch(x){M=null}
 if(!M||!M.L)M=fresh();ROOT=M;(function w(a){a.forEach(function(l){nid=Math.max(nid,l.i+1);if(l.k!=="grp"){delete l.g;delete l.mg}else if(l.ch)w(l.ch)})})(M.L);
 if(A.MD)A.MD.reset();
 hist=[];fut=[];sel=null;msel=[];selP={};delete seenTx[p.id];pendTx=null;foc=false;inFoc=false;fit=false;snapOn=true;sb.classList.add("on");split=null;
 setPps(.98);norm();render();applyDv();marks();ub();
 if(A.MD)A.MD.prepare(M).then(function(){render();marks();A.setT(S.t)})};
})();
