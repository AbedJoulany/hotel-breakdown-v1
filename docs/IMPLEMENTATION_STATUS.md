# Hotel Breakdown V1 - Implementation Status

Last reviewed: 2026-11-06

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
- Basic financial summaries calculate matched room-night charges with two-decimal ILS/USD totals; Final export blocking, discounts, and additional charges are not implemented.
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
- Multiple-upload results summarize added, replaced, and duplicate files.
- Failed files do not prevent other selected files from being processed.
- Per-file upload states are displayed as `pending`, `processing`, `completed`, or `failed`.
- Failed files expose a retry action that reprocesses only that file.
- IndexedDB stores the current project, active report metadata, parsed analyses, active corrections, and correction history locally.
- `Continue Project` restores the saved workspace state from the same device.

## Verification

The current test suite was last run with:

```text
npm test
npm run build
```

Observed result:

- 17 test files passed.
- 48 tests passed.
- Production build passed.

- PDF.js may emit `standardFontDataUrl` warnings during tests; these did not fail the test run.

## Planned

The following V1 capabilities are agreed requirements but are not implemented yet:

- Project creation and real Continue Project behavior.
- Persistence of original PDF binaries, backup export/import, and storage recovery behavior.
- Independent project report snapshots and saved report collections.
- Final correction validation and blocking completion while material conflicts remain unresolved.
- Ambiguous group-name collision detection and user-assisted resolution.
- Final financial validation and export blocking.
- Complimentary discounts and additional charges.
- Additional currencies beyond ILS/USD and currency conversion.
- Optional Folio parsing and comparison.
- Financial Preview and drill-down warnings.
- Excel Draft and Final export in English and Hebrew.
- Full project backup and restore.
- PWA offline behavior and stabilization work.

## Proposed

- Add code splitting for the PDF.js Worker and application bundle when performance work begins.

These items are recommendations, not completed functionality.

## Unresolved

- Folio discrepancy tolerance and the complete blocking/non-blocking validation policy.
- Practical browser-storage limits and recovery behavior.
- The internal structure of the Excel templates; they have not yet been inspected for export implementation.
- Final persistence schema and backup file format.
- Whether and how duplicate-room conflicts should be corrected in the UI.

## Next proposed task

Add final financial validation and explicit blocking behavior for unresolved room conflicts, pricing conflicts, and missing prices before any future Final export.

