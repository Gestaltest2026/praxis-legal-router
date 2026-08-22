import type { CanonicalFact, RetainerSlotType, TemplateSlot } from "./schema";

const SLOT_PATTERNS = [
  /\{\{\s*([^}]+?)\s*\}\}/g,
  /<<\s*([^>]+?)\s*>>/g,
  /\[\s*(?:INSERT\s+)?([A-Z0-9 _\-/]+?)\s*\]/g,
];

const FIELD_ALIASES: Record<string, string[]> = {
  clientName: ["client name", "client legal name", "full legal name", "name of client", "client"],
  clientAddress: ["client address", "address", "mailing address"],
  clientEmail: ["client email", "email", "email address"],
  clientPhone: ["client phone", "phone", "telephone", "phone number"],
  matterDescription: ["matter", "matter description", "case matter", "legal matter", "purpose of representation"],
  caseCaption: ["case caption", "caption", "style of case"],
  caseNumber: ["case number", "case no", "case #"],
  scopeOfRepresentation: ["scope", "scope of representation", "services", "legal services", "representation"],
  exclusions: ["exclusions", "excluded services", "not included", "outside scope"],
  retainerAmount: ["retainer", "retainer amount", "deposit", "advance fee", "initial retainer"],
  attorneyHourlyRate: ["attorney hourly rate", "attorney rate", "lawyer hourly rate", "hourly rate"],
  paralegalHourlyRate: ["paralegal hourly rate", "paralegal rate"],
  costs: ["costs", "filing fees", "third party expenses", "expenses"],
  attorneyName: ["attorney", "attorney name", "lawyer", "counsel"],
  firmName: ["firm", "firm name", "law firm"],
  date: ["date", "agreement date", "effective date"],
};

export function normalizeKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[_\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function classifySlot(normalizedKey: string): RetainerSlotType {
  if (/client|party|address|email|phone|name/.test(normalizedKey)) return "identity";
  if (/matter|case|caption|claim|court|jurisdiction/.test(normalizedKey)) return "matter";
  if (/scope|service|representation|work/.test(normalizedKey)) return "scope";
  if (/retainer|deposit|fee|hourly|rate/.test(normalizedKey)) return "fee";
  if (/cost|expense|filing/.test(normalizedKey)) return "cost";
  if (/exclusion|excluded|outside scope|not included/.test(normalizedKey)) return "exclusion";
  if (/sign|signature|initial/.test(normalizedKey)) return "signature";
  if (/date|effective/.test(normalizedKey)) return "date";
  if (/attorney review|approval|decision/.test(normalizedKey)) return "attorney-review";
  return "unknown";
}

export function extractTemplateSlots(templateText: string): TemplateSlot[] {
  const byRaw = new Map<string, TemplateSlot>();

  for (const pattern of SLOT_PATTERNS) {
    for (const match of templateText.matchAll(pattern)) {
      const raw = match[0];
      const key = match[1]?.trim() || raw;
      const normalizedKey = normalizeKey(key);
      if (!byRaw.has(raw)) {
        byRaw.set(raw, {
          raw,
          key,
          normalizedKey,
          type: classifySlot(normalizedKey),
        });
      }
    }
  }

  if (/\bTBD\b|TO BE PROVIDED|_{4,}/i.test(templateText)) {
    byRaw.set("TBD / blank fields", {
      raw: "TBD / blank fields",
      key: "Unstructured blank or TBD field",
      normalizedKey: "unstructured blank or tbd field",
      type: "unknown",
    });
  }

  return [...byRaw.values()];
}

function splitFieldLine(line: string): [string, string] | null {
  const colon = line.match(/^([^:：|]+)[:：|]\s*(.+)$/);
  if (colon) return [colon[1].trim(), colon[2].trim()];

  const tab = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tab.length >= 2) return [tab[0], tab.slice(1).join(" ")];

  return null;
}

function canonicalKeyFor(label: string): string {
  const normalized = normalizeKey(label);
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) return canonical;
  }
  return normalized.replace(/[^a-z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase());
}

export function extractCanonicalFacts(intakeText: string, source = "Filled intake form"): CanonicalFact[] {
  const facts: CanonicalFact[] = [];
  const seen = new Set<string>();

  intakeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const parsed = splitFieldLine(line);
      if (!parsed) return;
      const [label, value] = parsed;
      if (!value || /^n\/?a$|^none$|^unknown$|^tbd$/i.test(value)) return;
      const key = canonicalKeyFor(label);
      const unique = `${key}:${value}`;
      if (seen.has(unique)) return;
      seen.add(unique);
      facts.push({
        key,
        label,
        value,
        source: `${source}, line ${index + 1}: ${label}`,
        confidence: "high",
      });
    });

  return facts;
}

export function canonicalKeyForSlot(slot: TemplateSlot): string | null {
  const normalized = slot.normalizedKey;
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) return canonical;
  }
  return null;
}
