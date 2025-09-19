# Development Guide

## Overview

The project now relies on the `@openai/codex` command-line interface instead of a bespoke API runner. The automation philosophy is simple: keep a clean repository with well-documented prompts and let the Codex CLI iterate over the backlog inside a headless shell loop.

## Prerequisites

- Node.js 18+
- npm
- Git
- An OpenAI API key exported as `OPENAI_API_KEY`
- The Codex CLI installed globally: `npm install -g @openai/codex`

## Setup Steps

1. Install project dependencies:

   ```bash
   npm install
   ```

2. Verify the Codex configuration:

   ```bash
   npm run codex:config
   ```

3. Print the ready-to-run loop command:

   ```bash
   npm run codex:loop
   ```

4. Copy the command into a terminal session (inside WSL or your shell of choice) to start the automation.

## Running the Loop

1. Ensure you are in the repository directory and that `OPENAI_API_KEY` is exported.
2. Paste the snippet produced by `npm run codex:loop`.
3. Optionally wrap the loop in `tmux`, `screen`, or a background job when running long sessions.
4. Inspect `codex/journal.md` periodically to track progress.

## Managing Loop Assets

All artefacts that steer the automation live in `codex/`:

- **`prompt.md`** – Update this to change how the agent behaves each iteration.
- **`tasks.md`** – Maintain the backlog manually. Completed tasks should be checked off by humans to keep intent clear.
- **`constraints.md`** – Tighten or relax guard rails here when you need to restrict file access.
- **`journal.md`** – The agent appends context after each loop. Review or prune as needed.
- **`scratchpad/`** – Ephemeral workspace for the loop. Safe to clear between sessions.

## Helper Scripts

The TypeScript utilities under `scripts/` provide lightweight assistance:

- `codex-config.ts` – Validates and loads `codex/config.json`.
- `codex-loop.ts` – Prints the canonical `while` loop command.
- `codex-validate.ts` – Simple CLI wrapper used by `npm run codex:config`.

Feel free to extend these helpers or add new ones if you find repetitive chores worth automating.

## Quality Checks

Even though the loop is headless, keep the codebase healthy:

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript in no-emit mode
npm run test       # Vitest suite for helper scripts
npm run build      # Emit compiled helpers to dist/
npm run validate   # Runs all of the above sequentially
```

Run these commands manually when iterating on the automation tooling. They are also safe to execute from the Codex loop if you decide to enforce checks per iteration.

## Contact Form Configuration

The `/[locale]/contact` page relies on Cloudflare Turnstile and Resend. Set the following environment variables before running the app locally or deploying:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` – Public site key rendered by the form widget.
- `TURNSTILE_SECRET_KEY` – Private key used by the server action to verify submissions.
- `RESEND_API_KEY` – Server-side key for the Resend API.
- `RESEND_FROM_EMAIL` – Verified sender address (e.g. `Portfolio <hello@example.com>`).
- `CONTACT_RECIPIENT_EMAIL` – Destination inbox for contact requests (defaults to `RESEND_FROM_EMAIL` when omitted).

When configuration is missing, the form stays disabled and shows a friendly fallback message so visitors aren’t left guessing.

## Tips for Loop Sessions

- Start with shorter `delaySeconds` in `codex/config.json` while experimenting, then increase for overnight runs.
- Keep the backlog focused—fewer, well-defined tasks lead to higher quality commits.
- Archive journals and scratchpad files after large sessions to keep Git history tidy.
- When you need to pause automation, simply terminate the loop and pick up where it left off later.

With the API code removed and the CLI workflow in place, maintaining the personal website generator is now as simple as editing markdown files and nudging the Codex loop when you are ready for progress.
