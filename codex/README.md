# Codex Loop Assets

This directory contains everything required to run the repository through the `@openai/codex` command-line interface.

- `config.json` – Source of truth for the loop helper scripts. Adjust the `command` field with any CLI flags you need.
- `prompt.md` – Injected into the Codex CLI on every iteration. Tailor the workflow instructions here.
- `tasks.md` – Human-maintained backlog that the agent should process in order of priority.
- `constraints.md` – Guard rails to keep the loop from touching restricted areas.
- `journal.md` – Lightweight changelog maintained by the agent as it progresses.
- `scratchpad/` – Temporary working area for the agent. Files can be created or pruned freely during runs.

Update these files manually between sessions to steer the automation.
