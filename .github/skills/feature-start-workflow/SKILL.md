---
name: feature-start-workflow
description: "Use when starting a new UIT ConFinder feature, task, module, API, UI flow, or test. Defines the file/folder plan, naming, contract-first design, test cases, and clean implementation checklist."
argument-hint: "Describe the feature to plan and implement"
user-invocable: true
---

# Feature start workflow

Use this skill before creating the first file of a feature. Keep the plan short and
turn it into code in the same task.

## 0. Start with the skill

Call the skill explicitly at the beginning of a task:

```text
/feature-start-workflow
```

Then send a task prompt with the task ID, owner, goal, scope, dependency, and
acceptance criteria. `T` always means `Task`.

Use this prompt:

```text
/feature-start-workflow

Task: T<number>
Owner: TV<number>
Goal: <one sentence>
Scope: <files/module/page allowed to change>
Dependency: <None or merged task/API>
Acceptance criteria:
- <observable result 1>
- <observable result 2>

Before coding:
1. Inspect the relevant contract, ownership, and existing implementation.
2. Propose the file plan, API shape, test cases, branch name, and PR title.
3. Stop for confirmation if the scope or contract is ambiguous.
After confirmation, implement and verify the task.
```

Example:

```text
/feature-start-workflow

Task: T1
Owner: TV3
Goal: Persist Explore filter state in the URL.
Scope: site/js/pages/explore-state.js, tools/explore-state.test.mjs,
docs/contracts.md
Dependency: None
Acceptance criteria:
- Repeated URL parameters support multi-select filters.
- Parsing and serialization are independent of the DOM.
- Unit tests cover defaults, invalid values, and round trips.
```

## 1. Define the feature

Write four lines before coding:

```md
Goal: ...
Input: ...
Output: ...
Done when: ...
```

Then identify the owner, affected page/module, shared files, and dependencies. Read
`docs/contracts.md`, `docs/ownership.md`, and the nearest existing implementation.

## 2. Choose paths and names

Use the existing project structure. Do not create a new top-level folder for a single
feature.

| Concern | Location | Naming |
|---|---|---|
| Page | `site/<page>.html` | lowercase kebab-case |
| Page JavaScript | `site/js/pages/<page>.js` | lowercase kebab-case |
| Shared JavaScript | `site/js/<module>.js` | noun or domain, lowercase kebab-case |
| UI helper | `site/js/ui/<helper>.js` | reusable UI concern |
| Shared CSS | `site/css/<layer>.css` | `tokens`, `base`, or `components` |
| Page CSS | `site/css/pages/<page>.css` | same stem as the page |
| Static data | `site/data/<name>.json` | lowercase kebab-case |
| Python tooling | `tools/<tool>.py` | lowercase snake_case |
| Unit tests | `tools/<module>.test.mjs` | same module stem plus `.test.mjs` |
| Feature docs | `docs/<feature>.md` | lowercase kebab-case |

Use one clear name everywhere. Do not mix `exploreState`, `explore-state`, and
`explore_state` for the same concept. Keep existing Vietnamese page filenames when
they are already part of the public site.

## 3. Design the contract first

Before implementation, record the smallest public API:

```js
functionName(input) -> output
```

Define:

- required and optional input fields;
- output shape and stable IDs;
- valid states and default values;
- error behavior and user-visible handling;
- side effects such as DOM, URL, storage, network, or events;
- one example input and output.

Pure parsing, filtering, sorting, validation, and formatting functions should not
depend on the DOM. If the contract changes, update `docs/contracts.md` and notify
the module owner in the same PR.

## 4. Plan tests before code

Create tests beside the implementation plan, not after a happy-path implementation.
Cover at least:

- valid minimum input;
- empty input and default state;
- invalid or malformed input;
- boundary values and duplicate values;
- expected error behavior;
- one integration path for URL, storage, fetch, or DOM when applicable.

Use fixed fixtures and fixed `now` values. Test observable input/output, not private
implementation details. Keep test data separate from the production snapshot.

## 5. Implement in small layers

1. Add or update the contract and fixture.
2. Implement pure logic and its tests.
3. Add the page/module integration.
4. Add loading, error, empty, disabled, and responsive UI states when relevant.
5. Update the feature doc with only the final behavior and verification.

Avoid unrelated refactors, duplicate helpers, magic numbers, global mutable state,
silent fallbacks, and speculative abstractions.

## 6. Commit, PR, and handoff

Use one branch and one PR per task. In this project, `T` always means `Task`.
Write the task number as `Task T<number>` in human-readable text. Keep names short
and searchable:

```text
feat/task-1-tv3-filter-state
fix/task-1-tv3-filter-state-url
docs/task-1-testing-guidelines
```

Commit messages use an imperative Conventional Commit style:

```text
feat(tv3): implement explore filter state
fix(data): reject invalid deadline input
test(tv3): cover repeated URL parameters
docs(workflow): define task handoff
```

Before committing:

1. Review `git diff` and remove unrelated changes, secrets, generated files, and
   personal files.
2. Run the smallest relevant test and `git diff --check`.
3. Update the relevant docs with the final contract and verification.
4. Commit only the completed task. Do not mix formatting or unrelated refactors.

PR titles follow:

```text
[Task T1][TV3] Implement explore filter state
[Task T1][TV3] Fix filter URL synchronization
```

The PR description must state:

- `Task`: `T` means Task; include the task ID and goal;
- `Changed`: files and behavior;
- `API/Contract`: changed or `None`;
- `Verification`: exact commands and result;
- `Limitations`: known gaps;
- `Handoff`: what the next task can use;
- `Screenshots`: for UI changes.

After review, merge the PR into `main`. The next person must update local `main`
before branching:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/task-1-tv3-list-page
```

Never build task 2 from an old local branch. If task 2 depends on task 1, task 1
must be merged first, or the dependency must be explicitly stated in the PR.

## 7. Prompts for later stages

Use these prompts after the start prompt. Replace placeholders; do not claim a
verification result that was not actually run.

### Implement

```text
Continue Task T<number>. Implement the approved plan only.
Preserve existing contracts and unrelated worktree changes.
Keep pure logic separate from DOM code.
Add focused tests for valid, empty, invalid, and boundary inputs.
Do not commit yet. Report changed files and remaining risks.
```

### Verify

```text
Verify Task T<number> against its acceptance criteria.
Run the smallest relevant tests, syntax checks, and git diff --check.
For UI, check Console/Network, keyboard use, relative paths, and
360/768/1366 px where applicable.
Report exact commands, results, limitations, and any failing case.
Do not modify unrelated files.
```

### Commit and PR

```text
Finish Task T<number>.
Review the diff, remove unrelated changes, update the relevant docs, and
prepare (but do not push or create a PR without confirmation):
- Conventional Commit message: <type>(<scope>): <imperative summary>
- Branch: <type>/task-<number>-<scope>-<short-name>
- PR title: [Task T<number>][TV<owner>] <Verb> <scope>
- PR body using .github/pull_request_template.md
Include exact verification results and a Handoff for the next task.
```

## 8. Completion checklist

- [ ] The task prompt includes Task ID, owner, scope, dependency, and acceptance criteria.
- [ ] The file plan and API were reviewed before implementation.
- [ ] File and folder names follow the table.
- [ ] The feature has one owner and a clear scope.
- [ ] Public API and error behavior are documented.
- [ ] Existing contracts and shared helpers are preserved.
- [ ] Pure logic has focused tests, including invalid input.
- [ ] UI has loading/error/empty/accessibility states where relevant.
- [ ] Relative paths work under a repository subpath.
- [ ] Relevant docs state `Changed`, `Verified`, and `Limitations`.
- [ ] `git diff --check` and the smallest relevant test pass.
- [ ] Commit and PR names follow the conventions.
- [ ] PR description includes verification and handoff information.

## 7. Completion checklist

- [ ] File and folder names follow the table.
- [ ] The feature has one owner and a clear scope.
- [ ] Public API and error behavior are documented.
- [ ] Existing contracts and shared helpers are preserved.
- [ ] Pure logic has focused tests, including invalid input.
- [ ] UI has loading/error/empty/accessibility states where relevant.
- [ ] Relative paths work under a repository subpath.
- [ ] Relevant docs state `Changed`, `Verified`, and `Limitations`.
- [ ] `git diff --check` and the smallest relevant test pass.
- [ ] Commit and PR names follow the conventions.
- [ ] PR description includes verification and handoff information.
