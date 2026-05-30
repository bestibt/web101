/* app.js — wires data, rendering, controls, and the polling loop. */
(() => {
  const REFRESH_MS = 45000; // free-tier-friendly polling interval

  const els = {
    matches: document.getElementById("matches"),
    status: document.getElementById("status-line"),
    league: document.getElementById("league-select"),
    autoRefresh: document.getElementById("auto-refresh"),
    refreshBtn: document.getElementById("refresh-btn"),
    themeToggle: document.getElementById("theme-toggle"),
    year: document.getElementById("year"),
  };

  let allMatches = [];
  let timer = null;
  let loading = false;

  // ---- Theme ----
  function initTheme() {
    const saved = localStorage.getItem("livekick-theme");
    const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(theme);
    els.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem("livekick-theme", next);
    });
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
  }

  // ---- Filters ----
  function buildLeagueOptions() {
    const opts = ['<option value="all">All leagues</option>'];
    for (const l of API.LEAGUES) {
      opts.push(`<option value="${l.name}">${l.name}</option>`);
    }
    els.league.innerHTML = opts.join("");
  }

  function visibleMatches() {
    const league = els.league.value;
    if (league === "all") return allMatches;
    return allMatches.filter((m) => m.league === league);
  }

  function liveCount(list) {
    return list.filter((m) => m.status === "live").length;
  }

  // ---- Render pipeline ----
  function paint(banner) {
    const list = visibleMatches();
    Render.matches(els.matches, list, { banner });
    const live = liveCount(list);
    const now = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    els.status.textContent = `${list.length} match${list.length === 1 ? "" : "es"} · ${live} live · updated ${now}`;
  }

  async function load({ showSkeleton = false } = {}) {
    if (loading) return;
    loading = true;
    if (showSkeleton) {
      Render.skeletons(els.matches);
      els.status.textContent = "Loading matches…";
    }
    els.refreshBtn.disabled = true;
    try {
      const { matches, error } = await API.getMatches();
      allMatches = matches;
      paint(error ? `Live API unavailable (${error}). Showing sample data.` : null);
    } catch (err) {
      els.matches.innerHTML = `<p class="state-msg">Couldn't load matches: ${err.message}</p>`;
      els.status.textContent = "Error loading matches";
    } finally {
      loading = false;
      els.refreshBtn.disabled = false;
    }
  }

  // ---- Polling ----
  function startPolling() {
    stopPolling();
    timer = setInterval(() => {
      if (document.hidden) return; // don't poll a backgrounded tab
      load();
    }, REFRESH_MS);
  }
  function stopPolling() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // ---- Events ----
  function bindEvents() {
    els.league.addEventListener("change", () => paint());
    els.refreshBtn.addEventListener("click", () => load());
    els.autoRefresh.addEventListener("change", () => {
      if (els.autoRefresh.checked) startPolling();
      else stopPolling();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && els.autoRefresh.checked) load();
    });
  }

  // ---- Init ----
  function init() {
    els.year.textContent = new Date().getFullYear();
    initTheme();
    buildLeagueOptions();
    bindEvents();
    load({ showSkeleton: true });
    if (els.autoRefresh.checked) startPolling();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
