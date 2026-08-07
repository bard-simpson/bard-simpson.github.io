/* Terrafab Hunt — Food Hunt-inspired pixel clear puzzle */
(function (global) {
  "use strict";

  const SAVE_KEY = "bard-simpson-terrafab-hunt-v1";

  // Palette shared across levels (index 1..)
  const PALETTE = {
    1: "#7aa2ff", // blue steel
    2: "#f0b37a", // heat copper
    3: "#7dcea0", // go / oxide
    4: "#e8eef8", // lacquer white
    5: "#c792ea", // plasma violet
    6: "#ff7b72", // warning red
    7: "#ffe08a"  // solar gold
  };

  // Each level: rows of digit strings, 0 empty
  const LEVELS = [
    {
      id: "pad-light",
      name: "Pad Light",
      blurb: "One clean exposure.",
      slots: 3,
      grid: [
        "00011000",
        "00111100",
        "01111110",
        "00111100",
        "00011000",
        "00011000",
        "00022000",
        "00022000"
      ]
    },
    {
      id: "wafer-bite",
      name: "Wafer Bite",
      blurb: "Nibble the die first.",
      slots: 3,
      grid: [
        "00111100",
        "01333310",
        "01322310",
        "01333310",
        "01322310",
        "01333310",
        "00111100",
        "00000000"
      ]
    },
    {
      id: "tiny-rocket",
      name: "Tiny Rocket",
      blurb: "Nose cone before engines.",
      slots: 3,
      grid: [
        "00040000",
        "00444000",
        "04414400",
        "04111140",
        "04111140",
        "00444000",
        "00600600",
        "06000060"
      ]
    },
    {
      id: "starlink-dot",
      name: "Constellation Dot",
      blurb: "Free the bus, then the wings.",
      slots: 3,
      grid: [
        "00000000",
        "05000050",
        "00555500",
        "00111100",
        "01122110",
        "00111100",
        "00555500",
        "05000050"
      ]
    },
    {
      id: "euv-bay",
      name: "EUV Bay",
      blurb: "Buried plasma needs a path.",
      slots: 3,
      grid: [
        "22222222",
        "21111112",
        "21555512",
        "21511512",
        "21555512",
        "21111112",
        "23333332",
        "22222222"
      ]
    },
    {
      id: "crane-arm",
      name: "Gantry Arm",
      blurb: "Slots are tight. Order matters.",
      slots: 3,
      grid: [
        "33300000",
        "31110000",
        "30111000",
        "30011140",
        "30001140",
        "30000140",
        "22222220",
        "00000000"
      ]
    },
    {
      id: "chip-crest",
      name: "Chip Crest",
      blurb: "Four metals, three docks.",
      slots: 3,
      grid: [
        "04444440",
        "04111140",
        "04133140",
        "04122140",
        "04133140",
        "04111140",
        "04555540",
        "04444440"
      ]
    },
    {
      id: "falcon-stack",
      name: "Stack Stage",
      blurb: "Stage sep is a sequencing puzzle.",
      slots: 4,
      grid: [
        "00077000",
        "00711700",
        "07111170",
        "01111110",
        "01222210",
        "01233210",
        "01222210",
        "00600600",
        "06000060"
      ]
    },
    {
      id: "orbital-ring",
      name: "Orbital Ring",
      blurb: "Don't dock the core too early.",
      slots: 3,
      grid: [
        "00111100",
        "01555510",
        "15222251",
        "15244251",
        "15244251",
        "15222251",
        "01555510",
        "00111100"
      ]
    },
    {
      id: "terrafab-mark",
      name: "Terrafab Mark",
      blurb: "The fab sigil. Full bay discipline.",
      slots: 4,
      grid: [
        "66666666",
        "61111116",
        "61777716",
        "61722716",
        "61777716",
        "61333316",
        "61111116",
        "65555556",
        "66666666"
      ]
    },
    {
      id: "deep-stack",
      name: "Deep Stack",
      blurb: "Five colors. Three docks. Breathe.",
      slots: 3,
      grid: [
        "11111111",
        "12222221",
        "12333321",
        "12344321",
        "12355321",
        "12333321",
        "12222221",
        "11111111"
      ]
    },
    {
      id: "launch-window",
      name: "Launch Window",
      blurb: "Final exposure. Make it elegant.",
      slots: 4,
      grid: [
        "00007000",
        "00077700",
        "00414140",
        "04111114",
        "04123214",
        "04122214",
        "00414140",
        "00606060",
        "06000006",
        "50000005"
      ]
    }
  ];

  function defaultSave() {
    return { level: 0, best: 0 };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const data = JSON.parse(raw);
      return {
        level: Math.max(0, Math.min(LEVELS.length - 1, data.level | 0)),
        best: Math.max(0, data.best | 0)
      };
    } catch (e) {
      return defaultSave();
    }
  }

  function saveSave(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  function parseGrid(rows) {
    return rows.map((row) => row.split("").map((ch) => parseInt(ch, 10) || 0));
  }

  function cloneGrid(grid) {
    return grid.map((row) => row.slice());
  }

  function colorsInGrid(grid) {
    const set = new Set();
    grid.forEach((row) => row.forEach((c) => { if (c) set.add(c); }));
    return [...set].sort((a, b) => a - b);
  }

  function countColor(grid, color) {
    let n = 0;
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        if (grid[y][x] === color) n += 1;
      }
    }
    return n;
  }

  function inBounds(grid, x, y) {
    return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
  }

  // A cell is exposed if it sits on the border OR touches an empty cell.
  function isExposed(grid, x, y) {
    if (!inBounds(grid, x, y) || !grid[y][x]) return false;
    if (x === 0 || y === 0 || x === grid[0].length - 1 || y === grid.length - 1) return true;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(grid, nx, ny) && grid[ny][nx] === 0) return true;
    }
    return false;
  }

  function findExposed(grid, color) {
    const cells = [];
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        if (grid[y][x] === color && isExposed(grid, x, y)) cells.push({ x, y });
      }
    }
    // Eat from bottom/right first for a satisfying chomp direction
    cells.sort((a, b) => b.y - a.y || b.x - a.x);
    return cells;
  }

  function boardCleared(grid) {
    return grid.every((row) => row.every((c) => c === 0));
  }

  function createGame(root, hooks) {
    const save = loadSave();
    let levelIndex = save.level;
    let grid = [];
    let slots = []; // {color|null, stuck:boolean}
    let remainingColors = []; // colors not yet docked
    let status = "play"; // play | won | lost
    let message = "";
    let eatTimer = 0;
    let animCells = new Set(); // "x,y" briefly flashing

    root.innerHTML = `
      <div class="th-shell">
        <header class="th-top">
          <div>
            <p class="th-kicker">Terrafab Hunt</p>
            <h2 data-th-title>Level</h2>
            <p class="th-blurb" data-th-blurb></p>
          </div>
          <button type="button" class="th-close" data-th-close aria-label="Close game">✕</button>
        </header>

        <section class="th-hud">
          <div><span>Level</span><strong data-th-level>1</strong></div>
          <div><span>Docks</span><strong data-th-docks>3</strong></div>
          <div><span>Best clear</span><strong data-th-best>0</strong></div>
        </section>

        <section class="th-board-wrap">
          <div class="th-board" data-th-board role="img" aria-label="Pixel wafer board"></div>
          <p class="th-msg" data-th-msg></p>
        </section>

        <section class="th-docks-wrap">
          <div class="th-section-label">Active docks</div>
          <div class="th-docks" data-th-docks-row></div>
        </section>

        <section class="th-tray-wrap">
          <div class="th-section-label">Deploy color</div>
          <div class="th-tray" data-th-tray></div>
        </section>

        <section class="th-actions">
          <button type="button" class="th-btn" data-th-restart>Restart level</button>
          <button type="button" class="th-btn ghost" data-th-prev>Prev</button>
          <button type="button" class="th-btn ghost" data-th-next>Next</button>
        </section>

        <p class="th-help">
          Food Hunt energy, Terrafab skin: dock a color, drones nibble only <em>exposed</em> blocks.
          Wrong order jams the docks. Clear the pixel art to win.
        </p>
      </div>
    `;

    const els = {
      title: root.querySelector("[data-th-title]"),
      blurb: root.querySelector("[data-th-blurb]"),
      level: root.querySelector("[data-th-level]"),
      docks: root.querySelector("[data-th-docks]"),
      best: root.querySelector("[data-th-best]"),
      board: root.querySelector("[data-th-board]"),
      msg: root.querySelector("[data-th-msg]"),
      docksRow: root.querySelector("[data-th-docks-row]"),
      tray: root.querySelector("[data-th-tray]"),
      close: root.querySelector("[data-th-close]"),
      restart: root.querySelector("[data-th-restart]"),
      prev: root.querySelector("[data-th-prev]"),
      next: root.querySelector("[data-th-next]")
    };

    function setMessage(text) {
      message = text;
      els.msg.textContent = text;
    }

    function startLevel(index) {
      levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
      const level = LEVELS[levelIndex];
      grid = parseGrid(level.grid);
      remainingColors = colorsInGrid(grid);
      slots = Array.from({ length: level.slots }, () => ({ color: null }));
      status = "play";
      animCells = new Set();
      save.level = levelIndex;
      saveSave(save);
      setMessage(level.blurb);
      render();
    }

    function anyProgressPossible() {
      // A docked color can eat if it has an exposed cell
      for (const slot of slots) {
        if (slot.color && findExposed(grid, slot.color).length) return true;
      }
      // Or we can still deploy a color into a free dock
      if (remainingColors.length && slots.some((s) => !s.color)) return true;
      return false;
    }

    function checkEnd() {
      if (boardCleared(grid)) {
        status = "won";
        const cleared = levelIndex + 1;
        if (cleared > save.best) {
          save.best = cleared;
          saveSave(save);
        }
        if (levelIndex < LEVELS.length - 1) {
          setMessage("Wafer clear. Dock the next pattern when ready.");
        } else {
          setMessage("Full stack clear. Terrafab Hunt complete.");
        }
        render();
        return;
      }
      if (!anyProgressPossible()) {
        status = "lost";
        setMessage("Dock jam. Buried colors, no free bay. Restart and resequence.");
        render();
      }
    }

    function deployColor(color) {
      if (status !== "play") return;
      if (!remainingColors.includes(color)) return;
      const free = slots.find((s) => !s.color);
      if (!free) {
        setMessage("All docks busy. Wait for a color to finish — or restart.");
        return;
      }
      free.color = color;
      remainingColors = remainingColors.filter((c) => c !== color);
      setMessage(`Docked color. Drones hunting exposed blocks.`);
      // Immediate nibble feels snappier
      nibbleOnce();
      render();
      checkEnd();
    }

    function nibbleOnce() {
      if (status !== "play") return false;
      let ate = false;
      animCells = new Set();
      for (const slot of slots) {
        if (!slot.color) continue;
        const exposed = findExposed(grid, slot.color);
        if (!exposed.length) continue;
        const cell = exposed[0];
        grid[cell.y][cell.x] = 0;
        animCells.add(`${cell.x},${cell.y}`);
        ate = true;
        // If color fully gone, free dock
        if (countColor(grid, slot.color) === 0) {
          slot.color = null;
        }
      }
      return ate;
    }

    function renderBoard() {
      const h = grid.length;
      const w = grid[0].length;
      els.board.style.setProperty("--th-cols", String(w));
      els.board.style.setProperty("--th-rows", String(h));
      const parts = [];
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const c = grid[y][x];
          const exposed = c && isExposed(grid, x, y);
          const flash = animCells.has(`${x},${y}`);
          if (!c) {
            parts.push(`<span class="th-cell empty${flash ? " flash" : ""}"></span>`);
          } else {
            parts.push(
              `<span class="th-cell${exposed ? " exposed" : " buried"}${flash ? " flash" : ""}" style="--c:${PALETTE[c] || "#888"}"></span>`
            );
          }
        }
      }
      els.board.innerHTML = parts.join("");
    }

    function renderDocks() {
      els.docksRow.innerHTML = slots
        .map((slot, i) => {
          if (!slot.color) {
            return `<div class="th-dock empty"><span>Dock ${i + 1}</span><em>open</em></div>`;
          }
          const left = countColor(grid, slot.color);
          const can = findExposed(grid, slot.color).length > 0;
          return `<div class="th-dock ${can ? "active" : "stuck"}" style="--c:${PALETTE[slot.color]}">
            <span>Dock ${i + 1}</span>
            <strong></strong>
            <em>${can ? "eating" : "blocked"} · ${left}</em>
          </div>`;
        })
        .join("");
    }

    function renderTray() {
      if (status === "won") {
        const hasNext = levelIndex < LEVELS.length - 1;
        els.tray.innerHTML = `
          <button type="button" class="th-color-btn next" data-th-continue>
            ${hasNext ? "Next level" : "Replay finale"}
          </button>`;
        return;
      }
      if (status === "lost") {
        els.tray.innerHTML = `
          <button type="button" class="th-color-btn next" data-th-restart-inline>Restart level</button>`;
        return;
      }
      if (!remainingColors.length) {
        els.tray.innerHTML = `<div class="th-tray-empty">All colors docked. Let the drones finish.</div>`;
        return;
      }
      els.tray.innerHTML = remainingColors
        .map((color) => {
          const left = countColor(grid, color);
          const exposed = findExposed(grid, color).length;
          return `<button type="button" class="th-color-btn" data-th-deploy="${color}" style="--c:${PALETTE[color]}">
            <i></i>
            <span>${left} blocks</span>
            <em>${exposed ? exposed + " exposed" : "buried"}</em>
          </button>`;
        })
        .join("");
    }

    function render() {
      const level = LEVELS[levelIndex];
      els.title.textContent = level.name;
      els.blurb.textContent = level.blurb;
      els.level.textContent = `${levelIndex + 1}/${LEVELS.length}`;
      els.docks.textContent = String(level.slots);
      els.best.textContent = String(save.best);
      els.msg.textContent = message;
      root.dataset.status = status;
      renderBoard();
      renderDocks();
      renderTray();
    }

    function onClick(event) {
      const t = event.target.closest(
        "[data-th-deploy], [data-th-continue], [data-th-restart], [data-th-restart-inline], [data-th-prev], [data-th-next], [data-th-close]"
      );
      if (!t) return;
      if (t.matches("[data-th-deploy]")) {
        deployColor(parseInt(t.getAttribute("data-th-deploy"), 10));
      } else if (t.matches("[data-th-continue]")) {
        if (levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
        else startLevel(levelIndex);
      } else if (t.matches("[data-th-restart]") || t.matches("[data-th-restart-inline]")) {
        startLevel(levelIndex);
      } else if (t.matches("[data-th-prev]")) {
        startLevel(levelIndex - 1);
      } else if (t.matches("[data-th-next]")) {
        startLevel(levelIndex + 1);
      }
    }

    function tick() {
      if (status === "play") {
        const ate = nibbleOnce();
        if (ate) {
          render();
          checkEnd();
        } else if (slots.some((s) => s.color) && remainingColors.length === 0) {
          // waiting / maybe stuck
          checkEnd();
          renderDocks();
        }
      }
      eatTimer = window.setTimeout(tick, 220);
    }

    function start() {
      startLevel(levelIndex);
      root.addEventListener("click", onClick);
      eatTimer = window.setTimeout(tick, 220);
    }

    function stop() {
      window.clearTimeout(eatTimer);
      root.removeEventListener("click", onClick);
      save.level = levelIndex;
      saveSave(save);
    }

    start();

    return {
      stop,
      closeButton: els.close
    };
  }

  global.TerrafabHunt = {
    createGame,
    levelCount: LEVELS.length
  };
})(window);
