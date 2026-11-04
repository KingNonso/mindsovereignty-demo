import {
  PEOPLE,
  PURPOSES,
  REQUESTERS,
  assessRequest,
  createInitialState,
  isValidState,
  setCommunityApproval,
  setConsent,
} from "./policy.mjs";

const storageKey = "mindsovereignty-synthetic-demo-v1";
const byId = (id) => document.getElementById(id);
const peopleById = Object.fromEntries(PEOPLE.map((item) => [item.id, item.label]));
const purposesById = Object.fromEntries(PURPOSES.map((item) => [item.id, item.label]));
const requestersById = Object.fromEntries(REQUESTERS.map((item) => [item.id, item.label]));

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return isValidState(stored) ? stored : createInitialState();
  } catch {
    return createInitialState();
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // The demo still works for this page load when browser storage is disabled.
  }
}

function fillSelect(id, items) {
  const select = byId(id);
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    select.append(option);
  }
}

function renderStatuses() {
  const personId = byId("consent-person").value;
  const consentPurposeId = byId("consent-purpose").value;
  const purposeId = byId("community-purpose").value;

  const consentStatus = byId("consent-status");
  const granted = state.consent[personId][consentPurposeId];
  consentStatus.textContent = granted ? "Granted" : "Not granted";
  consentStatus.className = granted ? "status allowed" : "status denied";

  const communityStatus = byId("community-status");
  const approved = state.communityApproval[purposeId];
  communityStatus.textContent = approved ? "Approved" : "Not approved";
  communityStatus.className = approved ? "status allowed" : "status denied";
}

function readableReason(reason) {
  return {
    "community-charter-ban": "blocked by the example community charter",
    "no-individual-consent": "no individual permission",
    "no-community-approval": "no community approval",
    "no-benefit-agreement": "no recorded benefit agreement",
  }[reason] || reason;
}

function actionLabel(action) {
  return {
    "consent-granted": "Permission granted",
    "consent-withdrawn": "Permission withdrawn",
    "community-approved": "Community approved",
    "community-suspended": "Community suspended",
    "access-request": "Access request",
  }[action] || action;
}

function displayTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function appendCell(row, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  row.append(cell);
}

function renderAudit() {
  const body = byId("audit-body");
  body.replaceChildren();
  if (state.audit.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-log";
    cell.textContent = "No decisions recorded. Try the three steps above.";
    row.append(cell);
    body.append(row);
    return;
  }

  for (const event of [...state.audit].reverse()) {
    const row = document.createElement("tr");
    appendCell(row, String(event.id));
    appendCell(row, displayTime(event.at));
    appendCell(row, actionLabel(event.action));
    const subject = event.personId ? `${peopleById[event.personId]} · ` : "";
    appendCell(row, `${subject}${purposesById[event.purposeId]}`);
    const outcome = event.outcome === "denied"
      ? `Denied: ${event.reasons.map(readableReason).join("; ")}`
      : event.outcome.charAt(0).toUpperCase() + event.outcome.slice(1);
    appendCell(row, outcome, event.outcome === "denied" ? "denied-cell" : "allowed-cell");
    body.append(row);
  }
}

function render() {
  renderStatuses();
  renderAudit();
}

function update(nextState) {
  state = nextState;
  saveState();
  render();
}

function showDecision(message, allowed) {
  const box = byId("decision");
  box.textContent = message;
  box.className = `decision ${allowed ? "decision-allowed" : "decision-denied"}`;
}

fillSelect("consent-person", PEOPLE);
fillSelect("consent-purpose", PURPOSES);
fillSelect("community-purpose", PURPOSES.filter((purpose) => !purpose.fixedBan));
fillSelect("requester", REQUESTERS);
fillSelect("request-person", PEOPLE);
fillSelect("request-purpose", PURPOSES);

byId("consent-person").addEventListener("change", renderStatuses);
byId("consent-purpose").addEventListener("change", renderStatuses);
byId("community-purpose").addEventListener("change", renderStatuses);

byId("grant-consent").addEventListener("click", () => {
  update(setConsent(
    state,
    byId("consent-person").value,
    byId("consent-purpose").value,
    true,
    new Date().toISOString(),
  ));
});

byId("withdraw-consent").addEventListener("click", () => {
  update(setConsent(
    state,
    byId("consent-person").value,
    byId("consent-purpose").value,
    false,
    new Date().toISOString(),
  ));
});

byId("approve-community").addEventListener("click", () => {
  update(setCommunityApproval(
    state,
    byId("community-purpose").value,
    true,
    new Date().toISOString(),
  ));
});

byId("suspend-community").addEventListener("click", () => {
  update(setCommunityApproval(
    state,
    byId("community-purpose").value,
    false,
    new Date().toISOString(),
  ));
});

byId("request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const result = assessRequest(
    state,
    {
      personId: byId("request-person").value,
      purposeId: byId("request-purpose").value,
      requesterId: byId("requester").value,
      benefitAgreement: byId("benefit-agreement").checked,
    },
    new Date().toISOString(),
  );
  update(result.state);
  const requester = requestersById[result.decision.actor];
  showDecision(
    result.decision.outcome === "allowed"
      ? `Allowed in this simulation: ${requester}'s stated request meets the three recorded conditions. No real data was accessed.`
      : `Denied: ${result.decision.reasons.map(readableReason).join("; ")}.`,
    result.decision.outcome === "allowed",
  );
});

byId("export-log").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({
    notice: "Synthetic demonstration only. No health data or real access rights.",
    exportedAt: new Date().toISOString(),
    audit: state.audit,
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mindsovereignty-synthetic-audit.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

byId("reset-demo").addEventListener("click", () => {
  state = createInitialState();
  saveState();
  byId("benefit-agreement").checked = false;
  byId("decision").textContent = "Demo reset. No request checked yet.";
  byId("decision").className = "decision";
  render();
});

render();

