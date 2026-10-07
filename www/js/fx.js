/* Apex Cut mobile - layer effects library: Blend modes, Border / Shadow helpers, Effects (blur, colour, glow, pixelate, RGB split, vignette).
   Used by the ONE canvas renderer in media.js, so preview and export always look the same. */
(function(){
"use strict";
var A=window.AX,FX=A.FX={};

/* ctx.filter exists on Chrome / Android WebView; where it is missing (old Safari) every effect has a pixel fallback */
var HASF=(function(){try{var c=document.createElement("canvas").getContext("2d");if(!("filter" in c))return false;c.filter="blur(1px)";return c.filter==="blur(1px)"}catch(x){return false}})();
FX.hasFilter=HASF;

FX.hexA=function(h,o){var n=parseInt(String(h||"#000000").replace("#",""),16)||0;return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+(Math.max(0,Math.min(100,o==null?100:o))/100)+")"};

/* ---------- catalogue ---------- */
FX.BLEND=[["normal","Normal"],["darken","Darken"],["multiply","Multiply"],["color-burn","Color Burn"],["lighten","Lighten"],["screen","Screen"],["color-dodge","Color Dodge"],["lighter","Add"],
 ["overlay","Overlay"],["soft-light","Soft Light"],["hard-light","Hard Light"],["difference","Difference"],["exclusion","Exclusion"],["hue","Hue"],["saturation","Saturation"],["color","Color"],["luminosity","Luminosity"]];
FX.DEF=[
 {id:"blur",name:"Blur",f:1,p:[{k:"a",t:"Amount",min:0,max:100,v:12,u:""}]},
 /* Directional Blur: motion-style blur along an angle. Inner Blur: blurs the inside of the layer but keeps its outer edge sharp */
 {id:"dbl",name:"Directional Blur",p:[{k:"a",t:"Length",min:0,max:200,v:40,u:""},{k:"g",t:"Angle",min:-180,max:180,v:0,u:"\u00B0",mid:0}]},
 /* Motion Blur (After Effects style): the layer is drawn several times inside the shutter window around the current frame and the copies are averaged,
    so only layers that MOVE (position / scale / rotation keyframes, parenting) get streaks; media.js does the sampling (drawMotion) */
 {id:"mbl",name:"Motion Blur",p:[{k:"a",t:"Shutter Angle",min:0,max:720,v:180,u:"\u00B0"},{k:"n",t:"Samples",min:2,max:32,v:16,u:""}]},
 {id:"ibl",name:"Inner Blur",p:[{k:"a",t:"Amount",min:0,max:100,v:20,u:""}]},
 {id:"bri",name:"Brightness",f:1,p:[{k:"a",t:"Amount",min:-100,max:100,v:25,u:"%",mid:0}]},
 {id:"con",name:"Contrast",f:1,p:[{k:"a",t:"Amount",min:-100,max:100,v:30,u:"%",mid:0}]},
 {id:"sat",name:"Saturation",f:1,p:[{k:"a",t:"Amount",min:-100,max:200,v:60,u:"%",mid:0}]},
 {id:"hue",name:"Hue Shift",f:1,p:[{k:"a",t:"Angle",min:-180,max:180,v:90,u:"\u00B0",mid:0}]},
 {id:"bw",name:"Black & White",f:1,p:[{k:"a",t:"Amount",min:0,max:100,v:100,u:"%"}]},
 {id:"sep",name:"Sepia",f:1,p:[{k:"a",t:"Amount",min:0,max:100,v:100,u:"%"}]},
 {id:"inv",name:"Invert",f:1,p:[{k:"a",t:"Amount",min:0,max:100,v:100,u:"%"}]},
 {id:"glow",name:"Glow",p:[{k:"r",t:"Radius",min:1,max:100,v:24,u:""},{k:"a",t:"Intensity",min:0,max:300,v:100,u:"%"}]},
 {id:"pix",name:"Pixelate",p:[{k:"a",t:"Size",min:2,max:120,v:24,u:""}]},
 {id:"rgb",name:"RGB Split",p:[{k:"a",t:"Distance",min:0,max:80,v:14,u:""},{k:"g",t:"Angle",min:0,max:360,v:0,u:"\u00B0"}]},
 {id:"vig",name:"Vignette",p:[{k:"a",t:"Amount",min:0,max:100,v:60,u:"%"},{k:"s",t:"Size",min:10,max:100,v:45,u:"%"}]},
 /* Fade In / Fade Out: the layer fades from / to transparent over Duration seconds at the start / end of the layer */
 {id:"fin",hide:1,name:"Fade In",p:[{k:"d",t:"Duration",min:.1,max:10,step:.1,v:1,u:" s"}]},
 {id:"fout",hide:1,name:"Fade Out",p:[{k:"d",t:"Duration",min:.1,max:10,step:.1,v:1,u:" s"}]},
 /* Fade In & Out: one effect, two durations (0 = no fade at that end). The old separate Fade In / Fade Out stay hidden so existing projects keep working */
 {id:"fio",name:"Fade In & Out",p:[{k:"i",t:"Fade In",min:0,max:10,step:.1,v:1,u:" s"},{k:"o",t:"Fade Out",min:0,max:10,step:.1,v:1,u:" s"}]},
 /* Light Leaks: soft rainbow / warm light beams that drift across the layer (screen-blended on top of it). Style = colour palette, Seed = different beam layout */
 {id:"leak",name:"Light Leaks",p:[
  {k:"a",t:"Intensity",min:0,max:300,v:100,u:"%"},{k:"sp",t:"Speed",min:0,max:100,v:30,u:""},{k:"g",t:"Angle",min:-180,max:180,v:20,u:"\u00B0",mid:0},
  {k:"w",t:"Width",min:10,max:100,v:45,u:"%"},{k:"s",t:"Style",min:0,max:3,v:0,u:"",names:["Rainbow","Warm","Cool","Sunset"]},
  {k:"h",t:"Hue",min:-180,max:180,v:0,u:"\u00B0",mid:0},{k:"d",t:"Seed",min:1,max:30,v:7,u:""}]},
 /* CC Light Sweep (After Effects): same controls as AE - Center, Direction, Shape, Width, Sweep Intensity, Edge Intensity, Edge Thickness, Light Color, Light Reception.
    Center X / Y = where the band sits (% of the layer box). The band is perpendicular to Direction. Auto Sweep Speed (not in AE) moves the band across the layer on its own, Delay = rest between sweeps (Speed 0 = band stays at Center) */
 {id:"lsw",name:"CC Light Sweep",p:[
  {k:"cx",t:"Center X",min:-100,max:200,v:50,u:"%",mid:50},{k:"cy",t:"Center Y",min:-100,max:200,v:50,u:"%",mid:50},
  {k:"g",t:"Direction",min:-180,max:180,v:20,u:"\u00B0",mid:0},
  {k:"s",t:"Shape",min:0,max:2,v:0,u:"",names:["Smooth","Linear","Sharp"]},
  {k:"w",t:"Width",min:1,max:100,v:30,u:"%"},
  {k:"a",t:"Sweep Intensity",min:0,max:300,v:100,u:"%"},{k:"e",t:"Edge Intensity",min:0,max:300,v:0,u:"%"},{k:"th",t:"Edge Thickness",min:1,max:100,v:70,u:"%"},
  {k:"lc",t:"Light Color",col:1,v:"#ffffff"},
  {k:"r",t:"Light Reception",min:0,max:2,v:0,u:"",names:["Add","Composite","Cut Out"]},
  {k:"sp",t:"Auto Sweep Speed",min:0,max:300,v:60,u:""},{k:"dl",t:"Auto Sweep Delay",min:0,max:300,v:40,u:""}]},
 /* Smooth Bevel: the layer's own shape (alpha) is rounded into a soft pillow and lit from Light Angle - highlight on the lit side, shadow on the far side.
    Size = how far the bevel reaches into the layer, Depth = how strong, Softness = extra smoothing, Style = profile of the slope */
 {id:"bev",name:"Smooth Bevel",p:[
  {k:"z",t:"Size",min:1,max:80,v:14,u:""},{k:"d",t:"Depth",min:0,max:200,v:100,u:"%"},{k:"f",t:"Softness",min:0,max:100,v:50,u:"%"},
  {k:"g",t:"Light Angle",min:-180,max:180,v:-135,u:"\u00B0",mid:0},
  {k:"h",t:"Highlight",min:0,max:100,v:70,u:"%"},{k:"s",t:"Shadow",min:0,max:100,v:60,u:"%"},
  {k:"m",t:"Style",min:0,max:2,v:0,u:"",names:["Smooth","Round","Chisel"]}]}];
FX.byId={};FX.DEF.forEach(function(d){FX.byId[d.id]=d});
FX.mk=function(id){var d=FX.byId[id],v={};d.p.forEach(function(p){v[p.k]=p.v});return {t:id,on:true,v:v}};
FX.BD={on:true,c:"#ffffff",w:10,o:100,p:"o",r:0};
FX.SD={on:true,c:"#000000",o:60,x:0,y:18,b:30};

FX.has=function(l){return !!(l&&l.fx&&l.fx.some(function(e){return e.on!==false&&FX.byId[e.t]}))};
/* a layer is rendered on its own surface when it has a blend mode, a shadow or effects */
FX.iso=function(l){return !!(l&&((l.bm&&l.bm!=="normal")||(l.sd&&l.sd.on)||FX.has(l)))};

/* ---------- scratch canvases (separate from the group / mask surfaces in media.js) ---------- */
var P=[];
function tmp(i,W,H){var c=P[i]||(P[i]=document.createElement("canvas"));if(c.width!==W||c.height!==H){c.width=W;c.height=H}
 var x=c.getContext("2d");x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";x.filter="none";x.imageSmoothingEnabled=true;x.clearRect(0,0,W,H);return c}
FX.snap=function(W,H){return tmp(8,W,H)};

/* ---------- CSS filter effects (+ colour-matrix fallback) ---------- */
function css(e,k){var a=e.v.a;
 switch(e.t){case "blur":return "blur("+(Math.max(0,a)*k).toFixed(2)+"px)";
  case "bri":return "brightness("+Math.max(0,1+a/100)+")";case "con":return "contrast("+Math.max(0,1+a/100)+")";
  case "sat":return "saturate("+Math.max(0,1+a/100)+")";case "hue":return "hue-rotate("+a+"deg)";
  case "bw":return "grayscale("+a/100+")";case "sep":return "sepia("+a/100+")";case "inv":return "invert("+a/100+")"}
 return ""}
function mat(e){var a=e.v.a;
 if(e.t==="bri"){var b=Math.max(0,1+a/100);return [b,0,0,0,0,0,b,0,0,0,0,0,b,0,0,0,0,0,1,0]}
 if(e.t==="con"){var c=Math.max(0,1+a/100),o=.5*(1-c);return [c,0,0,0,o,0,c,0,0,o,0,0,c,0,o,0,0,0,1,0]}
 if(e.t==="sat"){var s=Math.max(0,1+a/100);return [.213+.787*s,.715-.715*s,.072-.072*s,0,0,.213-.213*s,.715+.285*s,.072-.072*s,0,0,.213-.213*s,.715-.715*s,.072+.928*s,0,0,0,0,0,1,0]}
 if(e.t==="hue"){var r=a*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);
  return [.213+cs*.787-sn*.213,.715-cs*.715-sn*.715,.072-cs*.072+sn*.928,0,0,.213-cs*.213+sn*.143,.715+cs*.285+sn*.140,.072-cs*.072-sn*.283,0,0,.213-cs*.213-sn*.787,.715-cs*.715+sn*.715,.072+cs*.928+sn*.072,0,0,0,0,0,1,0]}
 if(e.t==="bw"){var g=1-a/100;return [.2126+.7874*g,.7152-.7152*g,.0722-.0722*g,0,0,.2126-.2126*g,.7152+.2848*g,.0722-.0722*g,0,0,.2126-.2126*g,.7152-.7152*g,.0722+.9278*g,0,0,0,0,0,1,0]}
 if(e.t==="sep"){var q=1-a/100;return [.393+.607*q,.769-.769*q,.189-.189*q,0,0,.349-.349*q,.686+.314*q,.168-.168*q,0,0,.272-.272*q,.534-.534*q,.131+.869*q,0,0,0,0,0,1,0]}
 if(e.t==="inv"){var i=a/100,d=1-2*i;return [d,0,0,0,i,0,d,0,0,i,0,0,d,0,i,0,0,0,1,0]}
 return null}
FX.mat=mat;FX.css=css;
function applyMat(x,W,H,m){if(!m)return;var id=x.getImageData(0,0,W,H),d=id.data,n=d.length,i,r,g,b;
 for(i=0;i<n;i+=4){r=d[i]/255;g=d[i+1]/255;b=d[i+2]/255;
  d[i]=Math.max(0,Math.min(255,(m[0]*r+m[1]*g+m[2]*b+m[4])*255));d[i+1]=Math.max(0,Math.min(255,(m[5]*r+m[6]*g+m[7]*b+m[9])*255));d[i+2]=Math.max(0,Math.min(255,(m[10]*r+m[11]*g+m[12]*b+m[14])*255))}
 x.putImageData(id,0,0)}
FX.applyMat=applyMat;
/* blur without ctx.filter: shrink + enlarge with smoothing */
function fbBlur(x,src,r,W,H){var s=Math.max(.03,1/(1+r*.6)),w=Math.max(2,Math.ceil(W*s)),h=Math.max(2,Math.ceil(H*s)),a=tmp(6,w,h),ax=a.getContext("2d");
 ax.imageSmoothingQuality="high";ax.drawImage(src,0,0,w,h);x.imageSmoothingQuality="high";x.drawImage(a,0,0,w,h,0,0,W,H)}
function blurTo(x,src,r,W,H){if(HASF){x.filter="blur("+r.toFixed(2)+"px)";x.drawImage(src,0,0);x.filter="none"}else fbBlur(x,src,r,W,H)}

/* ---------- CC Light Sweep helpers ---------- */
var BBC=null,BBX=null;
/* where the layer actually is on its surface (alpha scan of a 64px copy) so the sweep crosses the layer, not the whole canvas */
function bbox(src,W,H){
 var s=Math.min(1,64/Math.max(W,H)),w=Math.max(2,Math.round(W*s)),h=Math.max(2,Math.round(H*s)),full={x0:0,y0:0,x1:W,y1:H};
 try{if(!BBC){BBC=document.createElement("canvas");BBX=BBC.getContext("2d",{willReadFrequently:true})}
  if(BBC.width!==w||BBC.height!==h){BBC.width=w;BBC.height=h}
  BBX.setTransform(1,0,0,1,0,0);BBX.globalAlpha=1;BBX.globalCompositeOperation="source-over";BBX.clearRect(0,0,w,h);BBX.drawImage(src,0,0,w,h);
  var d=BBX.getImageData(0,0,w,h).data,x0=w,y0=h,x1=-1,y1=-1,x,y;
  for(y=0;y<h;y++)for(x=0;x<w;x++)if(d[(y*w+x)*4+3]>3){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return null;
  return {x0:x0/w*W,y0:y0/h*H,x1:(x1+1)/w*W,y1:(y1+1)/h*H}}catch(z){return full}}
function hex3(h){var n=parseInt(String(h||"#ffffff").replace("#",""),16);if(isNaN(n))n=16777215;return [(n>>16)&255,(n>>8)&255,n&255]}
function sweepAlpha(v,q){ /* q = 0 centre of the band .. 1 outer edge */
 var sh=Math.round(v.s||0),core=sh===1?1-q:sh===2?(q<.85?1:(1-q)/.15):(1+Math.cos(Math.PI*q))/2,
  ew=.05+.4*((v.th==null?30:v.th)/100),ed=Math.exp(-Math.pow((q-(1-ew*.5))/(ew*.45),2))*(q<1?1:0);
 return core*(v.a/100)+ed*((v.e||0)/100)}

/* ---------- effects that are not plain filters ---------- */
/* fade amount (0..1) of a layer at local time t - used by the Fade In / Fade Out effects (and by adjustment layers) */
FX.fadeA=function(l,t){var a=1;(l.fx||[]).forEach(function(e){if(!e||e.on===false)return;var d=Math.max(.05,+(e.v&&e.v.d)||1);
 if(e.t==="fin")a*=Math.max(0,Math.min(1,t/d));else if(e.t==="fout")a*=Math.max(0,Math.min(1,(l.d-t)/d));else if(e.t==="fio"){var fi=Math.max(0,+e.v.i||0),fo=Math.max(0,+e.v.o||0);if(fi>0)a*=Math.max(0,Math.min(1,t/fi));if(fo>0)a*=Math.max(0,Math.min(1,(l.d-t)/fo))}});return a};
/* ---------- Light Leaks painter: draws the beams on a small canvas (the upscale makes them soft) ---------- */
var LK={};
function lkR(seed,i,j){var n=Math.sin(seed*37.17+i*12.9898+j*78.233)*43758.5453;return n-Math.floor(n)}
function lkSm(a,b,x){var q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q)}
LK.paint=function(c,w,h,v,t,I){
 var seed=Math.round(v.d||7),sp=(v.sp==null?30:v.sp)/100,th=(v.g||0)*Math.PI/180,ws=Math.max(.1,(v.w==null?45:v.w)/45),hs=v.h||0,st=Math.round(v.s||0),
  D=Math.hypot(w,h),N=10,cyc=2.6,PAL=[18,350,42,215,285,5],i,j;
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation="source-over";c.clearRect(0,0,w,h);
 c.globalCompositeOperation="lighter";
 /* a warm glow that breathes in one corner */
 var gx=w*(.12+.76*(.5+.5*Math.sin(t*sp*.5+seed))),gy=h*(.85+.1*Math.sin(t*sp*.37+seed*2)),gh=((st===2?220:st===3?340:25)+hs+360)%360,
  gr=c.createRadialGradient(gx,gy,0,gx,gy,D*.55);gr.addColorStop(0,"hsla("+gh+",100%,58%,"+(.3*I).toFixed(3)+")");gr.addColorStop(1,"hsla("+gh+",100%,50%,0)");c.fillStyle=gr;c.fillRect(0,0,w,h);
 c.translate(w/2,h/2);c.rotate(th);
 for(i=0;i<N;i++){
  var r0=lkR(seed,i,1),r1=lkR(seed,i,2),r2=lkR(seed,i,3),r3=lkR(seed,i,4),
   p=(((r0*cyc+sp*t*.28*(.4+r1))%cyc)+cyc)%cyc-.8,                       /* beam centre across the layer, wraps off-screen */
   env=lkSm(-.8,-.2,p)*(1-lkSm(1.2,1.8,p)),
   fl=.82+.18*Math.sin(t*sp*2.3+r3*20),                                /* soft flicker */
   hue=st===0?(PAL[i%PAL.length]+(r3-.5)*30):st===1?(r3*55):st===2?(185+r3*95):((335+r3*95)%360);
  hue=((hue+hs)%360+360)%360;
  var hw=(.035+.11*r2)*ws*D,cx=(p-.5)*D,a=Math.min(1,.62*env*fl*I),d=hw*.5,
   bands=[[-1,(hue+330)%360,.85],[0,hue,1],[1,(hue+40)%360,.8]];                /* prism fringe: red edge - core - yellow/blue edge */
  if(a<=.002)continue;
  for(j=0;j<3;j++){var o=bands[j][0]*d,g=c.createLinearGradient(cx+o-hw,0,cx+o+hw,0),aa=(a*bands[j][2]).toFixed(3),cl="hsla("+bands[j][1].toFixed(0)+",100%,52%,";
   g.addColorStop(0,cl+"0)");g.addColorStop(.5,cl+aa+")");g.addColorStop(1,cl+"0)");c.fillStyle=g;c.fillRect(cx+o-hw,-D,hw*2,D*2)}}
 c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation="source-over"};

var FN={
 fin:function(x,src,v,W,H,k,t,dur,adj){if(adj){x.drawImage(src,0,0);return}var d=Math.max(.05,+v.d||1);x.globalAlpha=Math.max(0,Math.min(1,(t||0)/d));x.drawImage(src,0,0);x.globalAlpha=1},
 fout:function(x,src,v,W,H,k,t,dur,adj){if(adj||dur==null){x.drawImage(src,0,0);return}var d=Math.max(.05,+v.d||1);x.globalAlpha=Math.max(0,Math.min(1,(dur-(t||0))/d));x.drawImage(src,0,0);x.globalAlpha=1},
 fio:function(x,src,v,W,H,k,t,dur,adj){if(adj){x.drawImage(src,0,0);return}var fi=Math.max(0,+v.i||0),fo=Math.max(0,+v.o||0),a=1;t=t||0;if(fi>0)a*=Math.max(0,Math.min(1,t/fi));if(fo>0&&dur!=null)a*=Math.max(0,Math.min(1,(dur-t)/fo));x.globalAlpha=a;x.drawImage(src,0,0);x.globalAlpha=1},
 lsw:function(x,src,v,W,H,k,t){
  /* v.cx == null = a Light Sweep saved by an older build: it keeps its old look (Position / Hue / Tint / Original) */
  var leg=v.cx==null,o=leg?Math.max(0,Math.min(100,v.o==null?100:v.o))/100:1,rc=leg?1:Math.round(v.r||0),bb=bbox(src,W,H);
  if(leg||rc!==2){x.globalAlpha=o;x.drawImage(src,0,0);x.globalAlpha=1}
  if(!bb)return;
  var th=(v.g||0)*Math.PI/180,nx=Math.cos(th),ny=Math.sin(th),cx=(bb.x0+bb.x1)/2,cy=(bb.y0+bb.y1)/2,
   half=(Math.abs(nx)*(bb.x1-bb.x0)+Math.abs(ny)*(bb.y1-bb.y0))/2||1,hw=Math.max(.5,(v.w/100)*half),span=2*half+2*hw,
   sp=v.sp||0,C=100+Math.max(0,v.dl||0),s,p,vis=true;
  if(leg){p=(v.p||0)+sp*(t||0);if(sp>0)p=((p%C)+C)%C;if(p<0||p>100)vis=false;s=-half-hw+p/100*span}
  else{ /* the band is a line through Center, perpendicular to Direction, so only Center's distance along Direction matters */
   s=(bb.x0+v.cx/100*(bb.x1-bb.x0)-cx)*nx+(bb.y0+(v.cy==null?50:v.cy)/100*(bb.y1-bb.y0)-cy)*ny;
   if(sp>0){p=(((sp*(t||0))%C)+C)%C;if(p>100)vis=false;s+=(p/100-.5)*span}}
  if(!vis)return;
  var N=48,al=[],peak=0,i,j,q;
  for(i=0;i<N;i++){q=Math.abs(2*i/(N-1)-1);al[i]=Math.max(0,sweepAlpha(v,q));if(al[i]>peak)peak=al[i]}
  if(peak<=.001)return;
  var passes=Math.max(1,Math.ceil(peak)),cl,rgb=hex3(v.lc);
  if(leg){var tint=Math.max(0,Math.min(100,v.c||0)),hue=v.h||0;cl=function(a){return "hsla("+hue+","+tint+"%,"+(100-tint*.45).toFixed(1)+"%,"+a+")"}}
  else cl=function(a){return "rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+a+")"};
  var L=tmp(5,W,H),lx=L.getContext("2d"),g=lx.createLinearGradient(cx+nx*(s-hw),cy+ny*(s-hw),cx+nx*(s+hw),cy+ny*(s+hw));
  for(i=0;i<N;i++)g.addColorStop(i/(N-1),cl(Math.min(1,al[i]/passes).toFixed(3)));
  lx.fillStyle=g;for(j=0;j<passes;j++)lx.fillRect(0,0,W,H);
  lx.globalCompositeOperation="destination-in";lx.drawImage(src,0,0);lx.globalCompositeOperation="source-over";   /* light only lands on the layer */
  if(!leg&&rc===0){x.globalCompositeOperation="lighter";x.drawImage(L,0,0);x.globalCompositeOperation="source-over"}   /* Add: light is added to the layer's colours */
  else x.drawImage(L,0,0)},                                                                                            /* Composite: light over the layer / Cut Out: only the light is left */
 bev:function(x,src,v,W,H,k){
  var sz=Math.max(.5,(v.z==null?14:v.z)*k),dp=Math.max(0,(v.d==null?100:v.d)/100),sf=Math.max(0,Math.min(1,(v.f==null?50:v.f)/100)),an=(v.g==null?-135:v.g)*Math.PI/180,
   hi=Math.max(0,Math.min(1,(v.h==null?70:v.h)/100)),sh=Math.max(0,Math.min(1,(v.s==null?60:v.s)/100)),st=Math.round(v.m||0);
  x.drawImage(src,0,0);
  if(dp<=0||(hi<=0&&sh<=0))return;
  /* the light map is built on a small copy (<= 520 px) and scaled back: bevels are soft by nature, so nothing is lost and it stays fast */
  var sc=Math.min(1,520/Math.max(W,H)),w=Math.max(8,Math.round(W*sc)),h=Math.max(8,Math.round(H*sc)),r=Math.max(.5,sz*sc);
  var a=tmp(10,w,h),ax=a.getContext("2d");ax.drawImage(src,0,0,w,h);
  var b=tmp(11,w,h),bx=b.getContext("2d");blurTo(bx,a,r,w,h);                 /* blurred alpha = height map (0 outside, 1 deep inside) */
  var d;try{d=bx.getImageData(0,0,w,h).data}catch(z){return}
  var n=w*h,ht=new Float32Array(n),i,hv;
  for(i=0;i<n;i++){hv=d[i*4+3]/255;ht[i]=st===0?hv*hv*(3-2*hv):st===1?Math.sqrt(hv*(2-hv)):hv}   /* Smooth = smoothstep, Round = quarter circle, Chisel = straight ramp */
  var S=tmp(12,w,h),sx=S.getContext("2d"),oi=sx.createImageData(w,h),od=oi.data,lxv=Math.cos(an),lyv=Math.sin(an),gain=r*1.6*dp,xx,yy,gx,gy,lit,al,o4;
  for(yy=1;yy<h-1;yy++)for(xx=1;xx<w-1;xx++){
   i=yy*w+xx;gx=(ht[i+1]-ht[i-1])*.5;gy=(ht[i+w]-ht[i-w])*.5;
   lit=-(gx*lxv+gy*lyv)*gain;lit=lit>1?1:lit<-1?-1:lit;o4=i*4;     /* a slope that faces the light is bright, one that faces away is dark */
   if(lit>0){od[o4]=od[o4+1]=od[o4+2]=255;od[o4+3]=lit*hi*255}
   else{od[o4]=od[o4+1]=od[o4+2]=0;od[o4+3]=-lit*sh*255}}
  sx.putImageData(oi,0,0);
  var Lc=tmp(5,W,H),lx=Lc.getContext("2d");lx.imageSmoothingEnabled=true;lx.imageSmoothingQuality="high";
  if(sf>.01&&HASF)lx.filter="blur("+(r*sf*.6/sc).toFixed(2)+"px)";          /* Softness: extra smoothing of the light map */
  lx.drawImage(S,0,0,w,h,0,0,W,H);lx.filter="none";
  lx.globalCompositeOperation="destination-in";lx.drawImage(src,0,0);lx.globalCompositeOperation="source-over";
  x.drawImage(Lc,0,0)},
 mbl:function(x,src){x.drawImage(src,0,0)},   /* the sampling already happened when the layer was drawn */
 dbl:function(x,src,v,W,H,k){
  var L=Math.max(0,(v.a||0)*k),an=(v.g||0)*Math.PI/180,dx=Math.cos(an),dy=Math.sin(an);
  if(L<.6){x.drawImage(src,0,0);return}
  /* a box blur along the angle = average of shifted copies. Long blurs use two combs (fine comb of N2 copies inside one step of the coarse comb of N1 copies).
     A long blur has no fine detail left, so it is computed on a smaller copy (1/2 or 1/4) and scaled back - 4-16x less pixel work, same look */
  var sc=L>150?.25:L>50?.5:1,w=sc<1?Math.max(2,Math.round(W*sc)):W,h=sc<1?Math.max(2,Math.round(H*sc)):H,l=L*(w/W);
  var S=Math.max(2,Math.min(160,Math.ceil(l/1.6))),N1=Math.max(1,Math.ceil(Math.sqrt(S))),N2=Math.max(2,Math.ceil(S/N1)),s2=N1>1?l/N1:l;
  function avg(dst,from,n,span){for(var i=0;i<n;i++){var f=n>1?i/(n-1)-.5:0;dst.globalAlpha=1/(i+1);dst.drawImage(from,dx*span*f,dy*span*f)}dst.globalAlpha=1}
  var from=src,out=x,res=null,rx=null;
  if(sc<1){var a=tmp(6,w,h),ax=a.getContext("2d");ax.imageSmoothingQuality="high";ax.drawImage(src,0,0,w,h);from=a;res=tmp(7,w,h);rx=res.getContext("2d");out=rx}
  if(N1<2)avg(out,from,N2,l);
  else{var t1=tmp(sc<1?9:2,w,h),t1x=t1.getContext("2d");avg(t1x,from,N2,s2);avg(out,t1,N1,l-s2)}
  if(sc<1){x.imageSmoothingQuality="high";x.drawImage(res,0,0,w,h,0,0,W,H)}},
 ibl:function(x,src,v,W,H,k){
  var r=Math.max(0,(v.a||0)*k);if(r<.2){x.drawImage(src,0,0);return}
  var b=tmp(2,W,H),bx=b.getContext("2d");blurTo(bx,src,r,W,H);
  bx.globalCompositeOperation="destination-in";bx.drawImage(src,0,0);bx.globalCompositeOperation="source-over";
  x.drawImage(src,0,0);x.drawImage(b,0,0)},
  leak:function(x,src,v,W,H,k,t){
  x.drawImage(src,0,0);
  var I=Math.max(0,v.a==null?100:v.a)/100;if(I<=.001)return;
  var sc=Math.min(1,320/Math.max(W,H)),w=Math.max(8,Math.round(W*sc)),h=Math.max(8,Math.round(H*sc)),S=tmp(7,w,h),c=S.getContext("2d");
  LK.paint(c,w,h,v,t||0,Math.min(1,I));
  var Lc=tmp(5,W,H),lx=Lc.getContext("2d");lx.imageSmoothingEnabled=true;lx.imageSmoothingQuality="high";lx.drawImage(S,0,0,w,h,0,0,W,H);
  lx.globalCompositeOperation="destination-in";lx.drawImage(src,0,0);lx.globalCompositeOperation="source-over";
  x.globalCompositeOperation="screen";var m=I;while(m>.001){x.globalAlpha=Math.min(1,m);x.drawImage(Lc,0,0);m-=1}
  x.globalAlpha=1;x.globalCompositeOperation="source-over"},
 glow:function(x,src,v,W,H,k){var r=Math.max(1,v.r*k),n=Math.max(0,v.a/100),b=tmp(2,W,H),bx=b.getContext("2d");
  blurTo(bx,src,r,W,H);x.drawImage(src,0,0);x.globalCompositeOperation="lighter";
  var m=n;while(m>.001){x.globalAlpha=Math.min(1,m);x.drawImage(b,0,0);m-=1}
  x.globalAlpha=1;x.globalCompositeOperation="source-over"},
 pix:function(x,src,v,W,H,k){var s=Math.max(2,v.a*k),w=Math.max(1,Math.ceil(W/s)),h=Math.max(1,Math.ceil(H/s)),t=tmp(3,w,h),tx=t.getContext("2d");
  tx.imageSmoothingQuality="high";tx.drawImage(src,0,0,w,h);x.imageSmoothingEnabled=false;x.drawImage(t,0,0,w,h,0,0,w*s,h*s);x.imageSmoothingEnabled=true},
 rgb:function(x,src,v,W,H,k){var d=v.a*k,an=(v.g||0)*Math.PI/180,dx=Math.cos(an)*d,dy=Math.sin(an)*d,cols=["#ff0000","#00ff00","#0000ff"],of=[[-dx,-dy],[0,0],[dx,dy]];
  x.globalCompositeOperation="lighter";
  for(var c=0;c<3;c++){var t=tmp(2+c,W,H),tx=t.getContext("2d");tx.drawImage(src,0,0);tx.globalCompositeOperation="multiply";tx.fillStyle=cols[c];tx.fillRect(0,0,W,H);
   tx.globalCompositeOperation="destination-in";tx.drawImage(src,0,0);x.drawImage(t,of[c][0],of[c][1])}
  x.globalCompositeOperation="source-over"},
 vig:function(x,src,v,W,H,k){x.drawImage(src,0,0);var R=Math.hypot(W,H)/2,a=Math.max(0,Math.min(1,v.a/100)),r0=R*Math.max(.05,Math.min(1,v.s/100))*.95,r1=Math.max(r0+2,R*1.02);
  var g=x.createRadialGradient(W/2,H/2,r0,W/2,H/2,r1);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,"+(a*.92).toFixed(3)+")");
  x.globalCompositeOperation="source-atop";x.fillStyle=g;x.fillRect(0,0,W,H);x.globalCompositeOperation="source-over"}};

/* run the effect stack on `src` (never modifies it) and return the canvas that holds the result */
FX.run=function(src,list,W,H,k,t,dur,adj){
 var act=(list||[]).filter(function(e){return e&&e.on!==false&&FX.byId[e.t]}),cur=src,idx=0,i=0;
 function out(){var d=tmp(idx,W,H);idx=1-idx;return d}
 while(i<act.length){
  var e=act[i],d,x;
  if(FX.byId[e.t].f){
   if(HASF){var parts=[];while(i<act.length&&FX.byId[act[i].t].f){parts.push(css(act[i],k));i++}
    d=out();x=d.getContext("2d");x.filter=parts.join(" ");x.drawImage(cur,0,0);x.filter="none";cur=d;continue}
   d=out();x=d.getContext("2d");
   if(e.t==="blur")fbBlur(x,cur,e.v.a*k,W,H);else{x.drawImage(cur,0,0);try{applyMat(x,W,H,mat(e))}catch(z){}}
   cur=d;i++;continue}
  d=out();x=d.getContext("2d");FN[e.t](x,cur,e.v,W,H,k,t||0,dur,adj);cur=d;i++}
 return cur};
})();
