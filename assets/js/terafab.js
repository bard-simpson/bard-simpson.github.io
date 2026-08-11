/* Terafab Idle — chip fab to orbital compute clicker */
(function (global) {
  "use strict";

  const SAVE_KEY = "bard-simpson-terrafab-v1";
  const TICK_MS = 100;
  const SAVE_MS = 4000;
  const MAX_OFFLINE_MS = 1000 * 60 * 60 * 12;

  const BUILDINGS = [
    {
      id: "tech",
      name: "Cleanroom Tech",
      blurb: "Gowned humans, endless sticky mats.",
      baseCost: 15,
      costPow: 1.14,
      baseRate: 0.2,
      glyph: "tech"
    },
    {
      id: "euv",
      name: "EUV Bay",
      blurb: "Light so short it needs tin plasma.",
      baseCost: 120,
      costPow: 1.15,
      baseRate: 1.4,
      glyph: "euv"
    },
    {
      id: "pack",
      name: "Packaging Line",
      blurb: "Dies in, flight computers out.",
      baseCost: 900,
      costPow: 1.16,
      baseRate: 9,
      glyph: "pack"
    },
    {
      id: "pad",
      name: "Launch Pad",
      blurb: "Ship silicon before it gets nostalgic.",
      baseCost: 7500,
      costPow: 1.17,
      baseRate: 55,
      glyph: "pad"
    },
    {
      id: "link",
      name: "Constellation Node",
      blurb: "Demand from a mesh of bright dots.",
      baseCost: 62000,
      costPow: 1.18,
      baseRate: 320,
      glyph: "link"
    },
    {
      id: "orbit",
      name: "Orbital Fab",
      blurb: "Vacuum is free. Gravity is the bug.",
      baseCost: 520000,
      costPow: 1.19,
      baseRate: 2100,
      glyph: "orbit"
    },
    {
      id: "lunar",
      name: "Lunar Foundry",
      blurb: "Regolith in, radiance out.",
      baseCost: 4800000,
      costPow: 1.2,
      baseRate: 15000,
      glyph: "lunar"
    }
  ];

  const CLICK_UPGRADES = [
    { id: "glove", name: "Better Gloves", blurb: "Fewer smudges per tap.", cost: 50, mult: 2 },
    { id: "reticle", name: "Sharp Reticle", blurb: "Every click lands cleaner.", cost: 400, mult: 2 },
    { id: "servo", name: "Servo Assist", blurb: "The stage moves with you.", cost: 3500, mult: 2 },
    { id: "ai", name: "Inline AI OPC", blurb: "The mask starts guessing right.", cost: 40000, mult: 3 },
    { id: "beam", name: "Dual Beam Path", blurb: "Two exposures, one gesture.", cost: 500000, mult: 3 }
  ];

  function defaultState() {
    const owned = {};
    BUILDINGS.forEach((b) => {
      owned[b.id] = 0;
    });
    return {
      wafers: 0,
      totalWafers: 0,
      clickLvl: 0,
      owned,
      heritage: 0,
      launches: 0,
      lastTs: Date.now(),
      log: "Tap the wafer. Build the fab. Aim for orbit."
    };
  }

  function loadState() {
    try {
      // Keep legacy misspelled key working after Terafab rename.
      const raw =
        localStorage.getItem(SAVE_KEY) ||
        localStorage.getItem("bard-simpson-terrafab-v1");
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...data,
        owned: { ...base.owned, ...(data.owned || {}) }
      };
    } catch (e) {
      return defaultState();
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function format(n) {
    n = Number(n) || 0;
    if (!Number.isFinite(n)) return "0";
    const abs = Math.abs(n);
    if (abs < 1000) return (Math.round(n * 10) / 10).toString();
    const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
    let u = 0;
    let v = n;
    while (Math.abs(v) >= 1000 && u < units.length - 1) {
      v /= 1000;
      u += 1;
    }
    return `${v.toFixed(v >= 100 || v <= -100 ? 0 : 1)}${units[u]}`;
  }

  function heritageMult(state) {
    return 1 + state.heritage * 0.35;
  }

  function clickPower(state) {
    let power = 1;
    for (let i = 0; i < state.clickLvl; i += 1) {
      power *= CLICK_UPGRADES[i].mult;
    }
    return power * heritageMult(state);
  }

  function buildingCost(b, owned) {
    return Math.floor(b.baseCost * Math.pow(b.costPow, owned));
  }

  function ratePerSec(state) {
    let rate = 0;
    BUILDINGS.forEach((b) => {
      rate += b.baseRate * (state.owned[b.id] || 0);
    });
    return rate * heritageMult(state);
  }

  function prestigeGain(state) {
    // Soft curve: meaningful after ~50k lifetime wafers
    return Math.floor(Math.sqrt(state.totalWafers / 50000));
  }

  function prestigeReady(state) {
    return prestigeGain(state) > 0;
  }

  function createGame(root) {
    const state = loadState();
    let raf = 0;
    let lastFrame = performance.now();
    let saveAcc = 0;
    let floatId = 0;
    let rocketTimer = 0;

    root.innerHTML = `
      <div class="tf-shell">
        <header class="tf-top">
          <div>
            <p class="tf-kicker">Terafab Idle</p>
            <h2>From cleanroom to constellation</h2>
          </div>
          <button type="button" class="tf-close" data-tf-close aria-label="Close game">✕</button>
        </header>

        <section class="tf-stats" aria-live="polite">
          <div>
            <span class="tf-label">Wafers</span>
            <strong data-tf-wafers>0</strong>
          </div>
          <div>
            <span class="tf-label">Per sec</span>
            <strong data-tf-rate>0</strong>
          </div>
          <div>
            <span class="tf-label">Flight heritage</span>
            <strong data-tf-heritage>0</strong>
          </div>
        </section>

        <section class="tf-stage">
          <div class="tf-sky" aria-hidden="true">
            <div class="tf-aurora"></div>
            <div class="tf-stars"></div>
            <div class="tf-stars tf-stars-2"></div>
            <div class="tf-earth">
              <span class="tf-earth-glow"></span>
              <span class="tf-continent c1"></span>
              <span class="tf-continent c2"></span>
              <span class="tf-continent c3"></span>
            </div>
            <div class="tf-fab">
              <span class="tf-fab-body"></span>
              <span class="tf-fab-roof"></span>
              <span class="tf-fab-window w1"></span>
              <span class="tf-fab-window w2"></span>
              <span class="tf-fab-window w3"></span>
              <span class="tf-fab-stack"></span>
            </div>
            <div class="tf-pad-base"></div>
            <div class="tf-tower"></div>
            <div class="tf-starlink" aria-hidden="true">
              <div class="tf-link-path p1"></div>
              <div class="tf-link-path p2"></div>
              <div class="tf-sat-train t1">
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
              </div>
              <div class="tf-sat-train t2">
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
              </div>
              <div class="tf-sat-train t3">
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
                <span class="tf-sat"></span>
              </div>
            </div>
            <div class="tf-rocket" data-tf-rocket>
              <span class="tf-rocket-fin left"></span>
              <span class="tf-rocket-fin right"></span>
              <span class="tf-rocket-body"></span>
              <span class="tf-rocket-nose"></span>
              <span class="tf-rocket-window"></span>
              <span class="tf-rocket-flame"></span>
              <span class="tf-rocket-smoke"></span>
            </div>
            <div class="tf-beam" data-tf-beam></div>
            <div class="tf-scanlines"></div>
          </div>

          <button type="button" class="tf-wafer" data-tf-click aria-label="Expose wafer">
            <span class="tf-wafer-glow"></span>
            <span class="tf-wafer-notch"></span>
            <span class="tf-wafer-ring"></span>
            <span class="tf-wafer-ring outer"></span>
            <span class="tf-wafer-core">
              <span class="tf-die"></span><span class="tf-die"></span><span class="tf-die"></span>
              <span class="tf-die"></span><span class="tf-die on"></span><span class="tf-die"></span>
              <span class="tf-die"></span><span class="tf-die"></span><span class="tf-die"></span>
            </span>
            <span class="tf-expose-flash"></span>
            <span class="tf-wafer-label">Expose</span>
          </button>
          <p class="tf-log" data-tf-log></p>
          <div class="tf-floats" data-tf-floats></div>
        </section>

        <section class="tf-shop">
          <div class="tf-shop-head">
            <h3>Build queue</h3>
            <p>Simple lines. Long cadence. A little SpaceX in the margins.</p>
          </div>
          <div class="tf-click-up" data-tf-click-up></div>
          <div class="tf-buildings" data-tf-buildings></div>
          <div class="tf-prestige" data-tf-prestige></div>
          <button type="button" class="tf-reset" data-tf-reset>Reset local save</button>
        </section>
      </div>
    `;

    const els = {
      wafers: root.querySelector("[data-tf-wafers]"),
      rate: root.querySelector("[data-tf-rate]"),
      heritage: root.querySelector("[data-tf-heritage]"),
      log: root.querySelector("[data-tf-log]"),
      floats: root.querySelector("[data-tf-floats]"),
      clickUp: root.querySelector("[data-tf-click-up]"),
      buildings: root.querySelector("[data-tf-buildings]"),
      prestige: root.querySelector("[data-tf-prestige]"),
      rocket: root.querySelector("[data-tf-rocket]"),
      clickBtn: root.querySelector("[data-tf-click]"),
      closeBtn: root.querySelector("[data-tf-close]"),
      resetBtn: root.querySelector("[data-tf-reset]")
    };

    function save() {
      state.lastTs = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }

    function setLog(msg) {
      state.log = msg;
      els.log.textContent = msg;
    }

    function spawnFloat(amount, x, y) {
      const node = document.createElement("span");
      node.className = "tf-float";
      node.textContent = `+${format(amount)}`;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.setProperty("--tf-float-id", String((floatId += 1) % 7));
      els.floats.appendChild(node);
      window.setTimeout(() => node.remove(), 900);
    }

    function applyOffline() {
      const now = Date.now();
      const delta = clamp(now - (state.lastTs || now), 0, MAX_OFFLINE_MS);
      state.lastTs = now;
      if (delta < 1000) return;
      const gained = ratePerSec(state) * (delta / 1000);
      if (gained <= 0) return;
      state.wafers += gained;
      state.totalWafers += gained;
      const mins = Math.floor(delta / 60000);
      setLog(`While you were away: +${format(gained)} wafers (${mins}m offline).`);
    }

    function renderClickUpgrade() {
      const next = CLICK_UPGRADES[state.clickLvl];
      if (!next) {
        els.clickUp.innerHTML = `
          <div class="tf-card owned">
            <div class="tf-card-main">
              <strong>Click path complete</strong>
              <span>Expose power ×${format(clickPower(state))}</span>
            </div>
          </div>`;
        return;
      }
      const can = state.wafers >= next.cost;
      els.clickUp.innerHTML = `
        <button type="button" class="tf-card ${can ? "" : "locked"}" data-buy-click>
          <div class="tf-glyph click"></div>
          <div class="tf-card-main">
            <strong>${next.name}</strong>
            <span>${next.blurb}</span>
            <span class="tf-meta">Click ×${next.mult} · cost ${format(next.cost)}</span>
          </div>
        </button>`;
    }

    function glyphHtml(kind) {
      return `<div class="tf-glyph ${kind}" aria-hidden="true"></div>`;
    }

    function renderBuildings() {
      els.buildings.innerHTML = BUILDINGS.map((b) => {
        const owned = state.owned[b.id] || 0;
        const cost = buildingCost(b, owned);
        const can = state.wafers >= cost;
        const line = b.baseRate * owned * heritageMult(state);
        return `
          <button type="button" class="tf-card ${can ? "" : "locked"}" data-buy-building="${b.id}">
            ${glyphHtml(b.glyph)}
            <div class="tf-card-main">
              <strong>${b.name}</strong>
              <span>${b.blurb}</span>
              <span class="tf-meta">Owned ${owned} · ${format(line)}/s · cost ${format(cost)}</span>
            </div>
          </button>`;
      }).join("");
    }

    function renderPrestige() {
      const gain = prestigeGain(state);
      const can = gain > 0;
      els.prestige.innerHTML = `
        <div class="tf-prestige-card">
          <div>
            <strong>Launch window</strong>
            <p>Scrap the ground stack. Keep flight heritage. SpaceX energy: reset hard, climb faster.</p>
            <span class="tf-meta">Next launch grants +${gain} heritage (now ×${heritageMult(state).toFixed(2)})</span>
          </div>
          <button type="button" class="tf-launch ${can ? "" : "locked"}" data-prestige ${can ? "" : "disabled"}>
            Launch
          </button>
        </div>`;
    }

    function render() {
      els.wafers.textContent = format(state.wafers);
      els.rate.textContent = `${format(ratePerSec(state))}/s`;
      els.heritage.textContent = `${state.heritage}  (×${heritageMult(state).toFixed(2)})`;
      els.log.textContent = state.log;
      renderClickUpgrade();
      renderBuildings();
      renderPrestige();
    }

    function addWafers(amount) {
      state.wafers += amount;
      state.totalWafers += amount;
    }

    function onClick(event) {
      const power = clickPower(state);
      addWafers(power);
      const rect = els.clickBtn.getBoundingClientRect();
      const stage = root.querySelector(".tf-stage").getBoundingClientRect();
      const x = (event.clientX || rect.left + rect.width / 2) - stage.left;
      const y = (event.clientY || rect.top + rect.height / 2) - stage.top;
      spawnFloat(power, x, y);
      els.clickBtn.classList.remove("pulse");
      void els.clickBtn.offsetWidth;
      els.clickBtn.classList.add("pulse");
      const beam = root.querySelector("[data-tf-beam]");
      if (beam) {
        beam.classList.remove("fire");
        void beam.offsetWidth;
        beam.classList.add("fire");
      }
      if (Math.random() < 0.08) {
        setLog("Exposure clean. Next reticle, please.");
      }
      render();
    }

    function buyClick() {
      const next = CLICK_UPGRADES[state.clickLvl];
      if (!next || state.wafers < next.cost) return;
      state.wafers -= next.cost;
      state.clickLvl += 1;
      setLog(`${next.name} installed. Click power now ${format(clickPower(state))}.`);
      render();
      save();
    }

    function buyBuilding(id) {
      const b = BUILDINGS.find((item) => item.id === id);
      if (!b) return;
      const owned = state.owned[id] || 0;
      const cost = buildingCost(b, owned);
      if (state.wafers < cost) return;
      state.wafers -= cost;
      state.owned[id] = owned + 1;
      setLog(`${b.name} online. Floor cadence rising.`);
      if (id === "pad" || id === "orbit") fireRocket();
      render();
      save();
    }

    function fireRocket() {
      els.rocket.classList.remove("fly");
      void els.rocket.offsetWidth;
      els.rocket.classList.add("fly");
      rocketTimer = window.setTimeout(() => els.rocket.classList.remove("fly"), 1800);
    }

    function doPrestige() {
      const gain = prestigeGain(state);
      if (gain <= 0) return;
      const ok = window.confirm(
        `Launch and reset the ground stack?\n\nYou gain +${gain} flight heritage.\nWafers and buildings reset. Heritage stays.`
      );
      if (!ok) return;
      const heritage = state.heritage + gain;
      const launches = state.launches + 1;
      const keptLog = `Launch #${launches} complete. Heritage ${heritage}. Build again, faster.`;
      const next = defaultState();
      next.heritage = heritage;
      next.launches = launches;
      next.log = keptLog;
      Object.assign(state, next);
      fireRocket();
      setLog(keptLog);
      render();
      save();
    }

    function resetSave() {
      const ok = window.confirm("Reset Terafab Idle save on this device?");
      if (!ok) return;
      Object.assign(state, defaultState());
      setLog("Save cleared. Fresh cleanroom.");
      render();
      save();
    }

    function tick(now) {
      const dt = clamp((now - lastFrame) / 1000, 0, 0.25);
      lastFrame = now;
      const rate = ratePerSec(state);
      if (rate > 0) addWafers(rate * dt);
      saveAcc += dt * 1000;
      if (saveAcc >= SAVE_MS) {
        saveAcc = 0;
        save();
      }
      // light UI refresh without rebuilding shop every frame
      els.wafers.textContent = format(state.wafers);
      els.rate.textContent = `${format(rate)}/s`;
      raf = window.requestAnimationFrame(tick);
    }

    function onRootClick(event) {
      const t = event.target.closest("[data-buy-click], [data-buy-building], [data-prestige], [data-tf-reset], [data-tf-close], [data-tf-click]");
      if (!t) return;
      if (t.matches("[data-tf-click]")) onClick(event);
      else if (t.matches("[data-buy-click]")) buyClick();
      else if (t.matches("[data-buy-building]")) buyBuilding(t.getAttribute("data-buy-building"));
      else if (t.matches("[data-prestige]")) doPrestige();
      else if (t.matches("[data-tf-reset]")) resetSave();
    }

    // Rebuild shop affordance occasionally
    let shopTimer = 0;

    function start() {
      applyOffline();
      render();
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(tick);
      shopTimer = window.setInterval(() => {
        renderClickUpgrade();
        renderBuildings();
        renderPrestige();
      }, 400);
      root.addEventListener("click", onRootClick);
    }

    function stop() {
      window.cancelAnimationFrame(raf);
      window.clearInterval(shopTimer);
      window.clearTimeout(rocketTimer);
      root.removeEventListener("click", onRootClick);
      save();
    }

    start();

    return {
      stop,
      save,
      closeButton: els.closeBtn
    };
  }

  global.TerafabIdle = { createGame };
})(window);
