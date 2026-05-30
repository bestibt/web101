/* api.js — fetches match data and normalizes it to one shape.
 * Source: TheSportsDB (free, CORS-friendly, public test key "3").
 * Falls back to bundled mock data when the network/API is unavailable.
 *
 * Normalized match shape:
 * { id, league, home, away, homeCrest, awayCrest,
 *   homeScore, awayScore, status: 'live'|'upcoming'|'finished', minute, kickoff }
 */
const API = (() => {
  const KEY = "3"; // public free test key
  const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

  // Leagues offered in the filter. id = TheSportsDB league id.
  const LEAGUES = [
    { id: "4328", name: "English Premier League" },
    { id: "4335", name: "Spanish La Liga" },
    { id: "4332", name: "Italian Serie A" },
    { id: "4331", name: "German Bundesliga" },
    { id: "4334", name: "French Ligue 1" },
  ];

  function classifyStatus(raw) {
    const s = (raw || "").toLowerCase();
    if (!s || s === "not started" || s === "ns") return "upcoming";
    if (s === "match finished" || s === "ft" || s === "aet" || s === "pen" || s === "finished") return "finished";
    return "live"; // "1H", "2H", "HT", a minute like "67'", etc.
  }

  function minuteLabel(ev, status) {
    if (status === "finished") return "FT";
    if (status === "upcoming") return "";
    const p = ev.strProgress || ev.strStatus || "";
    return p ? (/^\d+$/.test(p) ? `${p}'` : p) : "LIVE";
  }

  function toNum(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }

  // Map a raw TheSportsDB event to our normalized shape.
  function normalizeEvent(ev) {
    const status = classifyStatus(ev.strStatus);
    return {
      id: ev.idEvent,
      league: ev.strLeague || "",
      home: ev.strHomeTeam || "Home",
      away: ev.strAwayTeam || "Away",
      homeCrest: ev.strHomeTeamBadge || "",
      awayCrest: ev.strAwayTeamBadge || "",
      homeScore: toNum(ev.intHomeScore),
      awayScore: toNum(ev.intAwayScore),
      status,
      minute: minuteLabel(ev, status),
      kickoff: ev.strTimestamp || (ev.dateEvent ? `${ev.dateEvent}T${ev.strTime || "00:00:00"}` : ""),
    };
  }

  async function fetchLeagueEvents(leagueId) {
    // Next 15 upcoming + last 15 results for the league.
    const urls = [
      `${BASE}/eventsnextleague.php?id=${leagueId}`,
      `${BASE}/eventspastleague.php?id=${leagueId}`,
    ];
    const results = await Promise.allSettled(urls.map((u) => fetch(u).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })));

    const events = [];
    for (const res of results) {
      if (res.status === "fulfilled" && res.value && Array.isArray(res.value.events)) {
        events.push(...res.value.events);
      }
    }
    return events.map(normalizeEvent);
  }

  // Fetch across the configured leagues. Returns { matches, live } or throws.
  async function fetchLive() {
    const settled = await Promise.allSettled(LEAGUES.map((l) => fetchLeagueEvents(l.id)));
    const matches = [];
    for (const s of settled) {
      if (s.status === "fulfilled") matches.push(...s.value);
    }
    if (matches.length === 0) throw new Error("No events returned from API");
    return { matches, live: true };
  }

  // Bundled fallback so the demo always renders something.
  async function fetchMock() {
    const res = await fetch("data/mock.json");
    const data = await res.json();
    return { matches: data.matches, live: false };
  }

  // Public entry point. Tries live data, falls back to mock on any failure.
  async function getMatches() {
    try {
      return await fetchLive();
    } catch (err) {
      const fallback = await fetchMock();
      fallback.error = err.message || "API unavailable";
      return fallback;
    }
  }

  return { getMatches, LEAGUES };
})();
