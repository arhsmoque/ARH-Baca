# Rehearsal verification checklist

Use before claiming any UI-touching change is done. Tick only what you actually observed; leave unticked and explain why if a surface could not be rehearsed.

## Pre-rehearsal

- [ ] The flow of events was written before implementation (layer 1).
- [ ] Required actions were derived before choosing UI shapes (layer 2).
- [ ] The implemented workflow traces back to those required actions (layer 3).
- [ ] A clean baseline was established: run `pnpm run check` and confirm it passes before rehearsing.
- [ ] The browser state is representative (fresh session / logged-in test user / seeded data if needed).

## During rehearsal

- [ ] Rehearsed on **desktop** (≥1280 px) if the change affects desktop layout.
- [ ] Rehearsed on **mobile** (≤414 px, e.g. Pixel 7) if the change affects mobile layout.
- [ ] Rehearsed on **tablet** (768–1024 px, e.g. iPad) if the change affects tablet layout.
- [ ] Used a real browser render, not just DOM inspection or a static screenshot.
- [ ] Performed the exact sequence from the flow of events, not a shortcut.
- [ ] Checked both the happy path and at least one representative error/denied path.
- [ ] Verified visible text, touch targets, focus states, and loading/error states.
- [ ] Verified dark mode if the surface supports theming.

## After rehearsal

- [ ] Screenshots, recordings, or Playwright report artifacts are attached.
- [ ] Any mismatch between the rendered result and the flow of events is filed as a bug or explicit gap.
- [ ] `pnpm run check` still passes after any fixes.
- [ ] CI Playwright job (`ui.yml`) would pass with the same test code.

## When to add a Playwright test

Add or update a test under `tests/e2e/` when:

- The flow is business-critical (auth, payment, exam creation, messaging).
- The flow has regressed before.
- The change crosses multiple pages or async states.

Keep tests deterministic: seed data via factories, use `data-testid` or accessible selectors, avoid waits tied to animation duration.
