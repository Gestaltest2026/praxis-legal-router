import test from "node:test";
import assert from "node:assert/strict";
import {
  selectApprovedTemplate,
  validateTemplateData,
  type ApprovedTemplateDefinition,
} from "../templateRegistry";

const approvedTemplate: ApprovedTemplateDefinition = {
  id: "retainer-standard",
  moduleId: "retainer",
  version: "1.0.0",
  fileName: "retainer.docx",
  attorneyApproved: true,
  approvedAt: "2026-08-05T00:00:00.000Z",
  approvedBy: "attorney@example.com",
  sha256: "abc123",
  fields: [
    { key: "clientName", label: "Client Name", type: "text", required: true },
    { key: "retainerAmount", label: "Retainer Amount", type: "money", required: true },
  ],
};

test("selects only a pinned approved template", () => {
  const result = selectApprovedTemplate([approvedTemplate], "retainer", "1.0.0");
  assert.equal(result.ok, true);
});

test("rejects unapproved templates", () => {
  const result = selectApprovedTemplate(
    [{ ...approvedTemplate, attorneyApproved: false }],
    "retainer",
    "1.0.0"
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "TEMPLATE_NOT_APPROVED");
});

test("rejects non-allowlisted and missing fields", () => {
  const errors = validateTemplateData(approvedTemplate, {
    clientName: "Client",
    unexpectedClause: "Do not insert",
  });
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.includes("unexpectedClause")));
  assert.ok(errors.some((error) => error.includes("retainerAmount")));
});
