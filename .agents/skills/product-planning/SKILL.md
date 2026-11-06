---
name: product-planning
description: Product planning and scope control. Use when deciding product scope, priorities, milestones, dependencies, or changing an approved product decision.
---

# Product planning and scope control

## When to use
Use when deciding product scope, priorities, milestones, dependencies, or changing an approved product decision.

## Read first
- `AGENTS.md`
- `docs/TASK_PROTOCOL.md`
- 
docs/PROJECT_VISION.md- docs/REQUIREMENTS.md- docs/ROADMAP.md- docs/DECISIONS.md

## Procedure
1. Identify the user's exact request and current roadmap phase; check approved decisions and relevant requirements.
2. Separate confirmed facts, assumptions, proposals, and unresolved decisions.
3. Produce the smallest useful deliverable for the requested stage; do not start implementation unless explicitly authorized.
4. Check effects on financial correctness, source traceability, optional Folio, English/Hebrew output, and project persistence where applicable.
5. State impacted documents and acceptance criteria; request approval before changing approved scope or architecture.

## Domain guardrail
Never silently expand scope. Mark decisions as proposed until the user approves them. A phase is complete only when its exit criteria are verified.

## Output contract
A decision proposal with problem, alternatives, tradeoffs, recommended scope, impacted requirement IDs, roadmap phase, and unresolved questions.

## Definition of done
- Traceable to requirements and a roadmap phase.
- No unapproved product decisions presented as approved.
- Open questions and verification steps are explicit.
- Documentation updates proposed or applied only within the authorized scope.
