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

### DEC-009 - Pricing rule specificity precedence

- **Status:** Superseded by DEC-014
- **Decision:** The earlier seven-level pricing specificity proposal is no longer active.

### DEC-010 - Missing prices and Final/Draft behavior

- **Status:** Approved; not implemented
- **Decision:** A missing required price is `Missing Price`, never zero. It blocks `Final` export but may appear in a clearly labelled `Draft` with the missing values shown.
- **Reason:** Preserve financial correctness and make incomplete data visible.

### DEC-011 - Decimal arithmetic, rounding, and currencies

- **Status:** Approved; not implemented
- **Decision:** Calculate each room-night with precise decimal arithmetic, apply `ROUND_HALF_UP` using the currency's supported number of decimal places, then sum. Keep currency totals separate and never convert currencies automatically.
- **Unresolved detail:** The supported minor-unit mapping for each currency still needs to be defined or verified before implementation.

### DEC-012 - Complimentary and additional charges

- **Status:** Approved; not implemented
- **Decision:** `Complimentary` is a manually confirmed discount line, and `Additional Charges` are manually entered independent line items. No automatic Complimentary formula is used.
- **Reason:** Avoid inventing an entitlement formula that is not present in the inspected source data or approved requirements.

### DEC-013 - V1 currencies and Default Rate

- **Status:** Approved; not implemented
- **Decision:** V1 supports `ILS` and `USD` only, with two decimal places for both currencies. No automatic currency conversion is used. `Default Rate` is not enabled in V1; when no pricing rule matches, the result is `Missing Price`.
- **Reason:** Keep the first financial implementation limited to the confirmed hotel currencies and prevent an unspecified fallback price from hiding missing contract data.

### DEC-014 - Four pricing rule categories

- **Status:** Superseded by DEC-015
- **Decision:** The four-category pricing proposal is no longer active.

### DEC-015 - Single pricing rule shape

- **Status:** Approved; implemented in the domain and UI
- **Decision:** V1 uses one pricing rule shape only: `Date + Room Type + Occupancy Band`, matching `reportDate`, `roomType`, `adults`, and `children` together. There is no `Default Rate` and no user-facing rule-category selector.
- **Conflict rule:** Multiple rules with the same complete match produce `Pricing Conflict`; the application must not choose automatically.
- **Reason:** Keep pricing explicit and prevent partial or implicit matches from hiding missing contract data.

### DEC-016 - Folio amount tolerance

- **Status:** Approved; implemented
- **Decision:** Compare Folio and Group Report amounts using integer minor units. A difference of `0.01` or less in `ILS` or `USD` is treated as `Matched`; a difference greater than `0.01` remains an amount warning and is not a Final-export blocker.
- **Reason:** Avoid false discrepancies from one minor currency unit while preserving visibility of larger differences.
- **Evidence:** `src/domain/folio/compareFolio.ts` and `src/domain/folio/compareFolio.test.ts`.

### DEC-017 - Folio warning acknowledgment before Final Export

- **Status:** Approved for later implementation; export behavior not implemented
- **Decision:** Validation must continue detecting financial and Folio warnings, but those warnings must not block either Draft Export or Final Export. When Final Export is implemented, it must download immediately without a confirmation dialog or an additional `Export Anyway` action. Missing values remain missing and must be displayed as warnings rather than replaced with zero. This approved policy does not change the current validation code in the placeholder-screen task.
- **Evidence:** Approved export workflow decision; current warning detection remains in `finalExportValidation.ts` and current export action is not implemented.

## Proposed decisions

No additional proposed decision is being recorded in this file. New recommendations must be approved before they become decisions.

## Unresolved decisions

### DEC-U002 - Final Export UI and workbook implementation

Implement the approved Draft/Final warning presentation, template selection, workbook generation, and immediate Final Export download. Numeric tolerance is defined by DEC-016. The non-blocking export policy is approved by DEC-017 but is not implemented yet.

### DEC-U004 - Persistence schema and storage limits

Define the IndexedDB/Dexie schema, browser quota behavior, recovery behavior, and whether project snapshots store binary PDFs inline or through a separate blob strategy.

### DEC-U005 - Excel template structure

Finalize the application-to-template field mapping and preserve the approved VAT, currency, missing-value, and fixed-room-row rules during export implementation.

### DEC-U006 - Duplicate-room correction workflow

Define how users review and correct material conflicts while preserving the rule that unambiguous rooms continue to calculate.

## Superseded decisions

None recorded.

