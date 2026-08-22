"use client";

import Link from "next/link";
import { useState } from "react";
import type { RetainerBuilderOutput } from "@/lib/retainer/schema";

const sampleTemplate = `RETAINER AGREEMENT

This Retainer Agreement is entered into by and between {{firmName}} and {{clientName}} regarding {{matterDescription}}.

Scope of Representation: {{scopeOfRepresentation}}

Initial Retainer / Deposit: {{retainerAmount}}
Attorney Hourly Rate: {{attorneyHourlyRate}}
Paralegal Hourly Rate: {{paralegalHourlyRate}}
Costs and Third-Party Expenses: {{costs}}

Excluded Services: {{exclusions}}

Client Address: {{clientAddress}}
Client Email: {{clientEmail}}
Date: {{date}}

This draft is subject to attorney review before use.`;

const sampleIntake = `Firm Name: Law Office of Morrie I. Levine, P.A.
Client Legal Name: Jane Doe
Client Address: 123 Main Street, Miami, FL 33101
Client Email: jane@example.com
Matter Description: Probate administration for the Estate of John Doe
Scope of Representation: Limited representation for probate administration and related court filings
Retainer Amount: $3,000
Attorney Hourly Rate: $425/hour
Paralegal Hourly Rate: $175/hour
Costs: Client is responsible for filing fees, publication costs, service costs, and other third-party expenses
Exclusions: Litigation, tax advice, appeals, and matters outside the probate administration unless separately agreed in writing
Date: August 22, 2026`;

type ApiResponse = RetainerBuilderOutput | { error?: string };

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e5e7eb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const shell: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "36px 22px 72px",
};

const card: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  border: "1px solid #273241",
  borderRadius: 10,
  background: "#111827",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "#f3f4f6",
  fontSize: 13,
  fontWeight: 700,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 11px",
  border: "1px solid #374151",
  borderRadius: 6,
  background: "#0b1220",
  color: "#f9fafb",
  fontSize: 14,
  boxSizing: "border-box",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 220,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  lineHeight: 1.45,
  resize: "vertical",
};

function section(title: string, items: string[]) {
  return (
    <section style={card}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{title}</h2>
      {items.length ? (
        <ul style={{ margin: "0 0 0 20px", lineHeight: 1.6 }}>
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : <p style={{ margin: 0, color: "#9ca3af" }}>None.</p>}
    </section>
  );
}

export default function RetainerBuilderPage() {
  const [templateText, setTemplateText] = useState("");
  const [intakeText, setIntakeText] = useState("");
  const [attorneyInstructions, setAttorneyInstructions] = useState("");
  const [forbiddenTerms, setForbiddenTerms] = useState("");
  const [output, setOutput] = useState<RetainerBuilderOutput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setOutput(null);
    setCopied(false);

    try {
      const res = await fetch("/api/retainer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateText,
          intakeText,
          attorneyInstructions,
          forbiddenTerms: forbiddenTerms.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        }),
      });

      const data = (await res.json()) as ApiResponse;
      if (!res.ok && "error" in data && data.error) throw new Error(data.error);
      setOutput(data as RetainerBuilderOutput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!output?.completedDraft) return;
    try {
      await navigator.clipboard.writeText(output.completedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed. Select the draft manually.");
    }
  }

  const statusColor = output?.status === "READY_FOR_ATTORNEY_REVIEW"
    ? "#166534"
    : output?.status === "ATTORNEY_DECISION_REQUIRED"
      ? "#a16207"
      : "#991b1b";

  return (
    <main style={page}>
      <div style={shell}>
        <Link href="/" style={{ color: "#93c5fd", fontSize: 13 }}>← Praxis Legal Router</Link>
        <div style={{ marginTop: 18, color: "#93c5fd", fontSize: 12, fontWeight: 800 }}>
          RETAINER BUILDER · V0.1
        </div>
        <h1 style={{ margin: "6px 0", fontSize: 30 }}>Template-Controlled Retainer Agreement Builder</h1>
        <p style={{ margin: 0, maxWidth: 850, color: "#9ca3af", lineHeight: 1.5 }}>
          Paste a Retainer Agreement template and a filled intake form. Praxis extracts slots, maps facts, assembles a draft, and reports missing information, conflicts, ambiguities, and attorney-review flags. Output is not final legal advice or external-delivery material.
        </p>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Inputs</h2>
          <div style={grid}>
            <div>
              <label style={label}>Retainer Agreement Template *</label>
              <textarea style={textarea} value={templateText} onChange={(e) => setTemplateText(e.target.value)} placeholder="Paste template with placeholders such as {{clientName}} or [CLIENT NAME]." />
            </div>
            <div>
              <label style={label}>Filled Out Intake Form *</label>
              <textarea style={textarea} value={intakeText} onChange={(e) => setIntakeText(e.target.value)} placeholder="Use key-value lines such as Client Legal Name: Jane Doe." />
            </div>
          </div>
          <div style={{ ...grid, marginTop: 16 }}>
            <div>
              <label style={label}>Attorney Instructions / Source Record</label>
              <textarea style={{ ...textarea, minHeight: 120 }} value={attorneyInstructions} onChange={(e) => setAttorneyInstructions(e.target.value)} placeholder="Paste attorney instruction or source notes. Praxis will flag these for review, not silently rewrite legal provisions." />
            </div>
            <div>
              <label style={label}>Forbidden / Prior-Matter Terms, one per line</label>
              <textarea style={{ ...textarea, minHeight: 120 }} value={forbiddenTerms} onChange={(e) => setForbiddenTerms(e.target.value)} placeholder="Names, old case numbers, old clients, outdated amounts." />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setTemplateText(sampleTemplate); setIntakeText(sampleIntake); }} style={{ padding: "10px 14px", borderRadius: 7, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb", cursor: "pointer" }}>
              Load Sample
            </button>
            <button type="button" onClick={generate} disabled={loading} style={{ padding: "10px 16px", borderRadius: 7, border: 0, background: "#93c5fd", color: "#0b1220", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Generating..." : "Generate Attorney-Review Package"}
            </button>
          </div>
        </section>

        {error && (
          <section style={{ ...card, borderColor: "#991b1b", color: "#fecaca" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Error</h2>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{error}</pre>
          </section>
        )}

        {output && (
          <>
            <section style={{ ...card, borderColor: statusColor }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Status: {output.status}</h2>
              {output.failureType && <p style={{ margin: 0, color: "#fde68a" }}>Failure Type: {output.failureType}</p>}
            </section>

            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>Completed Draft</h2>
                <button type="button" onClick={copyDraft} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb", cursor: "pointer" }}>{copied ? "Copied" : "Copy Draft"}</button>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13, background: "#05070a", padding: 16, borderRadius: 8, overflowX: "auto" }}>{output.completedDraft || "(no draft generated)"}</pre>
            </section>

            {section("Fields Filled", output.fieldsFilled)}
            {section("Missing Information", output.missingInformation)}
            {section("Mapping Conflicts", output.mappingConflicts)}
            {section("Template Ambiguities", output.templateAmbiguities)}
            {section("Customization Notes", output.customizationNotes)}
            {section("Attorney Review Flags", output.attorneyReviewFlags)}
            {section("Client-Facing Questions", output.clientFacingQuestions)}
            {section("Verification Findings", output.verificationFindings)}
          </>
        )}
      </div>
    </main>
  );
}
