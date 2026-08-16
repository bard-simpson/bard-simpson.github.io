/* Procedural 3D Japanese town (machi) — CSS 3D, no external libs */
(function (global) {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const PAL = {
    wall: ["#e8e2d6", "#f3efe6", "#d9d2c5", "#efe8da"],
    wood: ["#6b3f2a", "#8a5340", "#5a3424", "#7a4a32"],
    roof: ["#2c3038", "#3a2420", "#1f2430", "#4a3030", "#243028"],
    noren: ["#b54a4a", "#3d6b8c", "#d9a441", "#5d7a4a"],
    glow: "#f0b37a",
    water: "#1a3a4a",
    green: ["#2f5d3a", "#3f6b45", "#254a30"]
  };

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function createTown(container, options) {
    options = options || {};
    const seed = options.seed || 20260815;
    const rng = mulberry32(seed);
    const reduced = REDUCED || options.reduced;

    container.innerHTML = "";
    container.classList.add("machi-root");

    const stage = document.createElement("div");
    stage.className = "machi-stage";
    const world = document.createElement("div");
    world.className = "machi-world";
    const ground = document.createElement("div");
    ground.className = "machi-ground";
    world.appendChild(ground);

    // River
    const river = document.createElement("div");
    river.className = "machi-river";
    world.appendChild(river);
    for (let i = 0; i < 8; i++) {
      const shimmer = document.createElement("span");
      shimmer.className = "machi-shimmer";
      shimmer.style.left = 10 + i * 11 + "%";
      shimmer.style.animationDelay = (i * 0.4).toFixed(2) + "s";
      river.appendChild(shimmer);
    }

    // Bridge
    const bridge = document.createElement("div");
    bridge.className = "machi-bridge";
    world.appendChild(bridge);

    // Main roads
    const roadH = document.createElement("div");
    roadH.className = "machi-road horizontal";
    world.appendChild(roadH);
    const roadV = document.createElement("div");
    roadV.className = "machi-road vertical";
    world.appendChild(roadV);

    // Torii at town entrance
    world.appendChild(makeTorii(-420, 180, 1.15));
    world.appendChild(makeTorii(40, -60, 0.85));

    // Pagoda landmark
    world.appendChild(makePagoda(260, -210, 1));

    // Shrine cluster
    world.appendChild(makeShrine(-300, -260));

    // Buildings grid — commercial street + residential blocks
    const buildings = [];
    // Shopping street along X
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      const x = i * 78;
      const z = 70 + (rng() - 0.5) * 20;
      buildings.push(makeBuilding(x, z, {
        w: 54 + rng() * 24,
        d: 46 + rng() * 18,
        h: 46 + rng() * 50,
        shop: true,
        rng
      }));
    }
    // Far bank residences
    for (let i = -4; i <= 4; i++) {
      for (let j = 0; j < 2; j++) {
        const x = i * 90 + (rng() - 0.5) * 20;
        const z = -150 - j * 85 + (rng() - 0.5) * 18;
        buildings.push(makeBuilding(x, z, {
          w: 48 + rng() * 22,
          d: 42 + rng() * 16,
          h: 40 + rng() * 36,
          shop: false,
          rng
        }));
      }
    }
    // Near bank blocks
    for (let i = -4; i <= 4; i++) {
      const x = i * 95 + (rng() - 0.5) * 16;
      const z = 170 + (rng() - 0.5) * 24;
      buildings.push(makeBuilding(x, z, {
        w: 50 + rng() * 30,
        d: 44 + rng() * 20,
        h: 52 + rng() * 70,
        shop: rng() > 0.4,
        rng
      }));
    }
    buildings.forEach((b) => world.appendChild(b));

    // Lanterns along street
    for (let i = -6; i <= 6; i++) {
      world.appendChild(makeLantern(i * 70, 40, rng));
      if (Math.abs(i) > 1) world.appendChild(makeLantern(i * 70, 110, rng));
    }

    // Trees / pines
    for (let i = 0; i < (reduced ? 10 : 22); i++) {
      const x = (rng() - 0.5) * 900;
      const z = (rng() - 0.5) * 700;
      if (Math.abs(z) < 40 && Math.abs(x) < 200) continue;
      world.appendChild(makeTree(x, z, 0.7 + rng() * 0.7, rng));
    }

    // Train cars subtle motion on far track
    const track = document.createElement("div");
    track.className = "machi-track";
    world.appendChild(track);
    const train = document.createElement("div");
    train.className = "machi-train";
    for (let i = 0; i < 4; i++) {
      const car = document.createElement("span");
      car.className = "machi-car";
      train.appendChild(car);
    }
    world.appendChild(train);

    // Mountain silhouettes (billboards)
    const mount = document.createElement("div");
    mount.className = "machi-mountains";
    world.appendChild(mount);

    // Clouds
    for (let i = 0; i < (reduced ? 2 : 5); i++) {
      const c = document.createElement("div");
      c.className = "machi-cloud c" + i;
      c.style.animationDelay = (-i * 3.5).toFixed(1) + "s";
      world.appendChild(c);
    }

    // Ambient fireflies / dust
    const sparks = document.createElement("div");
    sparks.className = "machi-sparks";
    const sparkN = reduced ? 8 : 20;
    for (let i = 0; i < sparkN; i++) {
      const s = document.createElement("span");
      s.style.left = rng() * 100 + "%";
      s.style.top = rng() * 100 + "%";
      s.style.animationDelay = (rng() * 5).toFixed(2) + "s";
      sparks.appendChild(s);
    }
    stage.appendChild(sparks);

    stage.appendChild(world);
    container.appendChild(stage);

    const label = document.createElement("div");
    label.className = "machi-caption";
    label.innerHTML = "<p class=\"tag\">Machi</p><h2>A town grown from seed</h2><p>Procedural wooden streets, river light, torii, and tiled roofs — an entire Japanese town synthesized in 3D CSS.</p>";
    container.appendChild(label);

    const state = {
      mx: 0,
      my: 0,
      scrollLocal: 0,
      visible: 0,
      raf: 0,
      reduced
    };

    function frame() {
      if (state.reduced) {
        world.style.transform =
          "rotateX(58deg) rotateZ(-28deg) translate3d(0, 40px, 0) scale(0.92)";
        return;
      }
      const t = performance.now() * 0.001;
      const breathe = Math.sin(t * 0.35) * 6;
      const rx = 56 + state.my * 8 + state.scrollLocal * 6;
      const rz = -26 + state.mx * 14 - state.scrollLocal * 8;
      const ty = 30 + breathe + state.scrollLocal * -40;
      const sc = 0.9 + state.visible * 0.08;
      world.style.transform =
        "rotateX(" + rx.toFixed(2) + "deg) rotateZ(" + rz.toFixed(2) + "deg) translate3d(" +
        (state.mx * -30).toFixed(1) + "px," + ty.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
      state.raf = requestAnimationFrame(frame);
    }

    function onPointer(e) {
      const r = container.getBoundingClientRect();
      state.mx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * 2;
      state.my = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 2;
    }

    function onScroll() {
      const r = container.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when entering, 1 when centered/past
      const p = clamp(1 - Math.abs(r.top + r.height * 0.3) / (vh + r.height * 0.3), 0, 1);
      state.visible = p;
      state.scrollLocal = clamp((-r.top) / (r.height + vh), -0.2, 1);
      container.style.setProperty("--machi-vis", p.toFixed(3));
    }

    function start() {
      if (!state.reduced) {
        cancelAnimationFrame(state.raf);
        state.raf = requestAnimationFrame(frame);
      } else {
        frame();
      }
      onScroll();
    }

    function stop() {
      cancelAnimationFrame(state.raf);
    }

    container.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    start();

    return {
      destroy() {
        stop();
        container.removeEventListener("pointermove", onPointer);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        container.innerHTML = "";
      },
      refresh: onScroll
    };
  }

  function place(el, x, z) {
    el.style.transform = "translate3d(" + x + "px, " + z + "px, 0)";
    return el;
  }

  function makeBuilding(x, z, opt) {
    const rng = opt.rng;
    const w = opt.w;
    const d = opt.d;
    const h = opt.h;
    const el = document.createElement("div");
    el.className = "machi-building" + (opt.shop ? " shop" : "");
    el.style.setProperty("--w", w + "px");
    el.style.setProperty("--d", d + "px");
    el.style.setProperty("--h", h + "px");
    el.style.setProperty("--wall", pick(rng, PAL.wall));
    el.style.setProperty("--wood", pick(rng, PAL.wood));
    el.style.setProperty("--roof", pick(rng, PAL.roof));
    el.style.setProperty("--noren", pick(rng, PAL.noren));

    el.innerHTML =
      '<span class="face front"></span>' +
      '<span class="face back"></span>' +
      '<span class="face left"></span>' +
      '<span class="face right"></span>' +
      '<span class="roof"></span>' +
      (opt.shop ? '<span class="noren"></span><span class="sign"></span>' : "") +
      (rng() > 0.55 ? '<span class="lantern-wall"></span>' : "");

    // Windows as box-shadow density via data attr random
    el.style.setProperty("--win", (2 + Math.floor(rng() * 4)) + "");
    return place(el, x, z);
  }

  function makeTorii(x, z, s) {
    const el = document.createElement("div");
    el.className = "machi-torii";
    el.style.setProperty("--s", s);
    el.innerHTML =
      '<span class="hashira l"></span><span class="hashira r"></span>' +
      '<span class="kasagi"></span><span class="nuki"></span>';
    return place(el, x, z);
  }

  function makePagoda(x, z, s) {
    const el = document.createElement("div");
    el.className = "machi-pagoda";
    el.style.setProperty("--s", s);
    let html = "";
    for (let i = 0; i < 5; i++) {
      html += '<span class="tier t' + i + '"><i></i></span>';
    }
    html += '<span class="spire"></span>';
    el.innerHTML = html;
    return place(el, x, z);
  }

  function makeShrine(x, z) {
    const el = document.createElement("div");
    el.className = "machi-shrine";
    el.innerHTML =
      '<span class="base"></span><span class="hall"></span><span class="roof"></span><span class="rope"></span>';
    return place(el, x, z);
  }

  function makeLantern(x, z, rng) {
    const el = document.createElement("div");
    el.className = "machi-street-lantern";
    el.style.animationDelay = (rng() * 2).toFixed(2) + "s";
    el.innerHTML = '<span class="pole"></span><span class="paper"></span>';
    return place(el, x, z);
  }

  function makeTree(x, z, s, rng) {
    const el = document.createElement("div");
    el.className = "machi-tree";
    el.style.setProperty("--s", s);
    el.style.setProperty("--g", pick(rng, PAL.green));
    el.innerHTML = '<span class="trunk"></span><span class="canopy"></span>';
    return place(el, x, z);
  }

  // Auto-mount when section exists
  function mount(selector) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return null;
    return createTown(el);
  }

  global.BardMachi = { createTown, mount };
})(window);
