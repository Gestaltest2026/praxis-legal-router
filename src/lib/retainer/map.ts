import type { CanonicalFact, MappingResult, TemplateSlot } from "./schema";
import { canonicalKeyForSlot, normalizeKey } from "./extract";

function factsForKey(facts: CanonicalFact[], key: string): CanonicalFact[] {
  return facts.filter((fact) => fact.key === key && fact.value.trim());
}

function uniqueValues(facts: CanonicalFact[]): string[] {
  return [...new Set(facts.map((fact) => fact.value.trim()).filter(Boolean))];
}

export function mapSlotsToFacts(slots: TemplateSlot[], facts: CanonicalFact[]): MappingResult[] {
  return slots.map((slot) => {
    if (slot.type === "attorney-review") {
      return {
        slot,
        status: "attorney-review",
        message: "This slot requires attorney review or express attorney instruction.",
      };
    }

    if (slot.raw === "TBD / blank fields") {
      return {
        slot,
        status: "ambiguous",
        message: "The template contains unstructured blanks or TBD language that cannot be safely mapped automatically.",
      };
    }

    const canonical = canonicalKeyForSlot(slot);
    if (!canonical) {
      return {
        slot,
        status: "ambiguous",
        message: `Praxis cannot determine what the template slot ${slot.raw} should receive.`,
      };
    }

    const candidates = factsForKey(facts, canonical);
    const values = uniqueValues(candidates);

    if (values.length === 0) {
      return {
        slot,
        status: "missing",
        message: `No intake value found for ${slot.key}.`,
      };
    }

    if (values.length > 1) {
      return {
        slot,
        status: "conflict",
        message: `Multiple conflicting values found for ${slot.key}: ${values.join(" | ")}.`,
      };
    }

    const selected = candidates.find((fact) => normalizeKey(fact.value) === normalizeKey(values[0])) || candidates[0];
    return {
      slot,
      value: selected.value,
      source: selected.source,
      status: "filled",
    };
  });
}

export function summarizeMappings(mappings: MappingResult[]) {
  return {
    fieldsFilled: mappings
      .filter((mapping) => mapping.status === "filled")
      .map((mapping) => `${mapping.slot.raw} → ${mapping.value} (${mapping.source})`),
    missingInformation: mappings
      .filter((mapping) => mapping.status === "missing")
      .map((mapping) => mapping.message || `${mapping.slot.key} is missing.`),
    mappingConflicts: mappings
      .filter((mapping) => mapping.status === "conflict")
      .map((mapping) => mapping.message || `${mapping.slot.key} has conflicting values.`),
    templateAmbiguities: mappings
      .filter((mapping) => mapping.status === "ambiguous")
      .map((mapping) => mapping.message || `${mapping.slot.key} is ambiguous.`),
    attorneyReviewFlags: mappings
      .filter((mapping) => mapping.status === "attorney-review")
      .map((mapping) => mapping.message || `${mapping.slot.key} requires attorney review.`),
  };
}
