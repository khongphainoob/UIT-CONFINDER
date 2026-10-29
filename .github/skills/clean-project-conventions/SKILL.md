---
name: clean-project-conventions
description: "Use when implementing or reviewing UIT ConFinder docs, HTML/CSS UI, JavaScript, or Python. Keeps changes concise, accessible, modular, testable, and consistent with the project contracts."
argument-hint: "Describe the task, files, or completed feature to review"
user-invocable: true
---

# Clean project conventions

Use this skill before coding and again before marking a task complete.

## 1. Read the source of truth

1. Read the relevant contract in `docs/contracts.md`.
2. Read ownership in `docs/ownership.md` before changing a shared file.
3. Reuse existing tokens, helpers, naming, and state shapes.
4. Keep a task focused. Do not mix unrelated cleanup into the same change.

## 2. Documentation

Write for the next contributor, not as a work diary.

- Start with purpose and scope in one short paragraph.
- Prefer headings, tables, and bullets over long prose.
- Document decisions, public interfaces, constraints, and verification.
- Use one canonical location for each rule; link to it instead of duplicating it.
- Put examples next to the interface they explain.
- Use exact names for files, functions, parameters, states, and commands.
- Separate `Implemented`, `Not implemented`, and `Known limitations`.
- Remove stale TODOs, speculative plans, duplicated requirements, and personal commentary.
- Keep task completion notes to: `Changed`, `Verified`, `Limitations`, and `Follow-up`.

### Completion note template

```md
## Task completion

- **Changed:** ...
- **Verified:** `command` — result
- **Limitations:** ...
- **Follow-up:** ...
```

Only include a line when it has useful information. Do not claim browser or integration
verification when only syntax or unit tests were run.

## 3. HTML and CSS UI

- Use semantic HTML and one clear heading hierarchy.
- Associate every form control with a visible `label`; preserve keyboard focus.
- Use existing design tokens for color, spacing, type, radius, and motion.
- Keep page layout in `css/pages/`; keep reusable styles in shared component files.
- Use classes for styling. Avoid inline styles and unnecessary IDs.
- Design loading, error, empty, focus, disabled, and responsive states.
- Keep text in the page language and make link/button labels describe the action.
- Use relative asset URLs so the site works below a repository subpath.
- Do not hide errors behind an empty or success-looking state.

## 4. JavaScript

- Use ES modules and explicit imports/exports.
- Keep pure parsing, filtering, sorting, and formatting functions separate from DOM code.
- Prefer `const`; use `let` only for reassignment. Use descriptive names.
- Validate URL, JSON, storage, and user input at boundaries.
- Pass one fixed `now` value through a complete filtering/rendering operation.
- Respect contracts in `docs/contracts.md`; do not silently change object shapes.
- Render user-controlled text with `textContent`, not `innerHTML`.
- Handle loading, empty, and error states explicitly. Preserve useful error context.
- Avoid global mutable state, duplicated listeners, repeated fetches, and magic numbers.
- Keep functions small enough to test with fixed inputs and outputs.

## 5. Python

- Keep the standard library solution small and explicit for project tooling.
- Use `pathlib.Path` for paths and avoid working-directory assumptions.
- Add type hints to public functions and use clear names.
- Keep server setup separate from request/business logic.
- Handle expected shutdown and errors deliberately; do not use broad `except`.
- Make commands reproducible and document the exact invocation.

## 6. Verification before completion

1. Inspect the diff and confirm only task-related files changed.
2. Run the smallest relevant test or syntax check.
3. For UI changes, check Console/Network, keyboard use, and 360/768/1366 px.
4. Verify URL state, relative paths, loading/error/empty states, and malformed input
   when the task touches them.
5. Update the relevant `docs/` file with only the final contract and verification.
6. Report what was verified and what was not verified. Never report an unrun command as
   passing.
