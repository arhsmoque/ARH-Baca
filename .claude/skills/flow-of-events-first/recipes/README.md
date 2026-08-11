# Flow-of-events-first recipes — ARH-Baca

This directory is for **local, repo-specific** worked examples of the `flow-of-events-first` skill. Do not sync this file to other repos.

Each recipe should:

1. Name the pattern or incident.
2. Show exactly where and how it showed up in ARH-Baca.
3. Link to the relevant PR, issue, or diagnostic evidence if available.

Start empty is fine. Add a recipe when:

- A UI bug slips through code review and is caught only by rehearsal.
- A governing/check/gate needs a scoped exception path.
- An iteration of layer 5 changes what "done" means for a feature.

Template:

```markdown
# Recipe title

## What happened

## Flow of events (layer 1)

## Required actions (layer 2)

## Workflow decision (layer 3)

## Implementation note

## Rehearsal outcome (layer 5)

## Objective revision, if any
```
