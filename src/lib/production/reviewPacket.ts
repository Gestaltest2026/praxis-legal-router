import type { ValidationResult } from "./types";

export type ReviewPacketSection = {
  heading: string;
  items: string[];
};

export type AttorneyReviewPacket = {
  title: string;
  matterSummary: string[];
  sources: string[];
  validation: ValidationResult;
  attorneyDecisions: string[];
  paralegalNextActions: string[];
  additionalSections?: ReviewPacketSection[];
};

export function formatAttorneyReviewPacket(
  packet: AttorneyReviewPacket
): string {
  const lines: string[] = [
    `# ${packet.title}`,
    "",
    "## Matter Summary",
    ...toBullets(packet.matterSummary),
    "",
    "## Sources",
    ...toBullets(packet.sources.length ? packet.sources : ["No source identified."]),
    "",
    `## Status: ${packet.validation.status}`,
    ...(packet.validation.issues.length
      ? packet.validation.issues.map(
          (issue) => `- ${issue.severity} — ${issue.message}`
        )
      : ["- PASS — Deterministic checks cleared; ready for attorney review."]),
    "",
    "## Attorney Decisions",
    ...toBullets(
      packet.attorneyDecisions.length
        ? packet.attorneyDecisions
        : ["None identified by deterministic review."]
    ),
    "",
    "## Paralegal Next Actions",
    ...toBullets(
      packet.paralegalNextActions.length
        ? packet.paralegalNextActions
        : ["Submit the packet and controlled draft for attorney review."]
    ),
  ];

  for (const section of packet.additionalSections ?? []) {
    lines.push("", `## ${section.heading}`, ...toBullets(section.items));
  }

  return lines.join("\n");
}

function toBullets(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}
