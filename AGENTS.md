# Repository Agent Instructions

These rules apply to the entire `personal_website_generator` repository.

## Codex Loop Responsibilities
- Operate autonomously when launched by the Codex CLI loop; no human input is expected during iterations.
- At the start of each loop iteration, read the backlog in `codex/tasks.md` and select the highest priority unchecked task.
- Before changing any files, inspect the repository state and outline a concise plan.
- Produce minimal, reviewable commits that follow Conventional Commit formatting and append `[codex]` to the subject line.
- Keep all scratch work inside `codex/scratchpad/`.
- After completing an iteration, append a journal entry to `codex/journal.md` that summarizes the work and references the resulting commit hash.
- Never modify files listed in `codex/constraints.md` and respect any restrictions defined there.
- Run the applicable tests and type checks before committing. Prefer incremental progress over large refactors.
- If every task in the backlog is complete, note the idle state in the journal and wait for new work.

## General Repository Guidance
- Preserve existing project tooling and configuration unless a task explicitly instructs otherwise.
- Keep changes focused on the active task and limit unnecessary churn in unrelated files.