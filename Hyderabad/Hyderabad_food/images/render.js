// render.js (updated for nested JSON + category filter)

// create unique storage key based on folder + file
const folder = window.location.pathname.split('/').slice(-2, -1)[0] || "root";
const file = window.location.pathname.split('/').pop().replace('.html', '');
const STORAGE_KEY = `checkedPlaces_${folder}_${file}`;

let dataCache = null;
let currentCategory = "All";

/**
 * Resolve dataPath relative to current page reliably.
 */
function resolveDataUrl(dataPath) {
  const parts = window.location.pathname.split('/');
  parts.pop(); // remove filename
  const basePath = parts.join('/') + '/';
  return new URL(dataPath, window.location.origin + basePath).href;
}

export async function loadChecklist(containerId, dataPath = "data.json", categoryContainerId = "categoryFilter") {
  const container = document.getElementById(containerId);
  const categoryContainer = document.getElementById(categoryContainerId);
  if (!container) return;

  try {
    if (!dataCache) {
      const url = resolveDataUrl(dataPath);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      dataCache = await response.json();
    }

    // handle both single-item and multi-item formats
    let categories = [];
    let places = [];

    if (Array.isArray(dataCache.foodItems)) {
      // multi-food format
      dataCache.foodItems.forEach(food => {
        categories.push(...(food.categories || []));
        places.push(...(food.places || []));
      });
    } else {
      // single food item format
      categories = dataCache.categories || [];
      places = dataCache.places || [];
    }

    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // ===== Build category dropdown =====
    if (categoryContainer) {
      const uniqueCats = ["All", ...new Set(categories)];
      categoryContainer.innerHTML = `
        <label for="categorySelect"><b>Category:</b></label>
        <select id="categorySelect">
          ${uniqueCats.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
        </select>
      `;
      const select = categoryContainer.querySelector('#categorySelect');
      select.value = currentCategory;
      select.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderPlaces(container, places, completed);
      });
    }

    // ===== Render initial list =====
    renderPlaces(container, places, completed);

    // ===== Checkbox handling =====
    container.removeEventListener("change", container._checkHandler, true);
    const handler = (e) => {
      const target = e.target;
      if (target && target.matches('input[type="checkbox"][data-id]')) {
        const id = Number(target.getAttribute('data-id'));
        toggleCheckLocal(id, target.checked, container);
      }
    };
    container.addEventListener("change", handler, true);
    container._checkHandler = handler;

  } catch (err) {
    container.innerHTML = "<li>⚠️ Error loading data.json</li>";
    console.error("Error loading data:", err);
  }
}

/**
 * Render checklist items based on current category filter
 */
function renderPlaces(container, places, completed) {
  const fragment = document.createDocumentFragment();

  const filtered = currentCategory === "All"
    ? places
    : places.filter(p => p.categories && p.categories.includes(currentCategory));

  filtered.forEach(place => {
    const li = document.createElement("li");
    const isChecked = completed.includes(place.id || place.ID_I);

    li.className = isChecked ? "done" : "";
    li.dataset.id = String(place.id || place.ID_I);

    li.innerHTML = `
      <label>
        <input type="checkbox" ${isChecked ? "checked" : ""} data-id="${place.id || place.ID_I}">
        <span><b>${place.name || place.Name}</b></span>
      </label>
      <div class="meta">
        <div class="location">📍 ${place.location}</div>
        ⭐ ${place.rating} | 💬 ${place.comment || ""}
      </div>
      <div class="image-panel">
        ${place.image ? `<a href="${place.image}" target="_blank"><img src="${place.image}" alt="${place.name || place.Name}"></a>` : ""}
      </div>
    `;
    fragment.appendChild(li);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

/**
 * Update localStorage and DOM without re-fetching.
 */
function toggleCheckLocal(id, checked, container) {
  let completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (checked) {
    if (!completed.includes(id)) completed.push(id);
  } else {
    completed = completed.filter(x => x !== id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));

  const li = container.querySelector(`li[data-id="${id}"]`);
  if (li) {
    if (checked) li.classList.add('done'); else li.classList.remove('done');
    const cb = li.querySelector('input[type="checkbox"][data-id]');
    if (cb) cb.checked = checked;
  }
}

window.toggleCheck = function (id) {
  const container = document.getElementById("checklist");
  if (!container) return;
  const cb = container.querySelector(`input[type="checkbox"][data-id="${id}"]`);
  const newState = cb ? !cb.checked : true;
  toggleCheckLocal(id, newState, container);
};
