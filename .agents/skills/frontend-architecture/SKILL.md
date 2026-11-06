---
name: frontend-architecture
description: Frontend technical architecture. Use when selecting libraries, defining folder boundaries, data contracts, state management, storage, parser integration, test strategy, or implementation plans.
---

# Frontend technical architecture

## When to use
Use when selecting libraries, defining folder boundaries, data contracts, state management, storage, parser integration, test strategy, or implementation plans.

## Read first
- `AGENTS.md`
- `docs/TASK_PROTOCOL.md`
- 
docs/ARCHITECTURE.md- docs/REQUIREMENTS.md- docs/ROADMAP.md

## Procedure
1. Identify the user's exact request and current roadmap phase; check approved decisions and relevant requirements.
2. Separate confirmed facts, assumptions, proposals, and unresolved decisions.
3. Produce the smallest useful deliverable for the requested stage; do not start implementation unless explicitly authorized.
4. Check effects on financial correctness, source traceability, optional Folio, English/Hebrew output, and project persistence where applicable.
5. State impacted documents and acceptance criteria; request approval before changing approved scope or architecture.

## Domain guardrail
Clean-slate V12 uses React + TypeScript + Vite, PDF.js, ExcelJS, IndexedDB, Vitest. Engine must be pure and independent of UI and IO. V11 is read-only reference, never runtime dependency.

## Output contract
Architecture proposal with boundaries, data flow, API/types, error handling, test plan, alternatives and consequences.

## Definition of done
- Traceable to requirements and a roadmap phase.
- No unapproved product decisions presented as approved.
- Open questions and verification steps are explicit.
- Documentation updates proposed or applied only within the authorized scope.
