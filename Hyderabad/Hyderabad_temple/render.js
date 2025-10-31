// render.js (updated)
// create unique storage key based on folder + file
const folder = window.location.pathname.split('/').slice(-2, -1)[0] || "root";
const file = window.location.pathname.split('/').pop().replace('.html', '');
const STORAGE_KEY = `checkedPlaces_${folder}_${file}`;

// cache for loaded JSON
let dataCache = null;

/**
 * Resolve dataPath relative to current page reliably.
 * e.g. if page is /Food/Hyderabad.html and dataPath is "data.json",
 * we compute /Food/data.json
 */
function resolveDataUrl(dataPath) {
  // base = current page directory, ending with '/'
  const parts = window.location.pathname.split('/');
  parts.pop(); // remove filename
  const basePath = parts.join('/') + '/';
  // build absolute URL using the browser's URL constructor
  return new URL(dataPath, window.location.origin + basePath).href;
}

export async function loadChecklist(containerId, dataPath = "data.json") {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // load (and cache) JSON once
    if (!dataCache) {
      const url = resolveDataUrl(dataPath);
      const response = await fetch(url, { cache: "no-store" }); // avoid stale cache
      if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      dataCache = await response.json();
    }

    const places = dataCache.places || [];
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // build list in-memory first (faster & avoids flicker)
    const fragment = document.createDocumentFragment();

    places.forEach(place => {
      const li = document.createElement("li");
      const isChecked = completed.includes(place.ID_I);

      li.className = isChecked ? "done" : "";
      li.dataset.id = String(place.ID_I);

      li.innerHTML = `
        <label>
          <input type="checkbox" ${isChecked ? "checked" : ""} data-id="${place.ID_I}">
          <span><b>${place.Name}</b></span>
        </label>
        <div class="meta">
          <div class="location">📍 ${place.location}</div>
          ⭐ ${place.rating} | 💬 ${place.comment}
        </div>
        <div class="image-panel">
          ${place.image ? `<a href="${place.image}" target="_blank"><img src="${place.image}" alt="${place.Name}"></a>` : ""}
        </div>
      `;

      fragment.appendChild(li);
    });

    // clear and append
    container.innerHTML = "";
    container.appendChild(fragment);

    // attach delegated event listener (safer than inline onchange + re-render issues)
    // remove existing listener if previously attached
    container.removeEventListener("change", container._checkHandler, true);
    const handler = (e) => {
      const target = e.target;
      if (target && target.matches('input[type="checkbox"][data-id]')) {
        const id = Number(target.getAttribute('data-id'));
        // update storage and mark DOM without re-fetch
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
 * Update localStorage and DOM without re-fetching.
 * Called by delegated change handler above and by the global toggleCheck for compatibility.
 */
function toggleCheckLocal(id, checked, container) {
  let completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (checked) {
    if (!completed.includes(id)) completed.push(id);
  } else {
    completed = completed.filter(x => x !== id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));

  // update DOM: find the li with data-id and toggle class
  const li = container.querySelector(`li[data-id="${id}"]`);
  if (li) {
    if (checked) li.classList.add('done'); else li.classList.remove('done');
    // also make sure checkbox state reflects current (in case of re-render)
    const cb = li.querySelector('input[type="checkbox"][data-id]');
    if (cb) cb.checked = checked;
  }
}

// Keep a global toggleCheck for compatibility with inline attributes or other callers.
// This function will update localStorage and DOM without re-fetching.
window.toggleCheck = function (id) {
  const container = document.getElementById("checklist");
  if (!container) return;
  // find current checkbox (if exists) and invert state
  const cb = container.querySelector(`input[type="checkbox"][data-id="${id}"]`);
  const newState = cb ? !cb.checked : true;
  toggleCheckLocal(id, newState, container);
};
