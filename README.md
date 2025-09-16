# Personal Website Generator (AI Assisted)

An AI-powered development assistant that automatically implements features, fixes bugs, and improves code based on tasks defined in markdown files.

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Setup environment:**

   ```bash
   cp .env.example .env
   # Add your ANTHROPIC_API_KEY to .env
   ```

3. **Run the AI assistant:**
   ```bash
   npm run ai:run
   ```

## 🤖 How It Works

The AI assistant (`scripts/ai-run.ts`) uses Claude Sonnet (Anthropic) to:

1. **📋 Read Tasks**: Gets the first uncompleted task from `ai/TASKS.md`
2. **🌿 Create Branch**: Creates a new branch `ai/<task-slug>`
3. **🧠 Generate Patch**: Uses AI to create a unified diff patch
4. **✅ Apply Changes**: Applies the patch using `git apply`
5. **🔍 Quality Check**: Runs lint, typecheck, test, and build
6. **💾 Commit**: Commits changes and updates the journal

## 📁 Project Structure

```
├── ai/                    # AI configuration and data
│   ├── config.json       # AI assistant settings
│   ├── TASKS.md          # Task definitions
│   ├── JOURNAL.md        # Activity log
│   ├── PROMPT.md         # System prompt
│   └── CONSTRAINTS.md    # AI constraints
├── scripts/              # Automation scripts
│   ├── ai-run.ts         # Main AI assistant
│   ├── config-validator.ts
│   ├── git-utils.ts
│   ├── task-manager.ts
│   └── project-utils.ts
└── tests/                # Test suite
```

## 🛠️ Available Commands

### AI Assistant

```bash
npm run ai:run              # Run AI assistant
npm run ai:tasks            # List all tasks
npm run ai:tasks:next       # Show next priority task
npm run ai:config:validate  # Validate AI configuration
```

### Git Management

```bash
npm run ai:git:status       # Check git status
npm run ai:git:cleanup      # Clean up AI branches
npm run ai:git:cleanup:dry  # Preview branch cleanup
```

### Project Utilities

```bash
npm run cleanup             # Clean temporary files
npm run cleanup:dry         # Preview cleanup
npm run cleanup:deep        # Deep clean (includes node_modules)
npm run project:validate    # Validate entire project
npm run project:report      # Generate project report
```

### Development

```bash
npm run build               # Build TypeScript
npm run lint                # Run ESLint
npm run lint:fix            # Fix linting issues
npm run typecheck           # TypeScript type checking
npm run test                # Run tests
npm run test:watch          # Watch mode tests
npm run format              # Format code with Prettier
npm run validate            # Run all quality checks
```

## 📝 Task Management

### Task Format in `ai/TASKS.md`

```markdown
# Tasks

- [ ] Implement user authentication [!!!] #urgent #auth
- [x] Add database schema [!!] #database
- [ ] Create API endpoints #api
- [ ] Write unit tests [!] #testing
```

**Features:**

- `[ ]` / `[x]` - Pending / Completed
- `[!]` / `[!!]` / `[!!!]` - Low / Medium / High priority
- `#tag` - Task categories and labels

### Priority System

- **🔴 High `[!!!]`**: Critical bugs, security issues
- **🟡 Medium `[!!]`**: Important features, performance
- **🟢 Low `[!]`**: Nice-to-have features, documentation
- **⚪ None**: General maintenance

## ⚙️ Configuration

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

## 🔒 Safety Features

- **Branch Isolation**: All AI changes in separate branches
- **Quality Gates**: Automatic linting, testing, and type checking
- **Change Limits**: Restricted file paths and patch sizes
- **Rollback Options**: Easy to undo with Git history
- **Dry Run Modes**: Preview changes before applying

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

Tests cover:

- Configuration validation
- Task parsing and management
- Git utilities
- Error handling

## 📖 Documentation

- [Development Guide](./DEVELOPMENT.md) - Detailed usage and best practices
- [AI Configuration](./ai/config.json) - AI assistant settings
- [Task Examples](./ai/TASKS.md) - Sample task definitions

## 🐛 Troubleshooting

### Common Issues

**AI fails to apply patch:**

- Check file permissions and conflicts
- Verify `allowedPaths` in config
- Review patch size limits

**Quality checks fail:**

- Fix linting/type errors manually
- Update failing tests
- Check build configuration

**Branch conflicts:**

- Clean up old branches: `npm run ai:git:cleanup`
- Ensure clean working directory
- Switch to main branch

### Debug Commands

```bash
npm run project:validate    # Full project health check
npm run ai:git:status       # Detailed git status
npm run cleanup:dry -- --verbose # Verbose cleanup preview
```

## 🔑 Environment Variables

- `ANTHROPIC_API_KEY` - Required for AI functionality

## 🚧 Technical Details

- **AI Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Patch Limit**: 300 lines (configurable)
- **Node Version**: 18+ required
- **Package Manager**: npm/pnpm supported

## 📄 License

This project is private and not licensed for public use.

---

For detailed development instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).
