// app.js
(function () {
  const state = {
    q: "",
    area: "All",
    service: "All",
    sort: "Best",
    chip: "All",
    page: 1,
    pageSize: 25,
  };

  const els = {
    q: null,
    area: null,
    service: null,
    sort: null,
    chips: [],
    pageSizeButtons: [],
    pagePrevs: [],
    pageNexts: [],
    pageInfos: [],
    count: null,
    list: null
  };

  function uniq(arr) { return Array.from(new Set(arr)); }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[s]));
  }

  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function joinNonEmpty(parts, sep) {
    return parts.filter(Boolean).join(sep);
  }

  function normalizePhone(phone) {
    return String(phone || "").trim();
  }

  function inferArea(raw) {
    return raw.neighborhood || raw.area || raw.city || "Knoxville";
  }

  function deriveServices(raw) {
    const title = String(raw.title || raw.name || "").toLowerCase();
    const catName = String(raw.categoryName || raw.category || raw.primaryCategory || "").toLowerCase();
    const cats = Array.isArray(raw.categories) ? raw.categories : [];
    const oldServices = Array.isArray(raw.services) ? raw.services : [];

    const catHay = cats.join(" ").toLowerCase();
    const hay = [title, catName, catHay, oldServices.join(" ")].join(" ").toLowerCase();

    const out = [];

    for (const s of oldServices) {
      if (s && !out.includes(s)) out.push(s);
    }

    const isTreeCompany =
      hay.includes("tree service") ||
      hay.includes("tree removal") ||
      hay.includes("arborist") ||
      hay.includes("arboriculture");

    if (isTreeCompany) {
      out.push("Tree Removal");
      out.push("Tree Trimming");
      out.push("Tree Care");
      out.push("Tree Contractors");
      out.push("Tree Service");
    }

    if (hay.includes("stump") || hay.includes("grind")) out.push("Stump Grinding");
    if (hay.includes("emergency") || hay.includes("storm") || hay.includes("24/7") || hay.includes("cleanup")) out.push("Emergency");

    if (hay.includes("contractor") || hay.includes("construction") || hay.includes("land clearing") || hay.includes("clearing")) {
      out.push("Tree Contractors");
    }

    return uniq(out);
  }

  function normalizeDayName(day) {
    const s = String(day || "").trim().toLowerCase();

    if (!s) return "";

    // handle full day names
    if (s === "monday") return "monday";
    if (s === "tuesday") return "tuesday";
    if (s === "wednesday") return "wednesday";
    if (s === "thursday") return "thursday";
    if (s === "friday") return "friday";
    if (s === "saturday") return "saturday";
    if (s === "sunday") return "sunday";

    // handle common abbreviations
    if (s === "mon") return "monday";
    if (s === "tue" || s === "tues") return "tuesday";
    if (s === "wed") return "wednesday";
    if (s === "thu" || s === "thur" || s === "thurs") return "thursday";
    if (s === "fri") return "friday";
    if (s === "sat") return "saturday";
    if (s === "sun") return "sunday";

    return s;
  }

  function cleanHoursText(hours) {
    // normalize weird invisible unicode spaces in scraped data
    return String(hours || "")
      .replace(/\u202F/g, " ") // narrow no-break space
      .replace(/\u00A0/g, " ") // no-break space
      .replace(/\s+/g, " ")
      .trim();
  }

  function getTodayHours(raw) {
    const oh = Array.isArray(raw.openingHours) ? raw.openingHours : [];
    if (!oh.length) return "";

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[new Date().getDay()];

    const row = oh.find(x => normalizeDayName(x && x.day) === today);
    if (!row) return "";

    const hours = cleanHoursText(row.hours);
    if (!hours) return "";

    const lower = hours.toLowerCase();

    if (lower.includes("open 24")) return "Open 24 hours";
    if (lower === "closed") return "Closed";

    return hours;
  }

  function formatOpeningHoursCompact(raw) {
    const today = getTodayHours(raw);
    if (today) return `Today: ${today}`;

    // fallback: first non-empty row
    const oh = Array.isArray(raw.openingHours) ? raw.openingHours : [];
    const first = oh.find(x => x && (x.day || x.hours));
    if (!first) return "";

    const day = String(first.day || "").trim();
    const hrs = cleanHoursText(first.hours);

    if (day && hrs) return `${day}: ${hrs}`;
    return hrs || "";
  }

  function hoursStatusClass(raw, compactHours){
    // Determine if the business is open today (not real-time open now)
    // Uses openingHours when available, otherwise falls back to the compact string.
    const today = getTodayHours(raw);
    const basis = cleanHoursText(today || compactHours || "");
    const lower = basis.toLowerCase();

    if (!basis) return "";

    // normalize if the compact string includes a prefix like "Today: "
    const stripped = lower.replace(/^today:\s*/i, "").trim();

    if (stripped === "closed" || stripped.includes("closed")) return "closed-red";
    // Treat 24 hours and any non-closed schedule as open for the day
    if (stripped.includes("open 24")) return "open-green";

    // Common formats: "7:30 AM to 4:30 PM", "8 AM to 5 PM"
    // If it contains " to " (Google format) or a hyphenated range, consider it open today.
    if (stripped.includes(" to ") || stripped.includes("-") || stripped.includes("–")) return "open-green";

    return "";
  }

  function hourLabel(h) {
    const hr = asNum(h) % 24;
    const suffix = hr >= 12 ? "pm" : "am";
    const hr12 = ((hr + 11) % 12) + 1;
    return `${hr12}${suffix}`;
  }

  function topBusyHours(dayArr) {
    const arr = Array.isArray(dayArr) ? dayArr : [];
    const sorted = [...arr].sort((a, b) => asNum(b.occupancyPercent) - asNum(a.occupancyPercent));
    return sorted.slice(0, 3);
  }

  function renderPopularTimes(raw) {
    const hist = raw.popularTimesHistogram && typeof raw.popularTimesHistogram === "object" ? raw.popularTimesHistogram : null;
    const liveText = String(raw.popularTimesLiveText || "").trim();
    const livePct = raw.popularTimesLivePercent;

    if (!hist && !liveText && livePct == null) return "";

    const dayOrder = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const dayName = { Su: "Sun", Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat" };

    let rows = "";
    if (hist) {
      for (const d of dayOrder) {
        const day = hist[d];
        if (!day || !day.length) continue;

        const top = topBusyHours(day);
        if (!top.length) continue;

        const bars = top.map(x => {
          const pct = Math.max(0, Math.min(100, asNum(x.occupancyPercent)));
          const label = `${hourLabel(x.hour)} ${pct}%`;
          return `
            <div class="btRow">
              <div class="btLabel">${escapeHtml(label)}</div>
              <div class="btBarWrap"><div class="btBar" style="width:${pct}%"></div></div>
            </div>
          `;
        }).join("");

        rows += `
          <div class="btDay">
            <div class="small"><strong>${escapeHtml(dayName[d])}</strong></div>
            ${bars}
          </div>
        `;
      }
    }

    const liveLine = (liveText || livePct != null)
      ? `<div class="small">${escapeHtml(liveText || `Now: ${livePct}%`)}</div>`
      : "";

    return `
      <div class="detailsSection">
        <div class="small detail-header"><strong>Busy times</strong></div>
        ${liveLine}
        ${rows || `<div class="small">Not enough typical data</div>`}
      </div>
    `;
  }

  function renderSocialLinks(raw) {
    const socials = [
      ["Facebook", raw.facebooks],
      ["Instagram", raw.instagrams],
      ["YouTube", raw.youtubes],
      ["TikTok", raw.tiktoks],
      ["LinkedIn", raw.linkedIns],
      ["X", raw.twitters],
      ["Threads", raw.threads]
    ];

    const links = [];
    for (const pair of socials) {
      const label = pair[0];
      const arr = Array.isArray(pair[1]) ? pair[1] : [];
      for (const url of arr) {
        if (!url) continue;
        links.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
      }
    }

    if (!links.length) return "";
    return `
      <div class="detailsSection">
        <div class="small"><strong>Social</strong></div>
        <div class="small">${links.join(" · ")}</div>
      </div>
    `;
  }

  function hasMoreDetails(item) {
    const raw = item && item._raw ? item._raw : {};

    const hasNotes = !!String(item.notes || "").trim();

    const hasOwnerUpdates = Array.isArray(raw.ownerUpdates) && raw.ownerUpdates.some(u => String((u && u.text) || "").trim());

    const hasHoursList = Array.isArray(raw.openingHours) && raw.openingHours.some(x => x && (x.day || x.hours));

    const hasPopular =
      (raw.popularTimesHistogram && typeof raw.popularTimesHistogram === "object" && Object.keys(raw.popularTimesHistogram).length) ||
      !!String(raw.popularTimesLiveText || "").trim() ||
      raw.popularTimesLivePercent != null;

    const hasSocial =
      (Array.isArray(raw.facebooks) && raw.facebooks.length) ||
      (Array.isArray(raw.instagrams) && raw.instagrams.length) ||
      (Array.isArray(raw.youtubes) && raw.youtubes.length) ||
      (Array.isArray(raw.tiktoks) && raw.tiktoks.length) ||
      (Array.isArray(raw.linkedIns) && raw.linkedIns.length) ||
      (Array.isArray(raw.twitters) && raw.twitters.length) ||
      (Array.isArray(raw.threads) && raw.threads.length);

    return hasNotes || hasOwnerUpdates || hasHoursList || hasPopular || hasSocial;
  }

  function normalizeItem(raw) {
    if (!raw) return null;

    if (raw.name || raw.services || raw.totalScore || raw.reviews || raw.openingHours) {
      const hoursCompact = raw.hours || formatOpeningHoursCompact(raw);

      return {
        name: raw.name || raw.title || "",
        totalScore: asNum(raw.totalScore),
        // support both shapes
        reviews: asNum(raw.reviews != null ? raw.reviews : raw.reviewsCount),
        area: raw.area || raw.neighborhood || raw.city || "Knoxville",
        services: Array.isArray(raw.services) ? raw.services : deriveServices(raw),
        notes: raw.notes || raw.address || "",
        hours: hoursCompact || "",
        website: raw.website || "",
        phone: normalizePhone(raw.phoneUnformatted || raw.phone || ""),
        mapsUrl: raw.url || "",
        flag: raw.flag || "",
        _raw: raw
      };
    }


    const name = raw.title || "";
    const totalScore = asNum(raw.totalScore);
    const reviews = asNum(raw.reviewsCount);

    const address = raw.address || joinNonEmpty([raw.street, raw.city, raw.state], ", ");
    const area = inferArea(raw);

    const flag = String(raw.flag || "").toLowerCase();
    const maybeNote = (flag === "maybe") ? "Flagged maybe listing, verify services on their site or Google profile." : "";

    const notes = joinNonEmpty([address, maybeNote], " · ");
    const hoursCompact = formatOpeningHoursCompact(raw);

    return {
      name,
      totalScore,
      reviews,
      area,
      services: deriveServices(raw),
      notes,
      hours: hoursCompact,
      website: raw.website || "",
      phone: normalizePhone(raw.phoneUnformatted || raw.phone || ""),
      mapsUrl: raw.url || "",
      flag: raw.flag || "",
      _raw: raw
    };
  }

  function unwrapToArray(anyValue) {
    if (!anyValue) return [];
    if (Array.isArray(anyValue)) return anyValue;

    return (
      anyValue.items ||
      anyValue.results ||
      anyValue.listings ||
      anyValue.data ||
      anyValue.places ||
      anyValue.rows ||
      []
    );
  }

  function getItems() {
    const candidates = [
      window.TREE_SERVICES,
      window.DirectoryData,
      window.DIRECTORY_DATA,
      window.LISTINGS,
      window.DATA,
      window.PLACES,
      window.PLACE_RESULTS
    ];

    let src = null;
    for (const c of candidates) {
      if (c && (Array.isArray(c) || typeof c === "object")) { src = c; break; }
    }

    const arr = unwrapToArray(src);
    return arr.map(normalizeItem).filter(x => x && x.name);
  }

  function getAreas(items) {
    return ["All", ...uniq(items.map(x => x.area).filter(Boolean)).sort()];
  }

  function getServices(items) {
    const all = items.flatMap(x => x.services || []);
    return ["All", ...uniq(all).sort()];
  }

  function score(item) {
    const r = Number(item.totalScore || 0);
    const n = Number(item.reviews || 0);
    return (r * 20) + Math.log10(n + 1) * 10;
  }

  function matches(item) {
    const q = state.q.trim().toLowerCase();
    const text = [
      item.name,
      item.area,
      (item.services || []).join(" "),
      item.notes
    ].join(" ").toLowerCase();

    const okQ = q === "" || text.includes(q);
    const okArea = state.area === "All" || item.area === state.area;
    const okService = state.service === "All" || (item.services || []).includes(state.service);
    const okChip = state.chip === "All" || (item.services || []).includes(state.chip);

    return okQ && okArea && okService && okChip;
  }

  function sortItems(items) {
    const s = state.sort;
    const copy = [...items];

    if (s === "Best") {
      copy.sort((a, b) => score(b) - score(a));
      return copy;
    }
    if (s === "Highest Rated") {
      copy.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      return copy;
    }
    if (s === "Most Reviewed") {
      copy.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
      return copy;
    }

    return copy;
  }

  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

  function resetPage(){
    state.page = 1;
  }

  function ensurePaginationControls(){
    // If we already created both pagers, don't recreate
    if(els.pageSizeButtons.length && els.pagePrevs.length && els.pageNexts.length && els.pageInfos.length) return;

    // Helper to build one pager and wire its events
    const buildPager = (host, position) => {
      if(!host) return;

      // Avoid duplicates if hot reload or multiple mounts
      if(host.querySelector(`[data-pager="${position}"]`)) return;

      const wrap = document.createElement('div');
      wrap.className = 'pager';
      wrap.setAttribute('data-pager', position);
      wrap.style.display = 'flex';
      wrap.style.gap = '10px';
      wrap.style.alignItems = 'center';
      wrap.style.flexWrap = 'wrap';
      wrap.style.marginTop = '8px';

      const label = document.createElement('span');
      label.className = 'small';
      label.textContent = 'Show:';

      const sizesWrap = document.createElement('div');
      sizesWrap.className = 'pageSizeDots';
      sizesWrap.style.display = 'flex';
      sizesWrap.style.gap = '8px';
      sizesWrap.style.alignItems = 'center';

      const sizeOptions = [5, 25, 50, 100];
      const sizeButtons = sizeOptions.map((n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pageSizeDot';
        b.setAttribute('data-page-size-btn', String(n));
        b.setAttribute('aria-pressed', 'false');
        b.textContent = String(n);

        // Minimal styling so it looks like a circle even without CSS
        b.style.width = '34px';
        b.style.height = '34px';
        b.style.borderRadius = '999px';
        b.style.padding = '0';
        b.style.display = 'inline-flex';
        b.style.alignItems = 'center';
        b.style.justifyContent = 'center';
        b.style.border = '1px solid rgba(0,0,0,0.2)';
        b.style.background = 'transparent';
        b.style.cursor = 'pointer';

        return b;
      });

      sizeButtons.forEach(b => sizesWrap.appendChild(b));

      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'btn';
      prev.setAttribute('data-page-prev', '');
      prev.textContent = 'Prev';

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn';
      next.setAttribute('data-page-next', '');
      next.textContent = 'Next';

      const info = document.createElement('span');
      info.className = 'small';
      info.setAttribute('data-page-info', '');
      info.textContent = '';

      wrap.appendChild(label);
      wrap.appendChild(sizesWrap);
      wrap.appendChild(prev);
      wrap.appendChild(next);
      wrap.appendChild(info);

      host.appendChild(wrap);

      // Store refs
      sizeButtons.forEach(b => els.pageSizeButtons.push(b));
      els.pagePrevs.push(prev);
      els.pageNexts.push(next);
      els.pageInfos.push(info);

      // Wire events
      sizeButtons.forEach((b) => {
        b.addEventListener('click', () => {
          const v = Number(b.getAttribute('data-page-size-btn'));
          state.pageSize = Number.isFinite(v) && v > 0 ? v : 25;
          resetPage();
          render();
        });
      });

      prev.addEventListener('click', () => {
        state.page = Math.max(1, state.page - 1);
        render();
      });

      next.addEventListener('click', () => {
        state.page = state.page + 1;
        render();
      });
      // No default selection line needed for buttons
    };

    // TOP: under the results meta header
    const topHost = document.querySelector('.resultsMeta');
    buildPager(topHost, 'top');

    // BOTTOM: after the cards list
    let bottomHost = null;
    if(els.list && els.list.parentElement){
      bottomHost = els.list.parentElement;
    }
    buildPager(bottomHost, 'bottom');
  }

  function card(item) {
    const raw = item._raw || {};

    const tags = (item.services || [])
      .slice(0, 6)
      .map(s => `<span class="tag">${escapeHtml(s)}</span>`)
      .join("");

    const totalScoreLine = item.totalScore ? `Rating: ${Number(item.totalScore).toFixed(1)} ★` : "Rating: N/A";

    const hoursLine = item.hours ? `${escapeHtml(item.hours)}` : "Hours: N/A";
    const hoursClass = hoursStatusClass(raw, item.hours);

    const phoneLink = item.phone ? `tel:${String(item.phone).replace(/[^\d+]/g, "")}` : null;

    const hoursList = Array.isArray(raw.openingHours) && raw.openingHours.length
      ? raw.openingHours.map(x => `<div class="small">${escapeHtml(x.day)}: ${escapeHtml(x.hours)}</div>`).join("")
      : "";

    const popularBlock = renderPopularTimes(raw);
    const socialBlock = renderSocialLinks(raw);

    const promo = Array.isArray(raw.ownerUpdates) && raw.ownerUpdates.length
      ? raw.ownerUpdates.slice(0, 2).map(u => {
        const txt = String(u.text || "").trim();
        if (!txt) return "";
        return `<div class="small">Update: ${escapeHtml(txt)}</div>`;
      }).filter(Boolean).join("")
      : "";

    const image = raw.imageUrl || (Array.isArray(raw.imageUrls) && raw.imageUrls[0]) || "img/No-image-image.png";
    const photo = image
      ? `<img class="cardPhoto" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy" />`
      : "";

    const details = hasMoreDetails(item) ? `
      <details class="cardDetails">
        <summary>More details</summary>
        <div class="detailsBody">
          ${item.notes ? `<div class="detailsSection"><div class="small detail-header"><strong>Address</strong></div><div class="small">${escapeHtml(item.notes)}</div></div>` : ""}
          ${promo ? `<div class="detailsSection">${promo}</div>` : ""}
          ${hoursList ? `<div class="detailsSection"><div class="small detail-header"><strong>Hours</strong></div>${hoursList}</div>` : ""}
          ${popularBlock}
          ${socialBlock}
        </div>
      </details>
    ` : "";

    return `
      <article class="card">
        <div class="cardGrid">
          <div class="cardLeft">
            ${photo}
          </div>

          <div class="cardRight">
            <h3 class="cardName">${escapeHtml(item.name)}</h3>

            <div class="small cardMeta star-yellow">${escapeHtml(totalScoreLine)}</div>
            <div class="small cardMeta ${escapeHtml(hoursClass)}">${hoursLine}</div>

            ${details}

            <div class="cardBody">
              <div class="chips">${tags}</div>

              <div class="cardActions">
                ${item.website ? `<a class="btn btnPrimary" href="${escapeHtml(item.website)}" target="_blank" rel="noopener">Visit website</a>` : ""}
                ${item.mapsUrl ? `<a class="btn" href="${escapeHtml(item.mapsUrl)}" target="_blank" rel="noopener">Map</a>` : ""}
                ${phoneLink ? `<a class="btn" href="${escapeHtml(phoneLink)}">Call</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const items = getItems();
    const filteredAll = sortItems(items.filter(matches));

    ensurePaginationControls();

    const total = filteredAll.length;
    const pageSize = Number.isFinite(Number(state.pageSize)) && Number(state.pageSize) > 0 ? Number(state.pageSize) : 25;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    state.page = clamp(state.page, 1, totalPages);

    const startIdx = (state.page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);

    const pageItems = filteredAll.slice(startIdx, endIdx);

    if (els.count) {
      const range = total ? `Showing ${startIdx + 1}-${endIdx} of ${total}` : `0 companies found in Knoxville area`;
      els.count.textContent = total ? `${range}` : `0 companies found in Knoxville area`;
    }

    for (const info of els.pageInfos) {
      info.textContent = `Page ${state.page} / ${totalPages}`;
    }

    for (const prev of els.pagePrevs) {
      prev.disabled = state.page <= 1;
    }

    for (const next of els.pageNexts) {
      next.disabled = state.page >= totalPages;
    }

    for (const b of els.pageSizeButtons) {
      const v = Number(b.getAttribute('data-page-size-btn'));
      const isActive = v === pageSize;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      // Minimal visual active state (works even without CSS)
      b.style.background = isActive ? 'rgba(0,0,0,0.08)' : 'transparent';
      b.style.borderColor = isActive ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)';
      b.style.fontWeight = isActive ? '700' : '400';
    }

    if (els.list) {
      els.list.innerHTML =
        pageItems.map(card).join("") ||
        `<div class="panel"><div class="small">No matches. Try a different service or search term.</div></div>`;
    }
  }

  function setChipEverywhere(val) {
    state.chip = val;
    resetPage();

    for (const container of els.chips) {
      container.querySelectorAll(".chip").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.value === val);
      });
    }

    render();
  }

  function initFilters() {
    const items = getItems();

    if (els.area) {
      els.area.innerHTML = getAreas(items)
        .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
        .join("");
    }

    if (els.service) {
      els.service.innerHTML = getServices(items)
        .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join("");
    }

    for (const container of els.chips) {
      container.querySelectorAll(".chip").forEach(btn => {
        btn.addEventListener("click", () => setChipEverywhere(btn.dataset.value));
      });
    }

    setChipEverywhere("All");

    if (els.q) {
      els.q.addEventListener("input", (e) => {
        state.q = e.target.value || "";
        resetPage();
        render();
      });
    }

    if (els.area) {
      els.area.addEventListener("change", (e) => {
        state.area = e.target.value || "All";
        resetPage();
        render();
      });
    }

    if (els.service) {
      els.service.addEventListener("change", (e) => {
        state.service = e.target.value || "All";
        resetPage();
        render();
      });
    }

    if (els.sort) {
      els.sort.addEventListener("change", (e) => {
        state.sort = e.target.value || "Best";
        resetPage();
        render();
      });
    }
  }

  window.DirectoryApp = {
    mount: function () {
      els.q = document.querySelector("[data-q]");
      els.area = document.querySelector("[data-area]");
      els.service = document.querySelector("[data-service]");
      els.sort = document.querySelector("[data-sort]");
      els.chips = Array.from(document.querySelectorAll("[data-chips]"));
      els.count = document.querySelector("[data-count]");
      els.list = document.querySelector("[data-list]");
      // els.pageSizes = Array.from(document.querySelectorAll("[data-page-size]"));
      els.pagePrevs = Array.from(document.querySelectorAll("[data-page-prev]"));
      els.pageNexts = Array.from(document.querySelectorAll("[data-page-next]"));
      els.pageInfos = Array.from(document.querySelectorAll("[data-page-info]"));
      els.pageSizeButtons = Array.from(document.querySelectorAll("[data-page-size-btn]"));

      const params = new URLSearchParams(location.search);
      const bodyData = document.body ? document.body.dataset : {};

      const defaultService = params.get("service") || bodyData.defaultService || "";
      const defaultSort = params.get("sort") || bodyData.defaultSort || "";

      initFilters();
      ensurePaginationControls();

      if (defaultService) {
        state.service = defaultService;
        if (els.service) els.service.value = defaultService;
      }
      if (defaultSort) {
        state.sort = defaultSort;
        if (els.sort) els.sort.value = defaultSort;
      }

      render();
    }
  };
})();
