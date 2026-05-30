/* render.js — turns normalized matches into DOM. Pure view layer. */
const Render = (() => {
  const STATUS_ORDER = { live: 0, upcoming: 1, finished: 2 };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function crest(url, alt) {
    const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3C/svg%3E";
    const src = url ? escapeHtml(url) : fallback;
    return `<img class="team-crest" src="${src}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`;
  }

  function statusPill(m) {
    if (m.status === "live") return `<span class="status-pill live">${escapeHtml(m.minute || "LIVE")}</span>`;
    if (m.status === "finished") return `<span class="status-pill finished">FT</span>`;
    return `<span class="status-pill upcoming">Upcoming</span>`;
  }

  function kickoffLabel(m) {
    if (m.status === "live") return "In progress";
    if (!m.kickoff) return "";
    const d = new Date(m.kickoff);
    if (isNaN(d)) return "";
    return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  function card(m) {
    const showScore = m.status !== "upcoming";
    const homeScore = showScore ? m.homeScore : "–";
    const awayScore = showScore ? m.awayScore : "–";
    return `
      <article class="match-card">
        <div class="match-league">${escapeHtml(m.league)}</div>
        <div class="match-row">
          <div class="team home">
            ${crest(m.homeCrest, m.home)}
            <span class="team-name">${escapeHtml(m.home)}</span>
          </div>
          <span class="score">${homeScore}</span>
        </div>
        <div class="match-row">
          <div class="team away">
            ${crest(m.awayCrest, m.away)}
            <span class="team-name">${escapeHtml(m.away)}</span>
          </div>
          <span class="score">${awayScore}</span>
        </div>
        <div class="match-foot">
          ${statusPill(m)}
          <span>${escapeHtml(kickoffLabel(m))}</span>
        </div>
      </article>`;
  }

  function sortMatches(matches) {
    return [...matches].sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return new Date(a.kickoff || 0) - new Date(b.kickoff || 0);
    });
  }

  function skeletons(container, count = 6) {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = Array.from({ length: count }, () => `<div class="skeleton"></div>`).join("");
  }

  function matches(container, list, { banner } = {}) {
    container.setAttribute("aria-busy", "false");
    if (!list || list.length === 0) {
      container.innerHTML = `<p class="state-msg">No matches to show right now. Try another league or refresh.</p>`;
      return;
    }
    const bannerHtml = banner ? `<div class="banner">${escapeHtml(banner)}</div>` : "";
    container.innerHTML = bannerHtml + sortMatches(list).map(card).join("");
  }

  return { matches, skeletons };
})();
