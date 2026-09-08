import { modes, publicSources, surfaces } from "./design-data.js";

const modeButtons = [...document.querySelectorAll("[data-mode]")];
const modePanel = document.querySelector("#mode-panel");
const surfaceTabs = [...document.querySelectorAll("[data-surface]")];
const surfacePanel = document.querySelector("#surface-panel");
const copyButton = document.querySelector("#copy-cli");
const copyStatus = document.querySelector("#copy-status");

let activeMode = "minimal";
let activeSurface = "cli";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stateFromHash() {
  const [requestedMode, requestedSurface] = window.location.hash.replace(/^#/, "").split("/");
  return {
    mode: modes[requestedMode] ? requestedMode : "minimal",
    surface: surfaces[requestedSurface] ? requestedSurface : "cli",
  };
}

function updateHash() {
  history.replaceState(null, "", `#${activeMode}/${activeSurface}`);
}

function renderMode(modeId, syncHash = true) {
  activeMode = modes[modeId] ? modeId : "minimal";
  const mode = modes[activeMode];

  for (const button of modeButtons) {
    const selected = button.dataset.mode === activeMode;
    button.setAttribute("aria-pressed", String(selected));
  }

  document.body.dataset.mode = activeMode;
  modePanel.innerHTML = `
    <div class="mode-panel-heading">
      <div>
        <p class="eyebrow">${escapeHtml(mode.recommendation)}</p>
        <h2>${escapeHtml(mode.name)}</h2>
        <p>${escapeHtml(mode.summary)}</p>
      </div>
      <span class="mode-badge">${escapeHtml(mode.managed)}</span>
    </div>
    <dl class="mode-facts">
      <div><dt>Gateway execution</dt><dd>${escapeHtml(mode.execution)}</dd></div>
      <div><dt>Windows identity</dt><dd>${escapeHtml(mode.identity)}</dd></div>
      <div><dt>Network</dt><dd>${escapeHtml(mode.network)}</dd></div>
      <div><dt>Files</dt><dd>${escapeHtml(mode.files)}</dd></div>
      <div><dt>Per-process containment</dt><dd>${escapeHtml(mode.processContainment)}</dd></div>
    </dl>
    <p class="mode-warning">${escapeHtml(mode.warning)}</p>`;

  if (syncHash) {
    updateHash();
  }
}

function renderSurface(surfaceId, syncHash = true) {
  activeSurface = surfaces[surfaceId] ? surfaceId : "cli";
  const surface = surfaces[activeSurface];

  for (const tab of surfaceTabs) {
    const selected = tab.dataset.surface === activeSurface;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) {
      surfacePanel.setAttribute("aria-labelledby", tab.id);
    }
  }

  surfacePanel.innerHTML = `
    <div class="surface-heading">
      <div>
        <span class="surface-badge">${escapeHtml(surface.badge)}</span>
        <h3>${escapeHtml(surface.title)}</h3>
      </div>
      <p>${escapeHtml(surface.copy)}</p>
    </div>
    <pre><code>${escapeHtml(surface.example)}</code></pre>
    <ul>${surface.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`;

  copyButton.hidden = activeSurface !== "cli";
  copyStatus.textContent = "";

  if (syncHash) {
    updateHash();
  }
}

function renderSources() {
  document.querySelector("#source-list").innerHTML = publicSources
    .map(
      (source) => `
        <li>
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
            ${escapeHtml(source.label)}
          </a>
          <span>${escapeHtml(source.revision)}</span>
        </li>`,
    )
    .join("");
}

for (const button of modeButtons) {
  button.addEventListener("click", () => renderMode(button.dataset.mode));
}

for (const tab of surfaceTabs) {
  tab.addEventListener("click", () => renderSurface(tab.dataset.surface));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = surfaceTabs.indexOf(tab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? surfaceTabs.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % surfaceTabs.length
            : (currentIndex - 1 + surfaceTabs.length) % surfaceTabs.length;
    surfaceTabs[nextIndex].focus();
    renderSurface(surfaceTabs[nextIndex].dataset.surface);
  });
}

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(surfaces.cli.example);
    copyStatus.textContent = "Commands copied.";
  } catch {
    copyStatus.textContent = "Copy unavailable. Select the commands above.";
  }
});

window.addEventListener("hashchange", () => {
  const state = stateFromHash();
  renderMode(state.mode, false);
  renderSurface(state.surface, false);
});

const initialState = stateFromHash();
renderMode(initialState.mode, false);
renderSurface(initialState.surface, false);
updateHash();
renderSources();
