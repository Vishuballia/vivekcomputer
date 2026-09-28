/*
  Sarkari-style update board
  --------------------------------
  1. Update updates.json to change cards/ticker.
  2. The page automatically reloads JSON every 60 seconds.
  3. Set CONFIG.rssUrl to a CORS-enabled RSS/XML URL if required.
*/

const CONFIG = {
  jsonUrl: "updates.json",
  autoRefreshMs: 60 * 1000,

  // Optional RSS:
  // Example: "https://example.com/feed.xml"
  // Browser-side RSS needs the feed server to allow CORS.
  rssUrl: ""
};

const tickerTrack = document.getElementById("tickerTrack");
const updateGrid = document.getElementById("updateGrid");
const lastUpdated = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");
const rssList = document.getElementById("rssList");
const rssStatus = document.getElementById("rssStatus");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function createTicker(items) {
  if (!items.length) {
    tickerTrack.innerHTML = '<span class="ticker-loading">No updates available.</span>';
    return;
  }

  // Duplicate the content so the marquee can loop smoothly.
  const content = items.map(item => `
    <a class="ticker-item" href="${escapeHTML(item.url || "#")}"
       ${item.url ? 'target="_blank" rel="noopener"' : ''}>
      ${escapeHTML(item.title)}
    </a>
    <span class="ticker-separator">||</span>
  `).join("");

  tickerTrack.innerHTML = content + content;
}

function createCards(items) {
  if (!items.length) {
    updateGrid.innerHTML = '<div class="loading-card">No cards found in updates.json.</div>';
    return;
  }

  updateGrid.innerHTML = items.map(item => {
    const color = item.color || "blue";
    const target = item.url ? 'target="_blank" rel="noopener"' : "";
    const href = item.url || "#";

    return `
      <a class="update-card color-${escapeHTML(color)}"
         href="${escapeHTML(href)}" ${target}>
        <span>
          ${escapeHTML(item.title)}
          ${item.subtitle ? `<small>${escapeHTML(item.subtitle)}</small>` : ""}
        </span>
      </a>
    `;
  }).join("");
}

async function loadJSON() {
  updateGrid.innerHTML = '<div class="loading-card">Updates loading...</div>';

  try {
    // Timestamp prevents stale browser/CDN cache after JSON changes.
    const response = await fetch(`${CONFIG.jsonUrl}?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const tickerItems = Array.isArray(data.ticker) ? data.ticker : [];
    const cards = Array.isArray(data.cards) ? data.cards : [];

    createTicker(tickerItems);
    createCards(cards);

    const now = new Date();
    lastUpdated.textContent =
      `Last updated: ${now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })}`;

  } catch (error) {
    console.error("JSON update error:", error);
    tickerTrack.innerHTML =
      '<span class="ticker-loading">Updates could not be loaded.</span>';

    updateGrid.innerHTML = `
      <div class="error-card">
        JSON load nahi ho paya. Check करें कि <b>updates.json</b>
        same folder में मौजूद है और website HTTP/HTTPS पर चल रही है.
      </div>
    `;
  }
}

async function loadRSS(url) {
  if (!url) {
    rssStatus.textContent = "Optional";
    return;
  }

  rssStatus.textContent = "Loading...";

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`RSS HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(xmlText, "text/xml");

    if (xml.querySelector("parsererror")) {
      throw new Error("Invalid RSS/XML");
    }

    const items = [...xml.querySelectorAll("item")].slice(0, 10);

    if (!items.length) {
      rssList.innerHTML = '<div class="rss-empty">RSS में कोई item नहीं मिला.</div>';
      rssStatus.textContent = "Empty";
      return;
    }

    rssList.innerHTML = items.map(item => {
      const title = item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link = item.querySelector("link")?.textContent?.trim() || "#";
      const date = item.querySelector("pubDate")?.textContent?.trim() || "";

      return `
        <div class="rss-item">
          <a href="${escapeHTML(link)}" target="_blank" rel="noopener">
            ${escapeHTML(title)}
          </a>
          ${date ? `<span class="rss-date">${escapeHTML(date)}</span>` : ""}
        </div>
      `;
    }).join("");

    rssStatus.textContent = "Live";

  } catch (error) {
    console.warn("RSS load error:", error);
    rssStatus.textContent = "CORS / Error";
    rssList.innerHTML = `
      <div class="rss-empty">
        RSS fetch नहीं हो सकी. Source server पर CORS enable होना जरूरी है.
        JSON integration अभी भी काम करेगा.
      </div>
    `;
  }
}

refreshBtn.addEventListener("click", async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading...";
  await loadJSON();
  refreshBtn.disabled = false;
  refreshBtn.textContent = "↻ Refresh";
});

loadJSON();
loadRSS(CONFIG.rssUrl);

// JSON automatically refreshes every 60 seconds.
setInterval(loadJSON, CONFIG.autoRefreshMs);
