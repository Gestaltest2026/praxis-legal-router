import Link from "next/link";

import { canRemoveEmailDuplicate, nextRequiredControl } from "@/lib/documents/policy";
import type { DocumentRecord } from "@/lib/documents/types";

const DEMO_DOCUMENTS: readonly DocumentRecord[] = [
  {
    id: "demo-bank",
    matterId: "demo-probate",
    displayName: "Bank Statement",
    kind: "BANK_STATEMENT",
    source: "CLIENT_EMAIL",
    receivedAt: "2026-08-21T12:00:00.000Z",
    sensitivity: "HIGHLY_SENSITIVE",
    state: "CLASSIFIED",
    secureCopyConfirmed: false,
    retentionStatus: "NOT_REVIEWED",
    legalUse: "Possible estate asset verification",
    flags: ["Account data present", "Secure storage required"],
  },
  {
    id: "demo-deed",
    matterId: "demo-probate",
    displayName: "Recorded Deed",
    kind: "PROPERTY_RECORD",
    source: "COURT_FILE",
    receivedAt: "2026-08-21T12:05:00.000Z",
    sensitivity: "CONFIDENTIAL",
    state: "VERIFIED",
    secureCopyConfirmed: true,
    retentionStatus: "PRESERVE",
    legalUse: "Title and ownership review",
    flags: ["Attorney reviews legal effect"],
  },
  {
    id: "demo-order",
    matterId: "demo-probate",
    displayName: "Court Order",
    kind: "COURT_RECORD",
    source: "COURT_FILE",
    receivedAt: "2026-08-21T12:10:00.000Z",
    sensitivity: "STANDARD",
    state: "READY_FOR_USE",
    secureCopyConfirmed: true,
    retentionStatus: "PRESERVE",
    legalUse: "Confirm procedural status",
  },
];

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e5e7eb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "40px 24px 72px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #273241",
  borderRadius: 10,
  padding: 18,
  background: "#111827",
  marginTop: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  fontWeight: 700,
};

const valueStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 1.45,
};

const pill = (background: string, color: string): React.CSSProperties => ({
  display: "inline-block",
  borderRadius: 999,
  padding: "4px 8px",
  background,
  color,
  fontSize: 11,
  fontWeight: 800,
  marginRight: 6,
});

function sensitivityStyle(sensitivity: DocumentRecord["sensitivity"]): React.CSSProperties {
  if (sensitivity === "HIGHLY_SENSITIVE") return pill("#451a1a", "#fecaca");
  if (sensitivity === "CONFIDENTIAL") return pill("#422006", "#fde68a");
  return pill("#172554", "#bfdbfe");
}

function stateStyle(state: DocumentRecord["state"]): React.CSSProperties {
  if (state === "QUARANTINED") return pill("#450a0a", "#fca5a5");
  if (state === "READY_FOR_USE") return pill("#052e16", "#86efac");
  return pill("#1e293b", "#cbd5e1");
}

export default function DocumentGovernancePage() {
  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>
          ← Production Console
        </Link>

        <header style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}>
            Praxis Control Plane
          </div>
          <h1 style={{ fontSize: 30, margin: "6px 0" }}>Client Document Governance</h1>
          <p style={{ color: "#9ca3af", maxWidth: 830, lineHeight: 1.55, margin: 0, fontSize: 13 }}>
            Receive → Protect → Classify → Verify → Link → Use → Retain / Dispose.
            This prototype governs metadata and decisions only. It does not upload, store, email,
            delete, or expose client files.
          </p>
        </header>

        <section style={{ ...cardStyle, borderColor: "#7f1d1d", background: "#1f1215" }}>
          <div style={{ fontWeight: 800, color: "#fecaca" }}>DEMO METADATA ONLY</div>
          <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 13, lineHeight: 1.5 }}>
            Do not place real SSNs, bank statements, tax records, medical records, IDs, or other
            sensitive client files in this public-repository prototype. Secure storage, authentication,
            permissions, encryption, retention controls, and production audit persistence must exist first.
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ fontWeight: 800 }}>Governance Rule</div>
          <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
            A sensitive document is not ready merely because it was received. Praxis requires an explicit
            governed state, secure-copy confirmation when required, human verification, a stated legal
            use, and a matter link. Email duplicate removal is a separate retention decision—not an automatic step.
          </div>
        </section>

        <section style={{ marginTop: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Document Control Queue</div>
          {DEMO_DOCUMENTS.map((document) => {
            const duplicateDecision = canRemoveEmailDuplicate(document);
            return (
              <article key={document.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{document.displayName}</div>
                    <div style={{ marginTop: 8 }}>
                      <span style={sensitivityStyle(document.sensitivity)}>{document.sensitivity}</span>
                      <span style={stateStyle(document.state)}>{document.state}</span>
                    </div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Demo ID: {document.id}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 14,
                    marginTop: 18,
                  }}
                >
                  <div><div style={labelStyle}>Source</div><div style={valueStyle}>{document.source}</div></div>
                  <div><div style={labelStyle}>Legal Use</div><div style={valueStyle}>{document.legalUse || "Not stated"}</div></div>
                  <div><div style={labelStyle}>Secure Copy</div><div style={valueStyle}>{document.secureCopyConfirmed ? "Confirmed" : "Not confirmed"}</div></div>
                  <div><div style={labelStyle}>Retention</div><div style={valueStyle}>{document.retentionStatus}</div></div>
                </div>

                <div style={{ marginTop: 16, borderTop: "1px solid #273241", paddingTop: 14 }}>
                  <div style={labelStyle}>Next Required Control</div>
                  <div style={{ ...valueStyle, color: "#f8fafc", fontWeight: 700 }}>{nextRequiredControl(document)}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={labelStyle}>Email Duplicate</div>
                  <div style={{ ...valueStyle, color: duplicateDecision.allowed ? "#86efac" : "#fca5a5" }}>
                    {duplicateDecision.allowed ? "MAY BE CONSIDERED" : "DO NOT DELETE YET"} — {duplicateDecision.reason}
                  </div>
                </div>

                {document.flags?.length ? (
                  <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 12 }}>
                    {document.flags.map((flag) => <span key={flag} style={pill("#1e293b", "#cbd5e1")}>{flag}</span>)}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section style={cardStyle}>
          <div style={{ fontWeight: 800 }}>Tonight&apos;s Boundary</div>
          <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 13, lineHeight: 1.55 }}>
            This release adds the control vocabulary, deterministic policy, workflow gates, audit event vocabulary,
            tests, and a safe metadata-only screen. Actual client-file storage is intentionally out of scope.
          </div>
        </section>
      </div>
    </main>
  );
}
