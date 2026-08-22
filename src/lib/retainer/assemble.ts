import type { MappingResult } from "./schema";

export function assembleRetainerDraft(templateText: string, mappings: MappingResult[]): string {
  let draft = templateText;

  for (const mapping of mappings) {
    if (mapping.status !== "filled" || !mapping.value) continue;
    draft = draft.split(mapping.slot.raw).join(mapping.value);
  }

  return draft;
}

export function buildCustomizationNotes(mappings: MappingResult[], attorneyInstructions?: string): string[] {
  const notes = mappings
    .filter((mapping) => mapping.status === "filled")
    .map((mapping) => `Filled ${mapping.slot.key} from ${mapping.source}.`);

  if (attorneyInstructions?.trim()) {
    notes.push("Attorney/source instructions were provided and preserved for review. Praxis did not treat them as permission to redesign core legal provisions.");
  }

  if (!notes.length) notes.push("No fields were filled because no safe template-to-intake mappings were available.");
  return notes;
}

export function buildClientFacingQuestions(missing: string[], ambiguities: string[], conflicts: string[]): string[] {
  const questions: string[] = [];

  missing.forEach((item) => questions.push(`Please provide the missing information: ${item}`));
  ambiguities.forEach((item) => questions.push(`Please clarify this template field before drafting: ${item}`));
  conflicts.forEach((item) => questions.push(`Please confirm the correct value: ${item}`));

  return questions;
}
