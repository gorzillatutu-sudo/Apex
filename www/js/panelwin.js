/* Apex Cut mobile - movable + corner-resizable glass panels (same feel as the graph panel)
   AX.panelWin(panel, {key, drag, root})
     - drag : CSS selector of the zones you can grab to MOVE the panel (buttons / inputs inside them still work)
     - corner grip (bottom-right) = RESIZE: the whole panel scales uniformly, so every row, slider, switch and label inside follows
     - double-tap a drag zone or the corner = back to the default spot + size
     - spot + size are remembered (localStorage), panel is always kept inside the editor                          */
(function(){
var A=window.AX=window.AX||{};
function rem(){return parseFloat(getComputedStyle(document.documentElement).fontSize)||10}
var RZ='<svg viewBox="0 0 16 16"><path d="M14 5L5 14M14 10L10 14"/></svg>';
A.panelWin=function(el,o){
 var root=o.root||document.getElementById("editor"),M=8,st={x:0,y:0,s:1},lastTap=0;
 try{var j=JSON.parse(localStorage.getItem(o.key)||"null");if(j&&isFinite(j.x)&&isFinite(j.y)&&isFinite(j.s))st={x:+j.x,y:+j.y,s:+j.s}}catch(e){}
 el.classList.add("pw");
 var rz=document.createElement("button");rz.type="button";rz.className="pw-rz";rz.setAttribute("aria-label","Resize");rz.innerHTML=RZ;root.appendChild(rz);
 function save(){try{localStorage.setItem(o.key,JSON.stringify({x:+st.x.toFixed(1),y:+st.y.toFixed(1),s:+st.s.toFixed(4)}))}catch(e){}}
 function lim(){var W=root.clientWidth,H=root.clientHeight,w=el.offsetWidth||1,h=el.offsetHeight||1;
  var mx=Math.max(.4,Math.min((W-2*M)/w,(H-2*M)/h));return{min:Math.min(.42,mx),max:Math.min(1.25,mx)}}
 /* keep scale legal, keep the scaled panel fully inside the editor, then paint it + the corner grip */
 function place(){
  var L=lim(),W=root.clientWidth,H=root.clientHeight,w=el.offsetWidth,h=el.offsetHeight,l=el.offsetLeft,t=el.offsetTop;
  st.s=Math.max(L.min,Math.min(L.max,st.s));
  var vw=w*st.s,vh=h*st.s,mnx=M-l,mxx=W-M-vw-l,mny=M-t,mxy=H-M-vh-t;
  st.x=mxx<mnx?(mnx+mxx)/2:Math.max(mnx,Math.min(mxx,st.x));
  st.y=mxy<mny?(mny+mxy)/2:Math.max(mny,Math.min(mxy,st.y));
  el.style.translate=st.x.toFixed(1)+"px "+st.y.toFixed(1)+"px";
  el.style.scale=st.s===1?"":st.s.toFixed(4);
  var sz=rz.offsetWidth||54;
  rz.style.left=(l+st.x+vw-sz-.3*rem()).toFixed(1)+"px";rz.style.top=(t+st.y+vh-sz-.3*rem()).toFixed(1)+"px";
  rz.style.zIndex=(parseInt(getComputedStyle(el).zIndex,10)||30)+1;
 }
 function sync(){var on=el.classList.contains("on");rz.classList.toggle("on",on);if(on)place()}
 function reset(){st={x:0,y:0,s:1};place();save()}
 function tap(){var n=Date.now();if(n-lastTap<320){reset();lastTap=0}else lastTap=n}
 function win(mv,up){
  window.addEventListener("pointermove",mv,true);
  function end(ev){window.removeEventListener("pointermove",mv,true);window.removeEventListener("pointerup",end,true);window.removeEventListener("pointercancel",end,true);up(ev)}
  window.addEventListener("pointerup",end,true);window.addEventListener("pointercancel",end,true)}
 /* MOVE: hold a drag zone */
 el.addEventListener("pointerdown",function(e){
  var z=e.target.closest&&e.target.closest(o.drag);if(!z||!el.contains(z))return;
  if(e.target.closest("button,input,label,select,textarea,.sl,a"))return;
  e.preventDefault();
  var sx=e.clientX,sy=e.clientY,x0=st.x,y0=st.y,moved=false;el.classList.add("dragging");
  win(function(ev){var dx=ev.clientX-sx,dy=ev.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;st.x=x0+dx;st.y=y0+dy;place()},
   function(){el.classList.remove("dragging");if(moved){save()}else tap()});
 });
 /* RESIZE: corner grip, top-left stays put and everything inside scales with the panel */
 rz.addEventListener("pointerdown",function(e){
  e.preventDefault();e.stopPropagation();
  var w0=(el.offsetWidth||1)*st.s,h0=(el.offsetHeight||1)*st.s,s0=st.s,x0=e.clientX,y0=e.clientY,moved=false;el.classList.add("dragging");rz.classList.add("drag");
  win(function(ev){var dx=ev.clientX-x0,dy=ev.clientY-y0;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    st.s=s0*(1+((dx/w0)+(dy/h0))/2);place()},
   function(){el.classList.remove("dragging");rz.classList.remove("drag");if(moved)save();else tap()});
 });
 new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:["class"]});
 if(window.ResizeObserver)new ResizeObserver(function(){if(el.classList.contains("on"))place()}).observe(el);
 window.addEventListener("resize",function(){if(el.classList.contains("on"))place()});
 sync();
 return{place:place,reset:reset,state:st};
};
})();
