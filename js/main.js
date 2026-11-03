/* =========================================================
   The Comfort of Looking Back — interactions
   1. Landing pages: every object floats; drag to move it, click to open it.
      Clicks only count on the visible part of an image (not its transparent
      corners), so overlapping objects stay easy to reach.
   2. "Home" links return to whichever landing page (2026 / 2000s) you came from.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- remember which era the visitor is browsing ---------- */
  function store(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (e) { /* storage blocked: fall back to defaults */ }
    return null;
  }

  const collage = document.querySelector(".collage");

  if (collage) {
    store("era", collage.dataset.era);
  } else if (store("era") === "2000s") {
    document.querySelectorAll("a[data-home]").forEach(function (a) {
      a.href = a.getAttribute("href").replace("index.html", "2000s.html");
    });
  }

  if (!collage) return;

  const objects = Array.from(collage.querySelectorAll(".object"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = function (min, max) { return min + Math.random() * (max - min); };

  /* ---------- 1. gentle floating, different for each object ---------- */
  objects.forEach(function (a) {
    const s = a.style;
    s.setProperty("--fx", rand(-12, 12).toFixed(1) + "px");
    s.setProperty("--fy", rand(-16, 16).toFixed(1) + "px");
    s.setProperty("--fr", rand(-2.5, 2.5).toFixed(2) + "deg");
    s.setProperty("--float-dur", rand(3.5, 7).toFixed(2) + "s");
    s.setProperty("--float-delay", (-rand(0, 7)).toFixed(2) + "s");
    a.dataset.dx = "0";
    a.dataset.dy = "0";
    a.dataset.r = parseFloat(s.getPropertyValue("--r")) || 0;
  });

  /* ---------- 2. masks: which parts of each image are visible ---------- */
  const MASK_SIZE = 32;
  objects.forEach(function (a) {
    const hex = a.dataset.mask;
    if (!hex) return;
    const bits = new Uint8Array(MASK_SIZE * MASK_SIZE);
    for (let i = 0; i < hex.length; i++) {
      const n = parseInt(hex[i], 16);
      for (let b = 0; b < 4; b++) bits[i * 4 + b] = (n >> (3 - b)) & 1;
    }
    a._mask = bits;
  });

  let zTop = 100;

  // Is the point (clientX, clientY) on a visible pixel of this object?
  function hits(a, x, y) {
    const rect = a.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const w = a.offsetWidth;
    const h = a.offsetHeight;
    const rad = (-parseFloat(a.dataset.r) * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    // undo the rotation to get the point in the object's own coordinates
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    const u = (lx + w / 2) / w;
    const v = (ly + h / 2) / h;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    if (!a._mask) return true;
    return a._mask[Math.floor(v * MASK_SIZE) * MASK_SIZE + Math.floor(u * MASK_SIZE)] === 1;
  }

  // Topmost object under the pointer (highest z-index, then latest in the page)
  function objectAt(x, y) {
    let best = null;
    let bestZ = -Infinity;
    objects.forEach(function (a, i) {
      const z = (parseInt(a.style.zIndex, 10) || 0) * 1000 + i;
      if (z > bestZ && hits(a, x, y)) { best = a; bestZ = z; }
    });
    return best;
  }

  /* ---------- 3. hover, drag and click ---------- */
  let hovered = null;
  let drag = null; // { el, startX, startY, baseDx, baseDy, moved, pointerId }

  function setHover(a) {
    if (hovered === a) return;
    if (hovered) hovered.classList.remove("is-hover");
    hovered = a;
    if (a) a.classList.add("is-hover");
    collage.classList.toggle("has-hover", !!a);
  }

  collage.addEventListener("pointermove", function (ev) {
    if (drag) {
      const cqw = collage.clientWidth / 100;
      const mx = ev.clientX - drag.startX;
      const my = ev.clientY - drag.startY;
      if (!drag.moved && Math.hypot(mx, my) < 5) return; // tiny jitter = still a click
      if (!drag.moved) {
        drag.moved = true;
        drag.el.classList.add("is-dragging");
        collage.classList.add("is-grabbing");
      }
      const dx = drag.baseDx + mx / cqw;
      const dy = drag.baseDy + my / cqw;
      drag.el.dataset.dx = dx;
      drag.el.dataset.dy = dy;
      drag.el.style.setProperty("--dx", dx.toFixed(3));
      drag.el.style.setProperty("--dy", dy.toFixed(3));
      return;
    }
    if (ev.pointerType === "mouse") setHover(objectAt(ev.clientX, ev.clientY));
  });

  collage.addEventListener("pointerleave", function () { if (!drag) setHover(null); });

  collage.addEventListener("pointerdown", function (ev) {
    if (ev.button !== 0) return;
    const a = objectAt(ev.clientX, ev.clientY);
    if (!a) return;
    ev.preventDefault();
    zTop += 1;
    a.style.zIndex = zTop; // picked-up object comes to the front
    drag = {
      el: a,
      startX: ev.clientX,
      startY: ev.clientY,
      baseDx: parseFloat(a.dataset.dx),
      baseDy: parseFloat(a.dataset.dy),
      moved: false,
      pointerId: ev.pointerId,
    };
    try { collage.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  });

  function endDrag(ev, cancelled) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    collage.classList.remove("is-grabbing");
    d.el.classList.remove("is-dragging");
    if (!d.moved && !cancelled) {
      window.location.href = d.el.href; // a click without dragging opens the object
    }
  }

  collage.addEventListener("pointerup", function (ev) { endDrag(ev, false); });
  collage.addEventListener("pointercancel", function (ev) { endDrag(ev, true); });

  // keyboard users: links still work normally with Tab + Enter
  objects.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (ev.detail !== 0) ev.preventDefault(); // mouse clicks are handled above
    });
  });

  if (reduceMotion) {
    objects.forEach(function (a) { a.querySelector("img").style.animation = "none"; });
  }
})();
