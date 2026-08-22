"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { kahnCatinoMatter } from "@/lib/kahn-catino-data";
import {
  assertNoDoubleCounting,
  evaluateClaimReadiness,
  type ClaimReadiness,
  type GateState,
} from "@/lib/kahn-catino-readiness";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusStyle: Record<GateState, React.CSSProperties> = {
  PASS: { borderColor: "#16a34a", color: "#86efac", background: "#052e16" },
  YELLOW: { borderColor: "#ca8a04", color: "#fde68a", background: "#422006" },
  RED: { borderColor: "#dc2626", color: "#fecaca", background: "#450a0a" },
  BLOCKED: { borderColor: "#64748b", color: "#cbd5e1", background: "#0f172a" },
};

const initialClaims: ClaimReadiness[] = [
  {
    id: "oral-contract",
    name: "Breach of oral contract",
    status: "current",
    against: "Paula",
    attorneyApproved: false,
    proceduralGateSatisfied: true,
    requirements: [
      { id: "terms", label: "Terms and repayment obligation identified", status: "to-verify", required: true },
      { id: "performance", label: "Kahn performance / advances linked to primary evidence", status: "to-verify", required: true },
      { id: "breach", label: "Breach and nonpayment supported", status: "documented", required: true },
      { id: "damages", label: "Damages reconciled without overlap", status: "to-verify", required: true },
    ],
  },
  {
    id: "note-304",
    name: "Breach of $304,000 note",
    status: "current",
    against: "Paula",
    attorneyApproved: false,
    proceduralGateSatisfied: true,
    requirements: [
      { id: "copy", label: "Signed note copy available", status: "documented", required: true },
      { id: "original", label: "Original note custody / lost-note path confirmed", status: "to-verify", required: true },
      { id: "maturity", label: "Maturity and default established", status: "documented", required: true },
      { id: "tax", label: "Documentary stamp analysis complete", status: "to-verify", required: true },
      { id: "double", label: "No-double-counting treatment confirmed", status: "documented", required: true },
    ],
  },
  {
    id: "note-288",
    name: "Breach of $288,942.98 note",
    status: "current",
    against: "Paula",
    attorneyApproved: false,
    proceduralGateSatisfied: true,
    requirements: [
      { id: "copy", label: "Signed note copy available", status: "documented", required: true },
      { id: "original", label: "Original note custody / lost-note path confirmed", status: "to-verify", required: true },
      { id: "payoff", label: "Payoff and tax components linked to source documents", status: "to-verify", required: true },
      { id: "tenant", label: "Tenant $7,000 excluded from conservative model", status: "documented", required: true },
      { id: "tax", label: "Documentary stamp analysis complete", status: "to-verify", required: true },
    ],
  },
  {
    id: "fraud",
    name: "Fraud / fraudulent inducement",
    status: "current",
    against: "Paula",
    attorneyApproved: false,
    proceduralGateSatisfied: true,
    requirements: [
      { id: "statement", label: "Exact representation, date, and medium charted", status: "to-verify", required: true },
      { id: "falsity", label: "Falsity when made supported", status: "to-verify", required: true },
      { id: "knowledge", label: "Knowledge / intent evidence supported", status: "to-verify", required: true },
      { id: "reliance", label: "Reliance and resulting action identified", status: "to-verify", required: true },
      { id: "damage", label: "Separate resulting damage identified", status: "to-verify", required: true },
    ],
  },
  {
    id: "chapter-726",
    name: "Chapter 726 voidable transfer",
    status: "current",
    against: "Paula and Richard",
    attorneyApproved: false,
    proceduralGateSatisfied: true,
    requirements: [
      { id: "deed", label: "Recorded deed and transfer date confirmed", status: "documented", required: true },
      { id: "notice", label: "Richard prior written notice preserved", status: "documented", required: true },
      { id: "consideration", label: "Actual consideration investigated", status: "to-verify", required: true },
      { id: "value", label: "Property value at transfer date established", status: "to-verify", required: true },
      { id: "solvency", label: "Paula financial condition / solvency analyzed", status: "to-verify", required: true },
      { id: "control", label: "Retained control or benefit investigated", status: "to-verify", required: true },
    ],
  },
  {
    id: "civil-theft",
    name: "Civil theft",
    status: "reserved",
    against: "To be determined by attorney",
    attorneyApproved: false,
    proceduralGateSatisfied: false,
    requirements: [
      { id: "demand", label: "Statutory presuit demand served", status: "to-verify", required: true },
      { id: "receipt", label: "Receipt date and 30-day deadline logged", status: "to-verify", required: true },
      { id: "intent", label: "Independent theft-intent evidence supported", status: "to-verify", required: true },
    ],
  },
  {
    id: "punitive",
    name: "Punitive damages",
    status: "reserved",
    against: "Tied to qualifying tort claim",
    attorneyApproved: false,
    proceduralGateSatisfied: false,
    requirements: [
      { id: "discovery", label: "Discovery record / evidentiary proffer developed", status: "to-verify", required: true },
      { id: "leave", label: "Leave to amend obtained", status: "to-verify", required: true },
    ],
  },
  {
    id: "ameriliq",
    name: "AMERILIQ / Diane claims",
    status: "investigation",
    against: "AMERILIQ COMPANY INC. and/or Diane Sunderland",
    attorneyApproved: false,
    proceduralGateSatisfied: false,
    requirements: [
      { id: "loan-file", label: "Complete lender file obtained", status: "to-verify", required: true },
      { id: "ledger", label: "Advance and payment history reconciled", status: "to-verify", required: true },
      { id: "payoff", label: "$80,000 to $270,000 principal increase explained", status: "to-verify", required: true },
      { id: "communications", label: "Native communications preserved", status: "to-verify", required: true },
    ],
  },
];

export default function KahnCatinoClient() {
  const [claims, setClaims] = useState(initialClaims);
  const [note304IncludedAgain, setNote304IncludedAgain] = useState(false);
  const [tenantIncluded, setTenantIncluded] = useState(false);

  const claimResults = useMemo(
    () => claims.map((claim) => ({ claim, result: evaluateClaimReadiness(claim) })),
    [claims],
  );

  const damagesControl = assertNoDoubleCounting({
    grossDirectPayments: 993500,
    note304IncludedAgain,
    tenantSevenThousandIncluded: tenantIncluded,
  });

  const summary = claimResults.reduce(
    (acc, item) => {
      acc[item.result.state] += 1;
      return acc;
    },
    { PASS: 0, YELLOW: 0, RED: 0, BLOCKED: 0 } as Record<GateState, number>,
  );

  function updateRequirement(claimId: string, requirementId: string, checked: boolean) {
    setClaims((current) =>
      current.map((claim) =>
        claim.id !== claimId
          ? claim
          : {
              ...claim,
              requirements: claim.requirements.map((requirement) =>
                requirement.id !== requirementId
                  ? requirement
                  : { ...requirement, status: checked ? "documented" : "to-verify" },
              ),
            },
      ),
    );
  }

  function updateClaim(claimId: string, patch: Partial<ClaimReadiness>) {
    setClaims((current) =>
      current.map((claim) => (claim.id === claimId ? { ...claim, ...patch } : claim)),
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/" style={backLinkStyle}>← Praxis Production Console</Link>

        <header style={{ marginTop: 28 }}>
          <div style={eyebrowStyle}>{kahnCatinoMatter.privilegeNotice}</div>
          <h1 style={{ fontSize: 36, margin: "10px 0 8px" }}>{kahnCatinoMatter.title}</h1>
          <p style={leadStyle}>
            Interactive pre-filing control system. It records readiness inputs, exposes missing proof,
            and blocks unsupported claims. It does not file, send, or make legal decisions.
          </p>
        </header>

        <section style={summaryGridStyle}>
          {(["PASS", "YELLOW", "RED", "BLOCKED"] as GateState[]).map((state) => (
            <div key={state} style={{ ...summaryCardStyle, ...statusStyle[state] }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>{state}</div>
              <div style={{ fontSize: 30, fontWeight: 850, marginTop: 4 }}>{summary[state]}</div>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Matter posture</div>
          <div style={threeColumnStyle}>
            <Fact label="Filing status" value={kahnCatinoMatter.filingStatus} />
            <Fact label="Status date" value={kahnCatinoMatter.statusDate} />
            <Fact label="Court" value={kahnCatinoMatter.court} />
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Damages integrity control</div>
          <p style={hintStyle}>
            The control below intentionally tests the two prohibited inputs from the current conservative model.
          </p>
          <label style={checkRowStyle}>
            <input type="checkbox" checked={note304IncludedAgain} onChange={(e) => setNote304IncludedAgain(e.target.checked)} />
            Add the $304,000 note on top of the $993,500 direct-payment ledger
          </label>
          <label style={checkRowStyle}>
            <input type="checkbox" checked={tenantIncluded} onChange={(e) => setTenantIncluded(e.target.checked)} />
            Add the tenant $7,000 item to current damages
          </label>
          <div style={{ ...resultPanelStyle, ...(damagesControl.valid ? statusStyle.PASS : statusStyle.RED) }}>
            <strong>{damagesControl.valid ? "PASS — current exclusions preserved" : "RED — prohibited double-counting / inclusion detected"}</strong>
            {damagesControl.violations.map((violation) => <div key={violation} style={{ marginTop: 8 }}>{violation}</div>)}
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <tbody>
                {kahnCatinoMatter.damages.map((line) => (
                  <tr key={line.label}>
                    <td style={tdStyle}>{line.label}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {money.format(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Claim readiness engine</div>
          <p style={hintStyle}>
            Check an item only when the underlying source has been located and reviewed. Attorney approval is a separate gate.
          </p>

          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {claimResults.map(({ claim, result }) => (
              <article key={claim.id} style={claimCardStyle}>
                <div style={claimHeaderStyle}>
                  <div>
                    <div style={{ fontWeight: 850, fontSize: 17 }}>{claim.name}</div>
                    <div style={hintStyle}>Against: {claim.against} · Track: {claim.status}</div>
                  </div>
                  <span style={{ ...pillStyle, ...statusStyle[result.state] }}>{result.state}</span>
                </div>

                <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 13 }}>{result.rationale}</div>

                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {claim.requirements.map((requirement) => (
                    <label key={requirement.id} style={requirementRowStyle}>
                      <input
                        type="checkbox"
                        checked={requirement.status !== "to-verify"}
                        onChange={(event) => updateRequirement(claim.id, requirement.id, event.target.checked)}
                      />
                      <span>{requirement.label}</span>
                    </label>
                  ))}
                </div>

                <div style={gateGridStyle}>
                  <label style={checkRowStyle}>
                    <input
                      type="checkbox"
                      checked={claim.proceduralGateSatisfied}
                      disabled={claim.status === "investigation"}
                      onChange={(event) => updateClaim(claim.id, { proceduralGateSatisfied: event.target.checked })}
                    />
                    Procedural gate satisfied
                  </label>
                  <label style={checkRowStyle}>
                    <input
                      type="checkbox"
                      checked={claim.attorneyApproved}
                      onChange={(event) => updateClaim(claim.id, { attorneyApproved: event.target.checked })}
                    />
                    Attorney approved
                  </label>
                </div>

                {result.missingRequired.length > 0 ? (
                  <div style={missingStyle}>
                    Missing: {result.missingRequired.map((item) => item.label).join("; ")}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Critical work queue</div>
          <ol style={{ lineHeight: 1.7 }}>
            {kahnCatinoMatter.criticalTasks.map((task) => <li key={task}>{task}</li>)}
          </ol>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>Locked attorney decision gates</div>
          <ul style={{ lineHeight: 1.7 }}>
            {kahnCatinoMatter.attorneyDecisionGates.map((gate) => <li key={gate}>{gate}</li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...hintStyle, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ marginTop: 6, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#070b11",
  color: "#e5e7eb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};
const containerStyle: React.CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "38px 24px 80px" };
const backLinkStyle: React.CSSProperties = { color: "#bfdbfe", textDecoration: "none", fontWeight: 700 };
const eyebrowStyle: React.CSSProperties = { color: "#93c5fd", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };
const leadStyle: React.CSSProperties = { color: "#9ca3af", maxWidth: 900, lineHeight: 1.6, margin: 0 };
const summaryGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 24 };
const summaryCardStyle: React.CSSProperties = { border: "1px solid", borderRadius: 10, padding: 16 };
const cardStyle: React.CSSProperties = { border: "1px solid #263244", background: "#0f1724", borderRadius: 12, padding: 20, marginTop: 18 };
const cardHeaderStyle: React.CSSProperties = { fontWeight: 850, fontSize: 17, color: "#f8fafc" };
const hintStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, lineHeight: 1.45 };
const threeColumnStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, marginTop: 14 };
const checkRowStyle: React.CSSProperties = { display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12, lineHeight: 1.45, fontSize: 14 };
const resultPanelStyle: React.CSSProperties = { border: "1px solid", borderRadius: 8, padding: 14, marginTop: 16, fontSize: 13 };
const tableWrapStyle: React.CSSProperties = { overflowX: "auto", border: "1px solid #263244", borderRadius: 8, marginTop: 16 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const tdStyle: React.CSSProperties = { padding: 11, borderBottom: "1px solid #1e293b", fontSize: 13 };
const claimCardStyle: React.CSSProperties = { border: "1px solid #263244", borderRadius: 10, padding: 16, background: "#0a111d" };
const claimHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const pillStyle: React.CSSProperties = { border: "1px solid", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 850, letterSpacing: "0.06em", whiteSpace: "nowrap" };
const requirementRowStyle: React.CSSProperties = { display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45 };
const gateGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14, paddingTop: 12, borderTop: "1px solid #1e293b" };
const missingStyle: React.CSSProperties = { marginTop: 12, color: "#fecaca", background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 7, padding: 10, fontSize: 12, lineHeight: 1.45 };
