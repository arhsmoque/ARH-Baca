---
name: flow-of-events-first
description: Use at the start of any new project or major feature to define objectives, before implementing/reviewing/claiming done any change that touches what a real actor does end-to-end, and when designing a governing/gating mechanism (hooks, validation, permission checks) that must survive cases it didn't anticipate. Route through this before writing a workflow doc or code, before reporting a UI change as working, and before treating a project's objectives as final. Trigger on "add a feature", "fix the flow", "is this done", "test this", "what should this project achieve", "design this hook/check", or any moment about to claim a rendered UI change is verified.
---

# Flow of Events First

The foundation this project is built on. Every line of code, every UI decision, every governing script should trace back to it.

> **This file is the synced, principles-only layer.** Repo-specific incidents and worked examples live in `recipes/` — never synced, always local.

## Core stance

A workflow is not the starting point, and neither is a stated objective on its own. Both are abstractions. Start with the **flow of events**: what actually happens, to a real person, in the real context, regardless of whether any software exists for it.

```text
flow of events --> required actions --> workflow --> implementation --> verification
(ground truth,     (what must be       (designed     (code that          (rehearse the
 per entrypoint,     made possible,      to cater to   realizes the        SAME flow of
 software-           derived, not        the actions,  workflow)           events against
 independent)        assumed)            per                               rendered pixels,
                                          entrypoint)                       not code/state)
```

Skipping straight to "here's the workflow" risks designing around whatever's already built. Skipping verification against rendered pixels risks shipping a correctly-specified but non-functional workflow.

## Layer 1 — capture the flow of events, per entrypoint

Before writing a workflow doc or touching code, write the flow of events in plain language, sourced from something outside your own prior work: the real product, real screenshots, the operator's words, a real conversation — not from an existing data file, workflow doc, or current code.

For each entrypoint touched, ask:

- What does this person actually do, want, or decide, independent of any screen?
- What real-world constraint governs it?
- What triggers this flow, and what real-world state change ends it?

Write this down. A few sentences per entrypoint is enough, but it must exist as text before layer 2.

## Layer 2 — derive the required actions

State what must be made _possible_ for each flow to complete — not yet how. "A student must be able to see today's exam at a glance" is a required action. "Render a calendar widget" is already a workflow decision.

If you can't state the required action without naming a UI element, you've skipped to layer 3.

## Layer 3 — design the workflow

Map required actions onto this system: screens, steps, data changes, order. Every workflow step traces back to a required action from layer 2, which traces back to layer 1.

Repeat layers 1-3 for every entrypoint the change touches.

## Layer 4 — implement

Implement against the workflow from layer 3. Keep layer 1 in reach — you'll need it verbatim in layer 5.

## Layer 5 — verify by rehearsing, not by reading

Non-negotiable, and a different activity from layers 1-4:

- Re-walk the exact flow of events from layer 1 against the **rendered** result. Click what a real user would click, in the order they'd click it. Screenshot or record it.
- Static checks, unit tests, and clean diffs are necessary but never sufficient on their own for anything with a UI.
- If the check can't run against a UI (batch job, API-only), exercise it exactly the way its real caller does and observe the real output.
- A working flow of events beats a clean implementation. If forced to choose, ship the one that works, then clean it up.

See `checklists/rehearsal-verification-checklist.md` for the concrete checklist.

## Iterate the destination

The first objective is the clearest current hypothesis, not an immutable destination. If rehearsal exposes a better end shape, revise the objective and record why. This is disciplined discovery, not scope creep, as long as it stays tied to the actor's real flow.

## Design for imperfection

No flow-of-events capture is complete. Build governing/gating mechanisms with a scoped exception path from day one. A one-off exception must identify actor, action, scope, reason, and expiry/review condition. Repeated exceptions signal that the core rule missed a real pattern — that's the point to fold it back into the rule, not before.

## Where this repo's own examples live

- `checklists/rehearsal-verification-checklist.md` — generic checklist; adapt the repo-specific parenthetical if needed.
- `recipes/` — **never synced, always local.** This repo's own worked examples, incidents, and exceptions-already-applied. Start empty is fine; see `recipes/README.md`.

## Output contract

When using this skill, report:

```yaml
flow_first_result:
  entrypoints_touched: []
  flow_of_events: '' # plain language, per entrypoint, sourced outside own prior work
  required_actions: [] # what must be possible, one per flow-of-events item, pre-UI
  workflow_derived: '' # the system steps, each traced to a required action
  implementation_summary: ''
  rehearsal_performed: [] # what was actually watched/screenshotted, per entrypoint/surface
  rehearsal_gaps: [] # any entrypoint/surface NOT rehearsed, and why
  bugs_found_by_rehearsal: [] # anything a code/state-only check would have missed
  objective_revised: '' # if layer 5 changed what "done" means
```

Do not report a UI-touching change as done until `rehearsal_performed` covers every entrypoint/surface the change touches.
