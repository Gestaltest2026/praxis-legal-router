import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTransition, type TransitionContext } from "../stateMachine";

const baseContext: TransitionContext = {
  actor: "Paralegal",
  validationStatus: "PASS",
  unresolvedIssueCount: 0,
  approvedTemplateVersion: "1.0.0",
  assembledDocumentHash: "doc-hash",
  approvedDocumentHash: "doc-hash",
  expectedRevision: 1,
  currentRevision: 1,
  deliveryAuthorized: false,
};

test("allows the controlled happy path into assembly", () => {
  const result = evaluateTransition("VALIDATED", "READY_FOR_ASSEMBLY", baseContext);
  assert.equal(result.allowed, true);
});

test("fails closed when validation is not PASS", () => {
  const result = evaluateTransition("VALIDATED", "READY_FOR_ASSEMBLY", {
    ...baseContext,
    validationStatus: "YELLOW",
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "VALIDATION_NOT_PASS");
});

test("rejects stale writes", () => {
  const result = evaluateTransition("DRAFT", "INTAKE_COMPLETE", {
    ...baseContext,
    expectedRevision: 1,
    currentRevision: 2,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "STALE_WRITE");
});

test("requires an attorney for approval", () => {
  const result = evaluateTransition("ATTORNEY_REVIEW", "APPROVED", baseContext);
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "ATTORNEY_REQUIRED");
});

test("requires exact approved document hash for delivery", () => {
  const result = evaluateTransition("APPROVED", "DELIVERED", {
    ...baseContext,
    actor: "Attorney",
    deliveryAuthorized: true,
    approvedDocumentHash: "different-hash",
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "APPROVED_HASH_MISMATCH");
});
