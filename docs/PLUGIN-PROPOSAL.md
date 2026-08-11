# ARH-Baca Plugin Proposal — Student Dashboard Extensions

## Context

ARH-Baca is a collaborative study platform (successor to the Deckmate + Studio idea). The current scaffold runs:

- Laravel 13.x
- PHP 8.4
- Tailwind CSS v4
- Vite + TypeScript
- Quality gate: Pint, PHPStan/Larastan, PHPUnit, Rector, ESLint, Prettier, Secretlint, Playwright

The goal is to add student-facing capabilities: exam calendar, notes, target dates, project collaboration, and deep UI personalization (fonts, font sizes, themes including light/dark and additional presets). The listed candidate repositories were inspected for fit.

## Target stack recommendation

**Adopt Filament v4 panels as the dashboard shell.**

Why Filament v4:

- Native Laravel 13 support.
- Ships with Livewire v4, forms, tables, actions, notifications, and panels out of the box.
- Most of the high-quality plugins evaluated target Filament v4/v5 and Laravel 11/12/13.
- Tailwind v4 theme file is the standard integration path.

Trade-off: one attractive plugin, `tomatophp/filament-notes`, is Filament v3 only. We will skip it in favor of a v4-compatible notes approach (see Notes section below).

## Evaluation summary

| Plugin                                                   | Category                  | Filament       | Laravel      | Verdict                                            |
| -------------------------------------------------------- | ------------------------- | -------------- | ------------ | -------------------------------------------------- |
| `spatie/laravel-dashboard`                               | Dashboard tiles / widgets | N/A (Livewire) | 11/12/13     | **Adopt** as optional widget layer                 |
| `saade/filament-fullcalendar`                            | Exam calendar             | 4/5            | 10/11/12/13  | **Adopt**                                          |
| `silasrm/filament-themes`                                | Complete theme switcher   | 4/5            | 11/12/13     | **Adopt**                                          |
| `slym758/filacraft`                                      | Deep UI customization     | 4/5            | 11+          | **Adopt**                                          |
| `tales-virtualy/filament-kanban-board`                   | Kanban / project boards   | 3/4/5          | Compatible   | **Adopt**                                          |
| `LACV/pipo-scanner`                                      | Document scanner          | 3/5            | 10/11/12/13  | **Optional** for mobile scan-to-PDF                |
| `wirechat/wirechat`                                      | Messaging                 | N/A (Livewire) | Check latest | **Adopt** instead of `adultdate/filament-wirechat` |
| `tomatophp/filament-notes`                               | Sticky notes              | 3 only         | 11+          | **Skip** — v3 blocker                              |
| `alessandronuunes/tasks-management`                      | Task management           | 3 only         | 11           | **Skip** — v3 blocker, stale                       |
| `creativetimofficial/soft-ui-dashboard-laravel-livewire` | Full starter app          | N/A            | 11           | **Reference only** — not a package                 |
| `andrewandante/silverstripe-pdf-parser`                  | PDF parsing               | N/A            | SilverStripe | **Reject** — wrong framework                       |

## Plugin-by-plugin verdict

### 1. Exam calendar — `saade/filament-fullcalendar`

- **Status:** Active. Default branch `4.x`, latest release `v4.0.0-beta7` (April 2026), last push July 2026, 415 stars.
- **Stack:** PHP 8.2+, Filament 4/5, Laravel 10–13.
- **Why it fits:** FullCalendar is the de-facto calendar widget. Provides drag-and-drop, modal create/edit/view/delete actions powered by Filament Actions, timezone/locale config, and multiple views (dayGrid, timeGrid, list, multiMonth).
- **How to use for exams:** create an `Event` model with `title`, `starts_at`, `ends_at`, `type` (exam/quiz/deadline), `note_id` (nullable link to notes), and a `calendarable` morph relation so exams can belong to a subject, project, or user. The widget fetches events by date range.
- **Integration effort:** medium — requires a custom Filament theme CSS file with `@source` directives for the package views.
- **Verdict:** **Primary recommendation**.

### 2. UI themes — `silasrm/filament-themes`

- **Status:** Active. Last push July 2026. No releases yet, but README is complete.
- **Stack:** PHP 8.2+, Filament 4/5, Laravel 11/12/13.
- **Why it fits:** Gives users a built-in theme page with live-preview swatches. Supports per-user, global, and per-tenant persistence. Ships light, pastel, and dark presets. Pure CSS overlay — no asset build required.
- **How to use:** register `ThemesPlugin::make()->perUser()->global()` in the panel provider. Add a `theme` column/string attribute on `users`.
- **Integration effort:** low.
- **Verdict:** **Adopt** for the "several more themes" requirement.

### 3. Deep UI customization — `slym758/filacraft`

- **Status:** Active. Last push July 2026, 4 stars. Package name on Packagist is `slym758/filacraft`.
- **Stack:** PHP 8.2+, Filament 4/5, Laravel 11+.
- **Why it fits:** The most comprehensive personalization toolkit evaluated: 5 layout presets, 13 color palettes, Google Fonts, border radius, density, table/card styles, error page styles. Per-user persistence via `user_theme_settings` JSON column plus `localStorage` instant sync.
- **How to use:** `composer require slym758/filacraft`, `php artisan filacraft:install`, register `FilaCraftPlugin`, rebuild assets.
- **Caveat:** Targets `fi-*` CSS classes, so a Filament minor release could need a package update. Snapshot-tested in CI per README.
- **Integration effort:** medium.
- **Verdict:** **Adopt** for the "font, font size, color theme, density" requirement.

#### Theme strategy: `silasrm/filament-themes` + `filacraft`

Use `filament-themes` as the quick "pick a preset" switcher, and `filacraft` as the advanced "tune every knob" page. They can coexist if theme scopes are separated:

- `filament-themes` manages the global preset family (light/pastel/dark).
- `filacraft` manages per-user fine-tuning inside that family.

If that combination proves fragile, **pick one**:

- Start with `filament-themes` for speed.
- Upgrade to `filacraft` if students need font and density control.

### 4. Project collaboration boards — `tales-virtualy/filament-kanban-board`

- **Status:** Active. Last push May 2026. No releases, but README is detailed.
- **Stack:** PHP 8.2+, Filament 3/4/5, Livewire 3/4, Tailwind 3/4.
- **Why it fits:** Provides boards, lists, cards, drag-and-drop, checklists, attachments, comments, activity history, members, tags, due dates, and archiving. Covers the "project collaboration work" requirement beyond simple messaging.
- **How to use:** register `FilamentKanbanPlugin`, run migrations, add `@source` to the panel theme CSS, create default tags via seeder.
- **Integration effort:** medium — theme CSS setup is required or the board renders unstyled.
- **Verdict:** **Adopt** as the collaboration workspace.

### 5. Messaging — `wirechat/wirechat` (replaces `adultdate/filament-wirechat`)

- **Status:** Active. Latest release `v0.6.0` (July 2026), 574 stars.
- **Why the listed wrapper is rejected:** `adultdate/filament-wirechat` is a Filament wrapper around WireChat. Its `composer.json` requires `laravel/framework: ^10.0|^11.0|^12.0` and `filament/filament: ^4.0`, but **not Laravel 13**. The repo also appears to be an archive/fork (`blhk0532/filament-wirechat-archive` upstream). Reuse the upstream package instead.
- **How to use:** `composer require wirechat/wirechat`, publish config/migrations, add the `Chatable` trait to `User`, configure broadcasting (Pusher/Redis/Laravel Reverb). Embed the chat component in a Filament custom page or use it in a Livewire page outside Filament.
- **Integration effort:** medium-high — real-time broadcasting adds infrastructure (queue worker + Reverb/Pusher + Laravel Echo).
- **Verdict:** **Adopt upstream `wirechat/wirechat`** for student-to-student and group messaging.

### 6. Notes — skip `tomatophp/filament-notes`, build v4-native

- **Why skip:** `tomatophp/filament-notes` requires `filament/filament: ^3.0`. It will not install on a Filament v4 project.
- **Recommended alternative:** Build a lightweight `Note` resource with Filament v4 native components:
  - `TextInput::make('title')`
  - `RichEditor::make('body')`
  - `ColorPicker::make('background_color')`
  - `ColorPicker::make('text_color')`
  - `Toggle::make('is_pinned')`
  - `Select::make('visibility')->options(['private','shared','public'])`
  - Morph relation to `subject`, `event`, or `project`.
- **Widget:** add a `NotesWidget` to the dashboard showing pinned + recent notes.
- **Link to calendar:** `events.note_id` nullable foreign key, so clicking an exam opens its note.
- **Verdict:** **Custom build** using Filament v4 primitives.

### 7. Document scanning — `LACV/pipo-scanner`

- **Status:** Active. Latest release `v1.0.2` (March 2026), last push July 2026.
- **Stack:** PHP 8.1+, Filament 3/5, Laravel 10–13.
- **Why optional:** Useful for students scanning handwritten notes or assignment sheets into PDF. Browser-based OpenCV.js edge detection, multi-page PDF, mobile support (HTTPS required).
- **Caveat:** Supports Filament 3 and 5, but **not 4**. If ARH-Baca stays on Filament 4, this package cannot be used unless the maintainer adds v4 support or we fork/contribute.
- **Verdict:** **Park** until v4 support is confirmed.

### 8. `spatie/laravel-dashboard`

- **Status:** Mature. Latest release `4.0.0` (March 2026), 574 stars.
- **Stack:** PHP 8.3+, Laravel 11/12/13, Livewire 4.
- **Why it fits:** Provides a simple tile-based dashboard framework. Could be used for a public/student landing dashboard before students enter the Filament panel.
- **Verdict:** **Optional adopt** if a non-Filament public dashboard is desired. Not required if the whole student experience lives inside Filament panels.

### 9. Rejected

- `creativetimofficial/soft-ui-dashboard-laravel-livewire`: full Laravel 11 starter app, not a Composer package. Useful as UI inspiration only.
- `alessandronuunes/tasks-management`: Filament 3 only, stale dependencies (testbench 8, PHPUnit 10), Portuguese-first docs.
- `andrewandante/silverstripe-pdf-parser`: SilverStripe module, irrelevant to Laravel.

## Recommended architecture

```
ARH-Baca (Laravel 13 + Filament v4 panel)
├── Dashboard shell
│   └── Filament v4 panel: "student"
├── Personalization
│   ├── silasrm/filament-themes  → preset switcher
│   └── slym758/filacraft        → font, density, radius, color, layout
├── Calendar
│   └── saade/filament-fullcalendar + App\Models\Event
├── Notes
│   └── Custom Filament v4 Note resource + NotesWidget
├── Collaboration
│   ├── tales-virtualy/filament-kanban-board  → project boards
│   └── wirechat/wirechat                     → direct/group chat
└── Optional future
    └── LACV/pipo-scanner (pending Filament v4 support)
```

## Implementation phases

### Phase 0 — Filament base

1. `composer require filament/filament`
2. Create the `student` panel provider.
3. Set up `resources/css/filament/student/theme.css` with the standard Filament theme import and `@source` paths for chosen plugins.
4. Add the panel Vite input to `vite.config.js`.
5. Run `pnpm run build` and verify `php artisan filament:install --panels` output.

### Phase 1 — Personalization

1. `composer require silasrm/filament-themes slym758/filacraft`
2. Register both plugins in the `student` panel.
3. Add `theme` string column to `users` for `filament-themes`.
4. Run migrations.
5. Playwright rehearsal: switch theme, change font, assert persistence across reload.

### Phase 2 — Calendar + Notes

1. Create `Event` migration/model/policy with fields: `title`, `description`, `starts_at`, `ends_at`, `type`, `note_id`, `calendarable` morphs.
2. `composer require saade/filament-fullcalendar`
3. Add `CalendarWidget` extending `FullCalendarWidget`.
4. Create custom `Note` resource.
5. Link `Event` → `Note` and add a "view note" action on calendar events.
6. Playwright rehearsal: create exam, open linked note.

### Phase 3 — Collaboration

1. `composer require tales-virtualy/filament-kanban-board`
2. Register plugin, run migrations, seed default tags.
3. `composer require wirechat/wirechat`
4. Publish config/migrations, add `Chatable` trait to `User`, configure broadcasting.
5. Add a "Messages" custom page in the panel embedding the WireChat component.
6. Playwright rehearsal: create board, move card, send message.

### Phase 4 — Optional scanner

1. Re-evaluate `LACV/pipo-scanner` for Filament v4 support.
2. If unsupported, either contribute upstream or build a thin wrapper using the package's frontend assets directly.

## Version compatibility watchlist

| Package                                | Constraint today            | Risk                        |
| -------------------------------------- | --------------------------- | --------------------------- |
| `saade/filament-fullcalendar`          | `filament ^4.0\|^5.0`       | Low                         |
| `silasrm/filament-themes`              | `filament ^4.0\|^5.0`       | Low (no stable release yet) |
| `slym758/filacraft`                    | `filament ^4.0\|\|^5.0`     | Low                         |
| `tales-virtualy/filament-kanban-board` | `filament ^3.0\|^4.0\|^5.0` | Low                         |
| `LACV/pipo-scanner`                    | `filament ^3.0\|^5.0`       | **High** — no v4 support    |
| `adultdate/filament-wirechat`          | `laravel ^10\|^11\|^12`     | **Blocker** — no Laravel 13 |
| `tomatophp/filament-notes`             | `filament ^3.0`             | **Blocker** — no v4 support |

## Risks and mitigations

| Risk                                     | Mitigation                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Two theme plugins conflict               | Start with one; isolate responsibilities; keep customization behind feature flag |
| WireChat real-time infra                 | Use Laravel Reverb (official, Laravel 11+) or Pusher; run queue worker in prod   |
| Kanban board CSS missing                 | Always include package `@source` path in panel theme CSS and rebuild             |
| `filament-themes` has no stable release  | Pin to a specific commit/hash or wait for first release before production        |
| Filament v4 minor breaks `filacraft` CSS | Monitor package updates; keep a visual Playwright regression suite               |

## Open questions / parked items

1. Should the scanner be forked for Filament v4, or replaced with a simpler file upload + OCR pipeline?
2. Do students need a public non-Filament landing page, justifying `spatie/laravel-dashboard`?
3. Should WireChat conversations be scoped per class/cohort, or global across the platform?
4. Which notification channel should exam reminders use — email, in-app, or both?

These decisions are recorded in `PARKED.md` alongside the manual Infisical/GitHub secret steps.

## References

All inspected repositories are available as git submodules under `research/plugins/` for offline review and version pinning.

| Submodule path                                        | Repository                                               | Inspected commit |
| ----------------------------------------------------- | -------------------------------------------------------- | ---------------- |
| `research/plugins/filament-notes`                     | `tomatophp/filament-notes`                               | `master` HEAD    |
| `research/plugins/laravel-dashboard`                  | `spatie/laravel-dashboard`                               | `main` HEAD      |
| `research/plugins/soft-ui-dashboard-laravel-livewire` | `creativetimofficial/soft-ui-dashboard-laravel-livewire` | `master` HEAD    |
| `research/plugins/filament-themes`                    | `silasrm/filament-themes`                                | `main` HEAD      |
| `research/plugins/filament-fullcalendar`              | `saade/filament-fullcalendar`                            | `4.x` HEAD       |
| `research/plugins/filament-filacraft-themes`          | `slym758/filament-filacraft-themes`                      | `main` HEAD      |
| `research/plugins/filament-wirechat`                  | `adultdate/filament-wirechat`                            | `master` HEAD    |
| `research/plugins/filament-kanban-board`              | `tales-virtualy/filament-kanban-board`                   | `main` HEAD      |
| `research/plugins/tasks-management`                   | `alessandronuunes/tasks-management`                      | `main` HEAD      |
| `research/plugins/pipo-scanner`                       | `LACV/pipo-scanner`                                      | `main` HEAD      |
| `research/plugins/silverstripe-pdf-parser`            | `andrewandante/silverstripe-pdf-parser`                  | `main` HEAD      |

## Next step

Approve this proposal and Phase 0 (Filament v4 base install). Once approved, the agent can run the Composer installations, generate the panel, and begin the phased integration with Playwright rehearsals at each phase.
