/* =========================================================
   The Comfort of Looking Back — main.js
   网站的全部交互都在这个文件里。每个页面都会加载它。

   WHAT THIS FILE DOES / 这个文件做了什么
   0. Remembers which landing page (2026 or 2000s) you are browsing, so
      "Home" on the other pages takes you back to the right one.
      记住你在看哪个首页（2026 还是 2000s），其他页面的 "Home" 就能带你回去。
   1. Gives each object on the landing page its own floating motion.
      让首页上每个物体都有自己的飘动方式。
   2. Works out which parts of each image are visible (not transparent).
      算出每张图片哪些地方是看得见的（不透明的）。
   3. Hover, drag and click on the objects.
      物体的悬停、拖拽和点击。
   4. The clock: drops down when clicked, then opens the other landing page.
      时钟：点击后往下掉一点，然后打开另一个首页。
   ========================================================= */

// Wrapping everything in a function keeps these variables private to this file.
// 把所有代码包在一个函数里，这些变量就不会和别的代码冲突。
(function () {
  "use strict"; // catches common mistakes / 帮你发现常见错误

  /* ---------- 0. Remember the current era / 记住当前年代 ---------- */

  // Small helper to read or save a value in sessionStorage
  // (browser memory that lasts until the tab is closed).
  // try/catch: if the browser blocks storage, the site still works.
  // 一个小工具：在 sessionStorage 里读或存一个值（关掉标签页前一直有效）。
  // try/catch：就算浏览器禁止存储，网站也照样能用。
  function store(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key); // read / 读取
      sessionStorage.setItem(key, value);                         // save / 保存
    } catch (e) { /* storage blocked: fall back to defaults / 存储被禁用就用默认值 */ }
    return null;
  }

  // Only the two landing pages have a .collage element.
  // 只有两个首页上有 .collage 这个元素。
  const collage = document.querySelector(".collage");

  if (collage) {
    // On a landing page: save which one it is ("2026" or "2000s").
    // 在首页：记下这是哪个首页（"2026" 或 "2000s"）。
    store("era", collage.dataset.era);
  } else if (store("era") === "2000s") {
    // On any other page, if the visitor came from the 2000s page,
    // point every "Home" link to 2000s.html instead of index.html.
    // 在其他页面：如果访问者是从 2000s 首页来的，
    // 就把所有 "Home" 链接从 index.html 改成 2000s.html。
    document.querySelectorAll("a[data-home]").forEach(function (a) {
      a.href = a.getAttribute("href").replace("index.html", "2000s.html");
    });
  }

  // Everything below is only for the landing pages, so stop here on other pages.
  // 下面的代码只给首页用，其他页面到这里就结束了。
  if (!collage) return;

  const objects = Array.from(collage.querySelectorAll(".object")); // all the objects / 所有物体
  // true if the visitor turned on "Reduce motion" in system settings
  // 访问者在系统里开启了"减少动态效果"时为 true
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // random number between min and max / 生成 min 到 max 之间的随机数
  const rand = function (min, max) { return min + Math.random() * (max - min); };


  /* ---------- 1. Floating: different for each object / 飘动：每个物体都不一样 ---------- */

  // The float animation itself is in style.css (@keyframes float).
  // Here each object gets random values, so they don't all move in sync.
  // 飘动动画本身写在 style.css（@keyframes float）里。
  // 这里给每个物体随机的数值，让它们不会整齐地一起动。
  objects.forEach(function (a) {
    const s = a.style;
    s.setProperty("--fx", rand(-12, 12).toFixed(1) + "px");          // how far left/right / 左右飘多远
    s.setProperty("--fy", rand(-16, 16).toFixed(1) + "px");          // how far up/down / 上下飘多远
    s.setProperty("--fr", rand(-2.5, 2.5).toFixed(2) + "deg");       // how much it tilts / 倾斜多少
    s.setProperty("--float-dur", rand(3.5, 7).toFixed(2) + "s");     // how slow / 飘一次多久
    s.setProperty("--float-delay", (-rand(0, 7)).toFixed(2) + "s");  // start at a random point / 从随机的位置开始

    // Starting values used by dragging (see part 3).
    // 拖拽要用到的初始值（见第 3 部分）。
    a.dataset.dx = "0";                                    // dragged distance, x / 横向拖了多远
    a.dataset.dy = "0";                                    // dragged distance, y / 纵向拖了多远
    a.dataset.r = parseFloat(s.getPropertyValue("--r")) || 0; // rotation from Figma / Figma 里的旋转角度
  });


  /* ---------- 2. Masks: which parts of each image are visible / 遮罩：图片哪里看得见 ----------
     Each object's HTML has a data-mask attribute: a 32 × 32 grid of 1s and
     0s (written in hexadecimal to keep it short). 1 = visible, 0 = transparent.
     This lets a click on a transparent corner go to the object underneath.
     每个物体的 HTML 里有一个 data-mask：一个 32 × 32 的 1 和 0 网格
     （用十六进制写，比较短）。1 = 看得见，0 = 透明。
     这样点到透明的边角时，会点到下面的那个物体。 */
  const MASK_SIZE = 32;
  objects.forEach(function (a) {
    const hex = a.dataset.mask;
    if (!hex) return; // photos without transparency have no mask: the whole box counts / 没有透明部分的照片没有遮罩，整个框都算
    const bits = new Uint8Array(MASK_SIZE * MASK_SIZE);
    for (let i = 0; i < hex.length; i++) {
      const n = parseInt(hex[i], 16);                                         // one hex digit = 4 grid cells / 一个十六进制字符 = 4 个格子
      for (let b = 0; b < 4; b++) bits[i * 4 + b] = (n >> (3 - b)) & 1;
    }
    a._mask = bits;
  });

  // z-index counter: the last object you picked up goes on top.
  // 层级计数器：最后拿起的物体放在最上面。
  let zTop = 100;

  // Is the point (x, y) on a visible part of this object?
  // 点 (x, y) 是不是落在这个物体看得见的部分上？
  function hits(a, x, y) {
    // the object's center on screen / 物体在屏幕上的中心点
    const rect = a.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const w = a.offsetWidth;   // size before rotation / 旋转前的宽
    const h = a.offsetHeight;  // size before rotation / 旋转前的高
    const rad = (-parseFloat(a.dataset.r) * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    // Undo the object's rotation, so we can check the point against the
    // un-rotated image. / 把物体的旋转"转回去"，再判断点在图片的哪个位置。
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    // u, v = position inside the image, from 0 to 1 / u, v = 在图片里的位置，0 到 1
    const u = (lx + w / 2) / w;
    const v = (ly + h / 2) / h;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false; // outside the image / 在图片外面
    if (!a._mask) return true;
    return a._mask[Math.floor(v * MASK_SIZE) * MASK_SIZE + Math.floor(u * MASK_SIZE)] === 1;
  }

  // Find the topmost object under the mouse (highest z-index wins;
  // if equal, the one that comes later in the HTML is on top).
  // 找出鼠标下方最上面的那个物体（z-index 高的优先；一样高就看 HTML 里谁在后面）。
  function objectAt(x, y) {
    let best = null;
    let bestZ = -Infinity;
    objects.forEach(function (a, i) {
      const z = (parseInt(a.style.zIndex, 10) || 0) * 1000 + i;
      if (z > bestZ && hits(a, x, y)) { best = a; bestZ = z; }
    });
    return best;
  }


  /* ---------- 3. Hover, drag and click / 悬停、拖拽和点击 ---------- */

  let hovered = null; // the object under the mouse right now / 鼠标当前停在哪个物体上
  let drag = null;    // info about the current drag, or null / 正在拖拽的信息，没在拖时是 null

  // Turn the hover effect (pink glow + name tag) on for one object.
  // 给一个物体打开悬停效果（粉色光晕 + 名字标签）。
  function setHover(a) {
    if (hovered === a) return;
    if (hovered) hovered.classList.remove("is-hover");
    hovered = a;
    if (a) a.classList.add("is-hover");
    collage.classList.toggle("has-hover", !!a); // show the pointer cursor / 显示小手指针
  }

  // Mouse moves: either move the dragged object, or update the hover effect.
  // 鼠标移动时：如果正在拖拽就移动物体，否则更新悬停效果。
  collage.addEventListener("pointermove", function (ev) {
    if (drag) {
      const cqw = collage.clientWidth / 100;  // 1cqw in px / 1cqw 等于多少像素
      const mx = ev.clientX - drag.startX;    // how far the mouse moved / 鼠标移动了多远
      const my = ev.clientY - drag.startY;
      // Moving less than 5px still counts as a click, not a drag.
      // 移动不到 5px 还算点击，不算拖拽。
      if (!drag.moved && Math.hypot(mx, my) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        drag.el.classList.add("is-dragging");  // stop floating + shadow / 停止飘动 + 阴影
        collage.classList.add("is-grabbing");  // grabbing cursor / 抓取指针
      }
      // Distance is saved in cqw, so it stays right if the window is resized.
      // 距离用 cqw 保存，改变窗口大小时位置也不会错。
      const dx = drag.baseDx + mx / cqw;
      const dy = drag.baseDy + my / cqw;
      drag.el.dataset.dx = dx;
      drag.el.dataset.dy = dy;
      drag.el.style.setProperty("--dx", dx.toFixed(3)); // CSS uses --dx/--dy to move it / CSS 用 --dx/--dy 来移动它
      drag.el.style.setProperty("--dy", dy.toFixed(3));
      return;
    }
    if (ev.pointerType === "mouse") setHover(objectAt(ev.clientX, ev.clientY));
  });

  // Mouse leaves the collage: remove hover. / 鼠标离开拼贴区域：取消悬停。
  collage.addEventListener("pointerleave", function () { if (!drag) setHover(null); });

  // Mouse button pressed: pick up the object under the mouse.
  // 按下鼠标：拿起鼠标下面的物体。
  collage.addEventListener("pointerdown", function (ev) {
    if (ev.button !== 0) return; // left button only / 只响应左键
    const a = objectAt(ev.clientX, ev.clientY);
    if (!a) return;              // pressed on empty space / 按在空白处
    ev.preventDefault();
    zTop += 1;
    a.style.zIndex = zTop;       // bring it to the front / 放到最上层
    drag = {
      el: a,                                 // the object / 被拖的物体
      startX: ev.clientX,                    // where the mouse started / 鼠标起点
      startY: ev.clientY,
      baseDx: parseFloat(a.dataset.dx),      // where the object already was / 物体原来已经被拖到的位置
      baseDy: parseFloat(a.dataset.dy),
      moved: false,                          // becomes true once it's a real drag / 真正拖动后变成 true
      pointerId: ev.pointerId,
    };
    // Keep receiving mouse events even if the mouse leaves the collage.
    // 鼠标移出拼贴区域也继续接收事件。
    try { collage.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  });

  // Mouse button released: put the object down.
  // If the mouse barely moved, it was a click, so open the object's page.
  // 松开鼠标：放下物体。如果鼠标几乎没动，就是点击，打开这个物体的页面。
  function endDrag(ev, cancelled) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    collage.classList.remove("is-grabbing");
    d.el.classList.remove("is-dragging");
    if (!d.moved && !cancelled) {
      window.location.href = d.el.href; // go to the item page / 跳到物品详情页
    }
  }

  collage.addEventListener("pointerup", function (ev) { endDrag(ev, false); });
  collage.addEventListener("pointercancel", function (ev) { endDrag(ev, true); });

  // The objects are real <a> links. Mouse clicks are handled above, so we
  // block the browser's own click; keyboard (Tab + Enter) still works normally.
  // 物体本身是真正的 <a> 链接。鼠标点击已经在上面处理了，所以拦下浏览器自己的点击；
  // 键盘操作（Tab + Enter）仍然正常。
  objects.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (ev.detail !== 0) ev.preventDefault(); // detail is 0 for keyboard clicks / 键盘触发时 detail 是 0
    });
  });

  // Respect "Reduce motion": no floating. / 尊重"减少动态效果"：不飘动。
  if (reduceMotion) {
    objects.forEach(function (a) { a.querySelector("img").style.animation = "none"; });
  }


  /* ---------- 4. The clock: drop, then switch era / 时钟：往下掉，然后切换年代 ----------
     The drop animation is in style.css (@keyframes drop). Here we:
     1) stop the link from opening right away,
     2) add the .is-dropping class to start the animation,
     3) open the other landing page when the animation ends.
     下落动画写在 style.css（@keyframes drop）里。这里做三件事：
     1）阻止链接马上跳转；2）加上 .is-dropping 开始播放动画；3）动画结束后再打开另一个首页。 */
  const clock = document.querySelector(".era-switch");

  if (clock) {
    clock.addEventListener("click", function (ev) {
      // Let Cmd/Ctrl-click open a new tab as usual; skip the animation if
      // motion is reduced. / Cmd/Ctrl+点击照常开新标签页；关闭动态效果时也不播放动画。
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || reduceMotion) return;
      ev.preventDefault();
      if (clock.classList.contains("is-dropping")) return; // ignore double clicks / 忽略连点

      clock.classList.add("is-dropping");
      let gone = false; // make sure we only navigate once / 确保只跳转一次
      const go = function () {
        if (gone) return;
        gone = true;
        window.location.href = clock.href;
      };
      clock.addEventListener("animationend", function (e) {
        if (e.animationName === "drop") go();
      });
      setTimeout(go, 800); // backup, in case the animation doesn't fire / 保险：万一动画事件没触发也能跳转
    });

    // When you come back with the browser's Back button, the page may be
    // restored from memory with the clock still "dropped". Reset it.
    // 用浏览器的返回键回来时，页面可能是从缓存恢复的，时钟还停在掉下去的位置，这里把它复原。
    window.addEventListener("pageshow", function () { clock.classList.remove("is-dropping"); });
  }
})();
