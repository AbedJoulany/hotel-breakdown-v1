# Hotel Breakdown V1 - Roadmap

Last reviewed: 2026-11-06

## Status labels

- **Completed:** implemented and verified.
- **In progress:** approved work currently being implemented.
- **Next proposed:** recommended next task awaiting approval.
- **Planned:** agreed future phase not started.
- **Unresolved:** blocked by a product or business decision.

## Current position

### Phase 0 - Planning and documentation

**Completed**

Completed planning work:

- Inspected representative ILS, USD, Group Report, and Folio samples.
- Confirmed Group Report date semantics.
- Confirmed `Upg`/`Rm` room-type meanings.
- Confirmed unique-room counting and duplicate-report replacement rules.
- Approved the React/TypeScript/Vite/PDF.js/Vitest direction.
- Approved the hybrid source architecture.
- Created `AGENTS.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/PRD.md`.

Remaining documentation work:

- Keep the documentation synchronized after material implementation tasks.

Exit condition: the essential documentation set exists and clearly separates implemented, planned, proposed, and unresolved items.

## Phase 1 - Application foundation

**Completed**

- React + TypeScript + Vite foundation.
- Vitest and UI test setup.
- Home actions and initial Workspace.
- Domain/application/infrastructure folder boundaries.
- Basic PDF upload and analysis error state.

Exit condition: the application starts, tests pass, and the initial UI can accept a local PDF.

## Phase 2 - First working vertical slice

**In progress**

Completed:

- PDF.js positioned-text extraction.
- Group Report parser for verified ILS and USD layouts.
- Report-date extraction.
- Group and room-row normalization.
- Unique-room occupancy summaries.
- Duplicate-room conflict detection.
- Multiple Group Report upload and sequential processing.
- One active valid report per embedded report date, with duplicate/replacement handling.
- Report coverage, editable date range, and missing-date warnings.
- Group selection across active reports.
- Basic room-night preview and selected-group room summary.
- UI display of detected groups and unique room counts.

Next proposed small tasks, in order:

1. Add basic local persistence for the vertical slice.
2. Add resume behavior for the saved vertical-slice project.

Exit condition: `Create Project -> Upload Report -> Select Group -> Calculate Basic Room-Nights -> Preview -> Save and Resume` works locally with the inspected report formats.

## Phase 3 - Robust reports and group handling

**In progress**

- Improve group matching across dates without merging uncertain groups silently.
- Show per-file processing status and retry paths.
- Add explicit correction workflow and correction history.
- Prevent final processing when material conflicts remain unresolved.

Exit condition: multi-date projects remain traceable and do not silently fabricate or merge source data.

## Phase 4 - Contract and financial engine

**Planned; dependent on unresolved decisions**

- Editable pricing table.
- Room-type pricing.
- Occupancy-based pricing rules.
- Effective date ranges and date-specific overrides.
- Precise decimal arithmetic and per-room-night rounding.
- Complimentary discount line items.
- Manual additional charges.
- Separate currency totals.

Unresolved prerequisites:

- Pricing-rule precedence.
- Complimentary formula.
- Final currency and precision policy per currency.

Exit condition: deterministic financial calculations have unit tests for rounding, missing rates, overlapping rules, and multiple currencies.

## Phase 5 - Preview and Folio comparison

**Planned; dependent on Phase 4**

- Financial summary and drill-down by date, room, and source record.
- Linked warnings and unresolved-item navigation.
- Optional Folio ingestion.
- Currency-safe Folio comparison.
- Matched, mismatched, not-covered, Folio-only, and unavailable statuses.
- Explicit discrepancy acknowledgment where allowed.

Unresolved prerequisite: Folio tolerance and blocking/non-blocking discrepancy policy.

Exit condition: Folio remains comparison-only and cannot silently change contract prices or additional charges.

## Phase 6 - Excel export

**Planned; dependent on the actual template inspection**

- Inspect `templates/Master $.xlsx` and `templates/Master Hebrew.xlsx`.
- Define workbook mapping and output validation.
- Implement English and Hebrew workbook generation.
- Implement Draft export.
- Implement Final export with blocking validation.
- Keep export language independent from currency.

Exit condition: generated workbooks are validated against approved expected values and do not hide unresolved financial information.

## Phase 7 - Persistence, backup, offline, and stabilization

**Planned**

- Strengthen IndexedDB/Dexie persistence.
- Preserve active report PDFs and project data.
- Full backup export/import as a new independent project.
- Browser quota and failure recovery behavior.
- PWA caching and offline verification.
- Performance testing for larger report collections.
- Error recovery and release-readiness checks.

Exit condition: users can recover and continue local projects without relying on a backend or treating browser storage as a permanent backup.

## Dependency order

```text
Foundation
  -> Vertical slice
  -> Robust reports
  -> Financial engine
  -> Preview/Folio
  -> Excel export
  -> Backup/offline stabilization
```

Basic persistence remains part of the vertical slice; it is not deferred entirely to Phase 7.

## Task discipline

Each implementation task must be small enough to review independently and must include:

1. Objective and affected files/modules.
2. Acceptance criteria.
3. Explicit approval before implementation.
4. Relevant tests and checks.
5. A short completion report.
6. A stop point before the next task.

No phase is considered complete merely because its code exists; its exit condition and relevant tests must be verified.
