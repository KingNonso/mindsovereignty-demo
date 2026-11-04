// An intentionally small, synthetic policy model for discussing data governance.
// It is not a clinical system or a security boundary for real records.

export const PEOPLE = Object.freeze([
  { id: "person-a", label: "Participant A" },
  { id: "person-b", label: "Participant B" },
]);

export const PURPOSES = Object.freeze([
  {
    id: "community-research",
    label: "Community health research",
    description: "Aggregate findings for a community-reviewed research question.",
    communityDefault: true,
    fixedBan: false,
  },
  {
    id: "public-interest-training",
    label: "Public-interest model training",
    description: "A proposed AI training use that needs separate community approval.",
    communityDefault: false,
    fixedBan: false,
  },
  {
    id: "commercial-profiling",
    label: "Commercial profiling or resale",
    description: "Blocked by this illustrative community charter.",
    communityDefault: false,
    fixedBan: true,
  },
]);

export const REQUESTERS = Object.freeze([
  { id: "research-cooperative", label: "Example research cooperative" },
  { id: "app-vendor", label: "Example app vendor" },
]);

const personIds = new Set(PEOPLE.map((person) => person.id));
const purposeIds = new Set(PURPOSES.map((purpose) => purpose.id));
const requesterIds = new Set(REQUESTERS.map((requester) => requester.id));

function assertMember(value, allowed, field) {
  if (!allowed.has(value)) {
    throw new Error(`Unknown ${field}: ${value}`);
  }
}

function nextEvent(state, details, at) {
  return {
    id: state.audit.length + 1,
    at,
    ...details,
  };
}

export function createInitialState() {
  return {
    version: 1,
    consent: Object.fromEntries(
      PEOPLE.map((person) => [
        person.id,
        Object.fromEntries(PURPOSES.map((purpose) => [purpose.id, false])),
      ]),
    ),
    communityApproval: Object.fromEntries(
      PURPOSES.map((purpose) => [purpose.id, purpose.communityDefault]),
    ),
    audit: [],
  };
}

export function isValidState(state) {
  return (
    state?.version === 1 &&
    Array.isArray(state.audit) &&
    PEOPLE.every((person) =>
      PURPOSES.every(
        (purpose) => typeof state.consent?.[person.id]?.[purpose.id] === "boolean",
      ),
    ) &&
    PURPOSES.every(
      (purpose) => typeof state.communityApproval?.[purpose.id] === "boolean",
    )
  );
}

export function setConsent(state, personId, purposeId, granted, at) {
  assertMember(personId, personIds, "participant");
  assertMember(purposeId, purposeIds, "purpose");
  if (typeof granted !== "boolean") throw new Error("Consent must be a boolean");
  if (!at) throw new Error("An event time is required");

  const event = nextEvent(
    state,
    {
      actor: personId,
      action: granted ? "consent-granted" : "consent-withdrawn",
      personId,
      purposeId,
      outcome: granted ? "granted" : "withdrawn",
      reasons: [],
    },
    at,
  );

  return {
    ...state,
    consent: {
      ...state.consent,
      [personId]: { ...state.consent[personId], [purposeId]: granted },
    },
    audit: [...state.audit, event],
  };
}

export function setCommunityApproval(state, purposeId, approved, at) {
  assertMember(purposeId, purposeIds, "purpose");
  if (typeof approved !== "boolean") throw new Error("Approval must be a boolean");
  if (!at) throw new Error("An event time is required");
  if (PURPOSES.find((purpose) => purpose.id === purposeId).fixedBan) {
    throw new Error("The illustrative charter blocks this purpose");
  }

  const event = nextEvent(
    state,
    {
      actor: "community-steward-demo",
      action: approved ? "community-approved" : "community-suspended",
      personId: null,
      purposeId,
      outcome: approved ? "approved" : "suspended",
      reasons: [],
    },
    at,
  );

  return {
    ...state,
    communityApproval: { ...state.communityApproval, [purposeId]: approved },
    audit: [...state.audit, event],
  };
}

export function assessRequest(
  state,
  { personId, purposeId, requesterId, benefitAgreement },
  at,
) {
  assertMember(personId, personIds, "participant");
  assertMember(purposeId, purposeIds, "purpose");
  assertMember(requesterId, requesterIds, "requester");
  if (typeof benefitAgreement !== "boolean") {
    throw new Error("Benefit agreement acknowledgement must be a boolean");
  }
  if (!at) throw new Error("An event time is required");

  const purpose = PURPOSES.find((item) => item.id === purposeId);
  const reasons = [];
  if (purpose.fixedBan) reasons.push("community-charter-ban");
  if (!state.consent[personId][purposeId]) reasons.push("no-individual-consent");
  if (!state.communityApproval[purposeId]) reasons.push("no-community-approval");
  if (!benefitAgreement) reasons.push("no-benefit-agreement");

  const event = nextEvent(
    state,
    {
      actor: requesterId,
      action: "access-request",
      personId,
      purposeId,
      outcome: reasons.length ? "denied" : "allowed",
      reasons,
      benefitAgreement,
    },
    at,
  );
  return { state: { ...state, audit: [...state.audit, event] }, decision: event };
}

