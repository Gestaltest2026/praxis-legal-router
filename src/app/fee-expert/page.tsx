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
  matterLabel: string;
  caseNumber: string;
  court: string;
  retainingParty: string;
  contractingEntity: string;
  feePosition: string;
  depositType: string;
  depositAmount: string;
  expertRate: string;
  standardClauses: boolean;
  sourceVerified: boolean;
};

const initialForm: FormState = {
  matterLabel: "",
  caseNumber: "",
  court: "",
  retainingParty: "",
  contractingEntity: "",
  feePosition: "",
  depositType: "",
  depositAmount: "",
  expertRate: "",
  standardClauses: false,
  sourceVerified: false,
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

function parseMoney(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export default function FeeExpertProductionPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPacket, setShowPacket] = useState(false);

  const productionModule = getProductionModule("fee-expert");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validation = useMemo(() => {
    if (!productionModule) {
      return buildValidationResult([
        {
          id: "module:missing",
          severity: "RED",
          message: "Fee Expert production module is not configured.",
        },
      ]);
    }

    const requiredResult = validateRequiredInputs(productionModule, form);
    const issues: ValidationIssue[] = [];

    if (parseMoney(form.depositAmount) === null) {
      issues.push({
        id: "fee:deposit",
        severity: "RED",
        message: "Deposit amount is absent or invalid.",
      });
    }

    if (parseMoney(form.expertRate) === null) {
      issues.push({
        id: "fee:rate",
        severity: "RED",
        message: "Expert hourly rate is absent or invalid.",
      });
    }

    if (!form.standardClauses) {
      issues.push({
        id: "fee:template",
        severity: "RED",
        message: "Attorney-approved pinned clause version is not confirmed.",
      });
    }

    if (!form.sourceVerified) {
      issues.push({
        id: "fee:source",
        severity: "RED",
        message: "Matter variables are not source-verified.",
      });
    }

    if (form.depositType === "other") {
      issues.push({
        id: "fee:nonstandard",
        severity: "YELLOW",
        message:
          "Nonstandard deposit classification requires attorney approval and trust-treatment review.",
      });
    }

    return combineValidationResults(requiredResult, buildValidationResult(issues));
  }, [form, productionModule]);

  const packet = formatAttorneyReviewPacket({
    title: "Praxis Attorney Review Packet — Fee Expert Engagement",
    matterSummary: [
      `Matter: ${form.matterLabel || "(missing)"}`,
      `Case number: ${form.caseNumber || "(missing)"}`,
      `Court / county: ${form.court || "(missing)"}`,
      `Retaining party: ${form.retainingParty || "(missing)"}`,
      `Contracting entity: ${form.contractingEntity || "(missing)"}`,
      `Fee position: ${form.feePosition || "(missing)"}`,
    ],
    sources: [
      form.sourceVerified
        ? "Matter variables confirmed against source materials."
        : "Source verification not confirmed.",
      form.standardClauses
        ? "Attorney-approved pinned clause version confirmed."
        : "Pinned clause version not confirmed.",
    ],
    validation,
    attorneyDecisions:
      form.depositType === "other"
        ? ["Approve or reject the nonstandard deposit classification and trust treatment."]
        : [],
    paralegalNextActions:
      validation.status === "RED"
        ? ["Resolve all RED items before document assembly or attorney review."]
        : validation.status === "YELLOW"
          ? ["Present the nonstandard deposit issue and supporting source materials for attorney decision."]
          : ["Submit the controlled engagement draft and this packet for attorney review."],
    additionalSections: [
      {
        heading: "Engagement Terms",
        items: [
          `Deposit: ${form.depositAmount || "(missing)"} — ${form.depositType || "(missing classification)"}`,
          `Expert rate: ${form.expertRate || "(missing)"}/hour`,
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
        <div
          style={{
            marginTop: 18,
            color: "#93c5fd",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          FEE EXPERT PRODUCTION · CONTROLLED MODULE
        </div>
        <h1 style={{ margin: "6px 0", fontSize: 28 }}>
          Fee Expert Engagement Intake
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#9ca3af", lineHeight: 1.5 }}>
          Source-verified matter data is evaluated through the shared Praxis
          production engine. RED blocks production; YELLOW requires attorney
          decision.
        </p>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>1. Matter Identity</h2>
          <div style={grid}>
            <div>
              <label style={label}>Matter Label *</label>
              <input style={input} value={form.matterLabel} onChange={(e) => set("matterLabel", e.target.value)} />
            </div>
            <div>
              <label style={label}>Case Number *</label>
              <input style={input} value={form.caseNumber} onChange={(e) => set("caseNumber", e.target.value)} />
            </div>
            <div>
              <label style={label}>Court / County *</label>
              <input style={input} value={form.court} onChange={(e) => set("court", e.target.value)} />
            </div>
            <div>
              <label style={label}>Retaining Party *</label>
              <input style={input} value={form.retainingParty} onChange={(e) => set("retainingParty", e.target.value)} />
            </div>
            <div>
              <label style={label}>Contracting Entity *</label>
              <input style={input} value={form.contractingEntity} onChange={(e) => set("contractingEntity", e.target.value)} />
            </div>
            <div>
              <label style={label}>Fee Position *</label>
              <select style={input} value={form.feePosition} onChange={(e) => set("feePosition", e.target.value)}>
                <option value="">Select</option>
                <option value="Support fee claim">Support fee claim</option>
                <option value="Challenge fee claim">Challenge fee claim</option>
              </select>
            </div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>2. Engagement Terms</h2>
          <div style={grid}>
            <div>
              <label style={label}>Deposit Classification *</label>
              <select style={input} value={form.depositType} onChange={(e) => set("depositType", e.target.value)}>
                <option value="">Select</option>
                <option value="refundable-advance">Refundable advance deposit</option>
                <option value="true-retainer">True retainer</option>
                <option value="earned-on-receipt">Earned-upon-receipt flat fee</option>
                <option value="other">Other / nonstandard</option>
              </select>
            </div>
            <div>
              <label style={label}>Deposit Amount *</label>
              <input style={input} inputMode="decimal" value={form.depositAmount} onChange={(e) => set("depositAmount", e.target.value)} />
            </div>
            <div>
              <label style={label}>Expert Hourly Rate *</label>
              <input style={input} inputMode="decimal" value={form.expertRate} onChange={(e) => set("expertRate", e.target.value)} />
            </div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>3. Production Controls</h2>
          <label style={{ display: "block", marginBottom: 12 }}>
            <input type="checkbox" checked={form.standardClauses} onChange={(e) => set("standardClauses", e.target.checked)} />{" "}
            Attorney-approved pinned clause version confirmed
          </label>
          <label style={{ display: "block" }}>
            <input type="checkbox" checked={form.sourceVerified} onChange={(e) => set("sourceVerified", e.target.checked)} />{" "}
            Matter variables source-verified
          </label>
        </section>

        <section
          style={{
            ...card,
            borderColor:
              validation.status === "PASS"
                ? "#166534"
                : validation.status === "YELLOW"
                  ? "#a16207"
                  : "#991b1b",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Status: {validation.status}
          </h2>
          {validation.issues.length ? (
            <ul style={{ margin: "0 0 0 20px", lineHeight: 1.6 }}>
              {validation.issues.map((issue) => (
                <li key={issue.id}>
                  {issue.severity} — {issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#bbf7d0" }}>
              Deterministic checks cleared; ready for attorney review.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowPacket(true)}
            style={{
              marginTop: 16,
              padding: "11px 16px",
              border: 0,
              borderRadius: 7,
              background: "#93c5fd",
              color: "#0b1220",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Generate Attorney Review Packet
          </button>
        </section>

        {showPacket && (
          <section style={card}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
              Attorney Review Packet
            </h2>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: 13,
                background: "#05070a",
                padding: 16,
                borderRadius: 8,
                overflowX: "auto",
              }}
            >
              {packet}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
