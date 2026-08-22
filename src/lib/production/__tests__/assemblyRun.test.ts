import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { executeRetainerAssemblyRun } from "../assemblyRun.ts";
import type { ApprovedTemplateDefinition } from "../templateRegistry.ts";

const bytes = new TextEncoder().encode("approved-template");
const hash = createHash("sha256").update(bytes).digest("hex");

const template: ApprovedTemplateDefinition = {
  id: "retainer-standard",
  moduleId: "retainer",
  version: "1.0.0",
  fileName: "retainer.docx",
  attorneyApproved: true,
  approvedAt: "2026-08-06T00:00:00.000Z",
  approvedBy: "attorney@example.com",
  sha256: hash,
  fields: [
    { key: "clientName", label: "Client Name", type: "text", required: true },
    { key: "clientAddress", label: "Client Address", type: "text", required: true },
    { key: "matterName", label: "Matter Name", type: "text", required: true },
    { key: "matterNumber", label: "Matter Number", type: "text", required: true },
    { key: "courtName", label: "Court Name", type: "text", required: false },
    { key: "retainerAmount", label: "Retainer Amount", type: "money", required: true },
    { key: "attorneyHourlyRate", label: "Attorney Rate", type: "money", required: true },
    { key: "staffHourlyRate", label: "Staff Rate", type: "money", required: true },
    { key: "agreementDate", label: "Agreement Date", type: "date", required: true },
  ],
};

const request = {
  matterId: "matter-1",
  templateVersion: "1.0.0",
  expectedMatterRevision: 3,
  currentMatterRevision: 3,
  data: {
    clientName: "Jane Doe",
    clientAddress: "1 Main Street",
    matterName: "Doe Matter",
    matterNumber: "2026-001",
    courtName: "Broward County Court",
    retainerAmount: "$7,500",
    attorneyHourlyRate: "$425",
    staffHourlyRate: "$175",
    agreementDate: "August 6, 2026",
  },
};

const timestamps = {
  runId: "run-1",
  startedAt: "2026-08-06T00:00:00.000Z",
  completedAt: "2026-08-06T00:00:01.000Z",
};

test("records stale matter input as blocked", () => {
  const result = executeRetainerAssemblyRun({
    ...timestamps,
    request: { ...request, currentMatterRevision: 4 },
    templates: [template],
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.errorCode, "STALE_WRITE");
});

test("records an absent approved binary as blocked, not successful", () => {
  const result = executeRetainerAssemblyRun({
    ...timestamps,
    request,
    templates: [template],
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.errorCode, "TEMPLATE_BINARY_MISSING");
  assert.equal(result.outputSha256, undefined);
});

test("records template identity mismatch as quarantined", () => {
  const result = executeRetainerAssemblyRun({
    ...timestamps,
    request,
    templates: [template],
    templateBinary: {
      templateId: "wrong-template",
      version: "1.0.0",
      sha256: hash,
      bytes,
      extractedText: "{{clientName}} {{clientAddress}} {{matterName}} {{matterNumber}} {{courtName}} {{retainerAmount}} {{attorneyHourlyRate}} {{staffHourlyRate}} {{agreementDate}}",
    },
  });
  assert.equal(result.status, "QUARANTINED");
  assert.equal(result.quarantineRequired, true);
  assert.equal(result.errorCode, "TEMPLATE_ID_MISMATCH");
});
