# Hotel Breakdown V1 - Decisions

Last reviewed: 2026-11-07

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
- **Implemented:** ExcelJS workbook generation and the shared financial calculation layer. Browser persistence and PWA behavior remain future work.
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

- **Status:** Superseded by DEC-017
- **Decision:** A missing required price is `Missing Price`, never zero. The earlier rule that missing prices block `Final` export is no longer active. Missing values remain visible as warnings for both Draft and Final Export.
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

- **Status:** Superseded by DEC-020
- **Decision:** Validation must continue detecting financial and Folio warnings, but those warnings must not block either Draft Export or Final Export. When Final Export is implemented, it must download immediately without a confirmation dialog or an additional `Export Anyway` action. Missing values remain missing and must be displayed as warnings rather than replaced with zero. This approved policy does not change the current validation code in the placeholder-screen task.
- **Evidence:** Superseded by the implemented Export Preview and export validation flow in DEC-019 and DEC-020.

### DEC-018 - Excel Export mapping and non-blocking export policy

- **Status:** Superseded by DEC-019 and DEC-020
- **Decision:** Record the following approved Excel Export rules for later implementation:
  - Use `Booked Room Type`, not `Actual Room Type`, for Excel grouping.
  - Use `src/domain/rooms/roomTypes.ts` as the authoritative room-type catalog.
  - Use standardized Hebrew room names in `Master Hebrew.xlsx` and standardized English room names in `Master $.xlsx`.
  - Existing template labels are not authoritative.
  - Display room type and occupancy together in one description column.
  - Support exactly these occupancy combinations, in this order: `1/0 = Single`, `2/0 = Double`, `3/0 = Triple`, `1/1 = Single + Child`, `2/1 = Double + Child`, and `2/2 = Double + 2 Children`.
  - Keep all other or missing occupancy combinations as `Unresolved`, displayed in the corresponding room-type rows after the six supported categories.
  - Create a separate section for every `Report Date`, sort dates oldest to newest, and never combine different dates.
  - Display only room types and occupancy categories used on each date.
  - Order room types according to `roomTypes.ts` and occupancy categories according to the six-category sequence above.
  - Set `Nights = 1` for every room-charge row.
  - Aggregate by `Report Date + Booked Room Type + Occupancy Category + Rate + Currency`.
  - Count each unique room once per date. Rates remain per room-night, not per guest.
  - Use the applicable date-specific pricing rule; different rates remain separate.
  - Show a subtotal for each date and overall room-charge totals.
  - For `Master Hebrew.xlsx`, enter room rates before VAT, calculate 18% VAT for each night, and show nightly and overall totals before VAT, VAT amounts, and totals including VAT.
  - For `Master $.xlsx`, support two English choices: English/USD and English/ILS. Do not add VAT to room charges and do not perform automatic currency conversion. Values whose currency differs from the selected English template remain unresolved/warned rather than being converted.
  - Keep `Unresolved`, `Pricing Conflict`, and `Missing Price` visible. Leave unresolved rates and monetary totals blank, never zero.
  - Display warnings on the Excel Export screen. Warnings must not block Draft or Final Export.
  - When implemented, Final Export downloads immediately without an additional confirmation dialog.
- **Reason:** Preserve the approved room, occupancy, date, pricing, VAT, currency, and warning behavior while keeping the export implementation explicit and auditable.
- **Deferred:** The following are not approved implementation requirements in this decision:
  - An approval button or approval-state behavior.
  - Duplicate-room conflict presentation in Excel.
  - Complimentary & Staff mapping and calculations.
  - Additional Charges mapping and calculations.
  - Any future mixed-currency handling beyond the approved English-ILS output.
  - Structural changes to the Excel templates or relocation of existing formulas.
- **Evidence:** Superseded by the approved from-scratch generated workbook architecture in DEC-019 and DEC-020.

### DEC-018 - Excel Export mapping and non-blocking export policy

- **Status:** Approved; not implemented
- **Decision:** Record the following approved Excel Export rules for later implementation:
  - Use `Booked Room Type`, not `Actual Room Type`, for Excel grouping.
  - Use `src/domain/rooms/roomTypes.ts` as the authoritative room-type catalog.
  - Use standardized Hebrew room names in `Master Hebrew.xlsx` and standardized English room names in `Master $.xlsx`.
  - Existing template labels are not authoritative.
  - Display room type and occupancy together in one description column.
  - Support exactly these occupancy combinations, in this order: `1/0 = Single`, `2/0 = Double`, `3/0 = Triple`, `1/1 = Single + Child`, `2/1 = Double + Child`, and `2/2 = Double + 2 Children`.
  - Keep all other or missing occupancy combinations as `Unresolved`, displayed in the corresponding room-type rows after the six supported categories.
  - Create a separate section for every `Report Date`, sort dates oldest to newest, and never combine different dates.
  - Display only room types and occupancy categories used on each date.
  - Order room types according to `roomTypes.ts` and occupancy categories according to the six-category sequence above.
  - Set `Nights = 1` for every room-charge row.
  - Aggregate by `Report Date + Booked Room Type + Occupancy Category + Rate + Currency`.
  - Count each unique room once per date. Rates remain per room-night, not per guest.
  - Use the applicable date-specific pricing rule; different rates remain separate.
  - Show a subtotal for each date and overall room-charge totals.
  - For `Master Hebrew.xlsx`, enter room rates before VAT, calculate 18% VAT for each night, and show nightly and overall totals before VAT, VAT amounts, and totals including VAT.
  - For `Master $.xlsx`, do not add VAT to room charges and do not perform automatic currency conversion.
  - Keep `Unresolved`, `Pricing Conflict`, and `Missing Price` visible. Leave unresolved rates and monetary totals blank, never zero.
  - Display warnings on the Excel Export screen. Warnings must not block Draft or Final Export.
  - When implemented, Final Export downloads immediately without an additional confirmation dialog.
- **Reason:** Preserve the approved room, occupancy, date, pricing, VAT, currency, and warning behavior while keeping the export implementation explicit and auditable.
- **Deferred:** The following are not approved implementation requirements in this decision:
  - An approval button or approval-state behavior.
  - Duplicate-room conflict presentation in Excel.
  - Complimentary & Staff mapping and calculations.
  - Additional Charges mapping and calculations.
  - Mixed-currency handling in the USD template.
  - Structural changes to the Excel templates or relocation of existing formulas.
- **Evidence:** User-approved Excel Export decisions; existing template inspection remains structural evidence only and Excel export is not implemented.

## Proposed decisions

No additional proposed decision is being recorded in this file. New recommendations must be approved before they become decisions.

### DEC-019 - Canonical export and traceability model

- **Status:** Approved; implemented
- **Decision:** Export uses an immutable Canonical Export Model built from active reports, pricing rules, and corrections. Grouped rows use temporary opaque IDs, independent grouping keys, lightweight embedded source references, typed rate values, separate data and financial completeness, and structured issues. No persistent source identity or persistence migration is required for V1.

### DEC-020 - Export Preview and financial parity

- **Status:** Approved; implemented
- **Decision:** The workflow is Workspace → Export Preview → Review/Correct/Validate → Draft or Final Excel Export. Rate edits are session-scoped and do not mutate Pricing Rules or IndexedDB. Preview uses `FinancialCalculator`; Excel builders generate independent guarded formulas tested against shared fixtures.
- **Final policy:** Draft and Final are allowed after Folio Comparison is complete, even when validation issues exist. `Missing Price`, `Pricing Conflict`, unresolved occupancy, and duplicate-room conflicts remain classified and displayed as warnings; they do not block either export action. Missing values remain blank rather than being replaced with zero.
- **Visual fidelity:** Generated workbooks remain scratch-built with ExcelJS, while their fonts, colors, boxed borders, portrait print layout, header metadata, and logo placement follow the inspected Hebrew and USD reference workbooks.

### DEC-021 - Additional Charges currency, VAT, and export mapping

- **Status:** Approved; implemented
- **Decision:** `Additional Charges` remain manually entered independent line items. Each line has a description, price, quantity, number, and one supported currency (`ILS` or `USD`). Currency totals remain separate and no automatic conversion is applied.
- **VAT:** `Master Hebrew.xlsx` applies 18% VAT to eligible ILS Additional Charges. The English ILS export applies no VAT to Additional Charges.
- **Export:** Additional Charges are exported in a separate section. Charges whose currency does not match the selected template remain visible with a clear currency-mismatch warning and are not silently converted or included in the selected template's monetary total.
- **Reason:** Preserve currency integrity and make unsupported template amounts visible without inventing an exchange rate.

### DEC-022 - Complimentary & Staff entry fields

- **Status:** Approved; entry screen and separate export section implemented, financial behavior not implemented
- **Decision:** The `Complimentary & Staff` screen uses manual rows with exactly `Type` (`Free` or `Staff`), `Amount`, `Number` (default `1`), `Total` (`Amount × Number`), and `Currency` (`ILS` or `USD`). Rows are persisted in the active workspace snapshot.
- **Implemented:** Hebrew export applies 18% VAT to eligible ILS Complimentary/Staff rows and includes their VAT-inclusive total in the Hebrew overall total. USD export applies no VAT and keeps these rows outside the USD room total.
- **Updated decision:** Hebrew Financial Summary and final Hebrew workbook totals include `Complimentary & Staff` after VAT.
- **Deferred:** Confirmation, room assignment, and broader staff/free calculation rules require separate approval.

### DEC-023 - Excel Export metadata fields

- **Status:** Approved; implemented
- **Decision:** Hotel name, export group-name override, display-date override, and PM are edited on the `Excel Export` screen and persisted with the active project. Source Group Report dates and group names remain authoritative for calculations, grouping, pricing, and Folio comparison.
- **Folio mapping:** When PM is empty, the inspected Folio `Confirmation No.` may populate it. The user can edit PM manually; a later Folio upload does not overwrite a non-empty manual value.
- **Output mapping:** PM is written to Hebrew `הזמנה` and English `PM`. Hotel name, group name, and display date are written to the corresponding generated workbook header fields.

## Unresolved decisions

### DEC-U002 - Final Export UI and workbook implementation

Resolved by DEC-019 and DEC-020. Unresolved Duplicate Room Conflict and Unresolved Occupancy are Final blockers when they affect report correctness or price determination; native workbook visual QA remains as release verification.

### DEC-U004 - Persistence schema and storage limits

Define the IndexedDB/Dexie schema, browser quota behavior, recovery behavior, and whether project snapshots store binary PDFs inline or through a separate blob strategy.

### DEC-U005 - Excel template structure

Resolved by the approved from-scratch workbook architecture in DEC-019 and DEC-020. Reference templates remain visual/business references only.

### DEC-U006 - Duplicate-room correction workflow

Define how users review and correct material conflicts while preserving the rule that unambiguous rooms continue to calculate.

## Superseded decisions

None recorded.
