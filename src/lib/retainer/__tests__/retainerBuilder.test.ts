import assert from "node:assert/strict";
import test from "node:test";
import { assembleRetainerDraft } from "../assemble";
import { extractCanonicalFacts, extractTemplateSlots } from "../extract";
import { mapSlotsToFacts, summarizeMappings } from "../map";
import { determineRetainerStatus, verifyRetainerDraft } from "../verify";

const template = `Client: {{clientName}}
Matter: {{matterDescription}}
Retainer: {{retainerAmount}}`;

const intake = `Client Legal Name: Jane Doe
Matter Description: Probate administration
Retainer Amount: $3,000`;

test("retainer builder maps intake facts into template slots", () => {
  const slots = extractTemplateSlots(template);
  const facts = extractCanonicalFacts(intake);
  const mappings = mapSlotsToFacts(slots, facts);
  const summary = summarizeMappings(mappings);
  const draft = assembleRetainerDraft(template, mappings);
  const findings = verifyRetainerDraft({ draft, mappings });
  const status = determineRetainerStatus({
    missingInformation: summary.missingInformation,
    mappingConflicts: summary.mappingConflicts,
    templateAmbiguities: summary.templateAmbiguities,
    attorneyReviewFlags: summary.attorneyReviewFlags,
    verificationFindings: findings,
  });

  assert.equal(slots.length, 3);
  assert.equal(summary.fieldsFilled.length, 3);
  assert.match(draft, /Jane Doe/);
  assert.match(draft, /Probate administration/);
  assert.match(draft, /\$3,000/);
  assert.equal(findings.length, 0);
  assert.equal(status, "READY_FOR_ATTORNEY_REVIEW");
});

test("retainer builder does not silently fill missing fields", () => {
  const slots = extractTemplateSlots(`${template}\nClient Address: {{clientAddress}}`);
  const facts = extractCanonicalFacts(intake);
  const mappings = mapSlotsToFacts(slots, facts);
  const summary = summarizeMappings(mappings);

  assert.ok(summary.missingInformation.some((item) => item.includes("clientAddress") || item.includes("client address")));
});
