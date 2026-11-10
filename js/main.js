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
   3. Hover and click on the objects (they can't be dragged).
      物体的悬停和点击（物体不能拖动）。
   4. The square transition between the two landing pages (2 seconds).
      两个首页之间的方块转场（2 秒）。
   5. The clock: drops down when clicked, squares cover the screen, then the
      other landing page opens and the squares clear away.
      时钟：点击后往下掉一点，方块盖满屏幕，然后打开另一个首页，方块再散开。
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

    // Rotation from Figma, used to check clicks against the rotated image (part 2).
    // Figma 里的旋转角度，判断点击位置时要用到（第 2 部分）。
    a.dataset.r = parseFloat(s.getPropertyValue("--r")) || 0;
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

  // Find the topmost object under the mouse (the one that comes later in
  // the HTML is on top). / 找出鼠标下方最上面的那个物体（HTML 里越靠后的越在上面）。
  function objectAt(x, y) {
    let best = null;
    let bestZ = -Infinity;
    objects.forEach(function (a, i) {
      const z = (parseInt(a.style.zIndex, 10) || 0) * 1000 + i;
      if (z > bestZ && hits(a, x, y)) { best = a; bestZ = z; }
    });
    return best;
  }


  /* ---------- 3. Hover and click / 悬停和点击 ----------
     Objects can't be dragged; they float in place. Hovering shows the pink
     glow and name tag, and clicking opens the object's item page.
     物体不能拖动，只在原地飘动。悬停时显示粉色光晕和名字标签，点击打开物品详情页。 */

  let hovered = null; // the object under the mouse right now / 鼠标当前停在哪个物体上

  // Turn the hover effect (pink glow + name tag) on for one object.
  // 给一个物体打开悬停效果（粉色光晕 + 名字标签）。
  function setHover(a) {
    if (hovered === a) return;
    if (hovered) hovered.classList.remove("is-hover");
    hovered = a;
    if (a) a.classList.add("is-hover");
    collage.classList.toggle("has-hover", !!a); // show the pointer cursor / 显示小手指针
  }

  // Mouse moves: find the visible object under it and highlight it.
  // 鼠标移动：找出鼠标下面看得见的物体，并高亮它。
  collage.addEventListener("pointermove", function (ev) {
    if (ev.pointerType === "mouse") setHover(objectAt(ev.clientX, ev.clientY));
  });

  // Mouse leaves the collage: remove hover. / 鼠标离开拼贴区域：取消悬停。
  collage.addEventListener("pointerleave", function () { setHover(null); });

  // Click (or tap on a phone): open the page of the object under the pointer.
  // 点击（手机上是轻点）：打开鼠标下面那个物体的详情页。
  collage.addEventListener("click", function (ev) {
    if (ev.detail === 0) return;   // keyboard Enter on a focused object: let the link work normally / 键盘回车：让链接照常打开
    const a = objectAt(ev.clientX, ev.clientY);
    if (a) window.location.href = a.href;
  });

  // Respect "Reduce motion": no floating. / 尊重"减少动态效果"：不飘动。
  if (reduceMotion) {
    objects.forEach(function (a) { a.querySelector("img").style.animation = "none"; });
  }


  /* ---------- 4. The square transition / 方块转场 ----------
     A 2-second transition between the two landing pages:
       - COVER  (1s, on the page you leave): pink and white squares grow,
         starting at the top corners and cascading down in an arc, until
         the whole screen is covered.
       - REVEAL (1s, on the page you arrive at): the same squares shrink
         away in the same order, top to bottom, showing the new page.
     The squares are drawn on a <canvas> (a drawing surface) that sits on
     top of everything.
     两个首页之间 2 秒的转场：
       - 盖上（1 秒，在离开的页面）：粉白方块从顶部两角开始变大，
         以弧形一路往下铺，直到盖满整个屏幕。
       - 揭开（1 秒，在到达的页面）：同样的方块按同样的顺序从上往下缩小消失，露出新页面。
     方块画在一个盖在最上层的 <canvas>（画布）上。 */

  const T_COVER = 1000;          // cover time in ms / 盖上用时（毫秒）
  const T_REVEAL = 1000;         // reveal time in ms / 揭开用时（毫秒）
  const GROW = 0.32;             // each square takes 32% of the time to grow / 每个方块用 32% 的时间长大
  const PINK = "#e93392";
  const WHITE = "#ffffff";
  const PINK_SHARE = 0.55;       // about 55% of the squares are pink / 大约 55% 的方块是粉色

  // A random-number generator that always gives the same numbers for the
  // same "seed". Both pages use the same seed, so the pattern of pink and
  // white squares is identical when the page changes (no visible jump).
  // 一个"给同样的种子就给同样随机数"的生成器。两个页面用同一个种子，
  // 所以换页时粉白方块的图案完全一样，看不出跳动。
  function seededRandom(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Smooth start and end for each square's growth. / 让每个方块的变化开头和结尾都更顺滑。
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  // Build the grid of squares and the canvas to draw them on.
  // 建立方块网格和用来画方块的画布。
  function makeGrid(seed) {
    const canvas = document.createElement("canvas");
    canvas.className = "transition-canvas";
    canvas.setAttribute("aria-hidden", "true");
    // Added to <html> (not <body>) so it stays visible even while the body
    // is hidden on arrival. / 加在 <html> 上（不是 <body>），这样到达时 body 隐藏也不影响它。
    document.documentElement.appendChild(canvas);

    const dpr = window.devicePixelRatio || 1;   // sharp on Retina screens / 在 Retina 屏上也清晰
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const size = Math.max(24, Math.ceil(W / 32)); // square size: about 32 across the screen / 方块大小：一行大约 32 个
    const cols = Math.ceil(W / size);
    const rows = Math.ceil(H / size);
    const rand = seededRandom(seed);
    const mid = (cols - 1) / 2;
    const cells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // When does this square start? Lower rows start later (top → bottom),
        // and squares near the middle start a bit later than the edges,
        // which makes the arc that starts from the top corners.
        // 这个方块什么时候开始？越往下越晚（从上到下），
        // 越靠中间也稍晚一点，于是形成从顶部两角开始的弧形。
        const down = r / Math.max(1, rows - 1);                 // 0 at top, 1 at bottom / 顶部 0，底部 1
        const toMiddle = 1 - Math.abs(c - mid) / Math.max(1, mid); // 0 at the edges, 1 in the middle / 两边 0，中间 1
        const start = (down * 0.72 + toMiddle * 0.2 + rand() * 0.08) * (1 - GROW);
        cells.push({
          x: c * size,
          y: r * size,
          start: start,
          color: rand() < PINK_SHARE ? PINK : WHITE,
        });
      }
    }
    return { canvas: canvas, ctx: ctx, cells: cells, size: size, W: W, H: H };
  }

  // Draw one frame. progress goes from 0 to 1.
  // covering = true: squares grow; false: squares shrink.
  // 画一帧。progress 从 0 到 1。covering 为 true 时方块变大，为 false 时方块变小。
  function drawFrame(grid, progress, covering) {
    const ctx = grid.ctx;
    ctx.clearRect(0, 0, grid.W, grid.H);
    grid.cells.forEach(function (cell) {
      let p = (progress - cell.start) / GROW;     // this square's own progress / 这个方块自己的进度
      p = Math.min(1, Math.max(0, p));
      const k = covering ? ease(p) : 1 - ease(p); // 0 = invisible, 1 = full size / 0 = 看不见，1 = 完整大小
      if (k <= 0) return;
      const s = grid.size * k + 1;                // +1px hides thin gaps between squares / 多 1 像素，避免方块间出现细缝
      ctx.fillStyle = cell.color;
      // grow from the square's center / 从方块中心向外长
      ctx.fillRect(cell.x + (grid.size - s) / 2, cell.y + (grid.size - s) / 2, s, s);
    });
  }

  // Play the animation for `duration` ms, then call `done`.
  // 播放 duration 毫秒的动画，结束后执行 done。
  function play(grid, duration, covering, done) {
    const t0 = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - t0) / duration);
      drawFrame(grid, progress, covering);
      if (progress < 1) requestAnimationFrame(frame); // draw the next frame / 画下一帧
      else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  // ARRIVING: if we came here through the clock, start fully covered,
  // then reveal the page.
  // 到达：如果是点时钟过来的，先全部盖住，再揭开页面。
  const arrivingSeed = store("transition");
  if (arrivingSeed) {
    store("transition", "");                       // use it only once / 只用一次
    const grid = makeGrid(parseInt(arrivingSeed, 10));
    drawFrame(grid, 1, true);                      // fully covered right away / 一开始就完全盖住
    // Show the page under the squares, without the usual fade-in.
    // 显示方块下面的页面，不再播放平常的淡入。
    document.documentElement.classList.add("no-fade");
    document.documentElement.classList.remove("is-arriving");
    play(grid, T_REVEAL, false, function () { grid.canvas.remove(); });
  }


  /* ---------- 5. The clock: drop + cover, then switch era / 时钟：下落 + 盖上，然后切换年代 ----------
     The drop animation is in style.css (@keyframes drop). When the clock
     is clicked we:
     1) stop the link from opening right away,
     2) add .is-dropping so the clock drops, and start covering the screen,
     3) open the other landing page when the screen is covered.
     下落动画写在 style.css（@keyframes drop）里。点击时钟时：
     1）阻止链接马上跳转；2）加上 .is-dropping 让时钟下落，同时开始用方块盖住屏幕；
     3）屏幕盖满后再打开另一个首页。 */
  const clock = document.querySelector(".era-switch");

  if (clock) {
    const clockImg = clock.querySelector("img");
    let settle = null; // the "slowing down" animation, while it plays / 正在播放的"慢慢停下"动画

    // Read the watch's current angle (in degrees) from the browser.
    // 从浏览器读出怀表现在的角度（度）。
    function currentAngle() {
      const t = getComputedStyle(clockImg).transform;
      if (!t || t === "none") return 0;
      const m = new DOMMatrix(t);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    }

    // Mouse enters: start swinging (from rest, or from where it was settling).
    // 鼠标进入：开始摆动。
    clock.addEventListener("pointerenter", function () {
      if (reduceMotion) return;
      if (settle) { settle.cancel(); settle = null; }
      clock.classList.add("is-swinging");
    });

    // Mouse leaves: instead of snapping back, the watch keeps swinging a few
    // times, each smaller than the last, then stops, like a real pendulum.
    // 鼠标离开：怀表不会一下子弹回原位，而是继续摆几下、一下比一下小，然后停住，像真的钟摆。
    clock.addEventListener("pointerleave", function () {
      if (!clock.classList.contains("is-swinging")) return;
      if (clock.classList.contains("is-dropping")) return;      // leaving because the page is changing / 页面正在切换，不用处理
      const a = currentAngle();                                 // where the swing is right now / 摆到哪里了
      const start = Math.abs(a) < 3 ? (a < 0 ? -5 : 5) : a;     // always give it a little swing / 至少再轻轻摆一下
      clock.classList.remove("is-swinging");
      // Each keyframe swings to the other side, with a smaller angle.
      // "ease-in-out" on each step slows down at the ends of every swing, like a pendulum.
      // 每一帧摆到另一边，角度越来越小。每一段都用 ease-in-out，在摆到两端时放慢，像钟摆一样。
      const swing = "ease-in-out";
      settle = clockImg.animate([
        { transform: "rotate(" + a + "deg)", easing: swing },
        { transform: "rotate(" + (-start * 0.6) + "deg)", easing: swing },
        { transform: "rotate(" + (start * 0.32) + "deg)", easing: swing },
        { transform: "rotate(" + (-start * 0.14) + "deg)", easing: swing },
        { transform: "rotate(0deg)" },
      ], { duration: 1400 });
      settle.onfinish = function () { settle = null; };
    });

    clock.addEventListener("click", function (ev) {
      // Let Cmd/Ctrl-click open a new tab as usual; skip the animation if
      // motion is reduced. / Cmd/Ctrl+点击照常开新标签页；关闭动态效果时也不播放动画。
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || reduceMotion) return;
      ev.preventDefault();
      if (clock.classList.contains("is-dropping")) return; // ignore double clicks / 忽略连点

      clock.classList.add("is-dropping");

      const seed = Math.floor(Math.random() * 1e9);  // a new pattern every time / 每次都是新的图案
      const grid = makeGrid(seed);

      let gone = false; // make sure we only navigate once / 确保只跳转一次
      const go = function () {
        if (gone) return;
        gone = true;
        store("transition", String(seed));           // tell the next page to reveal with the same pattern / 告诉下一页用同样的图案揭开
        window.location.href = clock.href;
      };
      play(grid, T_COVER, true, go);
      setTimeout(go, T_COVER + 400); // backup, in case the animation is paused / 保险：万一动画被暂停也能跳转
    });

    // When you come back with the browser's Back button, the page may be
    // restored from memory with the clock "dropped" and the squares still
    // covering it. Reset both.
    // 用浏览器返回键回来时，页面可能是从缓存恢复的，时钟还在下面、方块还盖着。这里把两者都复原。
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      clock.classList.remove("is-dropping");
      document.querySelectorAll(".transition-canvas").forEach(function (c) { c.remove(); });
    });
  }
})();
