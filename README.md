# Hotel Breakdown V1

Hotel Breakdown V1 is a local-first React application for reviewing daily hotel Group Reports, comparing an optional Folio, applying contract pricing, and generating Hebrew or English Excel workbooks.

## Current status

**Implemented:**

- Local PDF analysis for the inspected Group Report and Folio layouts.
- Multiple daily Group Report uploads with embedded report-date handling.
- Group selection, unique room-night summaries, duplicate-room conflict review, and corrections.
- Manual `Pricing Rules` with non-binding price suggestions from Group Report rates.
- Optional Folio Comparison with room/guest night aggregation, amount warnings, and acknowledgment.
- `Complimentary & Staff` and `Additional Charges` entry screens.
- Excel Export Preview with Hebrew/ILS, English/USD, and English/ILS choices.
- Hebrew VAT formulas and separate ILS/USD handling without automatic conversion.
- Export metadata fields for hotel name, group name, display date, and PM. PM can be populated from Folio `Confirmation No.` and is written to the Hebrew `הזמנה` and English `PM` fields.
- Local IndexedDB persistence for the active project state.

**Planned or unresolved:**

- Original PDF binary backup and full project backup/restore.
- Browser storage recovery and offline/PWA stabilization.
- Broader Complimentary & Staff financial rules and unresolved template-specific fields.

## Local development

Requirements: Node.js and npm.

```text
npm install
npm run dev
```

Useful checks:

```text
npm test
npm run build
```

The application processes documents in the browser. It does not use a backend, authentication, or external document upload service.

## Project structure

- `src/domain/` — pure models and business rules.
- `src/application/` — report and export use cases.
- `src/infrastructure/` — PDF parsing, browser storage, and Excel generation.
- `src/components/` — reusable UI panels.
- `src/App.tsx` — application workflow and view state.
- `docs/` — requirements, architecture, decisions, roadmap, and verified implementation status.
- `templates/` — inspected Excel references; generated workbooks are built independently.

## Documentation

Read [`AGENTS.md`](AGENTS.md) for contribution rules and the documentation status labels. The main project references are [`docs/PRD.md`](docs/PRD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](docs/ROADMAP.md), [`docs/DECISIONS.md`](docs/DECISIONS.md), and [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).
