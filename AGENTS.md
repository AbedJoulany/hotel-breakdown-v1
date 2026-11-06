# Hotel Breakdown V1 - Agent Instructions

## Project purpose

Hotel Breakdown V1 is a browser-based, local-first application for analyzing daily hotel group reports and preparing a hotel financial breakdown. Hotel documents are processed locally; do not introduce a backend, authentication, or external document upload without explicit approval.

## Working protocol

- Work on one small, explicitly approved task at a time.
- Before changing files, state the task objective, expected scope, and acceptance criteria.
- Do not silently combine implementation tasks or start the next task after completion.
- Preserve existing user files, sample PDFs, Excel templates, and unrelated changes.
- For audits and investigations, use read-only inspection unless a change is explicitly approved.
- Do not create a GitHub repository or make remote changes without explicit approval.
- Keep explanations primarily in Arabic; keep code, identifiers, filenames, and technical documentation terminology in English where useful.

## Source of truth and decision labels

Every requirement or design statement in project documentation must be labelled by status:

- **Implemented:** verified in the current source code and tests.
- **Planned:** agreed V1 capability that is not implemented yet.
- **Proposed:** a recommendation awaiting approval.
- **Unresolved:** an open question or rule that still needs clarification.

Do not describe planned or proposed behavior as implemented. Do not invent financial rules, parser fields, or template structures that have not been verified from requirements or sample files.

## Architecture boundaries

Keep responsibilities separated across the existing boundaries:

- `src/domain`: pure models and business rules independent of React and PDF/IO APIs.
- `src/application`: use cases that compose domain rules with infrastructure services.
- `src/infrastructure`: PDF and other external-format or browser-API integrations.
- `src/App.tsx` and UI files: presentation and user interaction only; do not place financial calculations or parser rules directly in React components.

Current report facts that must remain stable:

- `Upg` is `Booked Room Type`.
- `Rm` is `Actual Room Type`.
- A Group Report is a daily report; its embedded report date is authoritative.
- A room shared by multiple rows is counted once by room number.
- Duplicate room rows remain available for review, and material conflicts must not be silently resolved.
- There is one active valid Group Report per `reportDate`; exact duplicates are ignored and replaced reports are not retained.

## Technology and commands

The current approved foundation is React, TypeScript, Vite, PDF.js, and Vitest. Do not add dependencies without a clear task-level reason and approval when the dependency changes the architecture.

Run the relevant checks after implementation:

```text
npm test
npm run build
```

Never claim tests or builds passed unless they were actually executed. Existing PDF tests may emit PDF.js font warnings; report them when relevant, but distinguish warnings from failures.

## Documentation conventions

- Keep documentation small and focused.
- Record only facts supported by the repository, approved requirements, or inspected sample files.
- Update implementation status when a task materially changes what is implemented.
- Record important architectural or business-rule decisions in `docs/DECISIONS.md` after approval.
- Keep the roadmap ordered into small reviewable tasks.

## Completion report

After each approved implementation task, report briefly:

**Completed:** what changed.

**Tests:** commands run and their result.

**Next:** one proposed small task, then stop for approval.

