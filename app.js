const tips = Array.isArray(window.CSS_TIPS)
  ? [...window.CSS_TIPS].sort((a, b) => a.order - b.order)
  : [];

const themeChoices = ["auto", "light", "dark"];
const storedTheme = localStorage.getItem("css-tip:theme");
const initialTheme = themeChoices.includes(storedTheme) ? storedTheme : "auto";

const state = {
  query: "",
  category: "Alla",
  level: "Alla",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("css-tip:favorites") || "[]")),
  theme: initialTheme,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  search: $("#tip-search"),
  clear: $(".clear-button"),
  categoryFilters: $("#category-filters"),
  levelFilters: $("#level-filters"),
  grid: $("#tip-grid"),
  weekList: $("#week-list"),
  homeProgression: $("#home-progression"),
  levelSummary: $("#level-summary"),
  template: $("#tip-card-template"),
  resultSummary: $("#result-summary"),
  empty: $("#empty-state"),
  showFavorites: $("#show-favorites"),
  tipCount: $("#tip-count"),
  categoryCount: $("#category-count"),
  favoriteCount: $("#favorite-count"),
  daily: $("#daily-tip"),
  detail: $("#tip-detail"),
  detailTitle: $("#tip-detail-title"),
  columnSize: $("#column-size"),
  gapSize: $("#gap-size"),
  labPreview: $("#lab-preview"),
  labCode: $("#lab-code"),
};

const categories = ["Alla", ...new Set(tips.map((tip) => tip.category).filter(Boolean))];
const levels = ["Alla", "Beginner", "Intermediate", "Advanced", "Experimental"];

function normalize(value) {
  return value.toLocaleLowerCase("sv-SE");
}

function sentenceCase(value) {
  if (!value) return "Kort, praktiskt CSS-mönster att använda direkt.";
  return value.charAt(0).toLocaleUpperCase("sv-SE") + value.slice(1);
}

function setTheme(theme) {
  state.theme = themeChoices.includes(theme) ? theme : "auto";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("css-tip:theme", state.theme);

  $$("[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === state.theme;
    button.setAttribute("aria-pressed", String(active));
  });
}

function saveFavorites() {
  localStorage.setItem("css-tip:favorites", JSON.stringify([...state.favorites]));
  if (elements.favoriteCount) elements.favoriteCount.textContent = state.favorites.size;
}

function sourceUrl(tip) {
  return tip.file
    ? `https://github.com/j4rl/css-tips/blob/main/daily-tips/${tip.file}`
    : "https://github.com/j4rl/css-tips";
}

function tipUrl(tip) {
  return `tip.html?slug=${encodeURIComponent(tip.slug)}`;
}

function codePenUrl(tip) {
  const html = `<main class="demo">\n  <section class="card">${tip.title}</section>\n</main>`;
  const data = JSON.stringify({
    title: `CSS Tips: ${tip.title}`,
    html,
    css: tip.code || "",
  });

  return `https://codepen.io/pen/define?data=${encodeURIComponent(data)}`;
}

function lessonText(tip) {
  return [
    `${tip.order}. ${tip.title} (${tip.level}, vecka ${Math.trunc(tip.week)})`,
    "",
    `Problem: ${sentenceCase(tip.summary)}`,
    `Lektionsanvändning: ${tip.lessonUse}`,
    `Support/fallback: ${tip.support}`,
    `Challenge: ${tip.challenge}`,
    "",
    tip.code,
  ].join("\n");
}

function getFilteredTips() {
  const query = normalize(state.query.trim());

  return tips.filter((tip) => {
    const matchesCategory = state.category === "Alla" || tip.category === state.category;
    const matchesLevel = state.level === "Alla" || tip.level === state.level;
    const matchesFavorite = !state.favoritesOnly || state.favorites.has(tip.slug);
    const haystack = normalize(`${tip.title} ${tip.category} ${tip.level} ${tip.status} ${tip.lessonUse} ${tip.summary} ${tip.code}`);
    const matchesQuery = !query || haystack.includes(query);
    return matchesCategory && matchesLevel && matchesFavorite && matchesQuery;
  });
}

function renderButtonGroup(container, values, activeValue, onSelect) {
  if (!container) return;

  container.replaceChildren(
    ...values.map((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-button";
      button.textContent = value;
      button.setAttribute("aria-pressed", String(value === activeValue));
      button.addEventListener("click", () => {
        onSelect(value);
        renderCatalog();
      });
      return button;
    }),
  );
}

function renderFilters() {
  renderButtonGroup(elements.categoryFilters, categories, state.category, (value) => {
    state.category = value;
  });
  renderButtonGroup(elements.levelFilters, levels, state.level, (value) => {
    state.level = value;
  });
}

function renderCard(tip) {
  const fragment = elements.template.content.cloneNode(true);
  const card = fragment.querySelector(".tip-card");
  const favoriteButton = fragment.querySelector(".favorite-button");
  const copyButton = fragment.querySelector(".copy-button");
  const lessonButton = fragment.querySelector(".lesson-button");
  const detailLink = fragment.querySelector(".detail-link");
  const sourceLink = fragment.querySelector(".source-link");
  const codepenLink = fragment.querySelector(".codepen-link");

  fragment.querySelector(".category-pill").textContent = tip.category;
  fragment.querySelector(".order-pill").textContent = `#${tip.order}`;
  fragment.querySelector(".level-pill").textContent = tip.level;
  fragment.querySelector(".status-pill").textContent = tip.status;
  fragment.querySelector(".lesson-pill").textContent = `${tip.lessonUse} · v.${Math.trunc(tip.week)}`;
  fragment.querySelector("h3").textContent = tip.title;
  fragment.querySelector("p").textContent = sentenceCase(tip.summary);
  fragment.querySelector(".support-text").textContent = tip.support;
  fragment.querySelector(".challenge-text").textContent = tip.challenge;
  fragment.querySelector("code").textContent = tip.code || "/* Inget kodexempel i datat. */";

  if (detailLink) detailLink.href = tipUrl(tip);
  if (sourceLink) sourceLink.href = sourceUrl(tip);
  if (codepenLink) codepenLink.href = codePenUrl(tip);

  favoriteButton.setAttribute("aria-pressed", String(state.favorites.has(tip.slug)));
  favoriteButton.textContent = state.favorites.has(tip.slug) ? "Sparad" : "Spara";
  favoriteButton.addEventListener("click", () => {
    if (state.favorites.has(tip.slug)) {
      state.favorites.delete(tip.slug);
    } else {
      state.favorites.add(tip.slug);
    }

    saveFavorites();
    renderCatalog();
  });

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(tip.code || "");
    copyButton.textContent = "Kopierad";
    setTimeout(() => {
      copyButton.textContent = "Kopiera";
    }, 1400);
  });

  lessonButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(lessonText(tip));
    lessonButton.textContent = "Kopierad";
    setTimeout(() => {
      lessonButton.textContent = "Lektion";
    }, 1400);
  });

  card.dataset.category = tip.category;
  return fragment;
}

function renderDailyTip() {
  if (!elements.daily || !tips.length) return;

  const dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
  const tip = tips[dayIndex];

  elements.daily.innerHTML = `
    <div>
      <span class="category-pill">${tip.category}</span>
      <div class="meta-row">
        <span class="order-pill">#${tip.order}</span>
        <span class="level-pill">${tip.level}</span>
        <span class="lesson-pill">Vecka ${Math.trunc(tip.week)}</span>
      </div>
      <h3>${tip.title}</h3>
      <p>${sentenceCase(tip.summary)}</p>
      <a class="primary-link" href="${tipUrl(tip)}">Öppna tipset</a>
    </div>
    <pre><code></code></pre>
  `;

  elements.daily.querySelector("code").textContent = tip.code || "/* Inget kodexempel i datat. */";
}

function renderStats() {
  if (elements.tipCount) elements.tipCount.textContent = tips.length;
  if (elements.categoryCount) elements.categoryCount.textContent = categories.length - 1;
  if (elements.favoriteCount) elements.favoriteCount.textContent = state.favorites.size;
}

function groupedWeeks() {
  return tips.reduce((weeks, tip) => {
    const week = Math.trunc(tip.week);
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week).push(tip);
    return weeks;
  }, new Map());
}

function renderWeekCards(container, limit) {
  if (!container) return;

  const weeks = [...groupedWeeks().entries()].sort((a, b) => a[0] - b[0]);
  const selectedWeeks = typeof limit === "number" ? weeks.slice(0, limit) : weeks;

  container.replaceChildren(
    ...selectedWeeks.map(([week, weekTips]) => {
      const article = document.createElement("article");
      article.className = "week-card";
      const items = weekTips
        .map((tip) => `<li><a href="${tipUrl(tip)}"><strong>${tip.title}</strong><span>${tip.level} · ${tip.category} · ${tip.lessonUse}</span></a></li>`)
        .join("");
      article.innerHTML = `<h3>Vecka ${week}</h3><ol>${items}</ol>`;
      return article;
    }),
  );
}

function renderLevelSummary() {
  if (!elements.levelSummary) return;

  const counts = levels
    .filter((level) => level !== "Alla")
    .map((level) => {
      const count = tips.filter((tip) => tip.level === level).length;
      return `<span>${level}: ${count}</span>`;
    })
    .join("");

  elements.levelSummary.innerHTML = counts;
}

function renderCatalog() {
  renderFilters();
  renderStats();

  if (!elements.grid || !elements.template) return;

  const filteredTips = getFilteredTips();
  elements.grid.replaceChildren(...filteredTips.map(renderCard));
  if (elements.empty) elements.empty.hidden = filteredTips.length > 0;
  if (elements.clear) elements.clear.hidden = state.query.length === 0;

  if (elements.showFavorites) {
    elements.showFavorites.setAttribute("aria-pressed", String(state.favoritesOnly));
    elements.showFavorites.textContent = state.favoritesOnly ? "Visa alla" : "Visa sparade";
  }

  if (elements.resultSummary) {
    const categoryText = state.category === "Alla" ? "alla kategorier" : state.category;
    const levelText = state.level === "Alla" ? "alla nivåer" : state.level;
    elements.resultSummary.textContent = `${filteredTips.length} av ${tips.length} tips visas inom ${categoryText} och ${levelText}.`;
  }
}

function renderTipDetail() {
  if (!elements.detail) return;

  const slug = new URLSearchParams(window.location.search).get("slug");
  const tip = tips.find((item) => item.slug === slug) || tips[0];

  if (!tip) {
    elements.detail.innerHTML = "<p>Inget tips hittades.</p>";
    return;
  }

  if (elements.detailTitle) elements.detailTitle.textContent = tip.title;
  document.title = `${tip.title} - CSS Tips`;

  elements.detail.innerHTML = `
    <div class="tip-detail-header">
      <span class="category-pill">${tip.category}</span>
      <div class="meta-row">
        <span class="order-pill">#${tip.order}</span>
        <span class="level-pill">${tip.level}</span>
        <span class="status-pill">${tip.status}</span>
        <span class="lesson-pill">Vecka ${Math.trunc(tip.week)} · ${tip.lessonUse}</span>
      </div>
      <p>${sentenceCase(tip.summary)}</p>
    </div>
    <div class="detail-grid detail-grid--page">
      <div>
        <strong>Problem</strong>
        <span>${sentenceCase(tip.summary)}</span>
      </div>
      <div>
        <strong>Support/fallback</strong>
        <span>${tip.support}</span>
      </div>
      <div>
        <strong>Challenge</strong>
        <span>${tip.challenge}</span>
      </div>
    </div>
    <pre><code></code></pre>
    <div class="card-actions">
      <button class="copy-button" type="button" id="detail-copy">Kopiera CSS</button>
      <button class="lesson-button" type="button" id="detail-lesson">Kopiera lektion</button>
      <a class="codepen-link" href="${codePenUrl(tip)}" rel="noreferrer">CodePen</a>
      <a class="secondary-link" href="${sourceUrl(tip)}" rel="noreferrer">Källa</a>
    </div>
  `;

  elements.detail.querySelector("code").textContent = tip.code || "/* Inget kodexempel i datat. */";
  $("#detail-copy").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(tip.code || "");
    event.currentTarget.textContent = "Kopierad";
  });
  $("#detail-lesson").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(lessonText(tip));
    event.currentTarget.textContent = "Kopierad";
  });
}

function updateLab() {
  if (!elements.columnSize || !elements.gapSize || !elements.labPreview || !elements.labCode) return;

  const column = `${elements.columnSize.value}rem`;
  const gap = `${elements.gapSize.value}px`;
  elements.labPreview.style.setProperty("--column-size", column);
  elements.labPreview.style.setProperty("--gap-size", gap);
  elements.labCode.textContent = `.grid {
  display: grid;
  gap: ${gap};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, ${column}), 1fr));
}`;
}

$$("[data-theme-choice]").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
});

elements.search?.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderCatalog();
});

elements.clear?.addEventListener("click", () => {
  elements.search.value = "";
  state.query = "";
  elements.search.focus();
  renderCatalog();
});

elements.showFavorites?.addEventListener("click", () => {
  state.favoritesOnly = !state.favoritesOnly;
  renderCatalog();
});

elements.columnSize?.addEventListener("input", updateLab);
elements.gapSize?.addEventListener("input", updateLab);

setTheme(state.theme);
renderDailyTip();
renderStats();
renderCatalog();
renderWeekCards(elements.weekList);
renderWeekCards(elements.homeProgression, 6);
renderLevelSummary();
renderTipDetail();
updateLab();
