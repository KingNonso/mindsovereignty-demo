import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRequest,
  createInitialState,
  setCommunityApproval,
  setConsent,
} from "./policy.mjs";

const at = "2026-11-04T10:00:00.000Z";
const request = {
  personId: "person-a",
  purposeId: "community-research",
  requesterId: "research-cooperative",
  benefitAgreement: true,
};

test("an unconsented request is denied and recorded", () => {
  const { state, decision } = assessRequest(createInitialState(), request, at);
  assert.equal(decision.outcome, "denied");
  assert.deepEqual(decision.reasons, ["no-individual-consent"]);
  assert.equal(state.audit.length, 1);
});

test("individual consent and community approval both enable an agreed use", () => {
  const consented = setConsent(createInitialState(), "person-a", "community-research", true, at);
  const { decision } = assessRequest(consented, request, at);
  assert.equal(decision.outcome, "allowed");
});

test("a community suspension denies a previously consented use", () => {
  const consented = setConsent(createInitialState(), "person-a", "community-research", true, at);
  const suspended = setCommunityApproval(consented, "community-research", false, at);
  const { decision } = assessRequest(suspended, request, at);
  assert.equal(decision.outcome, "denied");
  assert.ok(decision.reasons.includes("no-community-approval"));
});

test("a withdrawal blocks future requests while retaining the earlier decision", () => {
  const consented = setConsent(createInitialState(), "person-a", "community-research", true, at);
  const first = assessRequest(consented, request, at);
  const withdrawn = setConsent(first.state, "person-a", "community-research", false, at);
  const second = assessRequest(withdrawn, request, at);
  assert.equal(first.decision.outcome, "allowed");
  assert.equal(second.decision.outcome, "denied");
  assert.deepEqual(second.state.audit.map((event) => event.id), [1, 2, 3, 4]);
  assert.equal(second.state.audit[1].outcome, "allowed");
});

test("a benefit agreement is required even when both permissions exist", () => {
  const consented = setConsent(createInitialState(), "person-a", "community-research", true, at);
  const { decision } = assessRequest(consented, { ...request, benefitAgreement: false }, at);
  assert.equal(decision.outcome, "denied");
  assert.deepEqual(decision.reasons, ["no-benefit-agreement"]);
});

test("the example charter ban cannot be changed by the steward control", () => {
  assert.throws(
    () => setCommunityApproval(createInitialState(), "commercial-profiling", true, at),
    /charter blocks/,
  );
});

