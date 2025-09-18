# Personal Website Generator (Codex Loop Edition)

This repository is configured to run an autonomous coding loop using the [`@openai/codex`](https://www.npmjs.com/package/@openai/codex) command-line interface instead of relying on custom API integrations. The project files and helper scripts are optimized for headless execution inside a simple shell `while` loop.

## 🚀 Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Install the Codex CLI globally (inside WSL or your preferred shell)**

   ```bash
   npm install -g @openai/codex
   ```

3. **Export your OpenAI API key**

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

4. **Validate the Codex configuration**

   ```bash
   npm run codex:config
   ```

5. **Print the loop snippet**

   ```bash
   npm run codex:loop
   ```

   Copy the suggested command into your terminal to start the automated loop. The helper script respects the settings stored in `codex/config.json`.

## 🤖 How the Loop Works

- The shell loop pipes the contents of `codex/prompt.md` into the `codex` CLI on each iteration.
- Tasks are tracked manually in `codex/tasks.md`. The agent is instructed to pick the highest priority unchecked task.
- After each iteration the agent appends a short entry to `codex/journal.md` and keeps scratch notes inside `codex/scratchpad/`.
- Guard rails live in `codex/constraints.md`. Update them whenever you need to restrict the loop further.

All loop-specific assets sit under the `codex/` directory so you can tweak behaviour without touching the helper scripts.

## 📁 Project Structure

```
├── codex/                  # Assets consumed by the Codex CLI loop
│   ├── config.json         # Loop configuration
│   ├── prompt.md           # Prompt injected on every iteration
│   ├── tasks.md            # Backlog managed by humans
│   ├── constraints.md      # Guard rails for the agent
│   ├── journal.md          # Lightweight changelog
│   └── scratchpad/         # Free-form working area for the agent
├── scripts/                # TypeScript utilities for the loop
│   ├── codex-config.ts     # Config loader/validator + helpers
│   ├── codex-loop.ts       # Prints the `while` loop snippet
│   └── codex-validate.ts   # Simple config validation command
└── tests/                  # Vitest suite for the helper scripts
```

## 🛠️ Available npm Scripts

```bash
npm run codex:config   # Validate codex/config.json
npm run codex:loop     # Print the shell loop snippet
npm run build          # Compile TypeScript helpers
npm run lint           # Lint the TypeScript sources
npm run typecheck      # Run the TypeScript compiler in no-emit mode
npm run test           # Execute the Vitest suite
npm run validate       # Lint + typecheck + test + build
```

Feel free to extend the script list with additional automation tailored to your workflow.

## 🧪 Testing

```bash
npm test
```

The tests focus on validating the Codex configuration loader and the loop command generator to ensure your automation tooling stays reliable.

## 🗂️ Maintaining the Loop

- Edit `codex/tasks.md` to reprioritize work.
- Update `codex/prompt.md` to steer the agent's behaviour.
- Clear or archive files in `codex/scratchpad/` between sessions.
- Review `codex/journal.md` to understand what the loop accomplished overnight.

With this setup you can safely iterate on the personal website while letting the Codex CLI handle the repetitive plumbing.
