# Hotel Breakdown V1 - Implementation Status

Last reviewed: 2026-11-07

## Status legend

- **Implemented:** verified in the current source code and tests.
- **Planned:** agreed V1 capability that is not implemented yet.
- **Proposed:** recommendation awaiting approval.
- **Unresolved:** decision or rule still requiring clarification.

## Implemented

### Application foundation

- React + TypeScript + Vite application foundation.
- Vitest with `jsdom` and React Testing Library.
- Home screen with `New Project` and `Continue Project` actions.
- Initial Workspace screen.
- `Folio Comparison` is available as a separate view within the active project, with navigation back to Workspace and preserved in-memory panel state while switching views.
- `Complimentary & Staff` has a persisted manual-entry table with `Free`/`Staff` type, amount, number, row total, and `ILS`/`USD` currency selection, plus input validation warnings; its Financial Summary and Excel mapping remain deferred. `Additional Charges` has a persisted manual-entry table with description, price, quantity, number, row total, and `ILS`/`USD` currency selection. Additional Charges are included in Export Preview and generated Excel sections; Hebrew applies 18% VAT to eligible ILS charges, USD applies no VAT, and currency mismatches produce warnings without conversion. `Excel Export` is implemented as Export Preview with Draft/Final workbook actions.
- Local PDF file selection from the browser.
- In-memory project state for the current workspace.
- Multiple Group Report selection and sequential processing.

### PDF report analysis

- PDF.js extraction of positioned text items from local PDF files.
- Browser Worker configuration for PDF.js.
- Group Report date extraction from the embedded report date.
- Group and room-row parsing based on observed report layout and column positions.
- Support verified against:
  - `group in ils/24.10.26.pdf`
  - `group in ils/25.10.26.pdf`
  - `group in usd/fidf 23.10.pdf`
- Repeated group sections across pages are merged.

### Domain normalization and room handling

- `Upg` is normalized as `Booked Room Type`.
- `Rm` is normalized as `Actual Room Type`.
- Report dates are normalized to ISO date strings.
- Blank occupancy values remain `null`.
- Room types catalogued in English and Hebrew.
- Shared or duplicated room rows count as one occupied room by room number.
- Duplicate room numbers remain available for review.
- Material conflicts are detected for duplicate room records.
- Exact duplicate reports are ignored.
- A valid report replaces a different valid report for the same `reportDate`.
- Invalid reports do not replace an active valid report.
- Active reports are sorted by embedded report date.
- Report coverage and missing dates can be calculated for a selected date range.
- Basic room-night totals are calculated for a selected group.
- Pure pricing-rule contracts and matching results are implemented for one complete `Date + Room Type + Occupancy Band` rule, plus `Pricing Conflict` and `Missing Price`.
- `Pricing Rules` UI supports manual entry of the single rule shape and displays `Matched`, `Missing Price`, and `Pricing Conflict` statuses.
- Basic workspace financial summaries remain available; Export Preview uses the shared `FinancialCalculator` for grouped rows, session rate overrides, currencies, precision, and Hebrew VAT.
- Financial validation reports unresolved room conflicts, pricing conflicts, and missing or invalid prices as blockers through a pure domain contract; no Final export exists yet.
- Numeric `reportedRate` observations from the selected group are shown as non-binding price suggestions; the user must choose the currency and add them manually. Active pricing rules are persisted in the local workspace snapshot.
- Group matching uses a safe comparison key that trims and collapses whitespace and ignores letter case while preserving the original display name.

### Current UI output

- Selected filename is shown after upload.
- Parsed report date is shown.
- Detected groups are listed.
- Unique occupied-room count is shown per group.
- Group conflicts are surfaced as review warnings.
- Selected-group summaries show conflict room numbers, differing fields, and the involved source records without changing either record.
- A pure `RoomCorrection` model and `applyRoomCorrections` function can derive corrected room records without mutating source rows.
- The UI can select a record for a room conflict, and active corrections plus correction history are persisted in the local workspace snapshot; original PDF binaries and final blocking rules remain unimplemented.
- PDF analysis errors are shown to the user.
- Active reports are displayed by report date.
- A group can be selected across the active report collection.
- Date range inputs and missing-date warnings are displayed.
- Room-Nights and selected-group room details are displayed in the summary.
- Selected-group room details show Booked Room Type, Actual Room Type, Adults/Children occupancy, Reported Price, and Pricing status.
- A compact Financial Summary shows only separate ILS and USD totals.
- The inspected Folio layout is supported by a pure comparison contract with matched, amount-mismatch, missing-in-folio, missing-in-group, and data-missing statuses.
- The inspected Folio PDF is parsed into normalized `FolioEntry` records for room transactions and separate `ILS`/`USD` summary totals; account rows are excluded.
- The UI can upload one Folio PDF for review, display separate ILS/USD totals, and show room-level comparison statuses without changing pricing rules.
- Folio room comparison is date-aware: the comparison key is `reportDate + roomNumber`, so the same room on different dates remains separate.
- Folio comparison displays the number of unique Group Report nights for the same room and guest, alongside the number of Folio entries; Folio entries are not treated as nights unless the source states that explicitly.
- Folio comparison now summarizes one row per room and guest across all selected report dates, summing Group Report nights and amounts before comparing with the Folio amount.
- Folio amount differences are displayed as review warnings and are not connected to the blocking `Financial Validation` gate.
- Folio amount comparison uses the approved `0.01` minor-unit tolerance for ILS and USD.
- The UI records an acknowledgment timestamp and Folio file hash when Folio warnings are reviewed; Export Preview independently applies the issue severity policy for Draft and Final workbook downloads.
- A pure `Final Export` validation contract remains available for legacy Folio workflow checks; Export Preview uses structured issues and blocks only `final-blocker` issues.
- Export Preview displays all issues and prevents Final only for `final-blocker` issues; Draft remains available for review.
- `Folio nights` is shown as `Not stated` for the inspected layouts because they do not provide a per-room night quantity; account-level Arrival/Departure is not applied to individual rooms.
- Multiple-upload results summarize added, replaced, and duplicate files.
- Failed files do not prevent other selected files from being processed.
- Per-file upload states are displayed as `pending`, `processing`, `completed`, or `failed`.
- Failed files expose a retry action that reprocesses only that file.
- IndexedDB stores the current project, active report metadata, parsed analyses, active corrections, and correction history locally.
- `Continue Project` restores the saved workspace state from the same device.

### Excel export and preview

- The supplied templates were inspected read-only; no workbook was modified.
- `templates/Master $.xlsx` contains three worksheets, with populated content only on `גיליון1`; its visible structure includes project metadata, repeated room-charge blocks, a USD room total, staff/free rows, and ancillary-cost sections.
- `templates/Master Hebrew.xlsx` contains one populated worksheet, `גיליון`; its visible structure includes room charges, 18% VAT formulas, staff/free rows, ancillary costs, paid-amount adjustment, and final payable totals.
- `ExportDataBuilder` creates grouped export rows from active reports, corrections, and pricing rules.
- Canonical rows use temporary grouped IDs, lightweight source references, typed rates, issue severity, and separate data/financial completeness.
- `FinancialCalculator` supports positive, zero, negative, missing, and textual rates, separate currencies, Hebrew room VAT, and blank dependent totals for incomplete nights.
- `Export Preview` displays date-grouped rows, editable session-only rates, statuses, warnings, nightly totals, and overall totals without exposing room numbers.
- Draft export is available with warnings; Final export is disabled when `final-blocker` issues exist.
- Hebrew and USD workbooks are generated from scratch with one worksheet, independent date sections, formulas, print settings, direction, and the embedded Orient logo asset.
- Hebrew and USD workbook presentation now follows the inspected reference visual language: language-specific fonts, portrait print layout, reference-like colors, boxed borders, enlarged logo placement, hotel metadata, and no internal preview-check text.
- Excel export does not copy or populate the supplied reference templates.

## Verification

The current test suite was last run with:

```text
npm test
npm run build
```

Observed result:

- 24 test files passed.
- 74 tests passed.
- Production build passed.

- PDF.js may emit `standardFontDataUrl` warnings during tests; these did not fail the test run.

## Planned

The following V1 capabilities are agreed requirements but are not implemented yet:

- Original PDF binary persistence, backup export/import, and storage recovery behavior.
- Persistence of original PDF binaries, backup export/import, and storage recovery behavior.
- Independent project report snapshots and saved report collections.
- Final correction validation and blocking completion while material conflicts remain unresolved.
- Ambiguous group-name collision detection and user-assisted resolution.
- Complimentary/Staff financial rules and Additional Charges mapping for future template fields beyond the implemented generated workbook section.
- Additional currencies beyond ILS/USD and currency conversion.
- Expanded financial Preview drill-down and persistence of session overrides.
- Full project backup and restore.
- PWA offline behavior and stabilization work.

## Proposed

- Add code splitting for the PDF.js Worker and application bundle when performance work begins.

These items are recommendations, not completed functionality.

## Unresolved

- Practical browser-storage limits and recovery behavior.
- Complimentary/Staff workbook mapping and calculations.
- Final persistence schema and backup file format.
- Whether and how duplicate-room conflicts should be corrected in the UI.
- Remaining manual-field behavior in the reference templates is out of scope because generated workbooks are built from scratch.

## Next proposed task

Review generated workbook layout in a native spreadsheet application; the V1 Final blockers for unresolved Duplicate Room Conflict and Unresolved Occupancy are implemented.
