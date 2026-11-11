# Hotel Breakdown V1 - Architecture

Last reviewed: 2026-11-06

## Status legend

- **Implemented:** verified in the current source code and tests.
- **Planned:** agreed V1 capability that is not implemented yet.
- **Proposed:** recommendation awaiting approval.
- **Unresolved:** decision or rule still requiring clarification.

## Architectural direction

**Implemented:** The project uses a practical hybrid structure. The source tree is organized by responsibility, while report-related behavior is grouped by feature:

- `src/domain`: pure models and deterministic business rules.
- `src/application`: use cases that compose domain rules and infrastructure.
- `src/infrastructure`: PDF.js and other browser/external-format integrations.
- `src/App.tsx` and `src/styles.css`: the current UI shell and interaction layer.

This structure keeps parsing and room-count rules outside React components while avoiding a large framework or backend for V1.

## Current module boundaries

### Domain

Implemented domain modules include:

- `src/domain/shared/types.ts`: shared identifiers and ISO-date type.
- `src/domain/projects/models.ts`: initial `Project` model.
- `src/domain/reports/models.ts`: room, daily group, report, and candidate models.
- `src/domain/reports/normalizeGroupReportRow.ts`: raw Group Report row normalization.
- `src/domain/reports/replaceReport.ts`: one-active-report-per-date replacement rules.
- `src/domain/reports/roomOccupancy.ts`: unique-room counting and duplicate/conflict detection.
- `src/domain/rooms/roomTypes.ts`: English/Hebrew room-type catalog.
- `src/domain/folio/models.ts` and `src/domain/folio/compareFolio.ts`: Folio comparison contracts and deterministic room-level comparison without PDF or UI dependencies.
- `src/domain/pricing/finalExportValidation.ts`: pure gate contract for future Final Export readiness.

Domain code does not import React, PDF.js, or browser storage APIs.

### Application

Implemented application use case:

- `src/application/reports/analyzeGroupReportPdf.ts`: composes PDF extraction, Group Report parsing, occupancy summaries, and conflict detection.

The application layer is the intended boundary for future project workflows, persistence orchestration, validation, and export use cases.

### Infrastructure

Implemented PDF modules:

- `src/infrastructure/pdf/pdfTextExtractor.ts`: extracts positioned PDF text items with PDF.js.
- `src/infrastructure/pdf/parseGroupReport.ts`: maps observed Group Report layout and column positions to normalized room records.

The parser is based on inspected Oracle Reports layouts. It is not a generic PDF table parser.

### UI

Implemented UI behavior in `src/App.tsx`:

- Home actions for `New Project` and `Continue Project`.
- Initial Workspace view and a separate `Folio Comparison` view selected through the existing `View` state; no routing library is used.
- `Complimentary & Staff`, `Additional Charges`, and `Excel Export` views are selected through the same `View` state. `Complimentary & Staff` and `Additional Charges` own only manual row editing and delegate persistence to the existing workspace snapshot; Complimentary/Staff financial rules remain outside the UI.
- Local single or multiple PDF selection.
- In-memory active report collection with one report per embedded date.
- Display of report dates, detected groups, unique room counts, and conflict warnings.
- Group selection across active reports.
- Editable date range with one native `date` control supporting calendar selection and keyboard entry, coverage/missing-date warnings, and basic Room-Nights summary. The visible report/group list follows the selected range while the active report collection remains preserved.
- Selected-group room details grouped by report date.
- Conflict detail review with manual record selection, derived corrected summaries, and correction history.
- Selected-group room table with Booked/Actual Room Type, Adults/Children occupancy, Reported Price, and Pricing status.
- Compact Financial Summary with separate ILS and USD totals.
- Folio upload, separate ILS/USD totals, and room-level comparison statuses for the selected group.
- Excel Export metadata editing for hotel name, group-name display override, report-date display override, and PM; PM can be sourced from the parsed Folio confirmation number without changing source facts.
- Workspace-to-Folio navigation reuses the active project state and keeps the mounted `FolioComparisonPanel` instance while switching views.
- Pricing-rule entry and selected-group report-rate suggestions at the UI boundary; active rules are included in the local snapshot, and the domain matcher returns `Matched`, `Pricing Conflict`, or `Missing Price` without calculating money.
- IndexedDB snapshot persistence for project state, active report metadata, parsed analyses, active corrections, and correction history.
- `Continue Project` restoration from the local workspace snapshot.
- User-visible analysis errors.

The current UI does not yet own a persisted project or a complete workflow state machine.

## Current data flow

```text
Local PDF file(s)
  -> File.arrayBuffer() [for each selected file]
  -> extractPdfTextPages()
  -> parseGroupReport()
  -> normalizeGroupReportRow()
  -> summarizeRoomOccupancy() + findRoomConflicts()
  -> replaceReportForDate()
  -> active report collection and per-date analyses
  -> coverage and room-night summaries
  -> React Workspace summary
```

Project metadata overrides flow separately to export headers:

```text
Workspace metadata fields + Folio confirmation number
  -> persisted Project metadata
  -> ExportBuildInput.exportMetadata
  -> CanonicalExportModel.metadata
  -> Hebrew `הזמנה` / hotel / group / display-date header fields
```

The report date is read from the embedded Group Report date. `Upg` maps to `bookedRoomType`, and `Rm` maps to `actualRoomType`.

## Domain invariants

Implemented invariants:

- A Group Report is a daily snapshot identified by its embedded `reportDate`.
- A room shared by multiple rows is counted once by `roomNumber`.
- Duplicate room rows remain available for review.
- Material differences between duplicate rows are reported as conflicts rather than silently resolved.
- Pricing rules have one pure domain contract matching date, room type, adults, and children together; duplicate matches return `Pricing Conflict`, and absent matches return `Missing Price`.
- Blank occupancy values remain unknown (`null`).
- Financial validation classifies missing or unsupported occupancy separately from missing pricing.
- One active valid report is retained per `reportDate`.
- Exact duplicate reports are ignored.
- An invalid candidate cannot replace a valid active report.

Basic financial calculation is implemented with integer minor units, two-decimal ILS/USD totals, separate currencies, and per-room-night rounding. Hebrew VAT is applied to room charges, approved Additional Charges, and Complimentary/Staff rows in the Hebrew export; Hebrew Complimentary/Staff totals are included in the Hebrew overall total. English export supports separate `USD` and `ILS` template choices, applies no VAT, and does not convert between currencies. The pure Final Export gate is implemented. Pricing conflict and Missing Price results are connected to the displayed financial summary. Folio comparison accepts normalized entries, and `src/infrastructure/pdf/parseFolio.ts` maps the inspected layout into those entries plus separate ILS/USD summary totals while excluding account rows; the UI aggregates comparison by room and guest across dates, and the pure Final Export gate combines financial blockers with unacknowledged Folio warnings.

## Error handling

Implemented:

- Normalization rejects malformed dates and invalid integer fields.
- Missing required room and guest fields are rejected.
- PDF analysis errors are caught at the current UI boundary and shown as an error message.
- Duplicate and material-conflict information is returned as structured data.
- Multiple selected files are processed sequentially; a failed file does not stop the remaining files.
- Per-file upload states and retry handling are implemented in the UI boundary.
- Missing dates are reported for the user-selected date range.

Planned:

- Explicit acknowledgment for missing dates.

## Testing architecture

Implemented test layers:

- Domain unit tests for normalization, replacement, room counting, conflicts, and room types.
- PDF extraction tests using real sample PDFs.
- Parser tests using ILS and USD reports across multiple pages.
- Application composition test using a real Group Report.
- UI tests for Home actions, upload control, and analysis result display.

The current checks are:

```text
npm test
npm run build
```

## Planned boundaries

The following boundaries are planned but not implemented:

- `persistence`: IndexedDB/Dexie adapter and project/report snapshot storage.
- `financial`: discounts, Additional Charges VAT/export mapping beyond the generated section, export action, and broader currency support; validation contracts are implemented.
- `folio`: Folio extraction, totals, room/guest comparison, night aggregation, tolerance, and acknowledgment are implemented for inspected layouts.
- `workflow`: project navigation, completion status, acknowledgments, and validation messaging. Export Preview requires Folio Comparison to be complete but does not block Draft or Final downloads because of validation warnings.

### Excel template inspection and generated workbook architecture

**Implemented:** The supplied templates were inspected without modification. `Master $.xlsx` has one populated sheet (`גיליון1`) plus two empty sheets and contains metadata, repeated room-charge blocks, a reference USD room total, staff/free rows, and ancillary-cost sections. Generated English export uses the same visual family and supports either USD or ILS throughout the workbook. `Master Hebrew.xlsx` has one populated sheet (`גיליון`) with room totals, hardcoded 18% VAT formulas, staff/free rows, ancillary costs, paid-amount adjustment, and final payable totals.

**Implemented:** The supplied templates remain visual and business references only. New workbooks are generated from scratch with one worksheet, independent date sections, editable rate cells, guarded formulas, dynamic print areas, Hebrew RTL or English RTL layout with USD/ILS target-currency support, and the verified Orient logo asset.

**Implemented:** `ExportDataBuilder` produces an immutable canonical model with grouped rows, temporary `groupedRowId`, lightweight source references, typed rates, issue severity, separate data/financial completeness, and no authoritative derived monetary totals. `Export Preview` applies session-scoped rate overrides and both preview and Excel export use the same effective model and `FinancialCalculator` rules.

**Unresolved:** The templates' fixed single/double/staff/free categories do not map directly to the application's room-type and occupancy records. Broader manual fields such as `Agent`, `vat staff`, and `paid for transaction` require separate approval; the approved PM metadata mapping is implemented.

These modules must consume domain/application contracts rather than place business rules in React components.

## Dependency status

Implemented runtime dependencies:

- React
- React DOM
- PDF.js

Implemented development dependencies:

- TypeScript
- Vite
- Vitest
- React Testing Library
- jsdom

Planned but not currently installed or used:

- Dexie/IndexedDB persistence layer
- Decimal arithmetic library
- PWA tooling

## Known limitations and unresolved decisions

- The parser is tied to the currently inspected report layouts and needs additional layout validation before broader production use.
- The current snapshot persistence does not retain original PDF binaries, provide backup/restore, or block completion for unresolved conflicts.
- Pricing-rule precedence is unresolved.
- Final Export uses the approved issue severity policy; unresolved Duplicate Room Conflict and Unresolved Occupancy policy details remain open.
- Complimentary discount formula and Free/Staff financial treatment are unresolved.
- Backup schema and storage-failure behavior are unresolved.
- Complimentary/Staff is implemented as a generated separate workbook section; Hebrew applies 18% VAT and includes the result in the Hebrew overall total, while USD applies no VAT and keeps the section outside the USD room total. Broader staff/free financial treatment remains unresolved. Additional Charges are implemented as a generated separate export section with currency-specific VAT behavior; reference-template-specific field mapping remains unresolved.

## Architectural change rule

Any change that moves business logic into UI, adds a backend or external transmission, changes the approved technology direction, or changes a financial invariant requires explicit approval and a corresponding entry in `docs/DECISIONS.md`.
