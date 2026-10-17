/**
 * VouchAI Modern Frontend Application Logic
 */

let appConfig = null;
let currentResults = null;
let selectedQuals = new Set();
let selectedAreas = new Set();
let currentEventSource = null;

// DOM Elements
const form = document.getElementById("search-form");
const occupationSelect = document.getElementById("occupation");
const experienceSelect = document.getElementById("experience");
const countrySelect = document.getElementById("country");
const stateSelect = document.getElementById("state");
const qualsContainer = document.getElementById("quals-container");
const areasContainer = document.getElementById("areas-container");
const qualsCountLabel = document.getElementById("quals-count");
const areasCountLabel = document.getElementById("areas-count");
const websitesSlider = document.getElementById("websites-slider");
const websitesCountLabel = document.getElementById("websites-count-label");
const toggleLinkedin = document.getElementById("toggle-linkedin");
const toggleAccurate = document.getElementById("toggle-accurate");
const toggleCache = document.getElementById("toggle-cache");
const toggleDebug = document.getElementById("toggle-debug");
const btnSubmit = document.getElementById("btn-submit");
const btnSpinner = document.getElementById("btn-spinner");
const btnSubmitText = document.getElementById("btn-submit-text");
const themeToggle = document.getElementById("theme-toggle");

const liveProgressCard = document.getElementById("live-progress-card");
const progressStageTitle = document.getElementById("progress-stage-title");
const progressStageDesc = document.getElementById("progress-stage-desc");
const progressBarFill = document.getElementById("progress-bar-fill");
const logsTerminal = document.getElementById("logs-terminal");
const logCountLabel = document.getElementById("log-count");
const welcomeState = document.getElementById("welcome-state");
const resultsView = document.getElementById("results-view");
const resultsCountTitle = document.getElementById("results-count-title");
const cacheBadge = document.getElementById("cache-badge");
const methodologyCriteria = document.getElementById("methodology-criteria");
const methodologyQueries = document.getElementById("methodology-queries");
const warningBanner = document.getElementById("warning-banner");
const providersList = document.getElementById("providers-list");
const debugCard = document.getElementById("debug-card");
const debugJson = document.getElementById("debug-json");
const btnExportJson = document.getElementById("btn-export-json");
const btnExportCsv = document.getElementById("btn-export-csv");

// Theme Initialization
function initTheme() {
  const savedTheme = localStorage.getItem("vouchai-theme") || "dark";
  document.documentElement.className = savedTheme;
  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.className = nextTheme;
    localStorage.setItem("vouchai-theme", nextTheme);
  });
}

// Health Check
async function checkHealth() {
  const pill = document.getElementById("status-pill");
  const text = document.getElementById("status-text");
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.status === "ok") {
      pill.classList.remove("error");
      text.textContent = "Turbo Ready (Groq & TinyFish)";
    } else {
      pill.classList.add("error");
      text.textContent = "API Check Warning";
    }
  } catch (err) {
    pill.classList.add("error");
    text.textContent = "Offline / Connection Error";
  }
}

// Load App Configuration
async function loadConfig() {
  try {
    const [configRes, countriesRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/countries"),
    ]);

    appConfig = await configRes.json();
    const countriesData = await countriesRes.json();

    // Populate Occupation optgroups
    occupationSelect.innerHTML = "";
    for (const [groupName, occupations] of Object.entries(appConfig.occupationGroups)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = groupName;
      occupations.forEach((occ) => {
        const opt = document.createElement("option");
        opt.value = occ;
        opt.textContent = occ;
        if (occ === "Chartered Accountant (CA)") opt.selected = true;
        optgroup.appendChild(opt);
      });
      occupationSelect.appendChild(optgroup);
    }

    // Populate Countries
    countrySelect.innerHTML = "";
    countriesData.countries.forEach((country) => {
      const opt = document.createElement("option");
      opt.value = country;
      opt.textContent = country;
      if (country === "India") opt.selected = true;
      countrySelect.appendChild(opt);
    });

    // Populate States for default country
    await updateStates("India", "Delhi");

    // Populate dynamic chips
    updateChipsForOccupation(occupationSelect.value);
  } catch (err) {
    console.error("Failed to load initial configuration:", err);
  }
}

// Update State Dropdown
async function updateStates(country, defaultState = "") {
  try {
    const res = await fetch(`/api/states?country=${encodeURIComponent(country)}`);
    const data = await res.json();
    stateSelect.innerHTML = '<option value="">Any state</option>';
    (data.states || []).forEach((st) => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (defaultState && st === defaultState) opt.selected = true;
      stateSelect.appendChild(opt);
    });
    stateSelect.dataset.code = data.code || "";
  } catch (err) {
    console.error("Failed to fetch states:", err);
  }
}

// Find Occupation Group
function getOccupationGroup(occupation) {
  if (!appConfig) return "Business & Operations";
  for (const [group, occs] of Object.entries(appConfig.occupationGroups)) {
    if (occs.includes(occupation)) return group;
  }
  return "Business & Operations";
}

let expandQuals = false;
let expandAreas = false;

// Update Dynamic Qualification & Specialty Chips
function updateChipsForOccupation(occupation) {
  const group = getOccupationGroup(occupation);
  const filterData = appConfig?.filters?.[group] || { quals: [], areas: [] };

  selectedQuals.clear();
  selectedAreas.clear();

  // Defaults
  if (occupation === "Chartered Accountant (CA)") {
    selectedAreas.add("GST");
  }

  renderQualsChips(filterData.quals);
  renderAreasChips(filterData.areas);
}

function updateCounterBadge(labelEl, count, max = 4) {
  labelEl.textContent = `${count}/${max} selected`;
  if (count > 0) {
    labelEl.className = "chip-count active";
  } else {
    labelEl.className = "chip-count empty";
  }
}

function renderQualsChips(quals) {
  qualsContainer.innerHTML = "";
  const displayQuals = expandQuals ? quals : quals.slice(0, 8);
  
  displayQuals.forEach((q) => {
    const chip = document.createElement("div");
    chip.className = `chip ${selectedQuals.has(q) ? "selected" : ""}`;
    chip.textContent = q;
    chip.addEventListener("click", () => {
      if (selectedQuals.has(q)) {
        selectedQuals.delete(q);
        chip.classList.remove("selected");
      } else {
        if (selectedQuals.size >= 4) return;
        selectedQuals.add(q);
        chip.classList.add("selected");
      }
      updateCounterBadge(qualsCountLabel, selectedQuals.size);
    });
    qualsContainer.appendChild(chip);
  });
  updateCounterBadge(qualsCountLabel, selectedQuals.size);

  const toggleWrap = document.getElementById("quals-toggle-wrap");
  const toggleBtn = document.getElementById("btn-toggle-quals");
  if (toggleWrap && toggleBtn) {
    if (quals.length > 8) {
      toggleWrap.classList.remove("hidden");
      toggleBtn.textContent = expandQuals ? "Show fewer options" : `Show all (${quals.length})`;
      toggleBtn.onclick = () => {
        expandQuals = !expandQuals;
        renderQualsChips(quals);
      };
    } else {
      toggleWrap.classList.add("hidden");
    }
  }
}

function renderAreasChips(areas) {
  areasContainer.innerHTML = "";
  const displayAreas = expandAreas ? areas : areas.slice(0, 8);

  displayAreas.forEach((a) => {
    const chip = document.createElement("div");
    chip.className = `chip ${selectedAreas.has(a) ? "selected" : ""}`;
    chip.textContent = a;
    chip.addEventListener("click", () => {
      if (selectedAreas.has(a)) {
        selectedAreas.delete(a);
        chip.classList.remove("selected");
      } else {
        if (selectedAreas.size >= 4) return;
        selectedAreas.add(a);
        chip.classList.add("selected");
      }
      updateCounterBadge(areasCountLabel, selectedAreas.size);
    });
    areasContainer.appendChild(chip);
  });
  updateCounterBadge(areasCountLabel, selectedAreas.size);

  const toggleWrap = document.getElementById("areas-toggle-wrap");
  const toggleBtn = document.getElementById("btn-toggle-areas");
  if (toggleWrap && toggleBtn) {
    if (areas.length > 8) {
      toggleWrap.classList.remove("hidden");
      toggleBtn.textContent = expandAreas ? "Show fewer specialties" : `Show all (${areas.length})`;
      toggleBtn.onclick = () => {
        expandAreas = !expandAreas;
        renderAreasChips(areas);
      };
    } else {
      toggleWrap.classList.add("hidden");
    }
  }
}

// Stepper updater
function updateStepper(step) {
  const nodes = ["plan", "search", "fetch", "judge", "verify"];
  let passedCurrent = false;

  nodes.forEach((nodeName) => {
    const el = document.getElementById(`step-${nodeName}`);
    if (!el) return;
    if (nodeName === step) {
      el.className = "step-node active";
      passedCurrent = true;
    } else if (!passedCurrent) {
      el.className = "step-node done";
    } else {
      el.className = "step-node";
    }
  });

  const progressPercentMap = {
    plan: 15,
    search: 35,
    fetch: 60,
    judge: 80,
    verify: 95,
    done: 100,
  };
  const pct = progressPercentMap[step] || 25;
  progressBarFill.style.width = `${pct}%`;
}

// Append log to terminal
let logCount = 0;
function appendLog(message) {
  logCount++;
  logCountLabel.textContent = `${logCount} events`;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span class="log-time">[${time}]</span> ${escapeHtml(message)}`;
  logsTerminal.appendChild(line);
  logsTerminal.scrollTop = logsTerminal.scrollHeight;

  // React to log text to advance stepper
  const m = message.toLowerCase();
  if (m.includes("search:")) {
    updateStepper("search");
    progressStageTitle.textContent = "TinyFish Searching...";
    progressStageDesc.textContent = message;
  } else if (m.includes("fetch:")) {
    updateStepper("fetch");
    progressStageTitle.textContent = "TinyFish Fetching Content...";
    progressStageDesc.textContent = message;
  } else if (m.includes("checked")) {
    updateStepper("judge");
    progressStageTitle.textContent = "Groq Evaluating Evidence...";
    progressStageDesc.textContent = message;
  } else if (m.includes("cross-checking") || m.includes("linkedin")) {
    updateStepper("verify");
    progressStageTitle.textContent = "Cross-Verifying Independent Sources...";
    progressStageDesc.textContent = message;
  }
}

// Escape HTML helper
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Render Results View
function renderResults(data) {
  currentResults = data;
  welcomeState.classList.add("hidden");
  resultsView.classList.remove("hidden");

  // Cache Badge
  if (data.cached) {
    cacheBadge.classList.remove("hidden");
  } else {
    cacheBadge.classList.add("hidden");
  }

  // Count title
  const count = (data.providers || []).length;
  resultsCountTitle.textContent = `Evidence-Supported Results (${count})`;

  // Methodology
  methodologyCriteria.innerHTML = "";
  (data.plan?.criteria || []).forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    methodologyCriteria.appendChild(li);
  });

  methodologyQueries.innerHTML = "";
  (data.plan?.queries || []).forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    methodologyQueries.appendChild(li);
  });

  // Warning banner
  if (data.warning) {
    warningBanner.textContent = data.warning;
    warningBanner.classList.remove("hidden");
  } else {
    warningBanner.classList.add("hidden");
  }

  // Providers List
  providersList.innerHTML = "";
  if (count === 0) {
    providersList.innerHTML = `
      <div class="card empty-state" style="padding: 2.5rem 1.5rem;">
        <h4>No evidence-supported profiles matched all selected criteria.</h4>
        <p style="margin-top: 0.5rem; font-size: 0.85rem;">Try broadening the location to "Any state" or reducing specific certification filters.</p>
      </div>
    `;
  } else {
    data.providers.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "provider-card";

      // Score style
      const scoreClass = p.score >= 70 ? "" : "moderate";

      // Badge for kind
      const isLi = p.kind === "linkedin";
      const sourceBadgeHtml = isLi
        ? `<span class="source-badge badge-linkedin">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.81a1.63 1.63 0 0 0-1.63 1.62c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.62-1.63-1.62Z"/></svg>
             LinkedIn · Independently Corroborated
           </span>`
        : `<span class="source-badge badge-website">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
             Public Website · Verified Page Evidence
           </span>`;

      // Criteria Rows
      let criteriaRowsHtml = "";
      (p.rows || []).forEach((row) => {
        let verdictBadge = "";
        if (row.verdict === "match") {
          verdictBadge = `<span class="verdict-tag verdict-match">Supported</span>`;
        } else if (row.verdict === "no_match") {
          verdictBadge = `<span class="verdict-tag verdict-no_match">Contradicted</span>`;
        } else {
          verdictBadge = `<span class="verdict-tag verdict-unknown">Not Stated</span>`;
        }

        const quoteHtml = row.evidence
          ? `<p class="criterion-excerpt">${escapeHtml(row.evidence)}</p>`
          : "";

        criteriaRowsHtml += `
          <div class="criterion-row">
            <div class="criterion-header">
              ${verdictBadge}
              <span>${escapeHtml(row.criterion)}</span>
            </div>
            ${quoteHtml}
          </div>
        `;
      });

      // Contacts
      let contactsHtml = "";
      const emails = p.contacts?.emails || [];
      const phones = p.contacts?.phones || [];
      if (emails.length || phones.length) {
        const contactLinks = [];
        emails.forEach((e) => {
          contactLinks.push(`
            <a href="mailto:${e}" class="contact-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              ${e}
            </a>
          `);
        });
        phones.forEach((ph) => {
          contactLinks.push(`
            <a href="tel:${ph}" class="contact-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${ph}
            </a>
          `);
        });

        contactsHtml = `
          <div class="contacts-bar">
            <strong>Public Contacts:</strong>
            ${contactLinks.join(" · ")}
          </div>
        `;
      }

      // Corroboration
      let corroborationHtml = "";
      if (p.corroboration) {
        corroborationHtml = `
          <div class="corroboration-box">
            <h5>Independent Confirmation:</h5>
            <p><a href="${p.corroboration.url}" target="_blank" class="provider-link" rel="noopener noreferrer">${p.corroboration.url}</a></p>
            <p style="margin-top: 0.3rem; font-style: italic; color: var(--text-secondary);">“${escapeHtml(p.corroboration.evidence)}”</p>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-top">
          <div class="provider-name-wrap">
            <h3>
              <span>${idx + 1}.</span>
              <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="provider-link">
                ${escapeHtml(p.name)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </h3>
            ${sourceBadgeHtml}
          </div>
          <div class="score-badge-wrap">
            <span class="score-pill ${scoreClass}">${p.score}% Match</span>
            <div class="score-criteria-count">${p.matched} of ${p.total} criteria supported</div>
          </div>
        </div>

        <div class="criteria-table">
          ${criteriaRowsHtml}
        </div>

        ${contactsHtml}
        ${corroborationHtml}

        <div class="card-actions-bar">
          <button class="btn btn-secondary btn-sm btn-copy-card" data-idx="${idx}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy Summary
          </button>
          <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="text-decoration:none;">
            Visit Page
          </a>
        </div>
      `;

      providersList.appendChild(card);
    });

    // Attach copy button listeners
    document.querySelectorAll(".btn-copy-card").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const i = parseInt(btn.dataset.idx, 10);
        const item = data.providers[i];
        if (!item) return;

        const summary = [
          `Provider: ${item.name}`,
          `URL: ${item.url}`,
          `Match Score: ${item.score}% (${item.matched}/${item.total} criteria supported)`,
          `Contacts: ${(item.contacts?.emails || []).concat(item.contacts?.phones || []).join(", ") || "None listed"}`,
          `Verified Criteria:`,
          ...item.rows.map((r) => ` - [${r.verdict}] ${r.criterion}${r.evidence ? ` ("${r.evidence}")` : ""}`),
        ].join("\n");

        navigator.clipboard.writeText(summary).then(() => {
          const orig = btn.innerHTML;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.innerHTML = orig;
          }, 1500);
        });
      });
    });
  }

  // Debug info
  if (toggleDebug.checked && data.debug) {
    debugCard.classList.remove("hidden");
    debugJson.textContent = JSON.stringify(data.debug, null, 2);
  } else {
    debugCard.classList.add("hidden");
  }
}

// Search Submission
async function executeSearch(e) {
  e?.preventDefault();

  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }

  const occupation = occupationSelect.value;
  const expLabel = experienceSelect.value;
  const years = appConfig?.experience?.[expLabel] || 5;
  const country = countrySelect.value;
  const code = stateSelect.dataset.code || "";
  const state = stateSelect.value;

  const profile = {
    occupation,
    years,
    country,
    country_code: code,
    state,
    quals: Array.from(selectedQuals),
    areas: Array.from(selectedAreas),
  };

  const maxCandidates = parseInt(websitesSlider.value, 10);
  const accurate = toggleAccurate.checked;
  const useCache = toggleCache.checked;
  const includeLinkedin = toggleLinkedin.checked;

  // UI state for loading
  btnSubmit.disabled = true;
  btnSpinner.classList.remove("hidden");
  btnSubmitText.textContent = "Discovering...";

  welcomeState.classList.add("hidden");
  resultsView.classList.add("hidden");
  liveProgressCard.classList.remove("hidden");

  // Reset logs
  logCount = 0;
  logsTerminal.innerHTML = "";
  logCountLabel.textContent = "0 events";
  updateStepper("plan");
  progressStageTitle.textContent = "Starting Pipeline...";
  progressStageDesc.textContent = `Targeting ${occupation} in ${state ? `${state}, ` : ""}${country}`;

  appendLog(`Initiating search for ${occupation} (Min ${years}+ yrs exp)`);

  const sseUrl = `/api/search/stream?profile=${encodeURIComponent(JSON.stringify(profile))}&maxCandidates=${maxCandidates}&accurate=${accurate}&useCache=${useCache}&includeLinkedin=${includeLinkedin}`;

  const es = new EventSource(sseUrl);
  currentEventSource = es;

  es.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "log") {
        appendLog(payload.data);
      } else if (payload.type === "complete") {
        updateStepper("done");
        progressBarFill.style.width = "100%";
        progressStageTitle.textContent = "Discovery Complete!";
        progressStageDesc.textContent = `Found ${payload.data.providers?.length || 0} supported providers`;

        setTimeout(() => {
          liveProgressCard.classList.add("hidden");
          renderResults(payload.data);
          btnSubmit.disabled = false;
          btnSpinner.classList.add("hidden");
          btnSubmitText.textContent = "Find Providers";
        }, 500);

        es.close();
        currentEventSource = null;
      } else if (payload.type === "error") {
        appendLog(`ERROR: ${payload.data}`);
        btnSubmit.disabled = false;
        btnSpinner.classList.add("hidden");
        btnSubmitText.textContent = "Find Providers";
        es.close();
        currentEventSource = null;
      }
    } catch (err) {
      console.warn("SSE parse error:", err);
    }
  };

  es.onerror = (err) => {
    console.error("SSE connection error:", err);
    appendLog("SSE stream disconnected. Checking completion...");
    es.close();
    currentEventSource = null;
    btnSubmit.disabled = false;
    btnSpinner.classList.add("hidden");
    btnSubmitText.textContent = "Find Providers";
  };
}

// Export Handlers
btnExportJson.addEventListener("click", () => {
  if (!currentResults) return;
  const blob = new Blob([JSON.stringify(currentResults, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vouchai_results_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnExportCsv.addEventListener("click", () => {
  if (!currentResults || !currentResults.providers) return;
  const headers = ["Index", "Name", "URL", "Kind", "Score", "Matched", "Total", "Emails", "Phones", "Corroboration"];
  const rows = currentResults.providers.map((p, i) => [
    i + 1,
    `"${(p.name || "").replace(/"/g, '""')}"`,
    `"${(p.url || "").replace(/"/g, '""')}"`,
    p.kind,
    `${p.score}%`,
    p.matched,
    p.total,
    `"${(p.contacts?.emails || []).join("; ")}"`,
    `"${(p.contacts?.phones || []).join("; ")}"`,
    `"${p.corroboration?.url ? p.corroboration.url : "N/A"}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vouchai_results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Event Listeners
occupationSelect.addEventListener("change", (e) => {
  updateChipsForOccupation(e.target.value);
});

countrySelect.addEventListener("change", (e) => {
  updateStates(e.target.value);
});

websitesSlider.addEventListener("input", (e) => {
  websitesCountLabel.textContent = e.target.value;
});

toggleDebug.addEventListener("change", (e) => {
  if (currentResults && currentResults.debug) {
    if (e.target.checked) {
      debugCard.classList.remove("hidden");
      debugJson.textContent = JSON.stringify(currentResults.debug, null, 2);
    } else {
      debugCard.classList.add("hidden");
    }
  }
});

form.addEventListener("submit", executeSearch);

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await checkHealth();
  await loadConfig();
});
