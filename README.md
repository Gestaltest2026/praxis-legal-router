# Praxis Legal Router

Praxis turns approved legal-office workflows into source-controlled production
routes.

The Retainer Production route is the first complete document compiler:

1. Upload the Clerk Case Detail PDF.
2. Confirm the lawyer and mailing address.
3. Answer five plain-language routing questions.
4. Enter each money term once.
5. Download the Agreement, Executing Cover Letter, and Attorney Review Packet.

Praxis does not freely rewrite the agreement and does not send documents. It
copies an approved Word original, replaces controlled variables, runs
deterministic checks, and stops when required facts are missing.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/retainer`.

## Checks

```bash
npm run test:retainer
npm run build
```

See [docs/retainer-production.md](docs/retainer-production.md) for the route,
source hierarchy, template controls, and production boundary.
