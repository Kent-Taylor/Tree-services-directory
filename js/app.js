// app.js
(function () {
  const state = {
    q: "",
    area: "All",
    service: "All",
    sort: "Best",
    chip: "All"
  };

  const els = {
    q: null,
    area: null,
    service: null,
    sort: null,
    chips: null,
    count: null,
    list: null
  };

  function uniq(arr){ return Array.from(new Set(arr)); }

  function getAreas(items){
    return ["All", ...uniq(items.map(x => x.area).filter(Boolean)).sort()];
  }

  function getServices(items){
    const all = items.flatMap(x => x.services || []);
    return ["All", ...uniq(all).sort()];
  }

  function score(item){
    const r = Number(item.rating || 0);
    const n = Number(item.reviews || 0);
    return (r * 20) + Math.log10(n + 1) * 10;
  }

  function matches(item){
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

    const okChip = (function(){
      if(state.chip === "All") return true;
      if(state.chip === "Emergency") return (item.services || []).includes("Emergency");
      if(state.chip === "Tree Removal") return (item.services || []).includes("Tree Removal");
      if(state.chip === "Tree Trimming") return (item.services || []).includes("Tree Trimming");
      if(state.chip === "Stump Grinding") return (item.services || []).includes("Stump Grinding");
      return true;
    })();

    return okQ && okArea && okService && okChip;
  }

  function sortItems(items){
    const s = state.sort;
    const copy = [...items];
    if(s === "Best"){
      copy.sort((a,b) => score(b) - score(a));
      return copy;
    }
    if(s === "Highest Rated"){
      copy.sort((a,b) => (b.rating || 0) - (a.rating || 0));
      return copy;
    }
    if(s === "Most Reviewed"){
      copy.sort((a,b) => (b.reviews || 0) - (a.reviews || 0));
      return copy;
    }
    return copy;
  }

  function escapeHtml(str){
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[s]));
  }

  function card(item){
    const tags = (item.services || []).slice(0,6).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join("");
    const rating = `${Number(item.rating || 0).toFixed(1)} ★`;
    const reviews = item.reviews ? `${item.reviews} reviews` : "Reviews not listed";
    const phoneLink = item.phone ? `tel:${item.phone.replace(/[^\d+]/g,"")}` : null;

    return `
      <article class="card">
        <div class="cardTop">
          <h3 class="cardName">${escapeHtml(item.name)}</h3>
          <div class="rating">${escapeHtml(rating)}</div>
        </div>
        <div class="cardBody">
          <div class="kv">
            <span>${escapeHtml(item.area || "Knoxville area")}</span>
            <span>•</span>
            <span>${escapeHtml(reviews)}</span>
            <span>•</span>
            <span>${escapeHtml(item.hours || "Hours vary")}</span>
          </div>
          <div class="chips">${tags}</div>
          ${item.notes ? `<div class="small">${escapeHtml(item.notes)}</div>` : ""}
          <div class="cardActions">
            ${item.website ? `<a class="btn btnPrimary" href="${escapeHtml(item.website)}" target="_blank" rel="noopener">Visit website</a>` : ""}
            ${phoneLink ? `<a class="btn" href="${escapeHtml(phoneLink)}">Call</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function render(){
    const items = window.TREE_SERVICES || [];
    const filtered = sortItems(items.filter(matches));
    if(els.count) els.count.textContent = `${filtered.length} companies found in Knoxville area`;
    if(els.list) els.list.innerHTML = filtered.map(card).join("") || `<div class="panel"><div class="small">No matches. Try a different service or search term.</div></div>`;
  }

  function initFilters(){
    const items = window.TREE_SERVICES || [];

    if(els.area){
      els.area.innerHTML = getAreas(items).map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
    }
    if(els.service){
      els.service.innerHTML = getServices(items).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    }

    const setChip = (val) => {
      state.chip = val;
      if(els.chips){
        els.chips.querySelectorAll(".chip").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.value === val);
        });
      }
      render();
    };

    if(els.chips){
      els.chips.querySelectorAll(".chip").forEach(btn => {
        btn.addEventListener("click", () => setChip(btn.dataset.value));
      });
      setChip("All");
    }

    if(els.q){
      els.q.addEventListener("input", (e) => {
        state.q = e.target.value || "";
        render();
      });
    }
    if(els.area){
      els.area.addEventListener("change", (e) => {
        state.area = e.target.value || "All";
        render();
      });
    }
    if(els.service){
      els.service.addEventListener("change", (e) => {
        state.service = e.target.value || "All";
        render();
      });
    }
    if(els.sort){
      els.sort.addEventListener("change", (e) => {
        state.sort = e.target.value || "Best";
        render();
      });
    }
  }

  window.DirectoryApp = {
    mount: function(){
      els.q = document.querySelector("[data-q]");
      els.area = document.querySelector("[data-area]");
      els.service = document.querySelector("[data-service]");
      els.sort = document.querySelector("[data-sort]");
      els.chips = document.querySelector("[data-chips]");
      els.count = document.querySelector("[data-count]");
      els.list = document.querySelector("[data-list]");

      // Apply page-level defaults from <body> or URL
      const params = new URLSearchParams(location.search);
      const bodyData = document.body ? document.body.dataset : {};

      const defaultService = params.get("service") || bodyData.defaultService || "";
      const defaultSort = params.get("sort") || bodyData.defaultSort || "";

      if (defaultService) {
        state.service = defaultService;
        if (els.service) els.service.value = defaultService;
      }

      if (defaultSort) {
        state.sort = defaultSort;
        if (els.sort) els.sort.value = defaultSort;
      }

      initFilters();
      render();
    }
  };
})();
