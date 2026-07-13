(function () {
  "use strict";

  const PAGE_SIZE = 10;
  const collator = new Intl.Collator("en", { sensitivity: "base" });

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
    })[char]);
  }

  function setupMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-site-nav]");
    if (!toggle || !nav) return;

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    }

    toggle.addEventListener("click", () => {
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(willOpen));
      nav.classList.toggle("is-open", willOpen);
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        toggle.focus();
      }
    });
  }

  function setupDirectory(root) {
    const allProviders = Array.isArray(window.DIRECTORY_DATA) ? window.DIRECTORY_DATA : [];
    const elements = {
      search: root.querySelector("#directory-search"),
      service: root.querySelector("#service-filter"),
      area: root.querySelector("#area-filter"),
      emergency: root.querySelector("#emergency-filter"),
      sort: root.querySelector("#sort-filter"),
      clear: root.querySelector("#clear-filters"),
      status: root.querySelector("#results-status"),
      list: root.querySelector("#directory-results"),
      pagination: root.querySelector("#directory-pagination")
    };
    if (Object.values(elements).some((element) => !element)) return;

    const params = new URLSearchParams(window.location.search);
    const defaultService = root.dataset.defaultService || "All services";
    const state = {
      query: params.get("q") || "",
      service: params.get("service") || defaultService,
      area: params.get("area") || "All areas",
      emergency: params.get("emergency") || "All providers",
      sort: params.get("sort") || "Alphabetical",
      page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1)
    };

    function uniqueValues(key) {
      return [...new Set(allProviders.flatMap((provider) => provider[key]))].sort(collator.compare);
    }

    function addOptions(select, values) {
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
      });
    }

    addOptions(elements.service, uniqueValues("services"));
    addOptions(elements.area, uniqueValues("serviceAreas"));
    elements.search.value = state.query;
    elements.service.value = [...elements.service.options].some((o) => o.value === state.service) ? state.service : "All services";
    elements.area.value = [...elements.area.options].some((o) => o.value === state.area) ? state.area : "All areas";
    elements.emergency.value = state.emergency === "Emergency service advertised" ? state.emergency : "All providers";
    elements.sort.value = state.sort === "Recently verified" ? state.sort : "Alphabetical";

    function providerCard(provider) {
      const verified = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
        .format(new Date(`${provider.verifiedOn}T00:00:00Z`));
      const tags = provider.services.map((service) => `<li>${escapeHtml(service)}</li>`).join("");
      const areas = provider.serviceAreas.map(escapeHtml).join(", ");
      const emergency = provider.emergencyServiceAdvertised
        ? '<span class="status-badge">Emergency service advertised</span>'
        : "";
      const sources = provider.sourceUrls.map((url, index) =>
        `<a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">Official source${provider.sourceUrls.length > 1 ? ` ${index + 1}` : ""}<span class="sr-only"> (opens in a new tab)</span></a>`
      ).join(" · ");

      return `<article class="provider-card" id="${escapeHtml(provider.id)}">
        <div class="provider-heading">
          <div><h3>${escapeHtml(provider.name)}</h3><p class="service-area">Serves: ${areas}</p></div>
          ${emergency}
        </div>
        <p>${escapeHtml(provider.summary)}</p>
        <ul class="tag-list" aria-label="Services offered">${tags}</ul>
        <div class="provider-actions">
          <a class="button" href="${escapeHtml(provider.website)}" rel="noopener noreferrer" target="_blank">Visit official website<span class="sr-only"> (opens in a new tab)</span></a>
          <a class="button button-secondary" href="tel:${escapeHtml(provider.phone.replace(/[^+\d]/g, ""))}">Call ${escapeHtml(provider.phone)}</a>
        </div>
        <p class="verification">Information checked ${verified}. ${sources}. Verify scope, availability and credentials directly.</p>
      </article>`;
    }

    function updateUrl() {
      const next = new URLSearchParams();
      if (state.query) next.set("q", state.query);
      if (state.service !== "All services" && state.service !== defaultService) next.set("service", state.service);
      if (state.area !== "All areas") next.set("area", state.area);
      if (state.emergency !== "All providers") next.set("emergency", state.emergency);
      if (state.sort !== "Alphabetical") next.set("sort", state.sort);
      if (state.page > 1) next.set("page", String(state.page));
      const query = next.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }

    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        elements.pagination.innerHTML = "";
        return;
      }
      const buttons = [];
      buttons.push(`<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>Previous</button>`);
      for (let page = 1; page <= totalPages; page += 1) {
        buttons.push(`<button type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`);
      }
      buttons.push(`<button type="button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>Next</button>`);
      elements.pagination.innerHTML = buttons.join("");
    }

    function render() {
      const query = state.query.trim().toLocaleLowerCase();
      let matches = allProviders.filter((provider) => {
        const searchable = [provider.name, provider.summary, ...provider.services, ...provider.serviceAreas].join(" ").toLocaleLowerCase();
        return (!query || searchable.includes(query))
          && (state.service === "All services" || provider.services.includes(state.service))
          && (state.area === "All areas" || provider.serviceAreas.includes(state.area))
          && (state.emergency === "All providers" || provider.emergencyServiceAdvertised);
      });

      matches = matches.sort((a, b) => state.sort === "Recently verified"
        ? b.verifiedOn.localeCompare(a.verifiedOn) || collator.compare(a.name, b.name)
        : collator.compare(a.name, b.name));

      const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
      state.page = Math.min(state.page, totalPages);
      const start = (state.page - 1) * PAGE_SIZE;
      const visible = matches.slice(start, start + PAGE_SIZE);

      elements.status.textContent = matches.length === 0
        ? "No providers match these filters."
        : `Showing ${start + 1}–${start + visible.length} of ${matches.length} verified provider${matches.length === 1 ? "" : "s"}.`;
      elements.list.innerHTML = visible.length
        ? visible.map(providerCard).join("")
        : '<div class="empty-state"><h3>No exact matches</h3><p>Clear one or more filters, or contact a provider directly to ask about service outside the areas shown.</p></div>';
      renderPagination(totalPages);
      updateUrl();
    }

    function updateState(resetPage = true) {
      state.query = elements.search.value;
      state.service = elements.service.value;
      state.area = elements.area.value;
      state.emergency = elements.emergency.value;
      state.sort = elements.sort.value;
      if (resetPage) state.page = 1;
      render();
    }

    let searchTimer;
    elements.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(updateState, 120);
    });
    [elements.service, elements.area, elements.emergency, elements.sort].forEach((control) =>
      control.addEventListener("change", () => updateState())
    );
    elements.clear.addEventListener("click", () => {
      elements.search.value = "";
      elements.service.value = defaultService;
      elements.area.value = "All areas";
      elements.emergency.value = "All providers";
      elements.sort.value = "Alphabetical";
      updateState();
      elements.search.focus();
    });
    elements.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      render();
      elements.status.focus();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupMenu();
    document.querySelectorAll("[data-directory]").forEach(setupDirectory);
  });
})();
