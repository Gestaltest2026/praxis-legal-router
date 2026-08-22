import test from "node:test";
import assert from "node:assert/strict";
import {
  getRetainerTemplateBinary,
  templateRegistryKey,
  type RetainerTemplateRegistry,
} from "../retainerTemplateRegistry.ts";

const binary = {
  templateId: "retainer-standard",
  version: "1.0.0",
  sha256: "abc123",
  bytes: new Uint8Array([1, 2, 3]),
  extractedText: "{{clientName}}",
};

const registry: RetainerTemplateRegistry = {
  definitions: [],
  binaries: new Map([[templateRegistryKey(binary.templateId, binary.version), binary]]),
};

test("uses an exact template ID and version registry key", () => {
  assert.equal(templateRegistryKey("retainer-standard", "1.0.0"), "retainer-standard@1.0.0");
});

test("returns only the exact registered binary", () => {
  assert.equal(
    getRetainerTemplateBinary(registry, "retainer-standard", "1.0.0"),
    binary
  );
  assert.equal(
    getRetainerTemplateBinary(registry, "retainer-standard", "2.0.0"),
    undefined
  );
});
