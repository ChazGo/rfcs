import { boundaryDetails } from "./architecture-data.js";

const DEFAULT_VIEW = "target";
const validViews = new Set(["current", "target"]);
const tabs = [...document.querySelectorAll("[role='tab'][data-view]")];
const views = [...document.querySelectorAll(".architecture-view")];
const boundaries = [...document.querySelectorAll("[data-detail-id]")];
const drawer = document.querySelector("#details-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const drawerTitle = document.querySelector("#details-title");
const drawerKicker = document.querySelector("#details-kicker");
const drawerContent = document.querySelector("#details-content");
const closeButton = document.querySelector("#close-details");
const resetButton = document.querySelector("#reset-view");
const backgroundRegions = [
  document.querySelector(".skip-link"),
  document.querySelector(".page-header"),
  document.querySelector("main"),
  document.querySelector("footer"),
].filter(Boolean);

let activeView = DEFAULT_VIEW;
let activeBoundaryId = null;
let triggerElement = null;

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [requestedView, requestedDetailId, ...extraParts] = raw.split("/");
  const view = validViews.has(requestedView) ? requestedView : DEFAULT_VIEW;
  const detailId =
    requestedDetailId &&
    boundaryDetails[requestedDetailId] &&
    document.querySelector(
      `#view-${view} [data-detail-id="${CSS.escape(requestedDetailId)}"]`,
    )
      ? requestedDetailId
      : null;

  return {
    view,
    detailId,
    normalized:
      requestedView !== view ||
      Boolean(requestedDetailId) !== Boolean(detailId) ||
      extraParts.length > 0,
  };
}

function writeHash(view, detailId = null, replace = false) {
  const hash = `#${view}${detailId ? `/${detailId}` : ""}`;
  if (replace) {
    history.replaceState(null, "", hash);
  } else if (window.location.hash !== hash) {
    history.pushState(null, "", hash);
  }
}

function selectView(view, options = {}) {
  if (!validViews.has(view)) {
    return;
  }

  activeView = view;
  for (const tab of tabs) {
    const selected = tab.dataset.view === view;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }

  for (const panel of views) {
    panel.hidden = panel.id !== `view-${view}`;
  }

  if (!options.keepDetails) {
    closeDetails({ updateHash: false, restoreFocus: false });
  }

  if (options.updateHash !== false) {
    writeHash(view, options.detailId ?? null, options.replaceHash ?? false);
  }
}

function renderStatus(status) {
  const className =
    status.kind === "current"
      ? "status-current"
      : status.kind === "proposed"
        ? "status-proposed"
        : "status-open";
  return `<span class="status ${className}">${escapeHtml(status.label)}</span>`;
}

function renderFacts(facts) {
  return `
    <dl class="fact-grid">
      ${facts
        .map(
          ({ label, value }) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>`,
        )
        .join("")}
    </dl>`;
}

function renderList(items, className) {
  if (!items?.length) {
    return "";
  }

  return `<ul class="${className}">${items
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;
}

function renderSources(sources) {
  return sources
    .map(
      ({ label, url, revision }) => `
        <div class="source-card">
          <a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
            ${escapeHtml(label)}
          </a>
          <span class="source-revision">${escapeHtml(revision)}</span>
        </div>`,
    )
    .join("");
}

function renderDetails(detail) {
  drawerKicker.textContent = detail.kicker;
  drawerTitle.textContent = detail.title;
  drawerContent.innerHTML = `
    <div>${detail.statuses.map(renderStatus).join(" ")}</div>
    <p class="detail-summary">${escapeHtml(detail.summary)}</p>
    ${renderFacts(detail.facts)}
    ${
      detail.schema
        ? `<section class="detail-section">
            <h3>Focused schema</h3>
            <pre class="code-block"><code>${escapeHtml(detail.schema)}</code></pre>
          </section>`
        : ""
    }
    ${
      detail.example
        ? `<section class="detail-section">
            <h3>Default-filled example</h3>
            <pre class="code-block"><code>${escapeHtml(detail.example)}</code></pre>
          </section>`
        : ""
    }
    ${
      detail.options?.length
        ? `<section class="detail-section">
            <h3>Available options</h3>
            ${renderList(detail.options, "option-list")}
          </section>`
        : ""
    }
    ${
      detail.notes?.length
        ? `<section class="detail-section">
            <h3>Important boundaries</h3>
            ${renderList(detail.notes, "note-list")}
          </section>`
        : ""
    }
    <section class="detail-section">
      <h3>Public sources</h3>
      <div class="source-list">${renderSources(detail.sources)}</div>
    </section>`;
}

function openDetails(detailId, sourceElement = null, options = {}) {
  const detail = boundaryDetails[detailId];
  if (!detail) {
    return;
  }

  activeBoundaryId = detailId;
  triggerElement = sourceElement ?? triggerElement;
  renderDetails(detail);
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
  for (const region of backgroundRegions) {
    region.inert = true;
  }

  for (const boundary of boundaries) {
    boundary.classList.toggle("is-selected", boundary.dataset.detailId === detailId);
  }

  if (options.updateHash !== false) {
    writeHash(activeView, detailId);
  }

  if (options.focus !== false) {
    closeButton.focus();
  }
}

function closeDetails(options = {}) {
  if (!drawer.classList.contains("is-open") && !activeBoundaryId) {
    return;
  }

  const previousTrigger = triggerElement;
  activeBoundaryId = null;
  triggerElement = null;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
  for (const region of backgroundRegions) {
    region.inert = false;
  }

  for (const boundary of boundaries) {
    boundary.classList.remove("is-selected");
  }

  if (options.updateHash !== false) {
    writeHash(activeView);
  }

  if (options.restoreFocus !== false && previousTrigger?.isConnected) {
    previousTrigger.focus();
  }
}

function applyHash() {
  const { view, detailId, normalized } = parseHash();
  if (normalized) {
    writeHash(view, detailId, true);
  }
  selectView(view, {
    updateHash: false,
    keepDetails: Boolean(detailId),
  });

  if (detailId) {
    const visibleTrigger = document.querySelector(
      `#view-${view} [data-detail-id="${CSS.escape(detailId)}"]`,
    );
    openDetails(detailId, visibleTrigger, { updateHash: false });
  } else {
    closeDetails({ updateHash: false, restoreFocus: false });
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => selectView(tab.dataset.view));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = tabs.indexOf(tab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    selectView(tabs[nextIndex].dataset.view);
  });
}

for (const boundary of boundaries) {
  boundary.addEventListener("click", () =>
    openDetails(boundary.dataset.detailId, boundary),
  );
  boundary.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails(boundary.dataset.detailId, boundary);
    }
  });
}

closeButton.addEventListener("click", () => closeDetails());
drawerBackdrop.addEventListener("click", () => closeDetails());
resetButton.addEventListener("click", () => {
  closeDetails({ updateHash: false });
  selectView(DEFAULT_VIEW, { replaceHash: true });
  document.querySelector("#architecture").scrollIntoView({ block: "start" });
});

document.addEventListener("keydown", (event) => {
  if (!drawer.classList.contains("is-open")) {
    return;
  }

  if (event.key === "Escape") {
    closeDetails();
    return;
  }

  if (event.key === "Tab") {
    trapDrawerFocus(event);
  }
});

window.addEventListener("hashchange", applyHash);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function trapDrawerFocus(event) {
  const focusable = [
    ...drawer.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hidden);
  if (!focusable.length) {
    event.preventDefault();
    drawer.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

if (!window.location.hash) {
  writeHash(DEFAULT_VIEW, null, true);
}
applyHash();
