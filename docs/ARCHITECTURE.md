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
- Initial Workspace view.
- Local single or multiple PDF selection.
- In-memory active report collection with one report per embedded date.
- Display of report dates, detected groups, unique room counts, and conflict warnings.
- Group selection across active reports.
- Editable date range, coverage/missing-date warnings, and basic Room-Nights summary.
- Selected-group room details grouped by report date.
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

The report date is read from the embedded Group Report date. `Upg` maps to `bookedRoomType`, and `Rm` maps to `actualRoomType`.

## Domain invariants

Implemented invariants:

- A Group Report is a daily snapshot identified by its embedded `reportDate`.
- A room shared by multiple rows is counted once by `roomNumber`.
- Duplicate room rows remain available for review.
- Material differences between duplicate rows are reported as conflicts rather than silently resolved.
- Blank occupancy values remain unknown (`null`).
- One active valid report is retained per `reportDate`.
- Exact duplicate reports are ignored.
- An invalid candidate cannot replace a valid active report.

Planned financial invariants include precise decimal arithmetic, per-room-night rounding, currency separation, and Final-export blocking rules. They are not implemented in the current codebase.

## Error handling

Implemented:

- Normalization rejects malformed dates and invalid integer fields.
- Missing required room and guest fields are rejected.
- PDF analysis errors are caught at the current UI boundary and shown as an error message.
- Duplicate and material-conflict information is returned as structured data.
- Multiple selected files are processed sequentially; a failed file does not stop the remaining files.
- Missing dates are reported for the user-selected date range.

Planned:

- Per-file upload status and retry handling.
- Explicit acknowledgment for missing dates.
- Blocking versus non-blocking validation states for financial export.

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
- `financial`: pricing rules, decimal money calculations, discounts, additional charges, and multi-currency totals.
- `folio`: optional Folio extraction and comparison.
- `export`: ExcelJS Draft and Final workbook generation.
- `workflow`: project navigation, completion status, acknowledgments, and blocking validation.

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
- ExcelJS
- PWA tooling

## Known limitations and unresolved decisions

- The parser is tied to the currently inspected report layouts and needs additional layout validation before broader production use.
- The project model exists, but project creation, persistence, and resume behavior are not implemented.
- Pricing-rule precedence is unresolved.
- Folio tolerance and blocking policy are unresolved.
- Complimentary discount formula is unresolved.
- Backup schema and storage-failure behavior are unresolved.
- Excel templates have not yet been inspected for export implementation.

## Architectural change rule

Any change that moves business logic into UI, adds a backend or external transmission, changes the approved technology direction, or changes a financial invariant requires explicit approval and a corresponding entry in `docs/DECISIONS.md`.
