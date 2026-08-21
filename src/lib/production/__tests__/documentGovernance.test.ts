import assert from "node:assert/strict";
import test from "node:test";

import { canRemoveEmailDuplicate, inferSensitivity } from "../../documents/policy.ts";
import { decideDocumentTransition } from "../../documents/stateMachine.ts";
import type { DocumentRecord } from "../../documents/types.ts";

const baseRecord: DocumentRecord = {
  id: "doc-1",
  matterId: "matter-1",
  displayName: "Bank statement",
  kind: "BANK_STATEMENT",
  source: "CLIENT_EMAIL",
  receivedAt: "2026-08-21T12:00:00.000Z",
  sensitivity: "HIGHLY_SENSITIVE",
  state: "CLASSIFIED",
  secureCopyConfirmed: false,
  retentionStatus: "NOT_REVIEWED",
  legalUse: "Possible estate asset verification",
};

test("bank statements and SSN signals are highly sensitive", () => {
  assert.equal(inferSensitivity("BANK_STATEMENT"), "HIGHLY_SENSITIVE");
  assert.equal(inferSensitivity("COURT_RECORD", ["contains SSN"]), "HIGHLY_SENSITIVE");
});

test("sensitive documents cannot be verified before secure storage is confirmed", () => {
  const decision = decideDocumentTransition(baseRecord, "VERIFIED");
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "SECURE_COPY_REQUIRED");
});

test("sensitive documents can advance after secure copy confirmation", () => {
  const decision = decideDocumentTransition(
    { ...baseRecord, secureCopyConfirmed: true },
    "VERIFIED"
  );
  assert.equal(decision.allowed, true);
});

test("email duplicate removal requires both secure copy and retention review", () => {
  assert.equal(canRemoveEmailDuplicate(baseRecord).allowed, false);
  assert.equal(
    canRemoveEmailDuplicate({
      ...baseRecord,
      state: "VERIFIED",
      secureCopyConfirmed: true,
      retentionStatus: "REVIEWED_FOR_DUPLICATE_REMOVAL",
    }).allowed,
    true
  );
});

test("ready for use requires a verified matter link and stated legal use", () => {
  const linked: DocumentRecord = {
    ...baseRecord,
    state: "LINKED_TO_MATTER",
    secureCopyConfirmed: true,
    legalUse: "Asset ownership verification",
  };
  assert.equal(decideDocumentTransition(linked, "READY_FOR_USE").allowed, true);
  assert.equal(
    decideDocumentTransition({ ...linked, legalUse: "" }, "READY_FOR_USE").allowed,
    false
  );
});
