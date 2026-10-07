/* Apex Cut mobile - real text editing: multi-line editor panel (live on the canvas). Opens from the "Edit text" pill button,
   by double-tapping a text clip on the timeline, or by double-tapping the preview while a text layer is selected. */
(function(){
"use strict";
var A=window.AX,E=A.E,S=A.S,$=function(s,r){return (r||document).querySelector(s)};
var ed=$("#editor"),tools=$("#tools"),pill=$("#toolPill"),tl=$("#tl"),cv=$("#canvas");
var te=document.createElement("div");te.className="glass mp sp te";te.id="te";te.setAttribute("aria-hidden","true");
te.innerHTML='<div class="mp-h"><b class="xp-title" style="display:block">Edit Text</b><button class="pp-k" id="teX" type="button" aria-label="Cancel"><svg><use href="#i-x"/></svg></button><button class="pp-k on" id="teOk" type="button" aria-label="Done"><svg><use href="#i-check"/></svg></button></div>'+
 '<textarea id="teTa" class="te-ta" rows="4" maxlength="2000" spellcheck="false" autocomplete="off" autocapitalize="sentences" placeholder="Type your text"></textarea>';
ed.appendChild(te);
var ta=$("#teTa"),on=false,id=null,orig="",pushed=false,tm=0;
function cur(){var l=id!=null?E.find(id):null;return l&&l.k==="txt"?l:null}

/* keep the panel above the on-screen keyboard (visualViewport) */
function kb(){var vv=window.visualViewport;if(!vv)return;var h=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);ed.style.setProperty("--kb",h+"px")}
if(window.visualViewport){window.visualViewport.addEventListener("resize",function(){if(on)kb()});window.visualViewport.addEventListener("scroll",function(){if(on)kb()})}

function open(){
 var l=E.sel()!=null?E.find(E.sel()):null;if(!l||l.k!=="txt"){A.toast("Select a text layer first");return}
 if(on&&id===l.i)return;
 if(A.closePanels)A.closePanels();if(A.XP)A.XP.close(false);
 id=l.i;orig=l.t==null?"Text":l.t;pushed=false;ta.value=orig;
 te.classList.add("on");te.setAttribute("aria-hidden","false");tools.classList.add("mv");on=true;kb();
 setTimeout(function(){ta.focus();if(orig==="Text"||orig==="")ta.select();else ta.setSelectionRange(ta.value.length,ta.value.length)},260)}
function close(restore){
 if(!on)return;on=false;clearTimeout(tm);ta.blur();te.classList.remove("on");te.setAttribute("aria-hidden","true");tools.classList.remove("mv");ed.style.removeProperty("--kb");
 if(restore!==false){tools.classList.add("open");pill.setAttribute("aria-hidden","false")}}
function apply(){var l=cur();if(!l)return;if(!pushed){E.push();pushed=true}l.t=ta.value;A.redraw();
 clearTimeout(tm);tm=setTimeout(function(){E.save();E.render()},350)}
ta.addEventListener("input",apply);
$("#teOk").onclick=function(){var l=cur();if(l){if(l.t===""){l.t="Text"}E.save();E.render()}close(true)};
$("#teX").onclick=function(){var l=cur();if(l&&pushed){l.t=orig;E.save();E.render()}close(true)};
function sync(){if(!on)return;var l=cur(),sel=E.sel();if(!l||sel!==id)close(false)}
A.TE={open:open,close:close,sync:sync,isOn:function(){return on}};

/* ---- double-tap a text clip on the timeline (the 1st tap selects the layer and the timeline re-lays out, so the 2nd tap is matched by time + place) ---- */
var d0=null,lt=null;
tl.addEventListener("pointerdown",function(e){
 var n=performance.now();
 if(lt&&n-lt.t<450&&Math.hypot(e.clientX-lt.x,e.clientY-lt.y)<45){
  var l=E.sel()!=null?E.find(E.sel()):null;
  if(l&&l.k==="txt"&&l.i===lt.i){lt=null;d0=null;e.stopImmediatePropagation();e.preventDefault();open();return}}
 var c=e.target.closest?e.target.closest(".clip.txt"):null;
 d0={x:e.clientX,y:e.clientY,t:n,i:c?+c.dataset.i:null}},true);
tl.addEventListener("pointerup",function(e){
 if(!d0)return;var mv=Math.hypot(e.clientX-d0.x,e.clientY-d0.y),dt=performance.now()-d0.t,i=d0.i;d0=null;
 lt=(mv<=8&&dt<=380&&i!=null)?{i:i,x:e.clientX,y:e.clientY,t:performance.now()}:null},true);
/* ---- double-tap the preview while a text layer is selected ---- */
var c0=null,cl=0;
cv.addEventListener("pointerdown",function(e){c0={x:e.clientX,y:e.clientY,t:performance.now()}});
cv.addEventListener("pointerup",function(e){
 if(!c0)return;var mv=Math.hypot(e.clientX-c0.x,e.clientY-c0.y),dt=performance.now()-c0.t;c0=null;if(mv>10||dt>380)return;
 var l=E.sel()!=null?E.find(E.sel()):null;if(!l||l.k!=="txt"){cl=0;return}
 var n=performance.now();if(n-cl<450){cl=0;open()}else cl=n});
})();
