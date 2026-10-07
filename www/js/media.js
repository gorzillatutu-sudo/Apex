/* Apex Cut mobile - REAL media: import (video / photo / audio) -> IndexedDB, thumbnails + waveform,
   playback engine (WebAudio mixer), group / mask-group / invert-mask compositor (preview + export share ONE renderer) */
(function(){
"use strict";
var A=window.AX,S=A.S,E=A.E,X=A.X,FX=A.FX,$=function(s,r){return (r||document).querySelector(s)};
var MD=A.MD={},MM={},URLS={},MISS={},POOL={},PEND={},MEM={},missToast=false;

/* ---------- canvas preview surface ---------- */
var cv=document.createElement("canvas");cv.id="cv";var cvh=$("#canvas");cvh.insertBefore(cv,cvh.firstChild);cvh.classList.add("real");

/* ---------- IndexedDB: blobs + meta (survive restarts) ---------- */
var dbP=null;
function db(){if(dbP)return dbP;dbP=new Promise(function(res){try{var r=indexedDB.open("apexcut-media",1);
 r.onupgradeneeded=function(){var d=r.result;d.createObjectStore("blob",{keyPath:"id"});d.createObjectStore("meta",{keyPath:"id"})};
 r.onsuccess=function(){res(r.result)};r.onerror=function(){res(null)};r.onblocked=function(){res(null)}}catch(x){res(null)}});return dbP}
function idbGet(st,id){return db().then(function(d){if(!d)return null;return new Promise(function(res){try{var q=d.transaction(st).objectStore(st).get(id);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}}catch(x){res(null)}})})}
function idbPut(st,o){return db().then(function(d){if(!d)return false;return new Promise(function(res){try{var tx=d.transaction(st,"readwrite");tx.objectStore(st).put(o);tx.oncomplete=function(){res(true)};tx.onerror=tx.onabort=function(){res(false)}}catch(x){res(false)}})})}

/* ---------- audio graph: every media element -> its own gain (level / fades / mute) -> speakers (+ export stream) ---------- */
var ac=null,spk=null,exd=null;
function AC(){
 if(!ac){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{ac=new C()}catch(x){return null}
  spk=ac.createGain();spk.connect(ac.destination);try{exd=ac.createMediaStreamDestination()}catch(x){exd=null}}
 if(ac.state==="suspended"&&ac.resume)ac.resume().catch(function(){});return ac}
MD.ac=AC;

/* ---------- import ---------- */
function kindOf(f){var t=f.type||"",n=f.name||"";
 if(/^video\//.test(t)||/\.(mp4|m4v|mov|webm|mkv|3gp|avi)$/i.test(n))return "vid";
 if(/^image\//.test(t)||/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(n))return "img";
 if(/^audio\//.test(t)||/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|amr)$/i.test(n))return "aud";return null}
function wait(el,evs,ms){return new Promise(function(res){var d=false,t;
 function f(v){if(d)return;d=true;clearTimeout(t);evs.forEach(function(n){el.removeEventListener(n,h)});res(v)}
 function h(e){f(e.type!=="error")}
 evs.forEach(function(n){el.addEventListener(n,h)});t=setTimeout(function(){f(false)},ms||12000)})}
function snap(src,w,h){var th=120,cw=Math.max(2,Math.round(w*th/h)),c=document.createElement("canvas");c.width=cw;c.height=th;
 try{c.getContext("2d").drawImage(src,0,0,cw,th);return c.toDataURL("image/jpeg",.62)}catch(x){return null}}
async function probeVideo(url){
 var v=document.createElement("video");v.muted=true;v.playsInline=true;v.preload="auto";v.src=url;
 var ok=await wait(v,["loadedmetadata","error"],20000);if(!ok||!v.videoWidth)return null;
 var dur=v.duration;
 if(!isFinite(dur)){try{v.currentTime=1e7;await wait(v,["durationchange","seeked","timeupdate"],4000);dur=v.duration}catch(x){}if(!isFinite(dur))dur=v.currentTime||10;v.currentTime=0}
 var r={dur:dur,w:v.videoWidth,h:v.videoHeight,thumb:null};
 try{v.currentTime=Math.min(.4,dur/3);await wait(v,["seeked","error"],6000);r.thumb=snap(v,v.videoWidth,v.videoHeight)}catch(x){}
 v.removeAttribute("src");v.load();return r}
async function probeImage(url){
 var im=new Image();im.src=url;try{await im.decode()}catch(x){await wait(im,["load","error"],8000)}
 if(!im.naturalWidth)return null;return {dur:0,w:im.naturalWidth,h:im.naturalHeight,thumb:snap(im,im.naturalWidth,im.naturalHeight)}}
async function probeAudio(url){
 var a=document.createElement("audio");a.preload="metadata";a.src=url;var ok=await wait(a,["loadedmetadata","error"],15000);
 if(!ok||!isFinite(a.duration))return null;var d=a.duration;a.removeAttribute("src");a.load();return {dur:d,w:0,h:0,thumb:null}}
/* waveform: 800 normalised peaks over the whole file (skipped for very big files) */
async function peaksOf(file,dur){
 if(file.size>90*1048576||dur>1500)return {p:null,na:false};
 var c=AC();if(!c)return {p:null,na:false};
 try{var buf=await c.decodeAudioData(await file.arrayBuffer()),N=800,ch=buf.numberOfChannels,len=buf.length,step=len/N,tmp=new Float32Array(N),mx=1e-4,d=[],k,i,j;
  for(k=0;k<ch;k++)d.push(buf.getChannelData(k));
  for(i=0;i<N;i++){var a=Math.floor(i*step),b=Math.min(len,Math.floor((i+1)*step)),m=0,inc=Math.max(1,((b-a)/300)|0);
   for(k=0;k<ch;k++){var arr=d[k];for(j=a;j<b;j+=inc){var v=arr[j]<0?-arr[j]:arr[j];if(v>m)m=v}}
   tmp[i]=m;if(m>mx)mx=m}
  var p=new Uint8Array(N);for(i=0;i<N;i++)p[i]=Math.round(Math.min(1,tmp[i]/mx)*100);
  return {p:p,silent:mx<5e-4}}
 catch(e){return {p:null,na:true}}}
MD.import=async function(files){
 var out=[],n=files.length;
 for(var i=0;i<n;i++){var f=files[i],k=kindOf(f);
  if(!k){A.toast("Unsupported file: "+f.name);continue}
  A.toast("Importing "+(i+1)+" / "+n+" ...");
  var id="m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),url=URL.createObjectURL(f),meta={id:id,k:k,name:f.name,size:f.size},
   pr=k==="vid"?await probeVideo(url):k==="img"?await probeImage(url):await probeAudio(url);
  if(!pr){URL.revokeObjectURL(url);A.toast("Can't read "+f.name);continue}
  Object.assign(meta,pr);
  if(k!=="img"){var pk=await peaksOf(f,meta.dur);if(pk.p)meta.peaks=pk.p;if(pk.na&&k==="vid")meta.na=true;if(pk.silent&&k==="vid")meta.na=true}
  URLS[id]=url;MM[id]=meta;MEM[id]=f;
  var ok1=await idbPut("blob",{id:id,blob:f}),ok2=await idbPut("meta",meta);
  if(!ok1||!ok2)A.toast("Could not store "+f.name+" - it will be lost after restart");
  out.push(meta)}
 return out};
var fi=document.createElement("input");fi.type="file";fi.multiple=true;fi.hidden=true;$("#app").appendChild(fi);
MD.pick=function(kind,cb){
 fi.accept=kind==="vid"?"video/*":kind==="img"?"image/*":"audio/*";
 fi.onchange=async function(){var fs=[].slice.call(fi.files||[]);fi.value="";if(!fs.length)return;AC();
  try{var ms=await MD.import(fs);if(ms.length)cb(ms)}catch(e){A.toast("Import failed")}};
 fi.click()};
MD.meta=function(id){return id?MM[id]||null:null};
MD.missing=function(id){return !!MISS[id]};

/* load meta of every media a project uses (blobs load lazily when a layer first needs them) */
MD.prepare=function(M){
 var ids={};(function w(l){l.forEach(function(x){if(x.mid)ids[x.mid]=1;if(x.ch)w(x.ch)})})(M.L);
 var list=Object.keys(ids);
 return Promise.all(list.map(function(id){if(MM[id])return 1;return idbGet("meta",id).then(function(m){if(m)MM[id]=m;else MISS[id]=true})})).then(function(){
  var miss=list.filter(function(m){return MISS[m]}).length;if(miss&&!missToast){missToast=true;A.toast(miss+" media file"+(miss>1?"s":"")+" missing - re-import")}return list})};
function ensureBlob(id){
 if(URLS[id])return Promise.resolve(URLS[id]);if(PEND[id])return PEND[id];
 PEND[id]=(MEM[id]?Promise.resolve({blob:MEM[id]}):idbGet("blob",id)).then(function(r){delete PEND[id];
  if(!r||!r.blob){MISS[id]=true;return null}URLS[id]=URL.createObjectURL(r.blob);return URLS[id]});return PEND[id]}

/* ---------- element pool (one element per layer; old ones are released) ---------- */
function drop(id){var p=POOL[id];if(!p)return;try{p.el.pause&&p.el.pause();if(p.sn)p.sn.disconnect();if(p.g)p.g.disconnect();p.el.removeAttribute("src");p.el.load&&p.el.load()}catch(x){}delete POOL[id]}
function trimPool(){var ks=Object.keys(POOL).filter(function(k){return POOL[k].k!=="img"});if(ks.length<=7)return;
 var now=performance.now();ks.sort(function(a,b){return POOL[a].use-POOL[b].use});
 for(var i=0;i<ks.length-7;i++){if(now-POOL[ks[i]].use>1500)drop(ks[i])}}
function getEl(l){
 var p=POOL[l.i];if(p&&p.mid===l.mid){p.use=performance.now();return p}
 if(p)drop(l.i);
 if(!l.mid||!MM[l.mid])return null;
 var url=URLS[l.mid];if(!url){ensureBlob(l.mid).then(function(){A.redraw();ENG.tick(S.t)});return null}
 var el;
 if(l.k==="img"){el=new Image();el.decoding="async";el.onload=A.redraw;el.src=url}
 else{el=document.createElement(l.k==="aud"?"audio":"video");el.preload="auto";el.playsInline=true;el.setAttribute("playsinline","");
  el.onseeked=A.redraw;el.onloadeddata=A.redraw;el.src=url}
 p=POOL[l.i]={el:el,mid:l.mid,k:l.k,use:performance.now(),g:null,sn:null,had:false};
 trimPool();return p}
function ensureAud(p){
 if(p.g||p.k==="img"||p.noWA)return;var c=AC();if(!c){p.noWA=true;return}
 try{p.sn=c.createMediaElementSource(p.el);p.g=c.createGain();p.sn.connect(p.g);p.g.connect(spk);if(exd)p.g.connect(exd)}catch(x){p.noWA=true}}
MD.reset=function(){Object.keys(POOL).forEach(drop);missToast=false};

/* ---------- playback engine ---------- */
var ENG={playing:false,exporting:false};
function gainOf(l,tl){
 var g=Math.pow(10,E.valueAt(l,"lvl",tl)[0]/20),fi=E.valueAt(l,"fin",tl)[0],fo=E.valueAt(l,"fout",tl)[0],a=tl-l.s,b=l.s+l.d-tl;
 if(fi>0)g*=Math.max(0,Math.min(1,a/fi));if(fo>0)g*=Math.max(0,Math.min(1,b/fo));return g}
ENG.tick=function(t){
 var M=E.M();if(!M)return;
 (function w(list,tl,on,hid){list.forEach(function(l){
  var inR=on&&tl>=l.s-1e-6&&tl<=l.s+l.d+1e-6;
  if(l.k==="grp"){w(l.ch||[],tl-l.s,inR,hid||!!l.h);return}
  if(l.k!=="vid"&&l.k!=="aud")return;
  var p=inR?getEl(l):POOL[l.i];if(!p)return;var el=p.el;
  if(!inR){if(!el.paused)el.pause();return}
  var aud=l.k==="aud"||l.ha!==false;
  if(aud)ensureAud(p);
  var mt=(tl-l.s)+(l.o||0);if(l.md)mt=Math.min(mt,l.md-.04);
  if(ENG.playing){
   if(el.paused){if(Math.abs(el.currentTime-mt)>.05)el.currentTime=mt;var pr=el.play();if(pr&&pr.catch)pr.catch(function(){})}
   else if(Math.abs(el.currentTime-mt)>.3)el.currentTime=mt}
  else{if(!el.paused)el.pause();if(Math.abs(el.currentTime-mt)>.03)el.currentTime=mt}
  var g=aud&&!l.m?gainOf(l,tl):0;
  if(p.g)p.g.gain.value=g;else{try{el.volume=Math.max(0,Math.min(1,g))}catch(x){}}
 })})(M.L,t,true,false)};
function pauseAll(){Object.keys(POOL).forEach(function(k){var p=POOL[k];if(p.k!=="img"&&!p.el.paused)p.el.pause()})}
A.onPlay=function(){AC();ENG.playing=true;ENG.tick(S.t)};
A.onStop=function(){ENG.playing=false;pauseAll()};
var prevOnT=A.onT;A.onT=function(){if(prevOnT)prevOnT();ENG.tick(S.t)};
MD.sync=function(){ENG.tick(S.t)};
MD.el=function(l){var p=l&&POOL[l.i];return p?p.el:null};
MD.endT=function(){var M=E.M();return M?Math.max.apply(0,M.L.map(function(l){return l.s+l.d}).concat([0])):0};

/* export hooks (called by extras.js startExport) */
function hasAudio(){var M=E.M(),f=false;if(!M)return false;
 (function w(list){list.forEach(function(l){if(l.k==="grp")w(l.ch||[]);else if(l.mid&&(l.k==="aud"||(l.k==="vid"&&l.ha!==false&&!(MM[l.mid]&&MM[l.mid].na))))f=true})})(M.L);return f}
MD.hasAudio=hasAudio;
MD.audioTrack=function(){if(!hasAudio())return null;AC();var tr=exd&&exd.stream.getAudioTracks()[0];return tr||null};
MD.exStart=function(){AC();ENG.exporting=true;ENG.playing=true;if(spk)spk.gain.value=0;ENG.tick(0)};
MD.exTick=function(t){ENG.tick(t)};
MD.exEnd=function(){ENG.exporting=false;ENG.playing=false;pauseAll();if(spk)spk.gain.value=1;ENG.tick(S.t);A.redraw()};

/* ---------- TURBO export hooks (used by turbo.js; the classic real-time export above stays as the fallback) ----------
   Video clips are played at a controlled speed (up to 4x) and the exact frame clock is kept by steering playbackRate,
   images wait until decoded, audio is NOT played at all - it is mixed offline by txAudio(). */
var DEC={};
MD.txStart=function(){AC();ENG.exporting=true;ENG.txing=true;ENG.playing=false;pauseAll();if(spk)spk.gain.value=0};
MD.txPrep=async function(){
 var M=E.M(),ids={},ks;if(!M)return;
 (function w(l){l.forEach(function(x){if(x.mid)ids[x.mid]=1;if(x.ch)w(x.ch)})})(M.L);
 ks=Object.keys(ids);for(var i=0;i<ks.length;i++){try{await ensureBlob(ks[i])}catch(x){}}};
MD.txTick=function(t,rate,fps){
 var M=E.M(),ready=true,tol=Math.max(.012,.75/fps);if(!M)return true;
 (function w(list,tl,on){list.forEach(function(l){
  var inR=on&&tl>=l.s-1e-6&&tl<=l.s+l.d+1e-6;
  if(l.k==="grp"){w(l.ch||[],tl-l.s,inR);return}
  if(l.k!=="vid"&&l.k!=="img")return;
  if(!l.mid||MISS[l.mid])return;                       /* placeholder / missing media is drawn without waiting */
  var p=inR?getEl(l):POOL[l.i];
  if(!inR){if(p&&p.k==="vid"&&!p.el.paused)p.el.pause();return}
  if(!p){ready=false;return}
  var el=p.el;
  if(l.k==="img"){if(!(el.complete&&el.naturalWidth>0))ready=false;return}
  if(!el.muted)el.muted=true;
  var mt=(tl-l.s)+(l.o||0);if(l.md)mt=Math.min(mt,l.md-.04);
  if(el.readyState<1){ready=false;return}
  var d=el.currentTime-mt;
  if(el.paused){
   if(Math.abs(d)>.03||el.ended)el.currentTime=mt;
   el.playbackRate=rate;var pr=el.play();if(pr&&pr.catch)pr.catch(function(){});ready=false}
  else{
   if(Math.abs(d)>.4){el.currentTime=mt;ready=false}
   else{var r=Math.max(.2,Math.min(4,rate*(1-.6*d*fps)));if(Math.abs(el.playbackRate-r)>.02)el.playbackRate=r;
    if(el.seeking||el.readyState<2||d<-tol)ready=false}}
 })})(M.L,t,true);
 return ready};
MD.txEnd=function(){
 ENG.txing=false;ENG.exporting=false;ENG.playing=false;
 Object.keys(POOL).forEach(function(k){var p=POOL[k];if(p.k==="vid"){try{p.el.pause();p.el.muted=false;p.el.playbackRate=1}catch(x){}}});
 if(spk)spk.gain.value=1;ENG.tick(S.t);A.redraw()};
/* offline mix of every audible layer (level / fades / animated level included) -> AudioBuffer (stereo) or null when the project has no sound */
MD.txAudio=async function(dur,sr){
 var M=E.M(),jobs=[];if(!M||!hasAudio())return null;
 (function w(list,base,ws,we){list.forEach(function(l){
  if(l.k==="grp"){var gs=base+l.s;w(l.ch||[],gs,Math.max(ws,gs),Math.min(we,gs+l.d));return}
  if(!l.mid||MISS[l.mid]||(l.k!=="vid"&&l.k!=="aud"))return;
  if(!(l.k==="aud"||l.ha!==false)||l.m)return;
  var m=MM[l.mid];if(l.k==="vid"&&m&&m.na)return;
  jobs.push({l:l,base:base,ws:ws,we:we})})})(M.L,0,0,dur);
 if(!jobs.length)return null;
 var c=AC();if(!c||!window.OfflineAudioContext)return null;
 var off=new OfflineAudioContext(2,Math.max(1,Math.ceil(dur*sr)),sr),any=false;
 for(var j=0;j<jobs.length;j++){
  var jb=jobs[j],l=jb.l,buf=DEC[l.mid];
  if(buf===undefined){
   buf=null;
   try{var url=await ensureBlob(l.mid);if(url){var ab=await (await fetch(url)).arrayBuffer();buf=await c.decodeAudioData(ab)}}catch(x){buf=null}
   DEC[l.mid]=buf}
  if(!buf)continue;
  var aS=jb.base+l.s,st=Math.max(aS,jb.ws,0),en=Math.min(aS+l.d,jb.we,dur);if(en<=st+1e-4)continue;
  var src=off.createBufferSource(),g=off.createGain();src.buffer=buf;src.connect(g);g.connect(off.destination);
  var step=.02,T0=st;g.gain.setValueAtTime(gainOf(l,st-jb.base),st);
  for(var T=st+step;T<en;T+=step)g.gain.linearRampToValueAtTime(gainOf(l,T-jb.base),T);
  g.gain.linearRampToValueAtTime(gainOf(l,en-jb.base),en);
  src.start(st,(st-aS)+(l.o||0),en-st);any=true}
 if(!any)return null;
 var out=await off.startRendering();DEC={};return out};

/* ---------- compositor: one renderer for preview AND export ---------- */
var OFF=[];
function off(i,W,H){var o=OFF[i]||(OFF[i]=document.createElement("canvas"));if(o.width!==W||o.height!==H){o.width=W;o.height=H}
 var x=o.getContext("2d");x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";x.clearRect(0,0,W,H);return o}
function Q(l,tl,k){
 var p=E.valueAt(l,"pos",tl),a=E.valueAt(l,"anc",tl),d3=E.is3d(l),rr=E.valueAt(l,"rot",tl),D=Math.PI/180;
 return {x:p[0]*k,y:p[1]*k,ax:a[0]*k,ay:a[1]*k,s:E.valueAt(l,"scl",tl)[0]/100,z:d3?p[2]*k:0,r:rr[0]*D,rx:d3?rr[1]*D:0,ry:d3?rr[2]*D:0,o:Math.max(0,Math.min(1,E.valueAt(l,"opa",tl)[0]/100)),fx:l.fh?-1:1,fy:l.fv?-1:1}}
function place(c,q,W,H){c.translate(W/2+q.x,H/2+q.y);c.translate(q.ax,q.ay);if(q.rx||q.ry){var m=E.m3(q.r,q.rx,q.ry);c.transform(m[0],m[1],m[2],m[3],0,0)}else c.rotate(q.r);c.scale(q.s*(q.fx||1),q.s*(q.fy||1));c.translate(-q.ax,-q.ay)}
/* parenting: the layer rides on its parent's transform (parent chain applied first, child position is relative to the parent's origin) */
function findL(id){var r=null;(function w(a){a.forEach(function(x){if(r)return;if(x.i===id)r=x;else if(x.ch)w(x.ch)})})((E.M()||{L:[]}).L);return r}
function placeP(c,l,tl,q,W,H,cx){
 if(cx.flat){c.translate(W/2,H/2);return}
 var ch=[],p=l,n=0;while(p&&p.pr!=null&&n++<8){p=findL(p.pr);if(p&&p!==l)ch.unshift(p);else break}
 ch.forEach(function(pp){place(c,Q(pp,tl,cx.k),W,H);c.translate(-W/2,-H/2)});
 place(c,q,W,H)}
function ordered(list,tl){
 var a=list.filter(function(l){return l.k!=="aud"}).sort(function(a,b){return b.r-a.r});
 if(tl==null)return a;
 function is3(l){return l.k!=="nul"&&l.k!=="adj"&&E.is3d(l)}
 var i=0,j;
 while(i<a.length){
  if(!is3(a[i])){i++;continue}
  j=i;while(j<a.length&&is3(a[j]))j++;
  if(j-i>1){var seg=a.slice(i,j).map(function(l,n){return {l:l,n:n,z:E.valueAt(l,"pos",tl)[2]||0}});
   seg.sort(function(p,q){return q.z-p.z||p.n-q.n});seg.forEach(function(g,n){a[i+n]=g.l})}
  i=j}
 return a}
function fitBox(l,W,H){var m=MM[l.mid];if(!m||!m.w||!m.h)return [W,H];var f=Math.min(W/m.w,H/m.h);return [m.w*f,m.h*f]}
function txtLines(l){return String(l.t||"Text").split("\n")}
/* local rectangle (centered on the layer origin, in canvas px) used for selection outlines + alignment */
function localBox(c,l,W,H){
 if(l.k==="vid"||l.k==="img"){return l.mid?fitBox(l,W,H):[W*.44,W*.44]}
 if(l.k==="shp"){var ss=X.shSize?X.shSize(l):[1,1];return [W*.34*ss[0],W*.34*ss[1]]}
 if(l.k==="sol"||l.k==="adj"||l.k==="grp")return [W,H];
 if(l.k==="nul")return [W*.2,W*.2];
 if(l.k==="txt"){var tt=X.tf(l),fs=tt.s*H/270,ls=txtLines(l),w=0;c.save();c.font=fs+'px "'+tt.f+'",Roboto,"Noto Sans Myanmar",sans-serif';ls.forEach(function(s){w=Math.max(w,c.measureText(s).width)});c.restore();return [w+fs*.4,ls.length*fs*1.2]}
 return null}
MD.box=function(l){var wh=X.canvasWH(),b=localBox(document.createElement("canvas").getContext("2d"),l,wh[0],wh[1]);return b||[wh[0],wh[1]]};

/* ---------- border helpers (border = l.bd {on,c,w,o,p:"o|c|i",r}) ---------- */
function BD(l){return !!(l.bd&&l.bd.on)}
function bordRect(c,b,w,h,k){
 var lw=(b.w||0)*k;if(lw<=.05)return;
 var r=Math.max(0,(b.r||0)*k),P=new Path2D(),x=-w/2,y=-h/2;
 r=Math.min(r,w/2,h/2);if(P.roundRect&&r>0)P.roundRect(x,y,w,h,r);else P.rect(x,y,w,h);
 c.save();c.strokeStyle=FX.hexA(b.c,b.o);c.lineJoin="round";
 if(b.p==="i"){c.clip(P);c.lineWidth=lw*2;c.stroke(P)}
 else if(b.p==="c"){c.lineWidth=lw;c.stroke(P)}
 else{var BIG=Math.max(w,h)*4,O=new Path2D();O.rect(-BIG,-BIG,BIG*2,BIG*2);O.addPath(P);c.clip(O,"evenodd");c.lineWidth=lw*2;c.stroke(P)}
 c.restore()}
function clipRR(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);c.clip()}

function drawLeaf0(c,l,tl,cx,force,sl){
 var W=cx.W,H=cx.H,k=cx.k,q=Q(l,tl,k);
 if(l.k==="nul"||l.k==="adj"){
  if(cx.mode==="preview"&&cx.top&&cx.sel[l.i]){c.save();placeP(c,l,tl,q,W,H,cx);c.globalAlpha=Math.max(.35,q.o);c.strokeStyle="rgba(255,255,255,.85)";c.lineWidth=Math.max(1.5,W*.004);c.setLineDash([W*.02,W*.015]);
   if(l.k==="nul"){var s=W*.1;c.strokeRect(-s,-s,s*2,s*2);c.setLineDash([]);c.beginPath();c.moveTo(-s*.35,0);c.lineTo(s*.35,0);c.moveTo(0,-s*.35);c.lineTo(0,s*.35);c.stroke()}
   else if(cx.sel[l.i])c.strokeRect(-W/2,-H/2,W,H);c.restore()}
  return}
 c.save();placeP(c,l,tl,q,W,H,cx);c.globalAlpha=sl?1:q.o;
 if(l.k==="sol"){var fs0=X.cfill(c,X.fl(l,"#7c6cff"),-W/2,-H/2,W,H);if(fs0){c.fillStyle=fs0;c.fillRect(-W/2,-H/2,W,H)}if(BD(l))bordRect(c,l.bd,W,H,k)}
 else if(l.k==="vid"||l.k==="img"){
  var m=MM[l.mid],sz=l.mid?fitBox(l,W,H):null,rad=(l.mid&&m&&sz&&BD(l)&&l.bd.r>0)?Math.min(l.bd.r*k,sz[0]/2,sz[1]/2):0;
  if(rad){c.save();clipRR(c,-sz[0]/2,-sz[1]/2,sz[0],sz[1],rad)}
  if(l.mid&&m){
   var p=getEl(l);
   if(p){var el=p.el,ok=l.k==="img"?(el.complete&&el.naturalWidth>0):(el.readyState>=2||(p.had&&el.readyState>=1));
    if(ok){try{if(!(l.bgr&&l.bgr.on&&A.BG&&A.BG.draw(c,el,l,sz,cx.mode)))c.drawImage(el,-sz[0]/2,-sz[1]/2,sz[0],sz[1]);p.had=true}catch(x){}}
    else if(m.thumbImg&&m.thumbImg.complete){c.drawImage(m.thumbImg,-sz[0]/2,-sz[1]/2,sz[0],sz[1])}
    else if(m.thumb&&!m.thumbImg){m.thumbImg=new Image();m.thumbImg.onload=A.redraw;m.thumbImg.src=m.thumb}}
   else if(m.thumb){if(!m.thumbImg){m.thumbImg=new Image();m.thumbImg.onload=A.redraw;m.thumbImg.src=m.thumb}if(m.thumbImg.complete)c.drawImage(m.thumbImg,-sz[0]/2,-sz[1]/2,sz[0],sz[1])}}
  else if(l.mid){ /* media missing */ var bw=W*.5,bh=bw*.6;c.fillStyle="#2a2f3d";X.rr(c,-bw/2,-bh/2,bw,bh,bw*.06);c.fill();c.fillStyle="#9aa4b8";c.font=(W*.05)+'px Roboto,sans-serif';c.textAlign="center";c.textBaseline="middle";c.fillText("Media missing",0,0)}
  else if(l.k==="vid"){ /* old placeholder clip */
   var sz2=W*.44;c.translate(0,-W*.09);var ig=c.createLinearGradient(-sz2/2,-sz2/2,sz2/2,sz2/2);ig.addColorStop(0,"#c6b7ff");ig.addColorStop(1,"#8d73f5");
   c.fillStyle=ig;X.rr(c,-sz2/2,-sz2/2,sz2,sz2,sz2*.24);c.fill();c.translate(-sz2*.35,-sz2*.35);c.scale(sz2*.7/24,sz2*.7/24);c.fillStyle="#fff";c.strokeStyle="#fff";c.lineWidth=1.8;c.lineJoin="round";c.fill(X.STAR);c.stroke(X.STAR)}
  else{var bw2=W*.5,bh2=bw2*.6;c.fillStyle="#2a2f3d";X.rr(c,-bw2/2,-bh2/2,bw2,bh2,bw2*.06);c.fill()}
  if(rad)c.restore();
  if(l.mid&&m&&sz&&BD(l))bordRect(c,l.bd,sz[0],sz[1],k)}
 else if(l.k==="shp"){var sz3=W*.34,list=X.shList?X.shList(l):(X.SHP_P[l.sh]||X.SHP_P.circle),sbx=X.shBox?X.shBox(l):[0,0,24,24];c.scale(sz3/24,sz3/24);c.translate(-12,-12);
  var fs=X.cfill(c,X.fl(l,"#ffffff"),sbx[0],sbx[1],sbx[2],sbx[3]),sb=BD(l)&&l.bd.w>0?l.bd:null,lw2=sb?sb.w*k*24/sz3:0,bcol=sb?FX.hexA(sb.c,sb.o):null;
  if(sb&&sb.p==="o"){c.strokeStyle=bcol;c.lineJoin="round";list.forEach(function(o){c.lineWidth=(o.sw||0)+2*lw2;c.stroke(o.p)})}
  c.fillStyle=fs||"#fff";c.strokeStyle=fs||"#fff";c.lineJoin="round";
  if(fs)list.forEach(function(o){if(o.fill)c.fill(o.p);if(o.sw){c.lineWidth=o.sw;c.stroke(o.p)}});
  if(sb&&sb.p!=="o"){c.strokeStyle=bcol;c.lineJoin="round";list.forEach(function(o){var t0=o.sw||0;
   if(sb.p==="i"){c.save();c.clip(o.p);c.lineWidth=t0+2*lw2;c.stroke(o.p);c.restore()}else{c.lineWidth=t0+lw2;c.stroke(o.p)}})}}
 else if(l.k==="vec"){c.scale(k,k);c.lineCap="round";c.lineJoin="round";(l.st||[]).forEach(function(t){c.strokeStyle=t.c;c.lineWidth=t.w;c.stroke(new Path2D(X.pathD(t.p)))});if(A.PEN&&l.pn&&l.pn.length)A.PEN.draw(c,l,k)}
 else if(l.k==="txt"){var tt=X.tf(l),fs2=tt.s*H/270,lines=txtLines(l);
  c.font=fs2+'px "'+tt.f+'",Roboto,"Noto Sans Myanmar",sans-serif';c.fillStyle=tt.c;c.textBaseline="middle";c.textAlign=tt.a==="l"?"left":tt.a==="r"?"right":"center";
  var x=tt.a==="l"?-W*.44:tt.a==="r"?W*.44:0,lh=fs2*1.2,y0=-(lines.length-1)*lh/2;
  if(l.ta&&l.ta.on&&A.TA&&A.TA.draw){A.TA.draw(c,l,tl,cx,tt,fs2,lines,x,y0,lh,BD(l));c.restore();return}
  if(BD(l)&&l.bd.w>0){c.lineJoin="round";c.miterLimit=2;c.strokeStyle=FX.hexA(l.bd.c,l.bd.o);c.lineWidth=l.bd.w*k*2;lines.forEach(function(ln,i){c.strokeText(ln,x,y0+i*lh)})}
  lines.forEach(function(ln,i){c.fillText(ln,x,y0+i*lh)})}
 c.restore()}

/* ---------- real 3D (After Effects style) ----------
   The layer is drawn flat on its own surface; that surface is then a textured plane in a perspective camera (WebGL, per-pixel perspective, no affine shortcuts).
   Camera = AE's default comp camera (39.6 deg, distance = 1.389 x comp width, vanishing point = centre of the frame). +Z is AWAY from the camera, like AE.
   Rotation order = X, then Y, then Z (AE). Extrusion = the plane is stacked along its own depth axis, so walls get correct perspective at any angle.
   No WebGL on the device -> the same plane is drawn as a perspective-subdivided mesh with 2D triangles. */
var C3=[];function cv3(i,W,H){var o=C3[i]||(C3[i]=document.createElement("canvas"));if(o.width!==W||o.height!==H){o.width=W;o.height=H}var x=o.getContext("2d");x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";x.clearRect(0,0,W,H);return o}
MD.d3o=function(l){var o=l.d3o||{};function n(v,d){return v==null?d:+v}return {bs:n(o.bs,0),bd:n(o.bd,2),ext:n(o.ext,0),cs:n(o.cs,1),as:n(o.as,1),al:n(o.al,1),sc:o.sc||"#000000",si:n(o.si,50),ss:n(o.ss,5),mt:n(o.mt,100)}};
function camD(W){return 1.389*W}
MD.zs=function(z){var w=X.canvasWH()[0],D=1.389*w;return D/Math.max(1,D+z)};
/* does this layer need the 3D renderer? (a 3D layer that only has Z-rotation + scale is a plain 2D layer) */
function need3(l,q,o){if(!l||l.k==="nul"||l.k==="adj"||!E.is3d(l))return false;o=o||MD.d3o(l);return !!(q.rx||q.ry||q.z||o.ext>0)}
/* model matrix (column-major 4x4, px from the centre of the frame): T(position + anchor, z) . Rz.Ry.Rx . Scale . T(-anchor) */
function mat3(q){
 var cg=Math.cos(q.r),sg=Math.sin(q.r),ca=Math.cos(q.rx),sa=Math.sin(q.rx),cb=Math.cos(q.ry),sb=Math.sin(q.ry),
  sx=q.s*(q.fx||1),sy=q.s*(q.fy||1),sz=q.s,
  r00=cg*cb,r01=cg*sb*sa-sg*ca,r02=cg*sb*ca+sg*sa,r10=sg*cb,r11=sg*sb*sa+cg*ca,r12=sg*sb*ca-cg*sa,r20=-sb,r21=cb*sa,r22=cb*ca,
  m=new Float32Array(16);
 m[0]=r00*sx;m[1]=r10*sx;m[2]=r20*sx;m[4]=r01*sy;m[5]=r11*sy;m[6]=r21*sy;m[8]=r02*sz;m[9]=r12*sz;m[10]=r22*sz;m[15]=1;
 m[12]=q.x+q.ax-(m[0]*q.ax+m[4]*q.ay);m[13]=q.y+q.ay-(m[1]*q.ax+m[5]*q.ay);m[14]=q.z-(m[2]*q.ax+m[6]*q.ay);
 return m}
function pt3(m,x,y,z,D,W,H){
 var X0=m[0]*x+m[4]*y+m[8]*z+m[12],Y0=m[1]*x+m[5]*y+m[9]*z+m[13],Z0=m[2]*x+m[6]*y+m[10]*z+m[14],w=D+Z0;
 if(w<=D*.02)return null;var f=D/w;return [W/2+X0*f,H/2+Y0*f]}
MD._m3=mat3;MD._pt3=pt3;
/* parents of a layer are plain 2D transforms: they are applied first, the 3D plane is then drawn inside that space */
function parents3(c,l,tl,cx){var W=cx.W,H=cx.H,ch=[],p=l,n=0;while(p&&p.pr!=null&&n++<8){p=findL(p.pr);if(p&&p!==l)ch.unshift(p);else break}
 ch.forEach(function(pp){place(c,Q(pp,tl,cx.k),W,H);c.translate(-W/2,-H/2)})}
/* ---- WebGL plane renderer ---- */
var G3=null,G3F=0;
function glInit(){
 if(G3F)return G3;G3F=1;
 try{
  var cs=document.createElement("canvas"),op={alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:false},gl=cs.getContext("webgl",op)||cs.getContext("experimental-webgl",op);
  if(!gl)return null;
  var sh=function(t,src){var o=gl.createShader(t);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw 0;return o},pg=gl.createProgram();
  gl.attachShader(pg,sh(gl.VERTEX_SHADER,"attribute vec2 a;uniform mat4 M;uniform vec2 S;uniform float D,Z;varying vec2 v;void main(){vec4 p=M*vec4(a,Z,1.0);v=a/S+0.5;gl_Position=vec4(p.x/(S.x*0.5),-p.y/(S.y*0.5),0.0,(D+p.z)/D);}"));
  gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,"#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v;uniform sampler2D T;uniform vec4 C;void main(){vec4 t=texture2D(T,v);gl_FragColor=vec4(t.rgb*C.rgb,t.a)*C.a;}"));
  gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw 0;
  gl.useProgram(pg);
  var buf=gl.createBuffer(),al=gl.getAttribLocation(pg,"a"),tx=gl.createTexture();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(al);
  gl.bindTexture(gl.TEXTURE_2D,tx);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
  cs.addEventListener("webglcontextlost",function(e){e.preventDefault();G3=null;G3F=0},false);
  G3={cv:cs,gl:gl,al:al,buf:buf,w:0,h:0,u:{M:gl.getUniformLocation(pg,"M"),S:gl.getUniformLocation(pg,"S"),D:gl.getUniformLocation(pg,"D"),Z:gl.getUniformLocation(pg,"Z"),C:gl.getUniformLocation(pg,"C")}};
  return G3}catch(x){return null}}
/* draws the plane once per slice (sl = [[z, brightness], ...] in draw order) and returns the GL canvas (copy it out before anything else draws) */
function glDraw(F,mt,W,H,sl){
 var g=glInit();if(!g)return null;var gl=g.gl;
 try{
  if(gl.isContextLost())return null;
  if(g.w!==W||g.h!==H){g.cv.width=W;g.cv.height=H;g.w=W;g.h=H}
  gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER,g.buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-W/2,-H/2,W/2,-H/2,-W/2,H/2,W/2,H/2]),gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(g.al,2,gl.FLOAT,false,0,0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,F);
  gl.uniformMatrix4fv(g.u.M,false,mt);gl.uniform2f(g.u.S,W,H);gl.uniform1f(g.u.D,camD(W));
  for(var i=0;i<sl.length;i++){var t=sl[i][1];gl.uniform1f(g.u.Z,sl[i][0]);gl.uniform4f(g.u.C,t,t,t,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
  return g.cv}catch(x){return null}}
/* ---- fallback (no WebGL): perspective-subdivided mesh drawn with 2D affine triangles ---- */
function tri(c,img,p0,p1,p2,u0,v0,u1,v1,u2,v2){
 var d=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(d)<1e-9)return;
 var x0=p0[0],y0=p0[1],x1=p1[0],y1=p1[1],x2=p2[0],y2=p2[1],mx=(x0+x1+x2)/3,my=(y0+y1+y2)/3;
 function ex(x,y){var dx=x-mx,dy=y-my,l=Math.hypot(dx,dy)||1;return [x+dx/l*.7,y+dy/l*.7]}
 var e0=ex(x0,y0),e1=ex(x1,y1),e2=ex(x2,y2);
 c.save();c.beginPath();c.moveTo(e0[0],e0[1]);c.lineTo(e1[0],e1[1]);c.lineTo(e2[0],e2[1]);c.closePath();c.clip();
 c.transform((x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/d,(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/d,(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/d,(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/d,
  (x0*(u1*v2-u2*v1)+x1*(u2*v0-u0*v2)+x2*(u0*v1-u1*v0))/d,(y0*(u1*v2-u2*v1)+y1*(u2*v0-u0*v2)+y2*(u0*v1-u1*v0))/d);
 c.drawImage(img,0,0);c.restore()}
function meshDraw(c,F,mt,W,H,sl,dark){
 var D=camD(W),N=sl.length>1?6:16,s,i,j;
 for(s=0;s<sl.length;s++){
  var Z=sl[s][0],img=sl[s][1]>=.75?F:dark,g=[];
  for(j=0;j<=N;j++){g[j]=[];for(i=0;i<=N;i++)g[j][i]=pt3(mt,-W/2+W*i/N,-H/2+H*j/N,Z,D,W,H)}
  for(j=0;j<N;j++)for(i=0;i<N;i++){
   var a=g[j][i],b=g[j][i+1],e=g[j+1][i],f=g[j+1][i+1],u0=W*i/N,u1=W*(i+1)/N,v0=H*j/N,v1=H*(j+1)/N;
   if(a&&b&&e)tri(c,img,a,b,e,u0,v0,u1,v0,u0,v1);
   if(b&&f&&e)tri(c,img,b,f,e,u1,v0,u1,v1,u0,v1)}}}
/* slices of the extruded body: [z along the layer's own depth axis, brightness]. Front face = 1, side walls = dark, bevel rim fades from the face to the wall */
function slices(o,k,mt){
 var ext=o.ext>0?o.ext*k*.5:0;if(!ext)return [[0,1]];
 var n=Math.max(2,Math.min(56,Math.ceil(o.ext/4))),dk=o.al?1-.5*(1-.55*o.mt/100):1,rim=o.bs?Math.min(.5,o.bd/60):0,a=[],i,f,t,r;
 for(i=0;i<=n;i++){f=i/n;
  if(i===0||i===n)t=1;
  else if(f<rim){r=1-f/rim;r=o.bs===2?r*r*r:o.bs===3?Math.sqrt(r):r;t=dk+(1-dk)*r}
  else t=dk;
  a.push([f*ext,t])}
 if(mt[10]>=0)a.reverse();   /* +Z of the layer points away from the camera: far slices first. Seen from behind: the other way round */
 return a}
/* draws surface F (flat layer, centred) as a 3D plane / extruded slab of layer l onto c */
function proj3(c,F,l,tl,q,cx,o,al){
 var W=cx.W,H=cx.H,k=cx.k,mt=mat3(q),sl=slices(o,k,mt),res=glDraw(F,mt,W,H,sl);
 if(!res){var T=cv3(2,W,H),dk=cv3(1,W,H),dc=dk.getContext("2d");dc.drawImage(F,0,0);dc.globalCompositeOperation="source-atop";
  dc.fillStyle="rgba(0,0,0,"+(o.al?(.5*(1-.55*o.mt/100)):0).toFixed(3)+")";dc.fillRect(0,0,W,H);dc.globalCompositeOperation="source-over";
  meshDraw(T.getContext("2d"),F,mt,W,H,sl.length>14?sl.filter(function(s,i){return i%Math.ceil(sl.length/12)===0||i===sl.length-1}):sl,dk);res=T}
 c.save();parents3(c,l,tl,cx);c.globalAlpha=al;
 if(o.cs&&o.ext>0){c.shadowColor=FX.hexA(o.sc,.55);c.shadowBlur=14*k;c.shadowOffsetX=6*k;c.shadowOffsetY=8*k}
 c.drawImage(res,0,0);c.restore()}
/* specular sheen on the front face: slides across the face as the layer turns */
function sheen(fc,o,q,W,H){
 if(!(o.al&&o.si>0))return;
 var wd=W*(.12+.5*(1-o.ss/100)),gx=W/2+Math.sin(q.ry)*W*.34,gy=H/2-Math.sin(q.rx)*H*.34,g=fc.createLinearGradient(gx-wd,gy-wd,gx+wd,gy+wd);
 g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.5,"rgba(255,255,255,"+(o.si/100*.55*(.4+.6*o.mt/100)).toFixed(3)+")");g.addColorStop(1,"rgba(255,255,255,0)");
 fc.globalCompositeOperation="source-atop";fc.fillStyle=g;fc.fillRect(0,0,W,H);fc.globalCompositeOperation="source-over"}
function drawLeaf(c,l,tl,cx,force){
 if(l.k==="nul"||l.k==="adj"||!E.is3d(l)){drawLeaf0(c,l,tl,cx,force);return}
 var q=Q(l,tl,cx.k),o=MD.d3o(l);
 if(!need3(l,q,o)){drawLeaf0(c,l,tl,cx,force);return}
 var W=cx.W,H=cx.H,F=cv3(0,W,H),fc=F.getContext("2d"),of=cx.flat;
 cx.flat=1;drawLeaf0(fc,l,tl,cx,force,1);cx.flat=of;      /* the layer, flat and centred */
 sheen(fc,o,q,W,H);
 proj3(c,F,l,tl,q,cx,o,q.o)}

function drawList(c,list,tl,cx){ordered(list,tl).forEach(function(l){
 if(l.k==="adj"&&!l.h&&FX.has(l)&&tl>=l.s-1e-6&&tl<=l.s+l.d+1e-6)adjust(c,l,tl,cx);   /* adjustment layer: its effects hit everything drawn below it */
 drawLayer(c,l,tl,cx,false)})}
function drawLayer(c,l,tl,cx,force){
 if(l.h&&!force)return;
 if(!(tl>=l.s-1e-6&&tl<=l.s+l.d+1e-6))return;
 if(l.k!=="nul"&&l.k!=="adj"&&FX.iso(l)){drawIso(c,l,tl,cx,force);return}
 if(l.k==="grp")drawGroup(c,l,tl,cx);else drawLeaf(c,l,tl,cx,force)}
/* ---------- Motion Blur effect: draw the layer at several moments inside the shutter window and average the copies ---------- */
function mbOf(l){var f=l.fx;if(!f)return null;for(var i=0;i<f.length;i++){var e=f[i];if(e&&e.on!==false&&e.t==="mbl")return e}return null}
function mbFps(){var m=/(\d+)/.exec((S.cur&&S.cur.fps)||"30");return m?Math.max(1,+m[1]):30}
function mbMoves(l,t0,t1,k){var p=l,n=0;while(p&&n++<9){var a=Q(p,t0,k),b=Q(p,t1,k);
  if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.s-b.s)*100+Math.abs(a.r-b.r)*100+Math.abs(a.o-b.o)*100+Math.abs(a.rx-b.rx)*100+Math.abs(a.ry-b.ry)*100+Math.abs(a.z-b.z)>.02)return true;
  p=p.pr!=null?findL(p.pr):null;if(p===l)break}return false}
function drawMotion(c,oc,l,tl,cx,force,e,oa){
 var W=cx.W,H=cx.H,k=cx.k,ang=Math.max(0,+e.v.a||0),n=Math.round(Math.max(2,Math.min(32,+e.v.n||10))),sh=ang/360/mbFps();
 if(sh<=1e-5)return false;
 if(cx.mode==="preview")n=Math.min(n,12);
 var t0=Math.max(l.s,tl-sh/2),t1=Math.min(l.s+l.d,tl+sh/2);
 if(l.k!=="grp"&&!mbMoves(l,t0,t1,k))return false;     /* nothing moves -> plain draw (saves time) */
 var S1=off(oa+1,W,H),sc=S1.getContext("2d"),i;
 for(i=0;i<n;i++){
  var ti=n>1?t0+(t1-t0)*i/(n-1):tl;
  sc.setTransform(1,0,0,1,0,0);sc.globalAlpha=1;sc.globalCompositeOperation="source-over";sc.clearRect(0,0,W,H);
  cx.d=oa+2;
  if(l.k==="grp"){var ob0=cx.bk;cx.bk=(ob0||[]).concat([{c:c,T:c.getTransform?c.getTransform():null}]);drawGroup(sc,l,ti,cx);cx.bk=ob0}else drawLeaf(sc,l,ti,cx,force);
  oc.globalAlpha=1/(i+1);oc.drawImage(S1,0,0)}
 oc.globalAlpha=1;cx.d=oa+1;return true}
/* layer with blend mode / shadow / effects: drawn on its own surface, effects run on it, then it is composited (shadow first, then the layer with its blend mode) */
function drawIso(c,l,tl,cx,force){
 var W=cx.W,H=cx.H,k=cx.k,oa=cx.d||0,Ob=off(oa,W,H),oc=Ob.getContext("2d");cx.d=oa+1;
  var mb=mbOf(l);
 if(mb&&drawMotion(c,oc,l,tl,cx,force,mb,oa)){}
 else if(l.k==="grp"){var ob0=cx.bk;cx.bk=(ob0||[]).concat([{c:c,T:c.getTransform?c.getTransform():null}]);drawGroup(oc,l,tl,cx);cx.bk=ob0}else drawLeaf(oc,l,tl,cx,force);
 cx.d=oa;
 var res=FX.has(l)?FX.run(Ob,l.fx,W,H,k,tl-l.s,l.d):Ob,T=c.getTransform?c.getTransform():null;
 if(T&&!(T.a===1&&T.b===0&&T.c===0&&T.d===1&&T.e===0&&T.f===0)){var O2=off(oa+1,W,H),x2=O2.getContext("2d");x2.setTransform(T);x2.drawImage(res,0,0);x2.setTransform(1,0,0,1,0,0);res=O2}
 c.save();c.setTransform(1,0,0,1,0,0);
 var sd=l.sd;
 if(sd&&sd.on){var BIG=W*4;   /* draw the layer far off-canvas so only its shadow lands on the canvas */
  c.shadowColor=FX.hexA(sd.c,sd.o);c.shadowBlur=Math.max(0,sd.b||0)*k;c.shadowOffsetX=BIG+(sd.x||0)*k;c.shadowOffsetY=(sd.y||0)*k;
  c.drawImage(res,-BIG,0);c.shadowColor="rgba(0,0,0,0)";c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0}
 c.globalCompositeOperation=(l.bm&&l.bm!=="normal")?l.bm:"source-over";
 c.drawImage(res,0,0);c.restore()}
function adjust(c,l,tl,cx){
 /* an adjustment layer changes EVERYTHING below it. Inside a group (mask group, opacity group, effect group) the group is drawn on its own surface,
    so the pixels underneath the group are fetched from the surfaces stacked in cx.bk (bottom first) and put in this surface's space -
    the result is drawn here and the group's mask / opacity then limits it exactly like any other layer of the group */
 var W=cx.W,H=cx.H,q=Q(l,tl,cx.k),bk=cx.bk||[],sn=FX.snap(W,H),sx=sn.getContext("2d"),i,ms=[],M=null;
 sx.save();sx.setTransform(1,0,0,1,0,0);sx.globalAlpha=1;sx.globalCompositeOperation="source-over";sx.clearRect(0,0,W,H);
 for(i=bk.length-1;i>=0;i--){var iv=(bk[i].T&&bk[i].T.inverse)?bk[i].T.inverse():null;if(iv)M=M?M.multiply(iv):iv;ms[i]=M}
 for(i=0;i<bk.length;i++){if(ms[i])sx.setTransform(ms[i]);else sx.setTransform(1,0,0,1,0,0);sx.drawImage(bk[i].c.canvas,0,0)}
 sx.setTransform(1,0,0,1,0,0);sx.drawImage(c.canvas,0,0);sx.restore();
 var res=FX.run(sn,l.fx,W,H,cx.k,tl-l.s,l.d,true),fa=FX.fadeA(l,tl-l.s);
 c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=q.o*fa;if(!bk.length&&q.o*fa>=.999)c.globalCompositeOperation="copy";c.drawImage(res,0,0);c.restore()}
/* group = its own mini timeline (children keep times relative to the group start); mask group = top layer is the mask */
function drawGroup(c,g,tl,cx){
 var W=cx.W,H=cx.H,q=Q(g,tl,cx.k),lt=tl-g.s,kids=g.ch||[],mode=g.mg||0,mk=null,rest=kids;
 if(mode){var vis=ordered(kids),mi=vis.length-1;while(mi>0&&(vis[mi].k==="adj"||vis[mi].k==="nul"))mi--;mk=vis[mi];rest=kids.filter(function(x){return x!==mk})}   /* the mask = the top layer that is not an Adjustment / Null layer, so an Adjustment layer inside a mask group is always masked, never used as the mask */   /* lowest row index = top layer = mask */
 var top=cx.top;cx.top=false;var g3=need3(g,q);
 if(!mode&&q.o>.999&&!g3){c.save();placeP(c,g,tl,q,W,H,cx);c.translate(-W/2,-H/2);drawList(c,rest,lt,cx);c.restore();cx.top=top;return}
 var oa=cx.d||0,A1=off(oa,W,H),a=A1.getContext("2d");cx.d=oa+1;
 var Tg=null;c.save();if(!g3){placeP(c,g,tl,q,W,H,cx);c.translate(-W/2,-H/2)}if(c.getTransform)Tg=c.getTransform();c.restore();
 var ob=cx.bk;cx.bk=(ob||[]).concat([{c:c,T:Tg}]);
 drawList(a,rest,lt,cx);
 cx.bk=ob;
 if(mode&&mk){var B=off(cx.d,W,H),b=B.getContext("2d");cx.d++;
  /* a mask group that holds an Adjustment layer keeps its mask for as long as the group lasts (a mask clip that is shorter than the Adjustment layer would otherwise switch the masked effect off) */
  var mt=lt;if(rest.some(function(x){return x.k==="adj"&&!x.h&&FX.has(x)}))mt=Math.max(mk.s,Math.min(mk.s+mk.d-1e-4,lt));
  drawLayer(b,mk,mt,cx,true);
  a.globalCompositeOperation=mode===1?"destination-in":"destination-out";a.drawImage(B,0,0);a.globalCompositeOperation="source-over";cx.d--}
 else if(mode&&!mk){a.clearRect(0,0,W,H)}
 cx.d=oa;
 if(g3)proj3(c,A1,g,tl,q,cx,MD.d3o(g),q.o);
 else{c.save();placeP(c,g,tl,q,W,H,cx);c.translate(-W/2,-H/2);c.globalAlpha=q.o;c.drawImage(A1,0,0);c.restore()}
 cx.top=top}
function outline(c,l,cx){
 if(!(S.t>=l.s-1e-6&&S.t<=l.s+l.d+1e-6)||l.h||l.k==="nul"||l.k==="adj"||l.k==="vec"||l.k==="sol")return;
 var W=cx.W,H=cx.H,q=Q(l,S.t,cx.k),bx=localBox(c,l,W,H);if(!bx)return;
 var acc=(getComputedStyle(document.documentElement).getPropertyValue("--accent-c1").trim()||"#3aa4ff");
 if(need3(l,q)){var m=mat3(q),D=camD(W),cn=[[-1,-1],[1,-1],[1,1],[-1,1]].map(function(u){return pt3(m,u[0]*bx[0]/2,u[1]*bx[1]/2,0,D,W,H)});
  if(cn.every(Boolean)){c.save();parents3(c,l,S.t,cx);c.strokeStyle=acc;c.lineWidth=Math.max(2,W*.006);c.lineJoin="round";c.beginPath();c.moveTo(cn[0][0],cn[0][1]);for(var i=1;i<4;i++)c.lineTo(cn[i][0],cn[i][1]);c.closePath();c.stroke();c.restore()}return}
 c.save();placeP(c,l,S.t,q,W,H,cx);c.strokeStyle=acc;c.lineWidth=Math.max(2,W*.006)/Math.max(.05,q.s);c.strokeRect(-bx[0]/2,-bx[1]/2,bx[0],bx[1]);c.restore()}
function comp(c,W,H,t,mode){
 var M=E.M(),bg=(S.cur&&S.cur.cbg)||"#0b0d12";c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation="source-over";
 if(bg==="transparent"&&mode==="preview")c.clearRect(0,0,W,H);else{c.fillStyle=bg==="transparent"?"#000":bg;c.fillRect(0,0,W,H)}
 if(!M)return;
 var sel={};if(mode==="preview"){if(E.sel()!=null)sel[E.sel()]=1;E.msel().forEach(function(i){sel[i]=1})}
 var cx={W:W,H:H,k:H/X.canvasWH()[1],mode:mode,sel:sel,top:true,d:0};
 drawList(c,M.L,t,cx);
 if(mode==="preview")M.L.forEach(function(l){if(sel[l.i])outline(c,l,cx)})}
MD.draw=comp;

var RQ=0;
A.redraw=function(){if(RQ)return;RQ=requestAnimationFrame(function(){RQ=0;paint()})};
function paint(){
 var M=E.M();if(!M||!S.cur||ENG.txing)return;var cw=cvh.clientWidth,ch=cvh.clientHeight;if(!cw||!ch)return;
 var pqf={Full:1,Half:.5,Third:.34,Quarter:.25,Auto:1}[(S.cur&&S.cur.pq)||"Full"]||1,sc=Math.min(window.devicePixelRatio||1,720/Math.min(cw,ch))*pqf,W=Math.max(2,Math.round(cw*sc)),H=Math.max(2,Math.round(ch*sc));
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
 comp(cv.getContext("2d"),W,H,S.t,"preview")}
window.addEventListener("resize",function(){setTimeout(A.redraw,60)});
})();
