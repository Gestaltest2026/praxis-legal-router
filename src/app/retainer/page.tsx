"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getProductionModule } from "@/lib/production/modules";
import { formatAttorneyReviewPacket } from "@/lib/production/reviewPacket";
import {
  buildValidationResult,
  combineValidationResults,
  validateRequiredInputs,
} from "@/lib/production/validate";
import type { ValidationIssue } from "@/lib/production/types";

type FormState = {
  clientName: string;
  caseCaption: string;
  caseNumber: string;
  openingSentence: string;
  retainerSource: string;
  retainerDraft: string;
  hourlySource: string;
  hourlyDraft: string;
  sourceRecord: string;
  unresolvedIssues: string;
};

const initialForm: FormState = {
  clientName: "",
  caseCaption: "",
  caseNumber: "",
  openingSentence: "",
  retainerSource: "",
  retainerDraft: "",
  hourlySource: "",
  hourlyDraft: "",
  sourceRecord: "",
  unresolvedIssues: "",
};

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e5e7eb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const shell: React.CSSProperties = {
  maxWidth: 980,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 14,
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
};

function normalizeMoney(value: string) {
  return value.replace(/[$,\s]/g, "").trim();
}

export default function RetainerProductionPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPacket, setShowPacket] = useState(false);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validation = useMemo(() => {
    const productionModule = getProductionModule("retainer");

    if (!productionModule) {
      return buildValidationResult([
        {
          id: "retainer-module-missing",
          severity: "RED",
          message: "Retainer production module is unavailable.",
        },
      ]);
    }

    const requiredResult = validateRequiredInputs(productionModule, form);
    const issues: ValidationIssue[] = [];

    const sourceRetainer = normalizeMoney(form.retainerSource);
    const draftRetainer = normalizeMoney(form.retainerDraft);
    const sourceHourly = normalizeMoney(form.hourlySource);
    const draftHourly = normalizeMoney(form.hourlyDraft);

    if (sourceRetainer && draftRetainer && sourceRetainer !== draftRetainer) {
      issues.push({
        id: "retainer-money-mismatch",
        severity: "RED",
        message: "STOP: Retainer amount does not match the source.",
      });
    }

    if (sourceHourly && draftHourly && sourceHourly !== draftHourly) {
      issues.push({
        id: "hourly-money-mismatch",
        severity: "RED",
        message: "STOP: Hourly rate does not match the source.",
      });
    }

    if (form.unresolvedIssues.trim()) {
      issues.push({
        id: "retainer-unresolved",
        severity: "YELLOW",
        message: "Unresolved issues require attorney review before production.",
      });
    }

    return combineValidationResults(
      requiredResult,
      buildValidationResult(issues)
    );
  }, [form]);

  const blockers = validation.issues.map((issue) => issue.message);
  const ready = validation.status === "PASS";

  const packet = formatAttorneyReviewPacket({
    title: "Praxis Attorney Review Packet — Retainer Agreement",
    matterSummary: [
      "Matter: Attorney's Fee Hearing",
      "Side: Plaintiff",
      "Engagement: Morrie I. Levine, individually",
      "Client type: Attorney",
      `Client legal name: ${form.clientName || "(missing)"}`,
      `Case caption: ${form.caseCaption || "(missing)"}`,
      `Case number: ${form.caseNumber || "(not supplied)"}`,
    ],
    sources: [form.sourceRecord || "Authoritative source record missing."],
    validation,
    attorneyDecisions: form.unresolvedIssues.trim()
      ? [form.unresolvedIssues]
      : [],
    paralegalNextActions:
      validation.status === "RED"
        ? ["Resolve all RED items before document assembly or attorney review."]
        : validation.status === "YELLOW"
          ? ["Present the unresolved issue with the controlled draft for attorney decision."]
          : ["Submit the controlled draft and this packet for attorney review."],
    additionalSections: [
      {
        heading: "Opening Sentence",
        items: [form.openingSentence || "(missing)"],
      },
      {
        heading: "Monetary Verification",
        items: [
          `Retainer — Source: ${form.retainerSource || "(missing)"} | Draft: ${form.retainerDraft || "(missing)"}`,
          `Hourly rate — Source: ${form.hourlySource || "(missing)"} | Draft: ${form.hourlyDraft || "(missing)"}`,
        ],
      },
    ],
  });

  return (
    <main style={page}>
      <div style={shell}>
        <Link href="/" style={{ color: "#93c5fd", fontSize: 13 }}>
          ← Praxis Legal Router
        </Link>
        <div style={{ marginTop: 18, color: "#93c5fd", fontSize: 12, fontWeight: 800 }}>
          RETAINER PRODUCTION · CONTROLLED PILOT
        </div>
        <h1 style={{ margin: "6px 0", fontSize: 28 }}>
          Plaintiff Fee-Hearing Intake
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#9ca3af", lineHeight: 1.5 }}>
          First production route: Attorney&apos;s Fee Hearing → Plaintiff →
          Morrie I. Levine individually. Monetary conflicts stop production.
        </p>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>1. Locked Route</h2>
          <div style={grid}>
            <div><span style={label}>Side</span><input style={input} value="Plaintiff" disabled /></div>
            <div><span style={label}>Contracting Party</span><input style={input} value="Morrie I. Levine, individually" disabled /></div>
            <div><span style={label}>Matter</span><input style={input} value="Attorney's Fee Hearing" disabled /></div>
            <div><span style={label}>Client Type</span><input style={input} value="Attorney" disabled /></div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>2. Matter Identity</h2>
          <div style={grid}>
            <div><label style={label}>Client Legal Name *</label><input style={input} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
            <div><label style={label}>Case Number</label><input style={input} value={form.caseNumber} onChange={(e) => set("caseNumber", e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 14 }}><label style={label}>Exact Case Caption *</label><input style={input} value={form.caseCaption} onChange={(e) => set("caseCaption", e.target.value)} /></div>
          <div style={{ marginTop: 14 }}><label style={label}>Exact First Sentence on Page 1 *</label><textarea style={{ ...input, minHeight: 90 }} value={form.openingSentence} onChange={(e) => set("openingSentence", e.target.value)} /></div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 5px", fontSize: 16 }}>3. Double-Entry Monetary Check</h2>
          <p style={{ margin: "0 0 14px", color: "#9ca3af", fontSize: 12 }}>
            Enter the source value and draft value independently. Praxis does not infer, calculate, or reconcile a mismatch.
          </p>
          <div style={grid}>
            <div><label style={label}>Retainer Amount — Source *</label><input style={input} inputMode="decimal" value={form.retainerSource} onChange={(e) => set("retainerSource", e.target.value)} /></div>
            <div><label style={label}>Retainer Amount — Draft *</label><input style={input} inputMode="decimal" value={form.retainerDraft} onChange={(e) => set("retainerDraft", e.target.value)} /></div>
            <div><label style={label}>Hourly Rate — Source *</label><input style={input} inputMode="decimal" value={form.hourlySource} onChange={(e) => set("hourlySource", e.target.value)} /></div>
            <div><label style={label}>Hourly Rate — Draft *</label><input style={input} inputMode="decimal" value={form.hourlyDraft} onChange={(e) => set("hourlyDraft", e.target.value)} /></div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>4. Authority and Exceptions</h2>
          <label style={label}>Authoritative Source Record *</label>
          <textarea style={{ ...input, minHeight: 100 }} placeholder="Executed agreement, attorney instruction, client email, case detail..." value={form.sourceRecord} onChange={(e) => set("sourceRecord", e.target.value)} />
          <label style={{ ...label, marginTop: 14 }}>Unresolved Issues</label>
          <textarea style={{ ...input, minHeight: 90 }} placeholder="Leave blank only if none." value={form.unresolvedIssues} onChange={(e) => set("unresolvedIssues", e.target.value)} />
        </section>

        <section style={{ ...card, borderColor: ready ? "#166534" : validation.status === "YELLOW" ? "#a16207" : "#991b1b" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Status: {ready ? "READY FOR ATTORNEY REVIEW" : validation.status === "YELLOW" ? "ATTORNEY DECISION REQUIRED" : "DO NOT GENERATE"}
          </h2>
          {blockers.length ? (
            <ul style={{ margin: "0 0 0 20px", color: validation.status === "YELLOW" ? "#fde68a" : "#fecaca", lineHeight: 1.6 }}>
              {blockers.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#bbf7d0" }}>All shared deterministic validation checks cleared.</p>
          )}
          <button
            type="button"
            onClick={() => setShowPacket(true)}
            style={{ marginTop: 16, padding: "11px 16px", border: 0, borderRadius: 7, background: "#93c5fd", color: "#0b1220", fontWeight: 800, cursor: "pointer" }}
          >
            Generate Attorney Review Packet
          </button>
        </section>

        {showPacket && (
          <section style={card}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Attorney Review Packet</h2>
            <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13, background: "#05070a", padding: 16, borderRadius: 8, overflowX: "auto" }}>{packet}</pre>
          </section>
        )}
      </div>
    </main>
  );
}
