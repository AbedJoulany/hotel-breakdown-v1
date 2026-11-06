# Hotel Breakdown V1 - Decisions

Last reviewed: 2026-11-06

## Decision status

- **Approved:** explicitly agreed and safe to implement.
- **Proposed:** recommendation awaiting approval.
- **Unresolved:** decision still requires clarification.
- **Superseded:** replaced by a later approved decision.

## Approved decisions

### DEC-001 - Local-first browser application

- **Status:** Approved
- **Decision:** V1 runs in the browser, processes hotel documents locally, requires no backend or authentication, and does not upload hotel documents to external services.
- **Reason:** Protect hotel data and keep the first version simple and offline-capable.
- **Evidence:** V1 requirements and the current local PDF upload flow.

### DEC-002 - Approved technology direction

- **Status:** Approved direction; partially implemented
- **Decision:** Use React, TypeScript, Vite, PDF.js, Vitest, browser storage, precise decimal arithmetic, and ExcelJS as the V1 technology direction. PWA capabilities are a later stabilization concern.
- **Current implementation:** React, TypeScript, Vite, PDF.js, Vitest, React Testing Library, and jsdom are installed and used.
- **Not yet implemented:** browser persistence, decimal arithmetic, ExcelJS export, and PWA behavior.
- **Reason:** The direction supports a local-first browser application while keeping parsing and calculations testable.

### DEC-003 - Hybrid source architecture

- **Status:** Approved
- **Decision:** Use a practical hybrid structure with `domain`, `application`, `infrastructure`, and UI responsibilities.
- **Reason:** Keep pure business rules independent from React and file/browser APIs without introducing unnecessary framework layers.
- **Evidence:** Current `src/domain`, `src/application`, and `src/infrastructure` folders.

### DEC-004 - Group Report date is authoritative

- **Status:** Approved
- **Decision:** The date embedded in the Group Report is the authoritative `reportDate`; filenames and creation timestamps are not authoritative report dates.
- **Reason:** The inspected reports show filenames, embedded report dates, and creation timestamps as separate pieces of information.
- **Evidence:** Inspected ILS and USD Group Reports and the current parser tests.

### DEC-005 - Group Report room-type mapping

- **Status:** Approved
- **Decision:** `Upg` means `Booked Room Type`; `Rm` means `Actual Room Type`.
- **Reason:** Confirmed from the supplied report format and used by normalization and parser tests.

### DEC-006 - Room-night counting uses unique rooms

- **Status:** Approved
- **Decision:** A shared or duplicated room is counted once by `roomNumber`. Guest count does not multiply room-nights.
- **Reason:** One occupied room on one report date represents one room-night.
- **Additional rule:** Preserve duplicate rows and report material conflicts instead of silently deleting or choosing a row.
- **Evidence:** `roomOccupancy.ts` and the `0526` case in `25.10.26.pdf`.

### DEC-007 - One active valid report per date

- **Status:** Approved
- **Decision:** Keep one active valid Group Report for each `reportDate`.
- **Rules:**
  - An exact duplicate is ignored.
  - A different valid file replaces the active file for that date.
  - An invalid file cannot replace a valid active file.
  - Replaced and duplicate files are not retained in project history.
- **Evidence:** `replaceReport.ts` and its tests.

### DEC-008 - Status labels are mandatory in documentation

- **Status:** Approved
- **Decision:** Documentation must distinguish `Implemented`, `Planned`, `Proposed`, and `Unresolved`.
- **Reason:** Prevent planned capabilities and assumptions from being presented as implemented behavior.
- **Evidence:** `AGENTS.md` and `IMPLEMENTATION_STATUS.md`.

## Proposed decisions

No additional proposed decision is being recorded in this file. New recommendations must be approved before they become decisions.

## Unresolved decisions

### DEC-U001 - Pricing rule precedence

Define precedence when room type, adult/child occupancy, effective dates, and date-specific overrides overlap.

### DEC-U002 - Folio tolerance and export blocking

Define tolerance, comparison statuses, acknowledgment behavior, and which discrepancies block Final export.

### DEC-U003 - Complimentary discount formula

Define the future automatic formula. V1 currently treats complimentary as a separate manually confirmed discount and does not implement an automatic formula.

### DEC-U004 - Persistence schema and storage limits

Define the IndexedDB/Dexie schema, browser quota behavior, recovery behavior, and whether project snapshots store binary PDFs inline or through a separate blob strategy.

### DEC-U005 - Excel template structure

Inspect the supplied English and Hebrew templates when export implementation begins. Do not infer their internal worksheet or cell structure before that phase.

### DEC-U006 - Duplicate-room correction workflow

Define how users review and correct material conflicts while preserving the rule that unambiguous rooms continue to calculate.

## Superseded decisions

None recorded.
