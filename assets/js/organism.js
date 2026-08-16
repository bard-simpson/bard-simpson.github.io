/* Bard Simpson — living digital organism */
(function (global) {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(pointer: fine)").matches;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function createOrganism(options) {
    const canvas = options.canvas;
    const glCanvas = options.glCanvas;
    const root = options.root;
    const cursorEl = options.cursor;
    const ringEl = options.cursorRing;
    const progressEl = options.progress;
    const sceneLabel = options.sceneLabel;
    const soundBtn = options.soundBtn;
    const motionBtn = options.motionBtn;
    const nameRoot = options.nameRoot;

    const state = {
      w: 1,
      h: 1,
      dpr: 1,
      t: 0,
      mx: 0.5,
      my: 0.5,
      tx: 0.5,
      ty: 0.5,
      vx: 0,
      vy: 0,
      energy: 0,
      scroll: 0,
      scene: 0,
      pulse: 0,
      audio: false,
      motion: false,
      tiltX: 0, // -1..1 left/right (gamma)
      tiltY: 0, // -1..1 front/back (beta)
      lastPointer: 0,
      running: true,
      particles: [],
      ripples: [],
      nodes: [],
      last: performance.now()
    };

    // ---- Audio (adaptive ambient) ----
    let audioCtx = null;
    let master = null;
    let oscA = null;
    let oscB = null;
    let lfo = null;
    let noise = null;
    let filter = null;

    function ensureAudio() {
      if (audioCtx) return audioCtx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = 0.0001;
      master.connect(audioCtx.destination);

      filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 0.7;
      filter.connect(master);

      oscA = audioCtx.createOscillator();
      oscB = audioCtx.createOscillator();
      const gA = audioCtx.createGain();
      const gB = audioCtx.createGain();
      gA.gain.value = 0.03;
      gB.gain.value = 0.02;
      oscA.type = "sine";
      oscB.type = "triangle";
      oscA.frequency.value = 55;
      oscB.frequency.value = 82.5;
      oscA.connect(gA);
      oscB.connect(gB);
      gA.connect(filter);
      gB.connect(filter);

      // soft noise bed
      const bufferSize = 2 * audioCtx.sampleRate;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const ng = audioCtx.createGain();
      ng.gain.value = 0.012;
      const nf = audioCtx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 900;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(filter);

      lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 18;
      lfo.connect(lfoGain);
      lfoGain.connect(oscA.frequency);

      oscA.start();
      oscB.start();
      noise.start();
      lfo.start();
      return audioCtx;
    }

    function setAudio(on) {
      state.audio = on;
      const ctx = ensureAudio();
      if (!ctx || !master) return;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(on ? 0.22 : 0.0001, now + 0.6);
      if (soundBtn) {
        soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
        soundBtn.textContent = on ? "Sound on" : "Sound off";
      }
    }

    function blip(freq, dur) {
      if (!state.audio) return;
      const ctx = ensureAudio();
      if (!ctx || !master) return;
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(master);
      const t0 = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    // ---- Particles / physics ----
    function spawnParticles(count) {
      state.particles = [];
      for (let i = 0; i < count; i++) {
        state.particles.push({
          x: Math.random(),
          y: Math.random(),
          z: Math.random(),
          vx: 0,
          vy: 0,
          s: 0.4 + Math.random() * 1.8,
          hue: 150 + Math.random() * 80,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function spawnNodes() {
      state.nodes = [];
      const n = REDUCED ? 8 : 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        state.nodes.push({
          a,
          r: 0.18 + (i % 5) * 0.03,
          speed: 0.15 + (i % 3) * 0.05,
          x: 0.5,
          y: 0.5
        });
      }
    }

    function addRipple(nx, ny, force) {
      state.ripples.push({
        x: nx,
        y: ny,
        r: 0.01,
        life: 1,
        force: force || 1
      });
      if (state.ripples.length > 18) state.ripples.shift();
    }

    // ---- WebGL soft field (optional) ----
    let gl = null;
    let glProg = null;
    let glBuf = null;
    let uTime = null;
    let uRes = null;
    let uMouse = null;
    let uEnergy = null;
    let uScroll = null;

    function initGL() {
      if (!glCanvas || REDUCED) return false;
      gl = glCanvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance"
      });
      if (!gl) return false;

      const vs = `
        attribute vec2 a;
        void main(){ gl_Position = vec4(a,0.0,1.0); }
      `;
      const fs = `
        precision mediump float;
        uniform vec2 uRes;
        uniform vec2 uMouse;
        uniform float uTime;
        uniform float uEnergy;
        uniform float uScroll;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p);
          float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
          vec2 u=f*f*(3.-2.*f);
          return mix(a,b,u.x)+ (c-a)*u.y*(1.-u.x)+ (d-b)*u.x*u.y;
        }
        void main(){
          vec2 uv = gl_FragCoord.xy / uRes;
          vec2 p = (gl_FragCoord.xy - 0.5*uRes)/min(uRes.x,uRes.y);
          vec2 m = (uMouse - 0.5) * vec2(uRes.x/uRes.y, 1.0);
          float t = uTime * 0.15;
          float n = noise(p*2.2 + t);
          float n2 = noise(p*4.0 - t*1.3 + uScroll*2.0);
          float d = length(p - m*0.55);
          float core = smoothstep(0.55, 0.0, d) * (0.35 + uEnergy*0.5);
          float veins = smoothstep(0.35, 0.8, n2) * 0.22;
          float breath = 0.5 + 0.5*sin(uTime*0.8 + n*6.0);
          vec3 c1 = vec3(0.05, 0.08, 0.12);
          vec3 c2 = vec3(0.12, 0.22, 0.28);
          vec3 c3 = vec3(0.35, 0.55, 0.48);
          vec3 c4 = vec3(0.55, 0.72, 0.95);
          vec3 col = mix(c1, c2, uv.y + n*0.15);
          col = mix(col, c3, veins + core*0.45);
          col += c4 * core * (0.25 + breath*0.2);
          col += vec3(0.08,0.1,0.14) * smoothstep(1.2, 0.1, length(p));
          float a = 0.55 + core*0.35;
          gl_FragColor = vec4(col, a);
        }
      `;

      function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn(gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      }

      const vsh = compile(gl.VERTEX_SHADER, vs);
      const fsh = compile(gl.FRAGMENT_SHADER, fs);
      if (!vsh || !fsh) return false;
      glProg = gl.createProgram();
      gl.attachShader(glProg, vsh);
      gl.attachShader(glProg, fsh);
      gl.linkProgram(glProg);
      if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) return false;
      gl.useProgram(glProg);
      glBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(glProg, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uTime = gl.getUniformLocation(glProg, "uTime");
      uRes = gl.getUniformLocation(glProg, "uRes");
      uMouse = gl.getUniformLocation(glProg, "uMouse");
      uEnergy = gl.getUniformLocation(glProg, "uEnergy");
      uScroll = gl.getUniformLocation(glProg, "uScroll");
      return true;
    }

    const useGL = initGL();
    const ctx = canvas.getContext("2d", { alpha: true });

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = window.innerWidth;
      state.h = window.innerHeight;
      for (const c of [canvas, glCanvas]) {
        if (!c) continue;
        c.width = Math.floor(state.w * state.dpr);
        c.height = Math.floor(state.h * state.dpr);
        c.style.width = state.w + "px";
        c.style.height = state.h + "px";
      }
      if (ctx) ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      if (gl) {
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      }
      const count = REDUCED ? 40 : clamp(Math.floor((state.w * state.h) / 14000), 60, 160);
      if (state.particles.length !== count) spawnParticles(count);
    }

    function sceneFromScroll(s) {
      if (s < 0.16) return 0;
      if (s < 0.34) return 1;
      if (s < 0.56) return 2; // Machi town
      if (s < 0.78) return 3;
      return 4;
    }

    const sceneNames = ["Awaken", "Sense", "Machi", "Play", "Become"];

    function updateScroll() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      state.scroll = clamp(window.scrollY / max, 0, 1);
      const sc = sceneFromScroll(state.scroll);
      if (sc !== state.scene) {
        state.scene = sc;
        state.pulse = 1;
        blip(180 + sc * 40, 0.18);
        if (sceneLabel) sceneLabel.textContent = sceneNames[sc];
        root.dataset.scene = String(sc);
      }
      if (progressEl) progressEl.style.transform = "scaleX(" + state.scroll + ")";
    }

    function onPointer(e) {
      const x = e.clientX / state.w;
      const y = e.clientY / state.h;
      state.tx = clamp(x, 0, 1);
      state.ty = clamp(y, 0, 1);
      state.lastPointer = performance.now();
    }

    function onDown(e) {
      onPointer(e);
      addRipple(state.tx, state.ty, 1.4);
      state.energy = Math.min(1.5, state.energy + 0.55);
      blip(240 + state.scene * 30, 0.12);
      if (nameRoot) {
        nameRoot.classList.remove("kick");
        void nameRoot.offsetWidth;
        nameRoot.classList.add("kick");
      }
    }

    function onOrientation(e) {
      if (!state.motion || REDUCED) return;
      // beta: -180..180 front/back, gamma: -90..90 left/right
      const beta = typeof e.beta === "number" ? e.beta : 0;
      const gamma = typeof e.gamma === "number" ? e.gamma : 0;
      // Normalize around upright phone (~beta 45-70). Map modest tilt range.
      const tx = clamp(gamma / 28, -1, 1);
      const ty = clamp((beta - 45) / 35, -1, 1);
      state.tiltX = lerp(state.tiltX, tx, 0.18);
      state.tiltY = lerp(state.tiltY, ty, 0.18);

      // If user hasn't touched recently, let tilt drive the field target.
      const idlePointer = performance.now() - state.lastPointer > 900;
      if (idlePointer) {
        state.tx = clamp(0.5 + state.tiltX * 0.42, 0.05, 0.95);
        state.ty = clamp(0.5 + state.tiltY * 0.36, 0.08, 0.92);
      }
    }

    function updateMotionButton() {
      if (!motionBtn) return;
      const supported = "DeviceOrientationEvent" in window;
      if (!supported) {
        motionBtn.hidden = true;
        return;
      }
      motionBtn.hidden = false;
      motionBtn.setAttribute("aria-pressed", state.motion ? "true" : "false");
      motionBtn.textContent = state.motion ? "Motion on" : "Motion off";
    }

    async function enableMotion() {
      if (REDUCED) return false;
      if (!("DeviceOrientationEvent" in window)) return false;
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res !== "granted") return false;
        }
        if (!state.motion) {
          window.addEventListener("deviceorientation", onOrientation, { passive: true });
        }
        state.motion = true;
        updateMotionButton();
        blip(190, 0.1);
        return true;
      } catch (err) {
        console.warn("Motion permission failed", err);
        state.motion = false;
        updateMotionButton();
        return false;
      }
    }

    function disableMotion() {
      if (!state.motion) return;
      window.removeEventListener("deviceorientation", onOrientation);
      state.motion = false;
      state.tiltX = 0;
      state.tiltY = 0;
      updateMotionButton();
    }

    async function toggleMotion() {
      if (state.motion) disableMotion();
      else await enableMotion();
    }

    // custom cursor
    function updateCursor() {
      if (!FINE || !cursorEl || !ringEl) return;
      const x = state.mx * state.w;
      const y = state.my * state.h;
      cursorEl.style.transform = "translate(" + x + "px," + y + "px)";
      ringEl.style.transform =
        "translate(" + x + "px," + y + "px) scale(" + (1 + state.energy * 0.55) + ")";
    }

    function step(dt) {
      // cursor spring
      const k = REDUCED ? 1 : 0.12;
      state.vx += (state.tx - state.mx) * k;
      state.vy += (state.ty - state.my) * k;
      state.vx *= 0.78;
      state.vy *= 0.78;
      state.mx += state.vx;
      state.my += state.vy;
      state.energy = lerp(state.energy, 0, 1 - Math.pow(0.001, dt));
      state.pulse = lerp(state.pulse, 0, 1 - Math.pow(0.01, dt));
      state.t += dt;

      // audio follows organism
      if (state.audio && filter && audioCtx) {
        const f = 320 + state.energy * 900 + state.scroll * 280 + Math.sin(state.t * 0.7) * 40;
        filter.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.08);
        if (oscB) oscB.frequency.setTargetAtTime(70 + state.scene * 12 + state.energy * 20, audioCtx.currentTime, 0.1);
      }

      // nodes
      for (const n of state.nodes) {
        n.a += n.speed * dt * (0.4 + state.energy);
        const breathe = 1 + Math.sin(state.t * 0.9 + n.a) * 0.08 + state.energy * 0.12;
        const tiltPullX = state.motion ? state.tiltX * 0.05 : 0;
        const tiltPullY = state.motion ? state.tiltY * 0.04 : 0;
        n.x = 0.5 + Math.cos(n.a) * n.r * breathe + (state.mx - 0.5) * 0.08 + tiltPullX;
        n.y = 0.5 + Math.sin(n.a * 1.1) * n.r * 0.72 * breathe + (state.my - 0.5) * 0.08 + tiltPullY;
      }

      // particles physics
      const cx = state.mx;
      const cy = state.my;
      for (const p of state.particles) {
        let fx = 0;
        let fy = 0;
        // curl-ish field
        const ang = noise2(p.x * 3, p.y * 3, state.t * 0.08) * Math.PI * 2;
        fx += Math.cos(ang) * 0.015;
        fy += Math.sin(ang) * 0.015;
        // cursor attract/repel by scene
        const dx = p.x - cx;
        const dy = p.y - cy;
        const d2 = dx * dx + dy * dy + 0.0004;
        const force = (state.scene === 2 ? 0.00035 : -0.00022) * (0.5 + state.energy);
        fx += (dx / d2) * force;
        fy += (dy / d2) * force;
        // ripples
        for (const r of state.ripples) {
          const rx = p.x - r.x;
          const ry = p.y - r.y;
          const rd = Math.sqrt(rx * rx + ry * ry) + 0.0001;
          const band = Math.abs(rd - r.r);
          if (band < 0.05) {
            fx += (rx / rd) * 0.02 * r.life * r.force;
            fy += (ry / rd) * 0.02 * r.life * r.force;
          }
        }
        // scroll wind + device tilt gravity
        fy += (state.scroll - 0.5) * 0.002;
        if (state.motion) {
          fx += state.tiltX * 0.02;
          fy += state.tiltY * 0.018;
        }
        p.vx = (p.vx + fx) * 0.92;
        p.vy = (p.vy + fy) * 0.92;
        p.x += p.vx * dt * 60 * 0.016;
        p.y += p.vy * dt * 60 * 0.016;
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        if (p.y > 1.05) p.y = -0.05;
      }

      for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        r.r += dt * 0.35 * r.force;
        r.life -= dt * 0.65;
        if (r.life <= 0) state.ripples.splice(i, 1);
      }

      // spatial name reaction
      if (nameRoot) {
        const px = (state.mx - 0.5) * 24 + state.tiltX * 10;
        const py = (state.my - 0.5) * 16 + state.tiltY * 8;
        const sc = 1 + state.energy * 0.04 + state.pulse * 0.03;
        nameRoot.style.setProperty("--ox", px.toFixed(2) + "px");
        nameRoot.style.setProperty("--oy", py.toFixed(2) + "px");
        nameRoot.style.setProperty("--sc", sc.toFixed(3));
        nameRoot.style.setProperty("--glow", (0.25 + state.energy * 0.6).toFixed(3));
        // subtle 3D tilt from device / cursor
        const rx = clamp((-state.tiltY * 8) + (0.5 - state.my) * 6, -10, 10);
        const ry = clamp((state.tiltX * 10) + (state.mx - 0.5) * 8, -12, 12);
        nameRoot.style.setProperty("--rx", rx.toFixed(2) + "deg");
        nameRoot.style.setProperty("--ry", ry.toFixed(2) + "deg");
      }

      updateCursor();
    }

    // tiny value noise
    function noise2(x, y, z) {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const n = Math.sin(xi * 127.1 + yi * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }

    function drawGL() {
      if (!gl || !useGL) return;
      gl.useProgram(glProg);
      gl.uniform1f(uTime, state.t);
      gl.uniform2f(uRes, glCanvas.width, glCanvas.height);
      gl.uniform2f(uMouse, state.mx, 1 - state.my);
      gl.uniform1f(uEnergy, state.energy);
      gl.uniform1f(uScroll, state.scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw2D() {
      if (!ctx) return;
      const w = state.w;
      const h = state.h;
      ctx.clearRect(0, 0, w, h);

      // soft organism core
      const gx = state.mx * w;
      const gy = state.my * h;
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.45);
      grd.addColorStop(0, "rgba(158,192,255," + (0.12 + state.energy * 0.15) + ")");
      grd.addColorStop(0.35, "rgba(111,143,122," + (0.08 + state.pulse * 0.08) + ")");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // neural links
      ctx.lineWidth = 1;
      for (let i = 0; i < state.nodes.length; i++) {
        const a = state.nodes[i];
        for (let j = i + 1; j < state.nodes.length; j++) {
          const b = state.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.28) {
            ctx.strokeStyle = "rgba(232,238,248," + (0.08 + (1 - d / 0.28) * 0.18) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of state.nodes) {
        const x = n.x * w;
        const y = n.y * h;
        ctx.beginPath();
        ctx.fillStyle = "rgba(125,206,160," + (0.35 + state.energy * 0.3) + ")";
        ctx.arc(x, y, 2.2 + state.energy * 2, 0, Math.PI * 2);
        ctx.fill();
        // tendril to cursor
        ctx.strokeStyle = "rgba(122,162,255,0.12)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          lerp(x, gx, 0.5) + Math.sin(state.t + n.a) * 20,
          lerp(y, gy, 0.5),
          gx,
          gy
        );
        ctx.stroke();
      }

      // particles
      for (const p of state.particles) {
        const x = p.x * w;
        const y = p.y * h;
        const r = p.s * (1 + state.energy * 0.8);
        ctx.beginPath();
        ctx.fillStyle = "hsla(" + p.hue + ",55%,72%," + (0.25 + p.z * 0.45) + ")";
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ripples
      for (const r of state.ripples) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255," + r.life * 0.35 + ")";
        ctx.lineWidth = 1.5 * r.life;
        ctx.arc(r.x * w, r.y * h, r.r * Math.min(w, h), 0, Math.PI * 2);
        ctx.stroke();
      }

      // scene-specific glyph
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(state.t * 0.05);
      const rad = Math.min(w, h) * (0.16 + state.scroll * 0.05 + state.energy * 0.03);
      ctx.strokeStyle = "rgba(240,179,122," + (0.15 + state.pulse * 0.25) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = rad * (i % 2 === 0 ? 1 : 0.62);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      if (!state.running) return;
      const dt = clamp((now - state.last) / 1000, 0.001, 0.05);
      state.last = now;
      if (!REDUCED) step(dt);
      else {
        state.mx = state.tx;
        state.my = state.ty;
        updateCursor();
      }
      drawGL();
      draw2D();
      requestAnimationFrame(frame);
    }

    // wire events
    resize();
    spawnNodes();
    updateScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    // magnetic interactive targets
    function bindMagnetic() {
      if (!FINE || REDUCED) return;
      root.querySelectorAll("[data-magnetic]").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
          const y = ((e.clientY - r.top) / r.height - 0.5) * 12;
          el.style.transform = "translate(" + x + "px," + y + "px)";
        });
        el.addEventListener("pointerleave", () => {
          el.style.transform = "";
        });
      });
    }
    bindMagnetic();

    if (soundBtn) {
      soundBtn.addEventListener("click", () => setAudio(!state.audio));
    }

    updateMotionButton();
    if (motionBtn) {
      motionBtn.addEventListener("click", () => {
        toggleMotion();
      });
      // On non-iOS mobile, we can enable eagerly after first gesture.
      if (!FINE && !REDUCED && typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission !== "function") {
        // still require a tap via the button for intentionality
      }
    }

    // letter spatialize
    if (nameRoot && !REDUCED) {
      nameRoot.querySelectorAll(".char").forEach((ch, i) => {
        ch.style.setProperty("--i", String(i));
      });
    }

    requestAnimationFrame(frame);

    return {
      pulse(x, y) {
        addRipple(x ?? state.mx, y ?? state.my, 1.2);
        state.energy = Math.min(1.5, state.energy + 0.4);
        blip(200, 0.1);
      },
      setAudio,
      enableMotion,
      disableMotion,
      destroy() {
        state.running = false;
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", updateScroll);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("deviceorientation", onOrientation);
        if (audioCtx) audioCtx.close();
      }
    };
  }

  global.BardOrganism = { createOrganism };
})(window);
