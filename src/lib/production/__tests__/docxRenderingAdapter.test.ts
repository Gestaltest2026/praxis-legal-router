import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  renderRetainerDocx,
  replaceAllowlistedPlaceholders,
  type DocxTemplateBinary,
} from "../docxRenderingAdapter.ts";
import type { RetainerAssemblyPlan } from "../retainerAssembly.ts";

const bytes = new TextEncoder().encode("approved-template-binary");
const hash = createHash("sha256").update(bytes).digest("hex");

const plan: RetainerAssemblyPlan = {
  ok: true,
  matterId: "matter-1",
  expectedMatterRevision: 4,
  template: {
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
    ],
  },
  replacements: { clientName: "Jane Doe" },
};

const binary: DocxTemplateBinary = {
  templateId: "retainer-standard",
  version: "1.0.0",
  sha256: hash,
  bytes,
  extractedText: "Client: {{clientName}}",
};

test("replaces only explicit allowlisted placeholders", () => {
  const result = replaceAllowlistedPlaceholders(
    "Client: {{clientName}}",
    { clientName: "Jane & Doe" }
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.text, "Client: Jane &amp; Doe");
});

test("fails closed when template binary is missing", () => {
  const result = renderRetainerDocx(plan);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "TEMPLATE_BINARY_MISSING");
});

test("quarantines a template hash mismatch", () => {
  const result = renderRetainerDocx(plan, { ...binary, sha256: "wrong" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "TEMPLATE_HASH_MISMATCH");
    assert.equal(result.quarantineRequired, true);
  }
});

test("quarantines a missing approved placeholder", () => {
  const result = renderRetainerDocx(plan, {
    ...binary,
    extractedText: "Client:",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "PLACEHOLDER_NOT_FOUND");
    assert.equal(result.quarantineRequired, true);
  }
});

test("does not claim successful binary assembly before transformer registration", () => {
  const result = renderRetainerDocx(plan, binary);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "TEMPLATE_BINARY_MISSING");
});
