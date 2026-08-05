import test from "node:test";
import assert from "node:assert/strict";
import { verifyGeneratedDocument } from "../postGenerationVerification";

test("passes a clean generated document", () => {
  const result = verifyGeneratedDocument({
    renderedText: "Client: Jane Doe. Retainer: $7,500. Attorney review required.",
    expectedValues: { clientName: "Jane Doe", retainerAmount: "$7,500" },
    requiredPhrases: ["Attorney review required"],
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.quarantineRequired, false);
});

test("quarantines unresolved placeholders and prior matter terms", () => {
  const result = verifyGeneratedDocument({
    renderedText: "Client: {{CLIENT_NAME}}. Prior matter: HALL.",
    expectedValues: { clientName: "Jane Doe" },
    forbiddenTerms: ["HALL"],
  });
  assert.equal(result.status, "RED");
  assert.equal(result.quarantineRequired, true);
  assert.ok(result.findings.length >= 3);
});
