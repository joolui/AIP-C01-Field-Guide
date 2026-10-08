// Detail panel: cards open a <dialog> rendered from the page's embedded JSON. Patterns page: type/domain filters.
(function () {
  const dataEl = document.getElementById("skills");
  const dialog = document.getElementById("detail");
  if (!dataEl || !dialog) return;
  const items = JSON.parse(dataEl.textContent);
  const KIND = { pattern: "Pattern", practice: "Best practice" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // prev/next follow the cards currently visible on the page, in page order
  const order = () => [...document.querySelectorAll("li:not([hidden]) > [data-skill]")]
    .filter((el) => !el.closest("[hidden]")).map((el) => el.dataset.skill);
  let current = null;

  function related(s) {
    const links = (s.related || []).map((r) => items[r.id]
      ? `<li><button type="button" class="link" data-go="${esc(r.id)}"><span class="card-id">${esc(r.id)}</span> ${esc(r.title)}</button></li>`
      : `<li><a href="domain-${r.domain}.html#${esc(r.id)}"><span class="card-id">${esc(r.id)}</span> ${esc(r.title)}</a></li>`).join("");
    return links ? `<section class="d-section"><h3>Related skills</h3><ul class="related">${links}</ul></section>` : "";
  }

  function render(id) {
    const s = items[id];
    const list = order();
    const i = list.indexOf(id);
    const steps = (s.steps || []).map((st, n) =>
      `<li><span class="badge">${n + 1}</span><div><b>${esc(st.title)}</b><span>${esc(st.text)}</span></div></li>`).join("");
    const tech = (s.technologies || []).map((t) => `<li><b>${esc(t.name)}</b><span>${esc(t.role)}</span></li>`).join("");
    const code = s.code ? `<section class="d-section"><h3>In code</h3>${s.code.caption ? `<p class="code-cap">${esc(s.code.caption)}</p>` : ""}
      <pre class="code"><code>${esc(s.code.text)}</code></pre></section>` : "";
    const example = s.example ? `<section class="d-section"><h3>Example</h3><p class="example">${esc(s.example)}</p></section>` : "";
    const exam = s.kind ? `<section class="d-section"><h3>On the exam</h3><dl class="exam">
        <div class="cue"><dt>Cue</dt><dd>${esc(s.cue)}</dd></div>
        <div class="trap"><dt>Trap</dt><dd>${esc(s.trap)}</dd></div></dl></section>` : "";
    const lead = s.kind
      ? `<p class="d-skill"><b>${KIND[s.kind]}</b>${esc(s.lede)}</p>`
      : `<p class="d-skill"><b>Exam skill ${esc(s.id)}</b>${esc(s.skill)}</p>`;
    const label = s.kind ? KIND[s.kind] : `Skill ${s.id}`;
    dialog.innerHTML = `
      <header class="d-head">
        <div class="d-context"><span class="card-id">Domain ${s.domain} · Task ${esc(s.task)}</span><span>${esc(s.taskTitle)}</span></div>
        <div class="d-titlebar">
          ${s.kind ? `<span class="tag tag-${s.kind}">${KIND[s.kind]}</span>` : `<span class="card-id">${esc(s.id)}</span>`}
          <h2 id="detail-title">${esc(s.title)}</h2>
          <button class="d-btn" type="button" data-go="${list[i - 1] || ""}" ${i > 0 ? "" : "disabled"} aria-label="Previous">&larr;</button>
          <button class="d-btn" type="button" data-go="${list[i + 1] || ""}" ${i >= 0 && i < list.length - 1 ? "" : "disabled"} aria-label="Next">&rarr;</button>
          <a class="d-btn" href="diagrams/${esc(s.id)}.svg" target="_blank" rel="noopener">Full size</a>
          <button class="d-btn" type="button" data-close aria-label="Close" autofocus>&times;</button>
        </div>
      </header>
      <div class="d-content">
        ${lead}
        <div class="d-diagram plate"><img src="diagrams/${esc(s.id)}.svg" alt="Diagram for ${esc(label)}: ${esc(s.title)}"></div>
        <div class="d-grid">
          <div>
            <section class="d-section"><h3>Summary</h3><p>${esc(s.summary)}</p></section>
            ${exam}${example}${code}
          </div>
          <div>
            ${steps ? `<section class="d-section"><h3>Flow</h3><ol class="steps">${steps}</ol></section>` : ""}
            ${tech ? `<section class="d-section"><h3>Technologies</h3><ul class="tech">${tech}</ul></section>` : ""}
            ${related(s)}
          </div>
        </div>
      </div>`;
    current = id;
    dialog.scrollTop = 0;
  }

  function open(id) {
    if (!items[id]) return;
    render(id);
    if (!dialog.open) dialog.showModal();
    history.replaceState(null, "", location.pathname + location.search + "#" + id);
  }

  function step(delta) {
    const list = order();
    const next = list[list.indexOf(current) + delta];
    if (current && next) open(next);
  }

  // Patterns page filters: one choice per group, kept in the query string so a filtered view can be shared
  const chips = [...document.querySelectorAll("[data-filter]")];
  function applyFilters() {
    const want = Object.fromEntries(chips.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => [c.dataset.filter, c.dataset.value]));
    let shown = 0;
    document.querySelectorAll("li[data-kind]").forEach((li) => {
      li.hidden = (want.kind && li.dataset.kind !== want.kind) || (want.domain && li.dataset.domain !== want.domain);
      shown += !li.hidden;
    });
    document.querySelectorAll("section[data-domain]").forEach((sec) => { sec.hidden = !sec.querySelector("li:not([hidden])"); });
    const empty = document.querySelector(".empty");
    if (empty) empty.hidden = shown > 0;
    const q = new URLSearchParams(Object.entries(want).filter(([, v]) => v)).toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
  function press(group, value) {
    chips.filter((c) => c.dataset.filter === group).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === value)));
  }
  if (chips.length) {
    const params = new URLSearchParams(location.search);
    for (const g of ["kind", "domain"]) {
      const v = params.get(g) || "";
      if (chips.some((c) => c.dataset.filter === g && c.dataset.value === v)) press(g, v);
    }
    applyFilters();
  }

  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (chip) { press(chip.dataset.filter, chip.dataset.value); return applyFilters(); }
    const card = e.target.closest("[data-skill]");
    if (card) return open(card.dataset.skill);
    if (e.target === dialog || e.target.closest("[data-close]")) return dialog.close();
    const go = e.target.closest("[data-go]");
    if (go && go.dataset.go) open(go.dataset.go);
  });
  dialog.addEventListener("close", () => {
    history.replaceState(null, "", location.pathname + location.search);
    document.querySelector(`[data-skill="${current}"]`)?.focus();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (items[fromHash]) open(fromHash);
})();
