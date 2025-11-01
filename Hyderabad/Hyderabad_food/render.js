// render.js — styled for given CSS + radio filters + checklist on location IDs

const folder = window.location.pathname.split('/').slice(-2, -1)[0] || "root";
const file = window.location.pathname.split('/').pop().replace('.html', '');
const STORAGE_KEY = `checkedLocations_${folder}_${file}`;

let dataCache = null;
let currentCategory = "All";

/** Resolve data path */
function resolveDataUrl(dataPath) {
  const parts = window.location.pathname.split('/');
  parts.pop();
  const base = parts.join('/') + '/';
  return new URL(dataPath, window.location.origin + base).href;
}

/**
 * Main loader
 */
export async function loadChecklist(containerId, dataPath = "data.json", categoryContainerId = "categoryFilter") {
  const container = document.getElementById(containerId);
  const categoryContainer = document.getElementById(categoryContainerId);
  if (!container) return;

  try {
    // Load JSON once
    if (!dataCache) {
      const url = resolveDataUrl(dataPath);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      dataCache = await response.json();
    }

    const categories = dataCache.categories || [];
    const foods = dataCache.foods || [];
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // ===== Category Filter (Radio Buttons) =====
    if (categoryContainer) {
      categoryContainer.innerHTML = `
        <div class="category-radios" style="text-align:center; margin-top:20px;">
          <label style="margin-right:12px;">
            <input type="radio" name="category" value="All" checked>
            <span>All</span>
          </label>
          ${categories
            .map(
              (cat) => `
            <label style="margin-right:12px;">
              <input type="radio" name="category" value="${cat}">
              <span>${cat}</span>
            </label>`
            )
            .join('')}
        </div>
      `;
      categoryContainer.addEventListener("change", (e) => {
        if (e.target && e.target.name === "category") {
          currentCategory = e.target.value;
          renderChecklist(container, foods, completed);
        }
      });
    }

    // Initial render
    renderChecklist(container, foods, completed);

    // Checkbox handling
    container.removeEventListener("change", container._checkHandler, true);
    const handler = (e) => {
      const t = e.target;
      if (t && t.matches('input[type="checkbox"][data-id]')) {
        const id = Number(t.getAttribute('data-id'));
        toggleCheckLocal(id, t.checked, container);
      }
    };
    container.addEventListener("change", handler, true);
    container._checkHandler = handler;

  } catch (err) {
    console.error("Error loading data:", err);
    container.innerHTML = "<li>⚠️ Error loading data</li>";
  }
}

/**
 * Render foods + their location checklists
 */
function renderChecklist(container, foods, completed) {
  container.innerHTML = "";

  const filteredFoods =
    currentCategory === "All"
      ? foods
      : foods.filter((f) => f.categories && f.categories.includes(currentCategory));

  if (!filteredFoods.length) {
    container.innerHTML = `<li><em>No items found for "${currentCategory}"</em></li>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredFoods.forEach((food) => {
    const foodCard = document.createElement("li");
    foodCard.className = "food-card";

    const locationList = (food.location || [])
      .map((loc) => {
        const isChecked = completed.includes(loc.id);
        return `
          <li data-id="${loc.id}" class="${isChecked ? "done" : ""}">
            <label>
              <input type="checkbox" data-id="${loc.id}" ${isChecked ? "checked" : ""}>
              <span><b>${loc.name}</b> | <span class="location">${loc.location}</span> | 📍 <a href="${loc.link}" target="_blank" class="map-link">Click for Location</a> </span>
            </label>
          </li>
        `;
      })
      .join("");

    foodCard.innerHTML = `
      <div class="meta">
        <h2 style="margin:0; color:#0078d7;">${food.name}</h2>
        <p style="margin:6px 0;">${food.comment || ""}</p>
      </div>

      <div class="image-panel">
        ${food.image ? `<img src="${food.image}" alt="${food.name}">` : ""}
      </div>

      <ul class="location-list" style="margin-top:10px;">
        ${locationList}
      </ul>
    `;

    fragment.appendChild(foodCard);
  });

  container.appendChild(fragment);
}

/**
 * Toggle localStorage + update DOM
 */
function toggleCheckLocal(id, checked, container) {
  let completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (checked) {
    if (!completed.includes(id)) completed.push(id);
  } else {
    completed = completed.filter((x) => x !== id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));

  const li = container.querySelector(`li[data-id="${id}"]`);
  if (li) li.classList.toggle("done", checked);
}

// global compatibility toggle
window.toggleCheck = function (id) {
  const container = document.getElementById("checklist");
  const cb = container?.querySelector(`input[data-id="${id}"]`);
  if (!cb) return;
  const newState = !cb.checked;
  cb.checked = newState;
  toggleCheckLocal(id, newState, container);
};
