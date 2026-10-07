/* Apex Cut mobile - Graph editor, ported from Apex Cut 33 (graph-editor.js); Apply stores the curve on the selected layer's keyframes. */
/**
 * graph-editor.js - Graph editor popup for Apex Cut.
 *
 * The small curve button next to "+ Null" opens a floating glass editor with two tabs:
 *   Easing  - two bezier handles (cubic-bezier, y may overshoot 0..1)
 *   Elastic - a decaying-sine bounce (white handle = bounce size, coloured handle: x = speed, y = settle)
 * "Apply" sends the curve to the keyframes selected in THIS timeline (see ApexCutAPI in timeline.js and
 * apexTLApplyBezier / apexTLApplyElastic in host.jsx).
 *
 * Drag the header to move the editor (the spot is remembered). Drag the corner grip to resize it (contents scale with it; size is remembered). The grid button swaps the editor for the Presets panel in the same spot (smooth cross-fade); press it again to come back. Click a filled
 * tile to apply it, click an empty "+" tile to save the current curve there, right-click a filled tile for
 * Load / Rename / Overwrite / Delete.
 *
 * The popup scales itself to whatever size the panel currently has (window.ApexFit from appearance.js),
 * and every colour comes from the theme variables, so it follows the selected gradient preset.
 * Own curve maths only - nothing copied from any third-party plugin.
 */
(function () {
    "use strict";
    var btn = document.getElementById("btnGraph");
    if (!btn) return;
        var NS = "http://www.w3.org/2000/svg";

    // ---- plot geometry (viewBox 360 x 270) ------------------------------------------------------
    var W = 360, H = 270, PAD = 26, X0 = PAD, X1 = W - PAD, Y0 = PAD, Y1 = H - PAD;
    var YMIN = -0.3, YMAX = 1.3;          // value range the plot shows (room for overshoot)
    var SLOTS = 8;
    var LS_STATE = "apexCutGraphState", LS_SLOTS = "apexCutGraphSlots", LS_POS = "apexCutGraphPos";
    var PRE_W = 0, PRE_GAP = 0;     // presets panel width / gap (must match style.css)
    var pos = { dx: 0, dy: 0 };        // panel offset from the centre of the window (visual px), remembered between openings
    var presetsOpen = false;
    var LS_SCALE = "apexCutGraphScale", scale = 1, cardEl = null, resizeEl = null;   // panel size (uniform scale of the whole panel), remembered between openings

    var DEFAULTS = {
        easing: { h1: { x: 0.33, y: 0 }, h2: { x: 0.66, y: 1 } },
        elastic: { h1: { x: 0, y: 0.4 }, h2: { x: 0.3, y: 0.55 } }
    };
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    var state = { mode: "easing", easing: clone(DEFAULTS.easing), elastic: clone(DEFAULTS.elastic) };
    var slots = {};          // "1".."8" -> {mode,h1,h2,label?}
    var slotsLoaded = false;
    var armedSlot = null;    // slot whose curve is currently in the editor (tile outline)

    function loadState() {
        try {
            var o = JSON.parse(window.localStorage.getItem(LS_STATE) || "null");
            if (o && o.easing && o.elastic) { state.mode = o.mode === "elastic" ? "elastic" : "easing"; state.easing = o.easing; state.elastic = o.elastic; }
        } catch (e) {}
    }
    function saveState() { try { window.localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch (e) {} }
    function cur() { return state[state.mode]; }
    function cfgOf(mode) { var c = state[mode]; return { mode: mode, h1: { x: c.h1.x, y: c.h1.y }, h2: { x: c.h2.x, y: c.h2.y } }; }
    function curCfg() { return cfgOf(state.mode); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function esc(s) {
        return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'")
            .replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    function escHtml(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

    // ---- curve maths -----------------------------------------------------------------------------
    function bezierY(t, h1, h2) {
        function co(u, a, b) { var m = 1 - u; return 3 * m * m * u * a + 3 * m * u * u * b + u * u * u; }
        var lo = 0, hi = 1, u = t;
        for (var i = 0; i < 22; i++) { u = (lo + hi) / 2; if (co(u, h1.x, h2.x) < t) lo = u; else hi = u; }
        return co(u, h1.y, h2.y);
    }
    // Elastic: white handle (h1.y) = bounce size, coloured handle (h2) x = speed, y = how fast it settles.
    // These are exactly the numbers handed to apexTLApplyElastic, so preview and result agree.
    function elasticParams(c) {
        return { amp: 0.02 + clamp(c.h1.y, 0, 1) * 0.23, freq: 1 + clamp(c.h2.x, 0, 1) * 7, decay: 1 + clamp(c.h2.y, 0, 1) * 7 };
    }
    function elasticY(t, c) {
        var p = elasticParams(c), T0 = 0.22;
        if (t < T0) { var u = t / T0; return 1 - Math.pow(1 - u, 3); }       // the move itself
        var tau = (t - T0) * 1.6;                                              // seconds after the last key
        return 1 + 4 * p.amp * Math.sin(p.freq * tau * 2 * Math.PI) * Math.exp(-p.decay * tau);   // 4 = assumed key speed
    }
    function curveY(t, cfg) { return cfg.mode === "elastic" ? elasticY(t, cfg) : bezierY(t, cfg.h1, cfg.h2); }
    window.ApexCurve = curveY;

    // unit (x 0..1, y value) <-> svg px
    function toPx(u) { return { x: X0 + u.x * (X1 - X0), y: Y1 - ((u.y - YMIN) / (YMAX - YMIN)) * (Y1 - Y0) }; }
    function fromPx(px, py) { return { x: clamp((px - X0) / (X1 - X0), 0, 1), y: YMIN + ((Y1 - py) / (Y1 - Y0)) * (YMAX - YMIN) }; }

    // ---- DOM ----------------------------------------------------------------------------------------
    var overlay = null, posEl = null, fitWrap = null, stopFit = null, svg = null, presetsEl = null, gridEl = null;
    var tabEasing, tabElastic, valsEl, hintEl, applyBtn, clearBtn, presetsBtn, menuEl = null, hintTimer = null, defsHost = null;

    function ensureDefs() {
        if (defsHost && document.body.contains(defsHost)) return;
        defsHost = document.createElement("div"); defsHost.className = "gep-defs";
        defsHost.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs>' +
            '<linearGradient id="gepGradMain" gradientUnits="userSpaceOnUse" x1="' + X0 + '" y1="0" x2="' + X1 + '" y2="0"><stop offset="0" class="gep-s1"/><stop offset="0.5" class="gep-s2"/><stop offset="1" class="gep-s3"/></linearGradient>' +
            '<linearGradient id="gepGradTile" gradientUnits="userSpaceOnUse" x1="6" y1="0" x2="54" y2="0"><stop offset="0" class="gep-s1"/><stop offset="0.5" class="gep-s2"/><stop offset="1" class="gep-s3"/></linearGradient>' +
            '</defs></svg>';
        document.body.appendChild(defsHost);
    }

    function setHint(text, kind) {
        if (!hintEl) return;
        hintEl.textContent = text; hintEl.className = "gep-hint" + (kind ? " " + kind : "");
        clearTimeout(hintTimer);
        if (kind) hintTimer = setTimeout(function () { syncHint(); }, 3600);
    }
    function syncHint() {
        if (!hintEl) return;
        hintEl.className = "gep-hint";
        hintEl.textContent = state.mode === "elastic"
            ? "White handle: bounce size. Coloured handle: \u2192 faster, \u2191 settles quicker. Tap the grid button for presets."
            : "Drag the two handles, then Apply to the selected keyframes. Tap the grid button for presets.";
    }
    function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
    function syncVals() {
        if (!valsEl) return;
        var c = cur();
        if (state.mode === "elastic") { var p = elasticParams(c); valsEl.textContent = "size " + fmt(p.amp) + " \u00B7 speed " + fmt(p.freq) + " \u00B7 settle " + fmt(p.decay); }
        else valsEl.textContent = "(" + fmt(c.h1.x) + ", " + fmt(c.h1.y) + ", " + fmt(c.h2.x) + ", " + fmt(c.h2.y) + ")";
    }

    function line(x1, y1, x2, y2, cls) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="' + cls + '"/>'; }

    function render() {
        if (!svg) return;
        var c = cur(), cfg = curCfg(), i, h = "";
        for (i = 0; i <= 8; i++) { var gx = X0 + (i / 8) * (X1 - X0); h += line(gx, Y0, gx, Y1, "gep-grid"); }
        for (i = 0; i <= 6; i++) { var gy = Y0 + (i / 6) * (Y1 - Y0); h += line(X0, gy, X1, gy, "gep-grid"); }
        var p0 = toPx({ x: 0, y: 0 }), p1 = toPx({ x: 1, y: 1 });
        h += line(X0, p0.y, X1, p0.y, "gep-base") + line(X0, p1.y, X1, p1.y, "gep-base");
        var d = "";
        for (i = 0; i <= 160; i++) {
            var t = i / 160, y = clamp(curveY(t, cfg), YMIN, YMAX), p = toPx({ x: t, y: y });
            d += (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
        }
        h += '<path d="' + d + '" class="gep-curve" stroke="url(#gepGradMain)"/>';
        var a = toPx(c.h1), b = toPx(c.h2);
        if (state.mode === "easing") {
            h += line(p0.x, p0.y, a.x, a.y, "gep-guide") + line(b.x, b.y, p1.x, p1.y, "gep-guide");
            h += '<circle cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) + '" r="9.5" class="gep-handle gep-handle--w" stroke="url(#gepGradMain)" data-h="h1"/>';
            h += '<circle cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1) + '" r="9.5" class="gep-handle gep-handle--w" stroke="url(#gepGradMain)" data-h="h2"/>';
        } else {
            var r0 = toPx({ x: 0, y: 0 }), r1 = toPx({ x: 0, y: 1 }), wp = toPx({ x: 0, y: c.h1.y });
            h += line(r0.x, r0.y, r1.x, r1.y, "gep-rail");
            h += line(X0, b.y, X1, b.y, "gep-guide");
            h += '<text x="' + (X0 + 12).toFixed(1) + '" y="' + (wp.y + 3.5).toFixed(1) + '" class="gep-lab">size</text>';
            h += '<circle cx="' + wp.x.toFixed(1) + '" cy="' + wp.y.toFixed(1) + '" r="9.5" class="gep-handle gep-handle--w" stroke="url(#gepGradMain)" data-h="h1"/>';
            h += '<circle cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1) + '" r="9.5" class="gep-handle gep-handle--o" stroke="#fff" data-h="h2"/>';
        }
        svg.innerHTML = h;
        syncVals();
    }

    // ---- dragging ------------------------------------------------------------------------------------
    // The pointer must land exactly on the handle in every window size. Browsers disagree on what
    // getBoundingClientRect() returns inside a CSS-zoomed box (some give visual px, some give px divided by the
    // zoom), so we try both readings on mouse-down and keep the one that puts the pointer on the handle.
    function handleCentre(key) {
        var c = cur();
        if (state.mode === "elastic" && key === "h1") return toPx({ x: 0, y: c.h1.y });
        return toPx(c[key]);
    }
    function pickMapping(e, centre) {
        var r = svg.getBoundingClientRect(), k = (fitWrap && fitWrap.__apexZoom) || 1, best = null;
        var cands = [{ l: r.left, t: r.top, w: r.width, h: r.height }];
        if (Math.abs(k - 1) > 0.001) cands.push({ l: r.left * k, t: r.top * k, w: r.width * k, h: r.height * k });
        cands.forEach(function (m) {
            if (!m.w || !m.h) return;
            var px = (e.clientX - m.l) * (W / m.w), py = (e.clientY - m.t) * (H / m.h);
            m.err = Math.hypot(px - centre.x, py - centre.y);
            if (!best || m.err < best.err) best = m;
        });
        return best;
    }
    function startDrag(e) {
        var key = e.target && e.target.getAttribute && e.target.getAttribute("data-h");
        if (!key) return;
        e.preventDefault(); e.stopPropagation();
        var centre = handleCentre(key), m = pickMapping(e, centre); if (!m) return;
        var offX = centre.x - (e.clientX - m.l) * (W / m.w), offY = centre.y - (e.clientY - m.t) * (H / m.h);   // keep the grab point
        function move(ev) {
            var u = fromPx((ev.clientX - m.l) * (W / m.w) + offX, (ev.clientY - m.t) * (H / m.h) + offY);
            var c = cur();
            if (state.mode === "elastic") {
                if (key === "h1") c.h1 = { x: 0, y: clamp(u.y, 0, 1) };
                else c.h2 = { x: u.x, y: clamp(u.y, 0, 1) };
            } else c[key] = { x: u.x, y: clamp(u.y, YMIN, YMAX) };
            armedSlot = null; markTiles(); render();
        }
        function up() { window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); saveState(); }
        window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    }

    // ---- tabs / reset ----------------------------------------------------------------------------------
    function setMode(mode) {
        state.mode = mode;
        tabEasing.classList.toggle("is-active", mode === "easing");
        tabElastic.classList.toggle("is-active", mode === "elastic");
        clearBtn.hidden = mode !== "elastic";
        armedSlot = null; markTiles(); syncHint(); render(); saveState();
    }
    function resetCurve() { state[state.mode] = clone(DEFAULTS[state.mode]); armedSlot = null; markTiles(); render(); saveState(); }

    // ---- apply ----------------------------------------------------------------------------------------
    function n4(v) { return (Math.round(v * 10000) / 10000).toString(); }
    function applyCfg(cfg) {
        var E = window.AX && window.AX.E, n = E ? E.applyEase(cfg) : 0;
        if (!n) { setHint("Select a layer that has keyframes, then Apply.", "warn"); return; }
        setHint("Applied to " + n + " keyframe" + (n === 1 ? "" : "s"), "ok");
        if (window.AX && AX.toast) AX.toast(cfg.mode === "elastic" ? "Elastic applied" : "Graph applied");
    }
    function clearElastic() { var E = window.AX && window.AX.E; var n = E ? E.clearEase() : 0; setHint(n ? "Curve removed from " + n + " keyframes" : "No curve found on the selection.", n ? "ok" : ""); }

    // ---- presets -----------------------------------------------------------------------------------------
    function loadSlots(done) {
        try { slots = JSON.parse(window.localStorage.getItem(LS_SLOTS) || "{}") || {}; } catch (e) { slots = {}; }
        slotsLoaded = true; if (done) done();
    }
    function saveSlots() { try { window.localStorage.setItem(LS_SLOTS, JSON.stringify(slots)); } catch (e) {} }
    function tileSvg(cfg) {
        var S = 60, pd = 9, N = 44, d = "", i;
        function px(u) { return { x: pd + u.x * (S - 2 * pd), y: (S - pd) - ((clamp(u.y, YMIN, YMAX) - YMIN) / (YMAX - YMIN)) * (S - 2 * pd) }; }
        for (i = 0; i <= N; i++) { var t = i / N, p = px({ x: t, y: curveY(t, cfg) }); d += (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1); }
        var b0 = px({ x: 0, y: 0 }), b1 = px({ x: 0, y: 1 });
        return '<svg viewBox="0 0 ' + S + " " + S + '" aria-hidden="true"><line x1="' + pd + '" y1="' + b0.y.toFixed(1) + '" x2="' + (S - pd) + '" y2="' + b0.y.toFixed(1) + '" class="gep-pb"/>' +
            '<line x1="' + pd + '" y1="' + b1.y.toFixed(1) + '" x2="' + (S - pd) + '" y2="' + b1.y.toFixed(1) + '" class="gep-pb"/>' +
            '<path d="' + d + '" class="gep-pc" stroke="url(#gepGradTile)"/></svg>';
    }
    function slotName(i) {
        var s = slots[i]; if (!s) return "";
        return s.label || (s.mode === "elastic" ? "Elastic " : "Easing ") + i;
    }
    function renderTiles() {
        if (!gridEl) return;
        gridEl.innerHTML = "";
        for (var i = 1; i <= SLOTS; i++) (function (idx) {
            var data = slots[idx];
            var cell = document.createElement("div"); cell.className = "gep-slot";
            var tile = document.createElement("button"); tile.type = "button"; tile.setAttribute("data-slot", idx);
            tile.className = "gep-tile" + (data ? " filled" : "");
            if (data) { tile.innerHTML = tileSvg(data); tile.title = slotName(idx) + " \u2014 click to apply, right-click for more"; }
            else { tile.textContent = "+"; tile.title = "Save the curve in the editor here"; }
            tile.addEventListener("click", function () {
                if (!slots[idx]) { slots[idx] = cfgOf(state.mode); armedSlot = idx; saveSlots(); renderTiles(); setHint("Saved to slot " + idx, "ok"); return; }
                loadIntoEditor(idx); applyCfg(curCfg());
            });
            tile.addEventListener("contextmenu", function (e) {
                e.preventDefault(); e.stopPropagation();
                if (slots[idx]) openSlotMenu(idx, e.clientX, e.clientY);
            });
            var cap = document.createElement("div"); cap.className = "gep-cap"; cap.textContent = data && data.label ? data.label : "";
            cell.appendChild(tile); cell.appendChild(cap); gridEl.appendChild(cell);
        })(i);
        markTiles();
    }
    function markTiles() {
        if (!gridEl) return;
        var ts = gridEl.querySelectorAll(".gep-tile");
        for (var i = 0; i < ts.length; i++) ts[i].classList.toggle("on", armedSlot !== null && ts[i].getAttribute("data-slot") === String(armedSlot));
    }
    function loadIntoEditor(idx) {
        var s = slots[idx]; if (!s) return;
        var mode = s.mode === "elastic" ? "elastic" : "easing";
        state[mode] = { h1: { x: s.h1.x, y: s.h1.y }, h2: { x: s.h2.x, y: s.h2.y } };
        if (mode === "elastic") state.elastic.h1.x = 0;
        setMode(mode); armedSlot = idx; markTiles();
    }

    // ---- floating menus -------------------------------------------------------------------------------
    function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
    function placeMenu(m, x, y) {
        overlay.appendChild(m);
        var w = m.offsetWidth, h = m.offsetHeight;
        m.style.left = clamp(x, 4, Math.max(4, window.innerWidth - w - 4)) + "px";
        m.style.top = clamp(y, 4, Math.max(4, window.innerHeight - h - 4)) + "px";
    }
    function openSlotMenu(idx, x, y) {
        closeMenu();
        var m = document.createElement("div"); m.className = "gep-menu"; menuEl = m;
        m.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        m.addEventListener("click", function (e) { e.stopPropagation(); });
        m.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); });
        function item(label, fn, cls) {
            var b = document.createElement("button"); b.type = "button"; b.className = "gep-mi" + (cls ? " " + cls : ""); b.textContent = label;
            b.addEventListener("click", function (e) { fn(b, e); }); m.appendChild(b); return b;
        }
        item("Load into editor", function () { loadIntoEditor(idx); closeMenu(); });
        item("Rename", function () {
            m.innerHTML = "";
            var inp = document.createElement("input"); inp.type = "text"; inp.className = "gep-rename"; inp.maxLength = 18; inp.value = slots[idx].label || ""; inp.placeholder = "Preset name";
            m.appendChild(inp); inp.focus(); inp.select();
            function done(ok) { if (ok && slots[idx]) { var v = inp.value.replace(/^\s+|\s+$/g, ""); if (v) slots[idx].label = v; else delete slots[idx].label; saveSlots(); renderTiles(); } closeMenu(); }
            inp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") done(true); else if (e.key === "Escape") done(false); });
            inp.addEventListener("blur", function () { setTimeout(function () { if (menuEl === m) done(true); }, 0); });
        });
        item("Overwrite with current", function () {
            var label = slots[idx].label; slots[idx] = cfgOf(state.mode); if (label) slots[idx].label = label;
            armedSlot = idx; saveSlots(); renderTiles(); closeMenu(); setHint("Slot " + idx + " updated", "ok");
        });
        item("Delete", function (b) {
            if (!b.classList.contains("sure")) { b.classList.add("sure"); b.textContent = "Click again to delete"; return; }
            delete slots[idx]; if (armedSlot === idx) armedSlot = null; saveSlots(); renderTiles(); closeMenu();
        }, "danger");
        placeMenu(m, x, y);
    }

    function setPresets(on) {
        if (!presetsEl || !cardEl) return;
        presetsOpen = !!on;
        presetsBtn.classList.toggle("on", presetsOpen);
        closeMenu();
        if (on && !slotsLoaded) { renderTiles(); loadSlots(renderTiles); } else if (on) renderTiles();
        cardEl.classList.toggle("show-presets", presetsOpen);   // graph editor fades out, presets fade in, same spot
    }
    function togglePresets() { setPresets(!presetsOpen); }

    // ---- panel position (drag by the header, remembered) ---------------------------------------------
    function loadPos() {
        try { var o = JSON.parse(window.localStorage.getItem(LS_POS) || "null"); if (o && isFinite(o.dx) && isFinite(o.dy)) pos = { dx: +o.dx, dy: +o.dy }; } catch (e) {}
    }
    function savePos() { try { window.localStorage.setItem(LS_POS, JSON.stringify(pos)); } catch (e) {} }
    // ---- panel size: the whole panel scales uniformly; limits keep it inside the window ----
    function loadScaleSaved() { try { var v = parseFloat(window.localStorage.getItem(LS_SCALE)); return isFinite(v) && v > 0 ? v : null; } catch (e) { return null; } }
    function saveScale() { try { window.localStorage.setItem(LS_SCALE, String(scale)); } catch (e) {} }
    function natSize() {   // size of the panel at scale 1
        var z = fitWrap.style.zoom; fitWrap.style.zoom = "1";
        var o = { w: fitWrap.offsetWidth || 372, h: fitWrap.offsetHeight || 460 };
        fitWrap.style.zoom = z; return o;
    }
    function scaleLimits() {
        var n = natSize(), M = 8, mx = Math.min((window.innerWidth - 2 * M) / n.w, (window.innerHeight - 2 * M) / n.h);
        mx = Math.max(0.3, mx); return { min: Math.min(0.55, mx), max: mx, nw: n.w };
    }
    function applyScale(s) {
        var lim = scaleLimits();
        scale = clamp(s, lim.min, lim.max);
        fitWrap.style.zoom = scale; fitWrap.__apexZoom = scale;
        return lim;
    }
    function defaultScale() { return Math.min(1, (window.innerWidth - 20) / scaleLimits().nw); }
    function startResize(e) {
        e.preventDefault(); e.stopPropagation();
        var r0 = posEl.getBoundingClientRect(), s0 = scale, x0 = e.clientX, y0 = e.clientY, w0 = r0.width || 1, h0 = r0.height || 1, L0 = r0.left, T0 = r0.top;
        posEl.classList.add("dragging");
        function move(ev) {
            var ds = ((ev.clientX - x0) / w0 + (ev.clientY - y0) / h0) / 2;
            applyScale(s0 * (1 + ds));
            var w = posEl.offsetWidth, h = posEl.offsetHeight;
            pos.dx = L0 - (window.innerWidth - w) / 2; pos.dy = T0 - (window.innerHeight - h) / 2;   // keep the top-left corner where it was
            var c = placePanel(true); pos.dx = c.x; pos.dy = c.y;
        }
        function up() {
            window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", up, true);
            if (posEl) posEl.classList.remove("dragging");
            saveScale(); savePos();
        }
        window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    }
    // Puts the panel at its remembered spot, nudged just enough to keep it inside the window. Returns the clamped offset.
    function placePanel(instant) {
        if (!posEl) return { x: pos.dx, y: pos.dy };
        var W0 = window.innerWidth, H0 = window.innerHeight, w = posEl.offsetWidth, h = posEl.offsetHeight, M = 8;
        var baseL = (W0 - w) / 2, baseT = (H0 - h) / 2;
        var minX = M - baseL, maxX = W0 - M - w - baseL, minY = M - baseT, maxY = H0 - M - h - baseT;
        var x = maxX < minX ? (minX + maxX) / 2 : clamp(pos.dx, minX, maxX);
        var y = maxY < minY ? (minY + maxY) / 2 : clamp(pos.dy, minY, maxY);
        if (instant) posEl.style.transition = "none";
        posEl.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
        if (instant) { void posEl.offsetWidth; posEl.style.transition = ""; }
        return { x: x, y: y };
    }
    function startPanelDrag(e) {
        if (e.target.closest && e.target.closest("button")) return;
        e.preventDefault();
        var sx = e.clientX, sy = e.clientY, p0 = { dx: pos.dx, dy: pos.dy };
        posEl.classList.add("dragging");
        function move(ev) {
            pos.dx = p0.dx + (ev.clientX - sx); pos.dy = p0.dy + (ev.clientY - sy);
            var r = placePanel(true); pos.dx = r.x; pos.dy = r.y;
        }
        function up() {
            window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true);
            if (posEl) posEl.classList.remove("dragging");
            savePos();
        }
        window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    }
    function onWinResize() { if (!fitWrap) return; applyScale(loadScaleSaved() || scale); placePanel(true); }

    // ---- open / close ------------------------------------------------------------------------------
    var ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var ICON_RESET = '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 107.5-7.5H8"/><path d="M10.5 1.8L7.7 4.5l2.8 2.7"/></svg>';
    var ICON_PRESETS = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/></svg>';

    function onKey(e) {
        if (e.key === "Escape") {
            e.stopPropagation(); e.preventDefault();
            if (menuEl) closeMenu(); else if (presetsEl && presetsOpen) setPresets(false); else closeEditor();
            return;
        }
        // the Graph editor shortcut (default G) closes the popup again
        // while the popup is open the timeline shortcuts (Space, Delete, ...) must not fire behind it
        var tag = (e.target && e.target.tagName) || "";
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.stopPropagation();
    }
    function openEditor() {
        if (overlay) return;
        ensureDefs(); loadState(); loadPos(); presetsOpen = false;
        overlay = document.createElement("div"); overlay.className = "gep-overlay"; overlay.id = "gepOverlay";
        overlay.innerHTML =
            '<div class="gep-pos" id="gepPos"><div class="gep-fit" id="gepFit">' +
              '<div class="gep-card" id="gepCard">' +
                '<div class="gep-head">' +
                  '<div class="gep-tabs"><button type="button" class="gep-tab" id="gepTabEasing">Easing</button><button type="button" class="gep-tab" id="gepTabElastic">Elastic</button></div>' +
                  '<span class="gep-grow"></span>' +
                  '<button type="button" class="gep-ib" id="gepReset" title="Reset this curve">' + ICON_RESET + '</button>' +
                  '<button type="button" class="gep-ib" id="gepPresetsBtn" title="Presets">' + ICON_PRESETS + '</button>' +
                  '<button type="button" class="gep-ib" id="gepClose" title="Close (Esc)">' + ICON_X + '</button>' +
                '</div>' +
                '<div class="gep-stack">' +
                  '<div class="gep-body" id="gepBody">' +
                    '<div class="gep-canvas" id="gepCanvas"><svg id="gepSvg" viewBox="0 0 ' + W + " " + H + '" xmlns="' + NS + '"></svg></div>' +
                    '<div class="gep-foot"><div class="gep-vals" id="gepVals"></div><button type="button" class="gep-btn" id="gepClear" hidden title="Remove the elastic expression from the selected keyframes">Clear</button><button type="button" class="gep-apply" id="gepApply">Apply</button></div>' +
                    '<div class="gep-hint" id="gepHint"></div>' +
                  '</div>' +
                  '<div class="gep-pbody" id="gepPresets">' +
                    '<div class="gep-ptitle"><span>Presets</span><small>' + SLOTS + ' slots</small></div>' +
                    '<div class="gep-grid4" id="gepGrid"></div>' +
                    '<div class="gep-phint">Tap = apply \u00B7 "+" = save current curve \u00B7 press-and-hold a preset for Rename / Delete</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="gep-resize" id="gepResize" aria-label="Resize"><svg viewBox="0 0 16 16"><path d="M14 5L5 14M14 10L10 14"/></svg></button>' +
            '</div>';
        document.body.appendChild(overlay);
        posEl = overlay.querySelector("#gepPos"); fitWrap = overlay.querySelector("#gepFit"); svg = overlay.querySelector("#gepSvg"); presetsEl = overlay.querySelector("#gepPresets"); cardEl = overlay.querySelector("#gepCard"); resizeEl = overlay.querySelector("#gepResize"); gridEl = overlay.querySelector("#gepGrid");
        tabEasing = overlay.querySelector("#gepTabEasing"); tabElastic = overlay.querySelector("#gepTabElastic");
        valsEl = overlay.querySelector("#gepVals"); hintEl = overlay.querySelector("#gepHint"); applyBtn = overlay.querySelector("#gepApply");
        clearBtn = overlay.querySelector("#gepClear"); presetsBtn = overlay.querySelector("#gepPresetsBtn");

        // click on the dim background closes; clicks inside the card / presets never do
        overlay.addEventListener("pointerdown", function (e) { if (e.target === overlay || e.target === posEl || e.target === fitWrap) closeEditor(); });
        overlay.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        cardEl.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); closeMenu(); togglePresets(); });
        overlay.querySelector("#gepClose").addEventListener("click", closeEditor);
        overlay.querySelector("#gepReset").addEventListener("click", resetCurve);
        presetsBtn.addEventListener("click", togglePresets);
        tabEasing.addEventListener("click", function () { setMode("easing"); });
        tabElastic.addEventListener("click", function () { setMode("elastic"); });
        applyBtn.addEventListener("click", function () { applyCfg(curCfg()); });
        clearBtn.addEventListener("click", clearElastic);
        svg.addEventListener("pointerdown", startDrag);
        var headEl = overlay.querySelector(".gep-head");
        headEl.addEventListener("pointerdown", startPanelDrag);
        headEl.addEventListener("dblclick", function (e) { if (e.target.closest && e.target.closest("button")) return; pos = { dx: 0, dy: 0 }; savePos(); applyScale(defaultScale()); saveScale(); placePanel(false); });
        resizeEl.addEventListener("pointerdown", startResize);
        document.addEventListener("keydown", onKey, true);

        btn.classList.add("on");
        setMode(state.mode);
        renderTiles();
        if (!slotsLoaded) loadSlots(renderTiles);
        applyScale(loadScaleSaved() || defaultScale());
        placePanel(true);
        window.addEventListener("resize", onWinResize);
        requestAnimationFrame(function () { placePanel(true); });
        window.addEventListener("apex-theme", render);
    }
    function closeEditor() {
        if (!overlay) return;
        closeMenu();
        if (stopFit) { stopFit(); stopFit = null; }
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("apex-theme", render);
        window.removeEventListener("resize", onWinResize);
        overlay.remove(); overlay = posEl = fitWrap = svg = presetsEl = gridEl = cardEl = resizeEl = null; presetsOpen = false;
        btn.classList.remove("on");
    }

    btn.addEventListener("click", function (e) { e.stopPropagation(); if (overlay) closeEditor(); else openEditor(); });
})();
