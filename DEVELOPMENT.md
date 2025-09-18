# Development Guide

## Overview

This project uses AI-powered automation to complete development tasks. The AI assistant can automatically implement features, fix bugs, and make improvements based on tasks defined in `ai/TASKS.md`.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git
- OpenAI API key

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

3. **Validate setup:**
   ```bash
   npm run project:validate
   ```

## AI Assistant Usage

### Running the AI Assistant

```bash
npm run ai:run
```

The AI assistant will:

1. Read the first uncompleted task from `ai/TASKS.md`
2. Create a new branch (`ai/task-name`)
3. Generate and apply a patch to implement the task
4. Run quality checks (lint, typecheck, test, build)
5. Commit the changes
6. Update the project journal

### Running the Tool-Using Agent Loop

```bash
npm run ai:agent
```

This mode launches a multi-step agent that uses function calls to inspect files, run commands, edit the repository directly, and
create commits by invoking the `finalize_task` tool when finished. The agent will:

1. Load the next pending task from `ai/TASKS.md`
2. Switch to or create a dedicated task branch
3. Iteratively inspect and modify files using the provided tools
4. Run project commands (lint, typecheck, test, build) on demand via the `run_command` tool
5. Stage, commit, and optionally push changes through the `finalize_task` tool
6. Append an entry to `ai/JOURNAL.md` recording the commit

The agent is constrained to the directories listed in `ai/config.json` under `allowedPaths`. Update the config to expand the
editable surface area if needed.

### Configuration

Edit `ai/config.json` to customize AI behavior:

```json
{
  "allowedPaths": ["app", "components", "lib", "scripts"],
  "branchPrefix": "ai/",
  "maxChangedLines": 300,
  "commands": {
    "lint": "npm run lint",
    "typecheck": "npm run typecheck",
    "test": "npm test",
    "build": "npm run build"
  },
  "retry": 2
}
```

**Configuration Options:**

- `allowedPaths`: Directories the AI can modify
- `branchPrefix`: Prefix for AI-created branches
- `maxChangedLines`: Maximum lines per patch
- `commands`: Quality check commands to run
- `retry`: Number of retry attempts

### Task Management

#### Task Format

Tasks in `ai/TASKS.md` should follow this format:

```markdown
# Tasks

- [ ] Implement user authentication
- [x] Add database schema
- [ ] Create API endpoints [!!!] #urgent
- [ ] Write unit tests [!!] #testing
- [ ] Update documentation [!] #docs
```

**Task Features:**

- `[ ]` = pending task
- `[x]` = completed task
- `[!]` = low priority
- `[!!]` = medium priority
- `[!!!]` = high priority
- `#tag` = task tags

#### Task Commands

```bash
# List all tasks with statistics
npm run ai:tasks

# Show next priority task
npm run ai:tasks:next

# Mark task as complete
npx tsx scripts/task-manager.ts complete "task description"

# Add new task
npx tsx scripts/task-manager.ts add "new task" medium
```

## Quality Assurance

### Automated Checks

The AI assistant runs these quality checks automatically:

- **Linting:** ESLint with TypeScript rules
- **Type Checking:** TypeScript compiler
- **Testing:** Vitest test runner
- **Building:** TypeScript compilation

### Manual Commands

```bash
# Run all quality checks
npm run validate

# Individual checks
npm run lint
npm run typecheck
npm run test
npm run build

# Fix formatting and linting
npm run format
```

## Project Utilities

### Configuration Validation

```bash
# Validate AI configuration
npm run ai:config:validate

# Full project validation
npm run project:validate
```

### Git Management

```bash
# Check git status
npm run ai:git:status

# Cleanup AI branches (preview)
npm run ai:git:cleanup:dry

# Cleanup AI branches
npm run ai:git:cleanup
```

### Project Maintenance

```bash
# Clean temporary files (preview)
npm run cleanup:dry

# Clean temporary files
npm run cleanup

# Deep clean (includes node_modules)
npm run cleanup:deep

# Generate project report
npm run project:report
```

## Safety Features

### Branch Isolation

- All AI changes happen in separate branches
- Main branch remains protected
- Easy to review and merge changes

### Quality Gates

- Automatic linting and type checking
- Test suite execution
- Build verification before commit

### Change Limits

- Maximum patch size restrictions
- File path restrictions via `allowedPaths`
- Retry limits for failed attempts

### Rollback Options

- Git history preserved
- Easy branch deletion
- Dry-run modes for testing

## Best Practices

### Writing Good Tasks

✅ **Good:**

```markdown
- [ ] Add user registration form with email validation [!!] #auth
- [ ] Implement JWT token refresh mechanism [!!!] #security
- [ ] Write tests for user service methods [!] #testing
```

❌ **Avoid:**

```markdown
- [ ] Fix stuff
- [ ] Make it better
- [ ] Update the thing
```

### Task Prioritization

- **High Priority `[!!!]`**: Critical bugs, security issues
- **Medium Priority `[!!]`**: Important features, performance improvements
- **Low Priority `[!]`**: Nice-to-have features, documentation
- **No Priority**: General maintenance, cleanup

### Using Tags

Common tag conventions:

- `#bug` - Bug fixes
- `#feature` - New features
- `#refactor` - Code refactoring
- `#docs` - Documentation updates
- `#test` - Testing improvements
- `#security` - Security-related changes
- `#performance` - Performance optimizations

## Troubleshooting

### Common Issues

**AI fails to apply patch:**

- Check if files are locked or have conflicts
- Verify `allowedPaths` configuration
- Review patch size limits

**Quality checks fail:**

- Run checks manually to identify issues
- Fix linting/type errors before retrying
- Update test cases if needed

**Branch conflicts:**

- Clean up old AI branches: `npm run ai:git:cleanup`
- Ensure working directory is clean
- Switch to main branch before running AI

### Debug Commands

```bash
# Verbose cleanup with dry-run
npx tsx scripts/project-utils.ts cleanup --dry-run --verbose

# Check git status in detail
npx tsx scripts/git-utils.ts status

# Validate configuration with details
npx tsx scripts/config-validator.ts
```

## File Structure

```
project/
├── ai/                    # AI configuration and data
│   ├── config.json       # AI assistant configuration
│   ├── TASKS.md          # Task definitions
│   ├── JOURNAL.md        # AI activity log
│   ├── PROMPT.md         # AI system prompt
│   └── CONSTRAINTS.md    # AI constraints and rules
├── scripts/              # Automation scripts
│   ├── ai-run.ts         # Main AI assistant
│   ├── config-validator.ts # Configuration validation
│   ├── git-utils.ts      # Git utilities
│   ├── task-manager.ts   # Task management
│   └── project-utils.ts  # Project utilities
├── tests/                # Test files
└── package.json          # Project configuration
```

## Contributing

1. Add tasks to `ai/TASKS.md` with clear descriptions
2. Use appropriate priority levels and tags
3. Run `npm run project:validate` before committing
4. Review AI-generated changes before merging
5. Update documentation as needed

## License

This project is private and not licensed for public use.
