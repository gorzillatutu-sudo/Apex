/* Apex Cut mobile - TURBO EXPORT
   The classic export plays the project in real time into a MediaRecorder, so a 60 s video needs 60 s to export.
   Turbo export renders the frames itself (video clips are played at up to 4x while the frame clock stays exact), encodes them with
   WebCodecs (H.264 / AAC) and writes the MP4 itself. Audio is mixed offline, so it is not tied to real time either.
   If this browser can not do it (no WebCodecs, no AAC encoder ...) ok()/run() say so and extras.js falls back to the classic export. */
(function(){
"use strict";
var A=window.AX=window.AX||{},T=A.TURBO={};

/* ====================================================================== MP4 muxer ====================================================================== */
function cat(list){var n=0,i;for(i=0;i<list.length;i++)n+=list[i].length;var o=new Uint8Array(n),p=0;for(i=0;i<list.length;i++){o.set(list[i],p);p+=list[i].length}return o}
function b32(n){return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255])}
function b16(n){return new Uint8Array([(n>>>8)&255,n&255])}
function str(s){var o=new Uint8Array(s.length);for(var i=0;i<s.length;i++)o[i]=s.charCodeAt(i)&255;return o}
function zeros(n){return new Uint8Array(n)}
function box(type){var a=[].slice.call(arguments,1),body=cat(a);return cat([b32(body.length+8),str(type),body])}
function full(type,ver,flags){var a=[].slice.call(arguments,3);return box.apply(null,[type,cat([new Uint8Array([ver,(flags>>>16)&255,(flags>>>8)&255,flags&255])].concat(a))])}
function tbl(entries){return cat([b32(entries.length)].concat(entries))}
var MATRIX=cat([b32(0x10000),b32(0),b32(0),b32(0),b32(0x10000),b32(0),b32(0),b32(0),b32(0x40000000)]);

/* opts: {w,h,avcC:Uint8Array, audio:{sr,ch,asc:Uint8Array}|null}  -  addVideo(data,ptsUs,key) / addAudio(data,ptsUs) / finish(endUs) -> Blob */
T.MP4=function(opts){
 var V=[],Au=[],VTS=90000,au=opts.audio||null,self=this;
 self.addVideo=function(data,pts,key){V.push({d:data,t:pts,k:!!key})};
 self.addAudio=function(data,pts){Au.push({d:data,t:pts})};
 function tk(us,ts){return Math.round(us*ts/1e6)}
 self.finish=function(endUs){
  var i,vn=V.length;if(!vn)throw new Error("no video");
  /* sample durations from presentation times (frames come out in decode order = display order: no B-frames) */
  for(i=0;i<vn;i++){var a=tk(V[i].t,VTS),b=i+1<vn?tk(V[i+1].t,VTS):Math.max(a+1,tk(endUs,VTS));V[i].dur=Math.max(1,b-a)}
  var vdur=0;for(i=0;i<vn;i++)vdur+=V[i].dur;
  var an=Au.length,adur=an*1024;
  /* interleave: one chunk of video samples + one chunk of audio samples per second */
  var chunks=[],vi=0,ai=0,sec=0,vTime=0;
  while(vi<vn||ai<an){
   var vs=[],as=[],lim=(sec+1)*1e6;
   while(vi<vn&&V[vi].t<lim)vs.push(V[vi++]);
   while(ai<an&&Au[ai].t<lim)as.push(Au[ai++]);
   if(vs.length)chunks.push({tr:0,s:vs});if(as.length)chunks.push({tr:1,s:as});sec++}
  var movieDur=Math.round(Math.max(vdur/VTS,au?adur/au.sr:0)*1000);
  function trak(id,vid){
   var T0=vid?V:Au,ts=vid?VTS:au.sr,dur=vid?vdur:adur,smp=T0,stts=[],j,run=0,last=-1;
   /* stts */
   if(vid){for(j=0;j<smp.length;j++){var d=smp[j].dur;if(d===last)run++;else{if(run)stts.push(cat([b32(run),b32(last)]));last=d;run=1}}if(run)stts.push(cat([b32(run),b32(last)]))}
   else stts.push(cat([b32(smp.length),b32(1024)]));
   /* stsz */
   var sz=[];for(j=0;j<smp.length;j++)sz.push(b32(smp[j].d.length));
   /* chunk tables for this track */
   var own=chunks.filter(function(c){return c.tr===(vid?0:1)}),stsc=[],prev=-1;
   own.forEach(function(c,ix){if(c.s.length!==prev){stsc.push(cat([b32(ix+1),b32(c.s.length),b32(1)]));prev=c.s.length}});
   var stco=own.map(function(c){return b32(c.off||0)});
   var stbl=[];
   if(vid){
    var avc1=box("avc1",zeros(6),b16(1),zeros(16),b16(opts.w),b16(opts.h),b32(0x480000),b32(0x480000),b32(0),b16(1),zeros(32),b16(0x18),b16(0xFFFF),box("avcC",opts.avcC));
    stbl.push(full("stsd",0,0,tbl([avc1])));
   }else{
    var asc=au.asc,esd=cat([new Uint8Array([3,23+asc.length,0,1,0, 4,15+asc.length,0x40,0x15,0,0,0, 0,0,0,0, 0,0,0,0, 5,asc.length]),asc,new Uint8Array([6,1,2])]);
    var mp4a=box("mp4a",zeros(6),b16(1),zeros(8),b16(au.ch),b16(16),b16(0),b16(0),b32(au.sr*65536),full("esds",0,0,esd));
    stbl.push(full("stsd",0,0,tbl([mp4a])));
   }
   stbl.push(full("stts",0,0,tbl(stts)));
   if(vid){var ks=[];for(j=0;j<smp.length;j++)if(smp[j].k)ks.push(b32(j+1));stbl.push(full("stss",0,0,tbl(ks)))}
   stbl.push(full("stsc",0,0,tbl(stsc)));
   stbl.push(full("stsz",0,0,b32(0),tbl(sz)));
   stbl.push(full("stco",0,0,tbl(stco)));
   var mdhd=full("mdhd",0,0,b32(0),b32(0),b32(ts),b32(dur),b16(0x55C4),b16(0)),
    hdlr=full("hdlr",0,0,b32(0),str(vid?"vide":"soun"),zeros(12),str(vid?"VideoHandler":"SoundHandler"),zeros(1)),
    dinf=box("dinf",full("dref",0,0,tbl([full("url ",0,1)]))),
    mhd=vid?full("vmhd",0,1,zeros(8)):full("smhd",0,0,zeros(4)),
    minf=box("minf",mhd,dinf,box.apply(null,["stbl"].concat(stbl))),
    mdia=box("mdia",mdhd,hdlr,minf),
    mdur=Math.round(dur/ts*1000),
    tkhd=full("tkhd",0,7,b32(0),b32(0),b32(id),b32(0),b32(mdur),zeros(8),b16(0),b16(0),b16(vid?0:0x100),b16(0),MATRIX,b32(vid?opts.w*65536:0),b32(vid?opts.h*65536:0));
   return box("trak",tkhd,mdia)}
  function moov(){
   var mvhd=full("mvhd",0,0,b32(0),b32(0),b32(1000),b32(movieDur),b32(0x10000),b16(0x100),zeros(10),MATRIX,zeros(24),b32(au?3:2)),
    parts=["moov",mvhd,trak(1,true)];if(au&&an)parts.push(trak(2,false));
   return box.apply(null,parts)}
  var ftyp=box("ftyp",str("isom"),b32(512),str("isom"),str("iso2"),str("avc1"),str("mp41"));
  var total=0;chunks.forEach(function(c){c.s.forEach(function(s){total+=s.d.length})});
  if(total>3.9e9)throw new Error("too big");
  if(!an)au=null;
  moov();                                   /* first pass (sizes only) */
  var msz=moov().length,pos=ftyp.length+msz+8;
  chunks.forEach(function(c){c.off=pos;c.s.forEach(function(s){pos+=s.d.length})});
  var mv=moov(),parts=[ftyp,mv,cat([b32(total+8),str("mdat")])];
  chunks.forEach(function(c){c.s.forEach(function(s){parts.push(s.d)})});
  return new Blob(parts,{type:"video/mp4"})};
};

/* ====================================================================== exporter ====================================================================== */
function yieldNow(){return new Promise(function(r){var c=new MessageChannel();c.port1.onmessage=function(){c.port1.close();r()};c.port2.postMessage(0)})}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

T.ok=function(){return !!(window.VideoEncoder&&window.VideoFrame&&window.EncodedVideoChunk&&window.MessageChannel&&A.MD&&A.MD.txStart)};

function vCandidates(W,H,fps){
 var px=W*H,lv=px<=921600?"1f":px<=2088960?(fps>30?"2a":"28"):px<=8912896?(fps>30?"34":"33"):"34";
 return ["avc1.6400"+lv,"avc1.4d00"+lv,"avc1.4200"+lv]}
async function pickVideo(W,H,fps,bps){
 var c=vCandidates(W,H,fps),i;
 for(i=0;i<c.length;i++){
  var cfg={codec:c[i],width:W,height:H,bitrate:bps,framerate:fps,avc:{format:"avc"}};
  try{var r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return r.config||cfg}catch(x){}}
 return null}
async function pickAudio(sr,ch){
 if(!window.AudioEncoder||!window.AudioData)return null;
 var cfg={codec:"mp4a.40.2",sampleRate:sr,numberOfChannels:ch,bitrate:192000};
 try{var r=await AudioEncoder.isConfigSupported(cfg);if(r&&r.supported)return cfg}catch(x){}return null}
function bytes(chunk){var u=new Uint8Array(chunk.byteLength);chunk.copyTo(u);return u}

/* o: {W,H,fps,dur,cv,c,draw(c,W,H,t),hasAudio,cancelled(),ui(fraction,text)}  ->  Promise<Blob | null (not possible here -> use classic export)> */
T.run=async function(o){
 var W=o.W,H=o.H,fps=o.fps,dur=o.dur,MD=A.MD,SR=48000,bps=Math.round(Math.max(2e6,Math.min(24e6,W*H*fps*.1)));
 var vcfg=await pickVideo(W,H,fps,bps);if(!vcfg)return null;
 var acfg=null;if(o.hasAudio){acfg=await pickAudio(SR,2);if(!acfg)return null}
 var ST=T.stats={wait:0,draw:0,enc:0,rate:0},started=false,venc=null,aenc=null,err=null,mux=null,avcC=null,asc=null,vq=[],aq=[],txOn=false;
 try{
  /* ---- audio: mixed offline (faster than real time), then AAC ---- */
  if(acfg){
   o.ui(0,"Preparing audio\u2026");
   var mix=await MD.txAudio(dur,SR);
   if(o.cancelled())return undefined;
   if(mix){
    aenc=new AudioEncoder({output:function(ch,meta){aq.push({d:bytes(ch),t:ch.timestamp});if(meta&&meta.decoderConfig&&meta.decoderConfig.description&&!asc){var d=meta.decoderConfig.description;asc=new Uint8Array(d.buffer?d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength):d)}},error:function(e){err=e}});
    aenc.configure(acfg);
    var L=mix.length,STEP=8192,l0=mix.getChannelData(0),l1=mix.numberOfChannels>1?mix.getChannelData(1):l0;
    for(var p=0;p<L;p+=STEP){
     var n=Math.min(STEP,L-p),buf=new Float32Array(n*2);buf.set(l0.subarray(p,p+n),0);buf.set(l1.subarray(p,p+n),n);
     var ad=new AudioData({format:"f32-planar",sampleRate:SR,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(p/SR*1e6),data:buf});
     aenc.encode(ad);ad.close();
     if(aenc.encodeQueueSize>16)await yieldNow();
     if(err)throw err}
    await aenc.flush();aenc.close();aenc=null;
    if(err)throw err;if(!asc||!aq.length){asc=null;aq=[]}}}
  if(o.cancelled())return undefined;

  /* ---- video ---- */
  venc=new VideoEncoder({output:function(ch,meta){
   if(meta&&meta.decoderConfig&&meta.decoderConfig.description&&!avcC){var d=meta.decoderConfig.description;avcC=new Uint8Array(d.buffer?d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength):d)}
   vq.push({d:bytes(ch),t:ch.timestamp,k:ch.type==="key"})},error:function(e){err=e}});
  venc.configure(vcfg);
  MD.txStart();txOn=true;await MD.txPrep();
  var n=Math.max(1,Math.round(dur*fps)),i,fd=Math.round(1e6/fps),ema=1/fps/3,rate=2,tStart=performance.now(),lastUi=0;
  for(i=0;i<n;i++){
   if(o.cancelled())return undefined;
   if(err)throw err;
   var t=Math.min(dur,i/fps),w0=performance.now(),ready=MD.txTick(t,rate,fps),waited=0;
   while(!ready&&waited<1800){await sleep(2);waited=performance.now()-w0;ready=MD.txTick(t,rate,fps)}
   var w1=performance.now();
   o.draw(o.c,W,H,t);
   var w1b=performance.now();
   var fr=new VideoFrame(o.cv,{timestamp:Math.round(i*1e6/fps),duration:fd});
   venc.encode(fr,{keyFrame:i%(fps*2)===0});fr.close();started=true;
   while(venc.encodeQueueSize>5){await yieldNow();if(err)throw err}
   var w2=performance.now();
   ST.wait+=w1-w0;ST.draw+=w1b-w1;ST.enc+=w2-w1b;ST.rate=rate;
   /* playback speed for the video clips = how many media seconds one frame of wall time can cover (render cost only, waiting not counted) */
   ema=ema*.8+Math.max(.0005,(w2-w1)/1000)*.2;rate=Math.max(.5,Math.min(4,(1/fps)/ema*.9));
   if(w2-lastUi>120||i===n-1){lastUi=w2;o.ui((i+1)/n,Math.round((i+1)/n*100)+"%  \u00B7  "+W+"\u00D7"+H+" \u00B7 "+fps+"fps \u00B7 Turbo");await yieldNow()}
   else if((i&7)===7)await yieldNow()}
  await venc.flush();venc.close();venc=null;
  if(err)throw err;
  if(!avcC||!vq.length)throw new Error("empty");
  o.ui(1,"Packing\u2026");await yieldNow();
  mux=new T.MP4({w:W,h:H,avcC:avcC,audio:asc&&aq.length?{sr:SR,ch:2,asc:asc}:null});
  vq.forEach(function(s){mux.addVideo(s.d,s.t,s.k)});aq.forEach(function(s){mux.addAudio(s.d,s.t)});
  vq=null;
  var blob=mux.finish(Math.round(n*1e6/fps));aq=null;
  return blob
 }catch(e){
  try{if(venc&&venc.state!=="closed")venc.close()}catch(x){}try{if(aenc&&aenc.state!=="closed")aenc.close()}catch(x){}
  if(!started&&!o.cancelled()){if(txOn){MD.txEnd();txOn=false}return null}   /* nothing was rendered yet: let the classic export try */
  throw e
 }finally{if(txOn)MD.txEnd()}
};
})();
