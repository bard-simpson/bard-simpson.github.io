/* Terrafab Hunt — harder Food Hunt-inspired wafer clear puzzle */
(function (global) {
  "use strict";

  // v3 save: queue tops + tighter docks
  const SAVE_KEY = "bard-simpson-terrafab-hunt-v3";

  const PALETTE = {
    1: "#7aa2ff",
    2: "#f0b37a",
    3: "#7dcea0",
    4: "#e8eef8",
    5: "#c792ea",
    6: "#ff7b72",
    7: "#ffe08a"
  };

  /**
   * queues: array of columns. Only the first stack in each queue is deployable.
   * A docked stack occupies a bay until its count is fully eaten.
   * Wrong order => waiting stacks fill all docks => jam.
   */
  const LEVELS = [
    {
      id: "first-bay",
      name: "First Bay",
      blurb: "Only queue tops are live. Two docks.",
      slots: 2,
      grid: [
        "1111111",
        "1222221",
        "1233321",
        "1233321",
        "1222221",
        "1111111"
      ],
      // 1:22 2:14 3:6
      queues: [
        [
          { color: 2, count: 5 },
          { color: 1, count: 8 },
          { color: 3, count: 3 },
          { color: 2, count: 4 }
        ],
        [
          { color: 1, count: 7 },
          { color: 3, count: 3 },
          { color: 1, count: 4 },
          { color: 2, count: 5 }
        ],
        [{ color: 1, count: 3 }]
      ]
    },
    {
      id: "false-edge",
      name: "False Edge",
      blurb: "The bright rim is bait.",
      slots: 2,
      grid: [
        "44444444",
        "41111114",
        "41222214",
        "41233214",
        "41233214",
        "41222214",
        "41111114",
        "44444444"
      ],
      // 1:20 2:12 3:4 4:28
      queues: [
        [
          { color: 4, count: 10 },
          { color: 1, count: 8 },
          { color: 2, count: 6 },
          { color: 4, count: 8 }
        ],
        [
          { color: 1, count: 6 },
          { color: 4, count: 6 },
          { color: 3, count: 2 },
          { color: 2, count: 6 }
        ],
        [
          { color: 1, count: 6 },
          { color: 3, count: 2 },
          { color: 4, count: 4 }
        ]
      ]
    },
    {
      id: "cross-lock",
      name: "Cross Lock",
      blurb: "Open both shells cold and you jam.",
      slots: 2,
      grid: [
        "11112222",
        "10012002",
        "10112112",
        "10133312",
        "10134312",
        "10133312",
        "11111112",
        "22222222"
      ],
      // 1:27 2:20 3:8 4:1
      queues: [
        [
          { color: 1, count: 9 },
          { color: 2, count: 7 },
          { color: 3, count: 4 },
          { color: 1, count: 8 }
        ],
        [
          { color: 2, count: 6 },
          { color: 1, count: 6 },
          { color: 2, count: 5 },
          { color: 3, count: 4 }
        ],
        [
          { color: 1, count: 4 },
          { color: 4, count: 1 },
          { color: 2, count: 2 }
        ]
      ]
    },
    {
      id: "service-loop",
      name: "Service Loop",
      blurb: "Corridor first. Rooms later.",
      slots: 2,
      grid: [
        "111111111",
        "100000001",
        "101222201",
        "101200201",
        "101233201",
        "101200201",
        "101222201",
        "100000001",
        "111444111"
      ],
      // 1:34 2:14 3:2 4:3
      queues: [
        [
          { color: 1, count: 10 },
          { color: 2, count: 6 },
          { color: 1, count: 8 },
          { color: 3, count: 2 }
        ],
        [
          { color: 1, count: 8 },
          { color: 2, count: 5 },
          { color: 4, count: 2 },
          { color: 1, count: 5 }
        ],
        [
          { color: 2, count: 3 },
          { color: 4, count: 1 },
          { color: 1, count: 3 }
        ]
      ]
    },
    {
      id: "twin-wells",
      name: "Twin Wells",
      blurb: "Two mouths. One crane.",
      slots: 2,
      grid: [
        "1111111111",
        "1222202221",
        "1200202021",
        "1222202221",
        "1111311111",
        "1444344441",
        "1400304041",
        "1444344441",
        "1111111111"
      ],
      // 1:41 2:18 3:4 4:17
      queues: [
        [
          { color: 1, count: 12 },
          { color: 2, count: 8 },
          { color: 1, count: 10 },
          { color: 4, count: 8 }
        ],
        [
          { color: 1, count: 8 },
          { color: 2, count: 6 },
          { color: 4, count: 6 },
          { color: 3, count: 2 }
        ],
        [
          { color: 1, count: 6 },
          { color: 2, count: 4 },
          { color: 4, count: 3 },
          { color: 3, count: 2 },
          { color: 1, count: 5 }
        ]
      ]
    },
    {
      id: "gantry-pinch",
      name: "Gantry Pinch",
      blurb: "Unpin the arm before the deck floods.",
      slots: 2,
      grid: [
        "333300001",
        "311100001",
        "301110001",
        "300111401",
        "300011401",
        "300001401",
        "222222201",
        "111111111"
      ],
      // 1:28 2:7 3:9 4:3
      queues: [
        [
          { color: 3, count: 5 },
          { color: 1, count: 10 },
          { color: 2, count: 4 },
          { color: 4, count: 2 }
        ],
        [
          { color: 1, count: 8 },
          { color: 3, count: 4 },
          { color: 2, count: 3 },
          { color: 1, count: 6 }
        ],
        [
          { color: 1, count: 4 },
          { color: 4, count: 1 }
        ]
      ]
    },
    {
      id: "plasma-pocket",
      name: "Plasma Pocket",
      blurb: "Violet is sealed under overtime steel.",
      slots: 2,
      grid: [
        "222222222",
        "211111112",
        "211555112",
        "211515112",
        "211555112",
        "211111112",
        "213333312",
        "214444412",
        "222222222"
      ],
      // 1:31 2:32 3:5 4:5 5:8
      queues: [
        [
          { color: 2, count: 12 },
          { color: 1, count: 12 },
          { color: 5, count: 4 },
          { color: 2, count: 8 }
        ],
        [
          { color: 1, count: 10 },
          { color: 2, count: 8 },
          { color: 3, count: 3 },
          { color: 5, count: 4 }
        ],
        [
          { color: 1, count: 9 },
          { color: 4, count: 5 },
          { color: 3, count: 2 },
          { color: 2, count: 4 }
        ]
      ]
    },
    {
      id: "checker-tax",
      name: "Checker Tax",
      blurb: "Equal-looking tops. Unequal futures.",
      slots: 2,
      grid: [
        "12121212",
        "21212121",
        "12121212",
        "21212121",
        "13131313",
        "31313131",
        "12121212",
        "21212121"
      ],
      // 1:32 2:24 3:8
      queues: [
        [
          { color: 1, count: 4 },
          { color: 2, count: 4 },
          { color: 1, count: 4 },
          { color: 3, count: 2 },
          { color: 2, count: 4 }
        ],
        [
          { color: 2, count: 4 },
          { color: 1, count: 4 },
          { color: 2, count: 4 },
          { color: 3, count: 2 },
          { color: 1, count: 4 }
        ],
        [
          { color: 1, count: 4 },
          { color: 2, count: 4 },
          { color: 3, count: 2 },
          { color: 1, count: 4 },
          { color: 2, count: 4 },
          { color: 3, count: 2 },
          { color: 1, count: 8 }
        ]
      ]
    },
    {
      id: "ring-key",
      name: "Ring Key",
      blurb: "Rings unlock only in tempo.",
      slots: 2,
      grid: [
        "00111100",
        "01222210",
        "12333321",
        "12344321",
        "12344321",
        "12333321",
        "01222210",
        "00111100"
      ],
      // 1:20 2:16 3:12 4:4
      queues: [
        [
          { color: 1, count: 8 },
          { color: 2, count: 6 },
          { color: 3, count: 5 },
          { color: 4, count: 2 }
        ],
        [
          { color: 2, count: 5 },
          { color: 1, count: 6 },
          { color: 3, count: 4 },
          { color: 4, count: 2 }
        ],
        [
          { color: 1, count: 6 },
          { color: 2, count: 5 },
          { color: 3, count: 3 }
        ]
      ]
    },
    {
      id: "nested-tax",
      name: "Nested Tax",
      blurb: "Pay the outer tax in installments.",
      slots: 2,
      grid: [
        "1111111111",
        "1222222221",
        "1233333321",
        "1234444321",
        "1234554321",
        "1234554321",
        "1234444321",
        "1233333321",
        "1222222221",
        "1111111111"
      ],
      // 1:36 2:28 3:20 4:12 5:4
      queues: [
        [
          { color: 1, count: 10 },
          { color: 2, count: 8 },
          { color: 1, count: 8 },
          { color: 3, count: 7 }
        ],
        [
          { color: 2, count: 8 },
          { color: 3, count: 6 },
          { color: 4, count: 6 },
          { color: 1, count: 8 }
        ],
        [
          { color: 2, count: 6 },
          { color: 4, count: 4 },
          { color: 5, count: 4 },
          { color: 3, count: 7 },
          { color: 4, count: 2 },
          { color: 1, count: 10 },
          { color: 2, count: 6 }
        ]
      ]
    },
    {
      id: "launch-cage",
      name: "Launch Cage",
      blurb: "Bolts before flame. Always.",
      slots: 2,
      grid: [
        "6666666666",
        "6000000006",
        "6011111106",
        "6012222106",
        "6012322106",
        "6012222106",
        "6011111106",
        "6007777006",
        "6000700006",
        "6666666666"
      ],
      // 1:18 2:11 3:1 6:36 7:5
      queues: [
        [
          { color: 6, count: 12 },
          { color: 1, count: 8 },
          { color: 2, count: 5 },
          { color: 6, count: 10 }
        ],
        [
          { color: 1, count: 6 },
          { color: 6, count: 8 },
          { color: 7, count: 3 },
          { color: 2, count: 4 }
        ],
        [
          { color: 1, count: 4 },
          { color: 3, count: 1 },
          { color: 7, count: 2 },
          { color: 2, count: 2 },
          { color: 6, count: 6 }
        ]
      ]
    },
    {
      id: "split-shell",
      name: "Split Shell",
      blurb: "Left or right — never both early.",
      slots: 2,
      grid: [
        "1111002222",
        "1001002002",
        "1011002202",
        "1011111112",
        "1013333312",
        "1013443312",
        "1013333312",
        "1111111112"
      ],
      // 1:35 2:14 3:13 4:2
      queues: [
        [
          { color: 1, count: 12 },
          { color: 3, count: 6 },
          { color: 1, count: 10 },
          { color: 4, count: 1 }
        ],
        [
          { color: 2, count: 7 },
          { color: 1, count: 8 },
          { color: 2, count: 5 },
          { color: 3, count: 5 }
        ],
        [
          { color: 1, count: 5 },
          { color: 2, count: 2 },
          { color: 4, count: 1 },
          { color: 3, count: 2 }
        ]
      ]
    },
    {
      id: "warning-seal",
      name: "Warning Seal",
      blurb: "Red lid in fragments. Still lethal.",
      slots: 2,
      grid: [
        "6666666666",
        "6111111116",
        "6177777716",
        "6172222716",
        "6172332716",
        "6172222716",
        "6177777716",
        "6111111116",
        "6555555556",
        "6666666666"
      ],
      // 1:26 2:10 3:2 5:8 6:36 7:18
      queues: [
        [
          { color: 6, count: 10 },
          { color: 1, count: 10 },
          { color: 6, count: 10 },
          { color: 7, count: 8 }
        ],
        [
          { color: 1, count: 8 },
          { color: 2, count: 5 },
          { color: 5, count: 4 },
          { color: 7, count: 6 }
        ],
        [
          { color: 6, count: 10 },
          { color: 1, count: 8 },
          { color: 2, count: 5 },
          { color: 5, count: 4 },
          { color: 3, count: 2 },
          { color: 7, count: 4 },
          { color: 6, count: 6 }
        ]
      ]
    },
    {
      id: "final-mask",
      name: "Final Mask",
      blurb: "Final reticle. Three docks, no autopilot.",
      slots: 3,
      grid: [
        "66666666666",
        "61111111116",
        "61777777716",
        "61722222216",
        "61723332216",
        "61723432216",
        "61723332216",
        "61722222216",
        "61777777716",
        "61555555516",
        "61111111116",
        "66666666666"
      ],
      // 1:34 2:21 3:8 4:1 5:7 6:42 7:19
      queues: [
        [
          { color: 6, count: 12 },
          { color: 1, count: 10 },
          { color: 7, count: 8 },
          { color: 2, count: 8 }
        ],
        [
          { color: 6, count: 10 },
          { color: 1, count: 10 },
          { color: 3, count: 5 },
          { color: 5, count: 4 }
        ],
        [
          { color: 2, count: 7 },
          { color: 7, count: 6 },
          { color: 4, count: 1 },
          { color: 3, count: 3 }
        ],
        [
          { color: 1, count: 8 },
          { color: 6, count: 12 },
          { color: 5, count: 3 },
          { color: 2, count: 6 },
          { color: 7, count: 5 },
          { color: 6, count: 8 },
          { color: 1, count: 6 }
        ]
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

  function isExposed(grid, x, y) {
    if (!inBounds(grid, x, y) || !grid[y][x]) return false;
    if (x === 0 || y === 0 || x === grid[0].length - 1 || y === grid.length - 1) return true;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
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
    cells.sort((a, b) => b.y - a.y || b.x - a.x);
    return cells;
  }

  function boardCleared(grid) {
    return grid.every((row) => row.every((c) => c === 0));
  }

  function createGame(root) {
    const save = loadSave();
    let levelIndex = save.level;
    let grid = [];
    let queues = [];
    let docks = [];
    let status = "play";
    let message = "";
    let eatTimer = 0;
    let animCells = new Set();
    let stackSeq = 0;

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
          <div><span>Docks</span><strong data-th-docks>2</strong></div>
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
          <div class="th-section-label">Deploy queue tops</div>
          <div class="th-queues" data-th-queues></div>
        </section>

        <section class="th-actions">
          <button type="button" class="th-btn" data-th-restart>Restart level</button>
          <button type="button" class="th-btn ghost" data-th-prev>Prev</button>
          <button type="button" class="th-btn ghost" data-th-next>Next</button>
        </section>

        <p class="th-help">
          Harder Food Hunt rules: only the <em>top</em> of each queue can dock.
          Stacks hold a bay until finished. Buried colors + full docks = jam.
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
      queues: root.querySelector("[data-th-queues]"),
      close: root.querySelector("[data-th-close]")
    };

    function setMessage(text) {
      message = text;
      els.msg.textContent = text;
    }

    function startLevel(index) {
      levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
      const level = LEVELS[levelIndex];
      grid = parseGrid(level.grid);
      queues = level.queues.map((q) =>
        q.map((s) => ({
          id: "s" + (stackSeq += 1),
          color: s.color,
          count: s.count
        }))
      );
      docks = Array.from({ length: level.slots }, () => null);
      status = "play";
      animCells = new Set();
      save.level = levelIndex;
      saveSave(save);
      setMessage(level.blurb);
      render();
    }

    function freeDockIndex() {
      return docks.findIndex((d) => !d);
    }

    function anyEatingPossible() {
      return docks.some((d) => d && d.remaining > 0 && findExposed(grid, d.color).length > 0);
    }

    function anyProgressPossible() {
      if (status !== "play") return false;
      if (anyEatingPossible()) return true;
      if (freeDockIndex() !== -1 && queues.some((q) => q.length)) return true;
      return false;
    }

    function markWin() {
      status = "won";
      const cleared = levelIndex + 1;
      if (cleared > save.best) {
        save.best = cleared;
        saveSave(save);
      }
      setMessage(
        levelIndex < LEVELS.length - 1
          ? "Wafer clear. Sequence holds."
          : "Full reticle clear. Terrafab Hunt complete."
      );
      render();
    }

    function checkEnd() {
      if (boardCleared(grid)) {
        docks = docks.map(() => null);
        queues = queues.map(() => []);
        markWin();
        return;
      }
      if (!anyProgressPossible()) {
        status = "lost";
        setMessage("Dock jam. Tops waiting on buried silicon. Resequence.");
        render();
      }
    }

    function deployTop(queueIndex) {
      if (status !== "play") return;
      const q = queues[queueIndex];
      if (!q || !q.length) return;
      const dockAt = freeDockIndex();
      if (dockAt === -1) {
        setMessage("All docks busy.");
        return;
      }
      const stack = q.shift();
      docks[dockAt] = {
        id: stack.id,
        color: stack.color,
        remaining: stack.count
      };
      setMessage("Stack docked. Drones hunting exposed blocks.");
      nibbleOnce();
      render();
      checkEnd();
    }

    function nibbleOnce() {
      if (status !== "play") return false;
      let ate = false;
      animCells = new Set();
      for (let i = 0; i < docks.length; i += 1) {
        const dock = docks[i];
        if (!dock || dock.remaining <= 0) continue;
        const exposed = findExposed(grid, dock.color);
        if (!exposed.length) continue;
        const cell = exposed[0];
        grid[cell.y][cell.x] = 0;
        dock.remaining -= 1;
        animCells.add(cell.x + "," + cell.y);
        ate = true;
        if (dock.remaining <= 0) docks[i] = null;
      }
      return ate;
    }

    function renderBoard() {
      const h = grid.length;
      const w = grid[0].length;
      els.board.style.setProperty("--th-cols", String(w));
      els.board.style.setProperty("--th-rows", String(h));
      let html = "";
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const c = grid[y][x];
          const flash = animCells.has(x + "," + y);
          if (!c) {
            html += '<span class="th-cell empty' + (flash ? " flash" : "") + '"></span>';
          } else {
            const exposed = isExposed(grid, x, y);
            html +=
              '<span class="th-cell' +
              (exposed ? " exposed" : " buried") +
              (flash ? " flash" : "") +
              '" style="--c:' +
              (PALETTE[c] || "#888") +
              '"></span>';
          }
        }
      }
      els.board.innerHTML = html;
    }

    function renderDocks() {
      els.docksRow.innerHTML = docks
        .map((dock, i) => {
          if (!dock) {
            return (
              '<div class="th-dock empty"><span>Dock ' +
              (i + 1) +
              "</span><em>open</em></div>"
            );
          }
          const can = findExposed(grid, dock.color).length > 0;
          return (
            '<div class="th-dock ' +
            (can ? "active" : "stuck") +
            '" style="--c:' +
            PALETTE[dock.color] +
            '"><span>Dock ' +
            (i + 1) +
            "</span><strong></strong><em>" +
            (can ? "eating" : "waiting") +
            " · " +
            dock.remaining +
            "</em></div>"
          );
        })
        .join("");
    }

    function renderQueues() {
      if (status === "won") {
        const hasNext = levelIndex < LEVELS.length - 1;
        els.queues.innerHTML =
          '<button type="button" class="th-color-btn next" data-th-continue>' +
          (hasNext ? "Next level" : "Replay finale") +
          "</button>";
        return;
      }
      if (status === "lost") {
        els.queues.innerHTML =
          '<button type="button" class="th-color-btn next" data-th-restart-inline>Restart level</button>';
        return;
      }

      els.queues.innerHTML = queues
        .map((q, qi) => {
          if (!q.length) {
            return '<div class="th-queue empty"><div class="th-queue-label">Queue ' + (qi + 1) + '</div><div class="th-queue-empty">empty</div></div>';
          }
          const top = q[0];
          const rest = q.slice(1, 5);
          const more = q.length - 1 - rest.length;
          const exposed = findExposed(grid, top.color).length;
          return (
            '<div class="th-queue">' +
            '<div class="th-queue-label">Queue ' + (qi + 1) + " · " + q.length + "</div>" +
            '<button type="button" class="th-color-btn top" data-th-deploy="' +
            qi +
            '" style="--c:' +
            PALETTE[top.color] +
            '"><i></i><span>' +
            top.count +
            " top</span><em>" +
            (exposed ? exposed + " exposed" : "buried now") +
            "</em></button>" +
            '<div class="th-queue-rest">' +
            rest
              .map(
                (s) =>
                  '<span class="th-mini" style="--c:' +
                  PALETTE[s.color] +
                  '" title="' +
                  s.count +
                  '">' +
                  s.count +
                  "</span>"
              )
              .join("") +
            (more > 0 ? '<span class="th-more">+' + more + "</span>" : "") +
            "</div></div>"
          );
        })
        .join("");
    }

    function render() {
      const level = LEVELS[levelIndex];
      els.title.textContent = level.name;
      els.blurb.textContent = level.blurb;
      els.level.textContent = levelIndex + 1 + "/" + LEVELS.length;
      els.docks.textContent = String(level.slots);
      els.best.textContent = String(save.best);
      els.msg.textContent = message;
      root.dataset.status = status;
      renderBoard();
      renderDocks();
      renderQueues();
    }

    function onClick(event) {
      const t = event.target.closest(
        "[data-th-deploy], [data-th-continue], [data-th-restart], [data-th-restart-inline], [data-th-prev], [data-th-next], [data-th-close]"
      );
      if (!t) return;
      if (t.matches("[data-th-deploy]")) deployTop(parseInt(t.getAttribute("data-th-deploy"), 10));
      else if (t.matches("[data-th-continue]")) {
        if (levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
        else startLevel(levelIndex);
      } else if (t.matches("[data-th-restart]") || t.matches("[data-th-restart-inline]")) {
        startLevel(levelIndex);
      } else if (t.matches("[data-th-prev]")) startLevel(levelIndex - 1);
      else if (t.matches("[data-th-next]")) startLevel(levelIndex + 1);
    }

    function tick() {
      if (status === "play") {
        const ate = nibbleOnce();
        if (ate) {
          render();
          checkEnd();
        } else {
          checkEnd();
          if (status === "play") {
            renderDocks();
            renderQueues();
          }
        }
      }
      eatTimer = window.setTimeout(tick, 170);
    }

    function start() {
      startLevel(levelIndex);
      root.addEventListener("click", onClick);
      eatTimer = window.setTimeout(tick, 170);
    }

    function stop() {
      window.clearTimeout(eatTimer);
      root.removeEventListener("click", onClick);
      save.level = levelIndex;
      saveSave(save);
    }

    start();
    return { stop, closeButton: els.close };
  }

  global.TerrafabHunt = {
    createGame,
    levelCount: LEVELS.length
  };
})(window);
