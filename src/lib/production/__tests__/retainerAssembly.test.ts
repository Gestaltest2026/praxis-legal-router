import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRetainerAssemblyPlan,
  type RetainerAssemblyRequest,
} from "../retainerAssembly.ts";
import type { ApprovedTemplateDefinition } from "../templateRegistry.ts";

const template: ApprovedTemplateDefinition = {
  id: "retainer-standard",
  moduleId: "retainer",
  version: "1.0.0",
  fileName: "retainer-standard-v1.docx",
  attorneyApproved: true,
  approvedAt: "2026-08-06T00:00:00.000Z",
  approvedBy: "attorney@example.com",
  sha256: "template-sha256",
  fields: [
    { key: "clientName", label: "Client Name", type: "text", required: true },
    { key: "clientAddress", label: "Client Address", type: "multiline", required: true },
    { key: "matterName", label: "Matter Name", type: "text", required: true },
    { key: "matterNumber", label: "Matter Number", type: "text", required: true },
    { key: "courtName", label: "Court Name", type: "text", required: false },
    { key: "retainerAmount", label: "Retainer Amount", type: "money", required: true },
    { key: "attorneyHourlyRate", label: "Attorney Hourly Rate", type: "money", required: true },
    { key: "staffHourlyRate", label: "Staff Hourly Rate", type: "money", required: true },
    { key: "agreementDate", label: "Agreement Date", type: "date", required: true },
  ],
};

const request: RetainerAssemblyRequest = {
  matterId: "matter-001",
  templateVersion: "1.0.0",
  expectedMatterRevision: 3,
  currentMatterRevision: 3,
  data: {
    clientName: " Jane Doe ",
    clientAddress: "100 Main Street",
    matterName: "Doe Representation",
    matterNumber: "2026-001",
    courtName: "Broward County Court",
    retainerAmount: "$7,500.00",
    attorneyHourlyRate: "$425.00",
    staffHourlyRate: "$175.00",
    agreementDate: "August 6, 2026",
  },
};

test("creates a normalized plan using an approved pinned template", () => {
  const result = buildRetainerAssemblyPlan(request, [template]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.replacements.clientName, "Jane Doe");
    assert.equal(result.template.version, "1.0.0");
  }
});

test("fails closed on stale matter data", () => {
  const result = buildRetainerAssemblyPlan(
    { ...request, currentMatterRevision: 4 },
    [template]
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "STALE_WRITE");
});

test("rejects an unapproved template", () => {
  const result = buildRetainerAssemblyPlan(request, [
    { ...template, attorneyApproved: false },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "TEMPLATE_SELECTION_FAILED");
});

test("rejects missing required values", () => {
  const result = buildRetainerAssemblyPlan(
    { ...request, data: { ...request.data, clientName: "" } },
    [template]
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_ASSEMBLY_DATA");
});
