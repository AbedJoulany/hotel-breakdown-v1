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

### Current UI output

- Selected filename is shown after upload.
- Parsed report date is shown.
- Detected groups are listed.
- Unique occupied-room count is shown per group.
- Group conflicts are surfaced as review warnings.
- PDF analysis errors are shown to the user.

## Verification

The current test suite was last run with:

```text
npm test
npm run build
```

Observed result:

- 8 test files passed.
- 22 tests passed.
- Production build passed.
- PDF.js may emit `standardFontDataUrl` warnings during tests; these did not fail the test run.

## Planned

The following V1 capabilities are agreed requirements but are not implemented yet:

- Project creation and real Continue Project behavior.
- IndexedDB/Dexie persistence and automatic saving.
- Independent project report snapshots and saved report collections.
- Report upload ordering, date coverage, missing-date handling, and replacement in the UI.
- Group selection and cross-report group matching workflow.
- Manual correction workflow and correction history.
- Contract pricing rules and effective date overrides.
- Decimal financial calculations and per-room-night rounding.
- Complimentary discounts and additional charges.
- Multi-currency financial totals.
- Optional Folio parsing and comparison.
- Financial Preview and drill-down warnings.
- Excel Draft and Final export in English and Hebrew.
- Full project backup and restore.
- PWA offline behavior and stabilization work.

## Proposed

- Add a small UI/application boundary around report replacement and active-report validation.
- Add code splitting for the PDF.js Worker and application bundle when performance work begins.
- Add the approved documentation set incrementally, starting with `AGENTS.md` and this status file.

These items are recommendations, not completed functionality.

## Unresolved

- Final pricing-rule precedence for overlapping date and occupancy rules.
- Folio discrepancy tolerance and the complete blocking/non-blocking validation policy.
- The future automatic Complimentary discount formula.
- Practical browser-storage limits and recovery behavior.
- The internal structure of the Excel templates; they have not yet been inspected for export implementation.
- Final persistence schema and backup file format.
- Whether and how duplicate-room conflicts should be corrected in the UI.

## Next approved task

No next implementation task is recorded here until the next task is explicitly approved. Documentation work continues one small file at a time.
