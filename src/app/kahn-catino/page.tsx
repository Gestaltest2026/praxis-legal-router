import Link from "next/link";
import { kahnCatinoMatter } from "@/lib/kahn-catino-data";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function KahnCatinoPage() {
  const matter = kahnCatinoMatter;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Praxis
        </Link>
      </div>

      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
          {matter.privilegeNotice}
        </p>
        <h1 style={{ fontSize: 38, lineHeight: 1.08, margin: "12px 0" }}>{matter.title}</h1>
        <p style={{ maxWidth: 850, fontSize: 17, lineHeight: 1.6 }}>
          Internal pre-filing control surface for facts, claims, damages, evidence status, reserved remedies,
          and attorney decision gates.
        </p>
      </header>

      <section style={gridStyle}>
        <Card title="Filing status">
          <p>{matter.filingStatus}</p>
          <p><strong>Status date:</strong> {matter.statusDate}</p>
        </Card>
        <Card title="Court posture">
          <p>{matter.court}</p>
        </Card>
        <Card title="Parties">
          <p><strong>Plaintiff:</strong> {matter.plaintiff}</p>
          <ul>{matter.defendants.map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
      </section>

      <SectionTitle>Current claims</SectionTitle>
      <section style={gridStyle}>
        {matter.currentClaims.map((claim) => (
          <Card key={claim.name} title={claim.name} badge="CURRENT">
            <p><strong>Against:</strong> {claim.against}</p>
            <p>{claim.purpose}</p>
            <p style={{ opacity: 0.8 }}><strong>Open issue:</strong> {claim.vulnerability}</p>
          </Card>
        ))}
      </section>

      <SectionTitle>Reserved remedies and investigation tracks</SectionTitle>
      <section style={gridStyle}>
        {matter.reservedClaims.map((claim) => (
          <Card
            key={claim.name}
            title={claim.name}
            badge={claim.status === "investigation" ? "INVESTIGATION" : "RESERVED"}
          >
            <p>{claim.gate}</p>
          </Card>
        ))}
      </section>

      <SectionTitle>Damages reconciliation</SectionTitle>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Line item</th>
              <th style={thStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {matter.damages.map((line) => (
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

      <section style={{ ...gridStyle, marginTop: 24 }}>
        <Card title="No-double-counting controls" badge="LOCKED">
          <ol>{matter.noDoubleCountingRules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        </Card>
        <Card title="Evidence classifications">
          <ul>{matter.evidenceLabels.map((label) => <li key={label}>{label}</li>)}</ul>
        </Card>
      </section>

      <SectionTitle>People and role cautions</SectionTitle>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Person / Entity</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Control note</th>
            </tr>
          </thead>
          <tbody>
            {matter.parties.map((party) => (
              <tr key={party.name}>
                <td style={tdStyle}><strong>{party.name}</strong></td>
                <td style={tdStyle}>{party.role}</td>
                <td style={tdStyle}>{party.caution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Critical open tasks</SectionTitle>
      <Card title="Pre-filing work queue">
        <ol>{matter.criticalTasks.map((task) => <li key={task}>{task}</li>)}</ol>
      </Card>

      <SectionTitle>Attorney decision gates</SectionTitle>
      <Card title="No-go rules" badge="ATTORNEY REVIEW REQUIRED">
        <ul>{matter.attorneyDecisionGates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
      </Card>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: "42px 0 16px", fontSize: 24 }}>{children}</h2>;
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        border: "1px solid rgba(127,127,127,0.28)",
        borderRadius: 14,
        padding: 20,
        background: "rgba(127,127,127,0.04)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        {badge ? (
          <span
            style={{
              whiteSpace: "nowrap",
              border: "1px solid currentColor",
              borderRadius: 999,
              padding: "4px 8px",
              fontSize: 10,
              letterSpacing: "0.06em",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 14, lineHeight: 1.55 }}>{children}</div>
    </article>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(127,127,127,0.28)",
  borderRadius: 14,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 720,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  borderBottom: "1px solid rgba(127,127,127,0.28)",
  background: "rgba(127,127,127,0.08)",
};

const tdStyle: React.CSSProperties = {
  padding: 14,
  verticalAlign: "top",
  borderBottom: "1px solid rgba(127,127,127,0.18)",
  lineHeight: 1.45,
};
