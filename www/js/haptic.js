/* Apex Cut mobile - haptics. Native (Capacitor Haptics plugin) when running as the APK, navigator.vibrate in a browser.
   HX.tick()  light detent                              HX.snap()  firmer tap (centre notch / min / max)
   HX.hold()  long-press pickup                         HX.slider() -> {move(f,snap,wasSnap)} per-drag helper

   Slider feel: a ratchet of short, crisp, evenly spaced clicks that follow the FINGER (one click every STEP px of travel, a stronger click
   every 5th one) instead of one soft buzz per 5 % of the track - so dragging any slider feels like a real notched slider
   (tick - tick - tick), whatever the slider width. tick / snap / hold are unchanged. */
(function(){
"use strict";
var HX=window.HX={},last=0;
var STEP=11,      /* px of finger travel per click */
    MAJOR=5,      /* every Nth click is a stronger one */
    GAP=32,       /* min ms between two slider clicks (keeps each click separate on a fast swipe) */
    MS_T=6,MS_M=11; /* click length in ms (normal / major) */
function plug(){try{return window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics||null}catch(x){return null}}
function vib(ms){try{navigator.vibrate&&navigator.vibrate(ms)}catch(x){}}
function now(){return Date.now()}
HX.tick=function(){var n=now();if(n-last<22)return;last=n;var p=plug();
 if(p){try{p.impact({style:"LIGHT"});return}catch(x){}}vib(6)};
HX.snap=function(){last=now();var p=plug();
 if(p){try{p.impact({style:"MEDIUM"});return}catch(x){}}vib(14)};
HX.hold=function(){last=now();var p=plug();
 if(p){try{p.impact({style:"HEAVY"});return}catch(x){}}vib(20)};
/* one short crisp pulse (a real "click", not a buzz) */
function click(ms,style){var p=plug();last=now();
 if(p&&p.vibrate){try{p.vibrate({duration:ms});return}catch(x){}}
 if(typeof navigator!=="undefined"&&navigator.vibrate){try{navigator.vibrate(ms);return}catch(x){}}
 if(p){try{p.impact({style:style||"LIGHT"})}catch(x){}}}
/* width in px of the slider that is being dragged (all sliders get the class "drag" while held) */
function trackPx(){
 var el=document.querySelector(".sl.drag,.bgs.drag,#txSl.drag,.drag"),w=el?el.getBoundingClientRect().width:0;
 return w>60?w:Math.max(240,(window.innerWidth||360)*.8)}
HX.slider=function(span){
 var edge=null,q=null,lt=0,W=span||0,cnt=0;
 return {move:function(f,snap,wasSnap){
  if(!W)W=trackPx();
  var pos=f*W,k=Math.floor(pos/STEP);
  if(snap&&!wasSnap){HX.snap();q=k;lt=now();return}                     /* centre notch / default value */
  var e=f<=0?0:f>=1?1:null;
  if(e!==null&&e!==edge){edge=e;HX.snap();q=k;lt=now();return}          /* min / max end stop */
  if(e===null)edge=null;
  if(q===null){q=k;lt=now();click(MS_T+2);return}                       /* pick-up click */
  if(k===q)return;
  var t=now(),major=(k%MAJOR===0);q=k;
  if(t-lt<GAP)return;lt=t;cnt++;
  if(major)click(MS_M,"MEDIUM");else click(MS_T,"LIGHT")}}};
})();
