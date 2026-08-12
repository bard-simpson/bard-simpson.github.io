/* Bard Simpson homepage dashboard */
(function (global) {
  "use strict";

  const TODO_KEY = "bard-simpson-todos";
  const IDLE_KEYS = ["bard-simpson-terafab-v1", "bard-simpson-terrafab-v1"];
  const HUNT_KEYS = [
    "bard-simpson-terafab-hunt-v3",
    "bard-simpson-terrafab-hunt-v3"
  ];

  function readJson(keys, fallback) {
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        return JSON.parse(raw);
      } catch (e) {
        /* try next */
      }
    }
    return fallback;
  }

  function formatNum(n) {
    n = Number(n) || 0;
    if (!Number.isFinite(n)) return "0";
    const abs = Math.abs(n);
    if (abs < 1000) return (Math.round(n * 10) / 10).toString();
    const units = ["", "K", "M", "B", "T"];
    let u = 0;
    let v = n;
    while (Math.abs(v) >= 1000 && u < units.length - 1) {
      v /= 1000;
      u += 1;
    }
    return v.toFixed(v >= 100 || v <= -100 ? 0 : 1) + units[u];
  }

  function loadSnapshot() {
    const todos = readJson([TODO_KEY], []);
    const list = Array.isArray(todos) ? todos : [];
    const open = list.filter((t) => !t.done);
    const done = list.filter((t) => t.done);

    const idle = readJson(IDLE_KEYS, null) || {};
    const hunt = readJson(HUNT_KEYS, null) || {};

    const owned = idle.owned || {};
    const buildingCount = Object.keys(owned).reduce(
      (sum, id) => sum + (Number(owned[id]) || 0),
      0
    );

    return {
      now: new Date(),
      todos: {
        total: list.length,
        open: open.length,
        done: done.length,
        next: open.slice(0, 4)
      },
      idle: {
        wafers: idle.wafers || 0,
        totalWafers: idle.totalWafers || 0,
        heritage: idle.heritage || 0,
        launches: idle.launches || 0,
        buildings: buildingCount,
        clickLvl: idle.clickLvl || 0
      },
      hunt: {
        level: (hunt.level || 0) + 1,
        best: hunt.best || 0,
        levelCount: (global.TerafabHunt && global.TerafabHunt.levelCount) || 14
      }
    };
  }

  function greeting(date) {
    const h = date.getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function formatClock(date) {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function createDashboard(root, actions) {
    const snap = loadSnapshot();

    root.innerHTML = `
      <div class="db-shell">
        <header class="db-top">
          <div>
            <p class="db-kicker">Dashboard</p>
            <h2 data-db-greet>${greeting(snap.now)}, Bard</h2>
            <p class="db-sub" data-db-clock>${formatClock(snap.now)}</p>
          </div>
          <button type="button" class="db-close" data-db-close aria-label="Close dashboard">✕</button>
        </header>

        <section class="db-stats">
          <article class="db-stat">
            <span class="db-label">Open todos</span>
            <strong data-db-todo-open>${snap.todos.open}</strong>
            <em>${snap.todos.done} done · ${snap.todos.total} total</em>
          </article>
          <article class="db-stat">
            <span class="db-label">Idle wafers</span>
            <strong data-db-wafers>${formatNum(snap.idle.wafers)}</strong>
            <em>heritage ${snap.idle.heritage} · ${snap.idle.buildings} buildings</em>
          </article>
          <article class="db-stat">
            <span class="db-label">Hunt progress</span>
            <strong data-db-hunt>L${snap.hunt.level}</strong>
            <em>best clear ${snap.hunt.best}/${snap.hunt.levelCount}</em>
          </article>
        </section>

        <section class="db-grid">
          <article class="db-card">
            <div class="db-card-head">
              <h3>Todo list</h3>
              <button type="button" class="db-link" data-db-open="todo">Open</button>
            </div>
            <ul class="db-todo-preview" data-db-todos></ul>
          </article>

          <article class="db-card">
            <div class="db-card-head">
              <h3>Terafab Idle</h3>
              <button type="button" class="db-link" data-db-open="idle">Play</button>
            </div>
            <dl class="db-kv">
              <div><dt>Lifetime wafers</dt><dd>${formatNum(snap.idle.totalWafers)}</dd></div>
              <div><dt>Launches</dt><dd>${snap.idle.launches}</dd></div>
              <div><dt>Click path</dt><dd>Lv ${snap.idle.clickLvl}</dd></div>
              <div><dt>Flight heritage</dt><dd>×${(1 + snap.idle.heritage * 0.35).toFixed(2)}</dd></div>
            </dl>
          </article>

          <article class="db-card">
            <div class="db-card-head">
              <h3>Terafab Hunt</h3>
              <button type="button" class="db-link" data-db-open="hunt">Puzzle</button>
            </div>
            <div class="db-progress">
              <div class="db-progress-bar">
                <span style="width:${Math.min(100, (snap.hunt.best / Math.max(1, snap.hunt.levelCount)) * 100)}%"></span>
              </div>
              <p>Cleared <strong>${snap.hunt.best}</strong> of <strong>${snap.hunt.levelCount}</strong> levels. Current seat: level <strong>${snap.hunt.level}</strong>.</p>
            </div>
          </article>

          <article class="db-card db-actions-card">
            <div class="db-card-head">
              <h3>Quick actions</h3>
            </div>
            <div class="db-actions">
              <button type="button" data-db-open="todo">Todos</button>
              <button type="button" data-db-open="idle">Idle</button>
              <button type="button" data-db-open="hunt">Hunt</button>
              <button type="button" data-db-refresh>Refresh</button>
            </div>
            <p class="db-note">Live stats come from this browser’s local saves. No cloud sync.</p>
          </article>
        </section>
      </div>
    `;

    const els = {
      close: root.querySelector("[data-db-close]"),
      todos: root.querySelector("[data-db-todos]"),
      greet: root.querySelector("[data-db-greet]"),
      clock: root.querySelector("[data-db-clock]"),
      todoOpen: root.querySelector("[data-db-todo-open]"),
      wafers: root.querySelector("[data-db-wafers]"),
      hunt: root.querySelector("[data-db-hunt]")
    };

    function renderTodos(list) {
      els.todos.innerHTML = "";
      if (!list.length) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "No open tasks. Nice and clear.";
        els.todos.appendChild(li);
        return;
      }
      list.forEach((todo) => {
        const li = document.createElement("li");
        li.textContent = todo.text || "Untitled";
        els.todos.appendChild(li);
      });
    }

    function refresh() {
      const next = loadSnapshot();
      els.greet.textContent = greeting(next.now) + ", Bard";
      els.clock.textContent = formatClock(next.now);
      els.todoOpen.textContent = String(next.todos.open);
      els.wafers.textContent = formatNum(next.idle.wafers);
      els.hunt.textContent = "L" + next.hunt.level;
      renderTodos(next.todos.next);
      // rewrite a few dynamic bits in cards cheaply by full recreate if needed
      // Keep simple: only list + top stats refresh here.
    }

    renderTodos(snap.todos.next);

    function onClick(event) {
      const t = event.target.closest("[data-db-open], [data-db-refresh], [data-db-close]");
      if (!t) return;
      if (t.matches("[data-db-close]")) {
        actions && actions.onClose && actions.onClose();
        return;
      }
      if (t.matches("[data-db-refresh]")) {
        // Full rebuild for complete stat cards
        createDashboard(root, actions);
        return;
      }
      const which = t.getAttribute("data-db-open");
      if (which === "todo" && actions.onOpenTodo) actions.onOpenTodo();
      if (which === "idle" && actions.onOpenIdle) actions.onOpenIdle();
      if (which === "hunt" && actions.onOpenHunt) actions.onOpenHunt();
    }

    root.addEventListener("click", onClick);

    const clockTimer = window.setInterval(() => {
      if (els.clock) els.clock.textContent = formatClock(new Date());
    }, 30000);

    return {
      closeButton: els.close,
      refresh,
      stop() {
        root.removeEventListener("click", onClick);
        window.clearInterval(clockTimer);
      }
    };
  }

  global.BardDashboard = { createDashboard, loadSnapshot };
})(window);
