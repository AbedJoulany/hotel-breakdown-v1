# Hotel Breakdown V1 - Product Requirements

Last reviewed: 2026-11-06

## Status labels

- **Implemented:** verified in the current source code and tests.
- **Approved / Planned:** agreed V1 requirement not implemented yet.
- **Proposed:** recommendation awaiting approval.
- **Unresolved:** rule or decision requiring clarification.

## Product summary

Hotel Breakdown V1 is a browser-based, local-first application for turning daily hotel Group Reports into a reliable hotel financial breakdown. Hotel documents remain on the user's device. The product must favor traceability and financial correctness over silent guessing.

## User and problem

### Primary user

Hotel or finance staff who need to analyze one hotel group across daily reports, optionally compare the result with a Folio, and export a workbook.

### Problem

Daily hotel reports contain room, guest, group, occupancy, room-type, and rate information across multiple PDFs. The user needs a repeatable way to identify the correct group, count occupied rooms accurately, resolve source conflicts, apply contract pricing, and produce a reviewable financial result.

## V1 scope

### Approved / Planned capabilities

- Create a new project or continue an existing project.
- Upload daily Group Reports in any order.
- Determine report dates from reliable document evidence and sort reports chronologically.
- Detect groups and let the user select one group for the project.
- Calculate room-nights from daily report evidence.
- Detect missing dates, duplicate rooms, and material conflicts.
- Allow explicit review and correction of material conflicts.
- Enter contract pricing by room type and occupancy/date rules.
- Apply precise money calculations and multi-currency separation.
- Add manually confirmed complimentary discounts and additional charges.
- Optionally compare the result with a Folio.
- Preview results and unresolved issues.
- Export Draft and Final Excel workbooks in English or Hebrew.
- Save projects locally, resume them, and import/export complete backups.

### Implemented subset

- Home screen with `New Project` and `Continue Project` actions.
- Workspace with local PDF selection.
- PDF.js extraction with positioned text.
- Group Report parsing for the inspected ILS and USD layouts.
- Report-date extraction, group detection, room-row normalization, and room-type mapping.
- Unique-room occupancy summaries and material duplicate-room conflict detection.
- Multiple Group Report upload with sequential local processing.
- Per-file upload status and retry for failed files.
- One active report per embedded `reportDate`, with exact-duplicate ignoring and replacement.
- Report coverage, editable date range, and missing-date warnings.
- Group selection across the active report collection.
- Basic Room-Nights calculation and selected-group room summary.
- Local IndexedDB snapshot for the current project, active report metadata, and parsed analyses.
- `Continue Project` restoration from the saved local snapshot.
- Display of report dates, detected groups, room counts, and conflict warnings.
- Manual conflict record selection with active corrections and correction history restored from the local snapshot.
- Manual `Pricing Rules` entry for the single approved rule shape, restored from the local workspace snapshot.
- Non-binding price suggestions derived from numeric `reportedRate` observations in the selected group; suggestions require manual approval and currency selection.
- Basic matched Room-Night financial summary with separate ILS/USD totals and visible missing-price and conflict counts.
- Selected-group room details show Booked Room Type, Actual Room Type, Adults/Children occupancy, Reported Price, and Pricing status.
- Folio PDF parsing for the inspected layouts, separate ILS/USD totals, and room/guest comparison across report dates.
- Group-night aggregation for the same room and guest, with Folio amount warnings using the approved `0.01` tolerance.
- Folio warning acknowledgment state persisted with the Folio file hash and timestamp.
- Pure Final Export validation gate combining financial blockers and unacknowledged Folio warnings; no export action is connected yet.

### Explicit exclusions for the current implementation slice

- Backend, authentication, cloud processing, and external document upload.
- Automatic Complimentary discount formula.
- Automatic currency conversion or exchange-rate assumptions.
- Automatic financial correction of conflicting records.
- Excel export before the real templates are inspected.

## User workflow

### Entry

1. User chooses `New Project` or `Continue Project`.
2. A project represents one selected hotel group.

### Reports and Group

1. User uploads one or more daily Group Reports.
2. The application extracts and normalizes report data locally.
3. The application keeps one active valid report per embedded `reportDate` and sorts active reports chronologically.
4. The application shows detected groups grouped by report date.
5. User selects the group to process across the active report collection.
6. The application shows date coverage, missing-date warnings, Room-Nights, and selected-group room details.

### Folio, Contract, Preview, Export

Contract, Preview, and Export remain Approved / Planned and are not implemented in the current code. Folio comparison is partially implemented for the inspected layouts:

1. User optionally adds a Folio for comparison only. **Implemented for inspected Folio layouts.**
2. User enters contract pricing. **Partially implemented through Pricing Rules.**
3. User reviews calculated results, warnings, and unresolved issues. **Partially implemented.**
4. User exports a Draft or Final workbook when validation allows it. **Planned.**

## Inputs and outputs

### Inputs

- Daily Group Report PDF files.
- Optional Folio PDF or billing source.
- Selected group.
- User-adjusted date range.
- Contract pricing rules.
- Manually confirmed discounts and additional charges.

### Current output

- Embedded report date.
- Detected groups.
- Normalized room records.
- Unique occupied-room count per group.
- Duplicate room numbers and material conflicts.
- Active report coverage and missing dates for the selected range.
- Room-Nights for the selected group.
- Selected-group room details grouped by report date.
- Folio ILS/USD totals, room/guest comparison, Group Report night totals, and review warnings.

### Planned output

- Contract charges and separate financial lines.
- Currency-specific totals.
- Draft/Final Excel workbook.
- Complete project backup.

## Approved business rules

### Report identity and replacement

- The embedded Group Report date is authoritative.
- There is one active valid report per `reportDate`.
- Exact duplicates are ignored.
- A different valid file replaces the active file for that date.
- An invalid file cannot replace a valid file.
- Replaced and duplicate files are not retained in project history.

### Group and room records

- Do not merge groups solely because names look similar.
- `Upg` is `Booked Room Type`.
- `Rm` is `Actual Room Type`.
- Prefer Booked Room Type for pricing; use Actual Room Type as a fallback with a warning when Booked is unavailable.
- Preserve unknown occupancy values as unknown, not zero.
- Preserve duplicate rows for review.

### Room-night calculation

- One occupied room on one report date equals one room-night.
- A shared room is counted once by room number.
- Do not multiply room-nights by guest count.
- Do not infer occupied nights only from check-in/check-out ranges.
- Do not silently infer room transfers.
- Continue with unambiguous rooms while isolating material conflicts.

### Financial correctness

- Contract prices are rates per room-night.
- Occupancy counts select pricing rules; they do not multiply the room rate by guest count.
- V1 uses one pricing rule shape: `Date + Room Type + Occupancy Band` (`reportDate` + `roomType` + `adults` + `children`). Every condition must match.
- V1 has no `Default Rate` and no user-facing rule-category selector.
- Multiple matches at the same priority level produce `Pricing Conflict` and are never resolved automatically.
- Money must use precise decimal arithmetic.
- Round each room-night amount using `ROUND_HALF_UP` before summing.
- Rounding uses the supported number of decimal places for the currency; two decimal places must not be assumed for every currency.
- V1 supports `ILS` and `USD`, both rounded to two decimal places.
- Preserve currencies separately.
- Never apply automatic currency conversion.
- Missing financial values produce `Missing Price` and must not silently become zero.
- V1 does not use a `Default Rate`; no matching rule remains `Missing Price`.

### Complimentary, charges, and Folio

- Complimentary is a separate discount line and does not delete room-nights.
- V1 allows manual complimentary entitlement and discount confirmation.
- No automatic Complimentary formula is used; Complimentary remains a manually confirmed discount line.
- Additional charges are manual and independent from PDF parsing and Folio comparison.
- Folio is comparison-only and cannot determine contract prices or automatically create charges.

## Validation and export requirements

### Validation states

- `Ready`
- `Ready with Warnings`
- `Incomplete`

### Final export warning policy

**Approved for later implementation; not implemented:** Validation continues to detect unresolved financially material conflicts, missing required prices, and other issues, but these warnings must not block Draft or Final downloads. Missing values remain missing and must not become zero. Final Export must download immediately without a confirmation dialog or an additional `Export Anyway` action.

### Draft export

Draft export may be available for incomplete projects when a meaningful workbook can be produced. It must be labelled `DRAFT` and must show missing or unresolved information honestly. This behavior is approved for later implementation and is not currently implemented.

## Acceptance criteria

### Current vertical slice

- A user can open the Workspace from Home.
- A local PDF can be selected without external upload.
- A supported Group Report produces its embedded report date.
- Detected groups are displayed.
- Room rows are normalized with `Upg` and `Rm` semantics.
- Shared/duplicate room rows count once in the occupancy summary.
- Material conflicts are surfaced rather than silently resolved.
- Invalid analysis shows an actionable error message.

### Full V1

- A project can be saved and resumed locally.
- A selected group can be processed across multiple report dates.
- Missing dates and conflicts are visible and actionable.
- Contract pricing and financial calculations are deterministic and tested.
- Currency totals remain separate.
- Folio comparison is optional and currency-safe.
- Final export cannot bypass blocking validation issues.
- Draft and Final exports follow the approved English/Hebrew template behavior.
- Complete backup import always creates a new independent project.

## Dependencies and risks

- PDF extraction depends on the observed Oracle Reports layouts; additional layouts may require new parsing rules.
- Financial correctness depends on resolving pricing precedence, Folio tolerance, and Complimentary formula decisions.
- Browser persistence depends on quota and binary-PDF storage behavior.
- Excel export depends on inspecting the supplied templates.

## Unresolved requirements

- Pricing-rule precedence for overlapping date and occupancy rules.
- Final Export acknowledgment UI and export action.
- Automatic Complimentary discount formula.
- Storage quota, failure recovery, and backup format.
- Exact UI workflow for correcting duplicate-room conflicts.
- Excel template worksheet and cell mapping.

