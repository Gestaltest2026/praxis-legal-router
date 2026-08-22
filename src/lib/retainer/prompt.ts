export const RETAINER_BUILDER_RULES = [
  "Fill only fields supported by provided facts.",
  "Do not invent legal terms.",
  "Do not modify core legal provisions unless attorney instruction explicitly authorizes it.",
  "Preserve attorney review boundary.",
  "Flag contradictions rather than resolving them silently.",
  "Return a draft package, not a final legal document.",
];

export function formatRetainerBuilderRules() {
  return RETAINER_BUILDER_RULES.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
}
