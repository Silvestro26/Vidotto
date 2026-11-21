const state = {
  scopus: [],
  other: [],
  category: "scopus"
};

const publications = document.querySelector("#publications");
const search = document.querySelector("#search");
const year = document.querySelector("#year");
const type = document.querySelector("#type");
const resultCount = document.querySelector("#result-count");
const bibtexLink = document.querySelector("#bibtex-link");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeAuthor(author) {
  if (!author) return "";
  return author
    .split(" and ")
    .map((name) => name.includes(",") ? name : name.trim())
    .join("; ");
}

function titleLink(publication) {
  const title = escapeHtml(publication.title);
  const target = publication.doi
    ? `https://doi.org/${encodeURI(publication.doi)}`
    : publication.url;
  return target
    ? `<a href="${escapeHtml(target)}" target="_blank" rel="noopener">${title}</a>`
    : title;
}

function publicationMarkup(publication) {
  const journal = publication.journal
    ? `<em>${escapeHtml(publication.journal)}</em>`
    : "";
  const details = [journal, publication.volume, publication.pages]
    .filter(Boolean)
    .join(", ");
  const links = publication.doi
    ? `<a class="badge" href="https://doi.org/${encodeURI(publication.doi)}" target="_blank" rel="noopener">DOI</a>`
    : "";
  const scopus = publication.url
    ? `<a class="badge" href="${escapeHtml(publication.url)}" target="_blank" rel="noopener">Scopus</a>`
    : "";
  return `
    <article class="publication">
      <h2>${titleLink(publication)}</h2>
      <p class="meta">${escapeHtml(normalizeAuthor(publication.author))}</p>
      ${details ? `<p class="meta">${details}${publication.year ? ` (${escapeHtml(publication.year)})` : ""}</p>` : ""}
      <div class="badges">
        ${publication.type ? `<span class="badge">${escapeHtml(publication.type)}</span>` : ""}
        ${links}${scopus}
      </div>
    </article>`;
}

function populateFilters(items) {
  const years = [...new Set(items.map((item) => item.year).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const types = [...new Set(items.map((item) => item.type).filter(Boolean))]
    .sort();

  year.innerHTML = '<option value="">All years</option>' +
    years.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  type.innerHTML = '<option value="">All types</option>' +
    types.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function render() {
  const selectedItems = state.category === "scopus" ? state.scopus : state.other;
  const query = search.value.trim().toLowerCase();
  const filtered = selectedItems.filter((item) => {
    const haystack = [
      item.title,
      item.author,
      item.journal,
      item.year,
      item.type
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!year.value || item.year === year.value)
      && (!type.value || item.type === type.value);
  });

  resultCount.textContent = `${filtered.length} publication${filtered.length === 1 ? "" : "s"} shown`;
  if (!filtered.length) {
    publications.innerHTML = state.category === "other"
      ? '<p class="empty">No other publications have been added yet.</p>'
      : '<p class="empty">No publications match the selected filters.</p>';
    return;
  }
  publications.innerHTML = filtered.map(publicationMarkup).join("");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    state.category = tab.dataset.category;
    search.value = "";
    year.value = "";
    type.value = "";
    populateFilters(state.category === "scopus" ? state.scopus : state.other);
    bibtexLink.hidden = state.category !== "scopus";
    render();
  });
});

search.addEventListener("input", render);
year.addEventListener("change", render);
type.addEventListener("change", render);

fetch("publications.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Could not load publications: ${response.status}`);
    return response.json();
  })
  .then((items) => {
    state.scopus = items;
    document.querySelector("#scopus-count").textContent = items.length;
    populateFilters(items);
    render();
  })
  .catch((error) => {
    publications.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  });
