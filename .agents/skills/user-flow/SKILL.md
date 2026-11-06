---
name: user-flow
description: User journey and flow design. Use when designing or revising end-to-end steps, branching states, recovery paths, and navigation.
---

# User journey and flow design

## When to use
Use when designing or revising end-to-end steps, branching states, recovery paths, and navigation.

## Read first
- `AGENTS.md`
- `docs/TASK_PROTOCOL.md`
- 
docs/REQUIREMENTS.md- docs/USER_FLOW.md- docs/DECISIONS.md

## Procedure
1. Identify the user's exact request and current roadmap phase; check approved decisions and relevant requirements.
2. Separate confirmed facts, assumptions, proposals, and unresolved decisions.
3. Produce the smallest useful deliverable for the requested stage; do not start implementation unless explicitly authorized.
4. Check effects on financial correctness, source traceability, optional Folio, English/Hebrew output, and project persistence where applicable.
5. State impacted documents and acceptance criteria; request approval before changing approved scope or architecture.

## Domain guardrail
Default flow: Saved Breakdowns/New Breakdown → Upload New Reports/Use Saved Reports → Select Group → Optional Folio → Contract Setup → Preview → Excel Export. Show missing-data and retry paths.

## Output contract
An updated step-by-step user flow with entry/exit, states, errors, optional paths, and mapping to requirements.

## Definition of done
- Traceable to requirements and a roadmap phase.
- No unapproved product decisions presented as approved.
- Open questions and verification steps are explicit.
- Documentation updates proposed or applied only within the authorized scope.
