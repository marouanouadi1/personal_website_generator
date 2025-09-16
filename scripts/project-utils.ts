#!/usr/bin/env tsx
/**
 * Utility script for project maintenance and cleanup
 */

import fs from "node:fs";
import { execSync } from "node:child_process";
import { cleanupAIBranches, getGitStatus } from "./git-utils.js";
import { validateConfig } from "./config-validator.js";
import { TaskManager } from "./task-manager.js";

interface CleanupOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export function cleanupProject(options: CleanupOptions = {}): void {
  const { dryRun = false, verbose = false } = options;

  console.log(`🧹 Project Cleanup ${dryRun ? "(Dry Run)" : ""}`);
  console.log("=".repeat(50));

  // 1. Clean up temporary files
  const tempPatterns = [
    "**/tmp_patch.diff",
    "**/node_modules/.cache",
    "**/.DS_Store",
    "**/Thumbs.db",
    "**/*.log",
    "**/npm-debug.log*",
    "**/yarn-debug.log*",
    "**/yarn-error.log*",
  ];

  console.log("\n📁 Cleaning temporary files...");
  for (const pattern of tempPatterns) {
    try {
      if (verbose) console.log(`  Checking pattern: ${pattern}`);
      const files = execSync(
        `find . -name "${pattern.replace("**/", "")}" -type f 2>/dev/null || true`,
        { encoding: "utf8" },
      )
        .split("\n")
        .filter((f) => f.trim());

      for (const file of files) {
        if (file.trim()) {
          if (dryRun) {
            console.log(`  Would delete: ${file}`);
          } else {
            fs.unlinkSync(file);
            console.log(`  Deleted: ${file}`);
          }
        }
      }
    } catch (error) {
      if (verbose)
        console.warn(
          `  Warning: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
  }

  // 2. Clean up AI branches
  console.log("\n🌿 Cleaning AI branches...");
  try {
    cleanupAIBranches(dryRun);
  } catch (error) {
    console.error(
      `Error cleaning branches: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // 3. Clean up node_modules if requested
  if (process.argv.includes("--deep")) {
    console.log("\n📦 Deep cleanup: removing node_modules...");
    if (dryRun) {
      console.log("  Would delete: node_modules/");
    } else {
      try {
        execSync("rm -rf node_modules");
        console.log("  Deleted: node_modules/");
        console.log('  Run "npm install" to reinstall dependencies');
      } catch (error) {
        console.error(`  Failed to remove node_modules: ${error}`);
      }
    }
  }

  console.log("\n✅ Cleanup completed");
}

export function validateProject(): boolean {
  console.log("🔍 Project Validation");
  console.log("=".repeat(50));

  let isValid = true;

  // 1. Validate config
  console.log("\n⚙️  Validating configuration...");
  try {
    const configResult = validateConfig();
    if (configResult.isValid) {
      console.log("  ✅ Configuration is valid");
      if (configResult.warnings.length > 0) {
        configResult.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
      }
    } else {
      console.log("  ❌ Configuration is invalid");
      configResult.errors.forEach((e) => console.log(`  ❌ ${e}`));
      isValid = false;
    }
  } catch (error) {
    console.log(
      `  ❌ Config validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    isValid = false;
  }

  // 2. Check git status
  console.log("\n📋 Checking git status...");
  try {
    const gitStatus = getGitStatus();
    console.log(`  Current branch: ${gitStatus.currentBranch}`);
    console.log(`  Clean working tree: ${gitStatus.isClean ? "✅" : "⚠️"}`);

    if (!gitStatus.isClean) {
      if (gitStatus.hasUncommittedChanges) {
        console.log("  ⚠️  Has uncommitted changes");
      }
      if (gitStatus.hasUntrackedFiles) {
        console.log("  ⚠️  Has untracked files");
      }
    }
  } catch (error) {
    console.log(
      `  ❌ Git status check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    isValid = false;
  }

  // 3. Validate tasks
  console.log("\n📝 Validating tasks...");
  try {
    const taskManager = new TaskManager();
    const stats = taskManager.getStats();
    console.log(`  Total tasks: ${stats.total}`);
    console.log(`  Completed: ${stats.completed} (${stats.completionRate.toFixed(1)}%)`);
    console.log(`  Pending: ${stats.pending}`);

    const nextTask = taskManager.getHighestPriorityTask();
    if (nextTask) {
      console.log(`  Next priority task: ${nextTask.description}`);
    } else {
      console.log("  🎉 No pending tasks");
    }
  } catch (error) {
    console.log(
      `  ⚠️  Task validation warning: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // 4. Check required files
  console.log("\n📄 Checking required files...");
  const requiredFiles = [
    "package.json",
    "tsconfig.json",
    "ai/config.json",
    "ai/TASKS.md",
    "scripts/ai-run.ts",
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ Missing: ${file}`);
      isValid = false;
    }
  }

  console.log(
    `\n${isValid ? "✅" : "❌"} Project validation ${isValid ? "passed" : "failed"}`,
  );
  return isValid;
}

export function generateReport(): void {
  console.log("📊 Project Report");
  console.log("=".repeat(50));

  // Git info
  try {
    const gitStatus = getGitStatus();
    const lastCommit = execSync('git log -1 --pretty=format:"%h %s (%cr)"', {
      encoding: "utf8",
    });

    console.log("\n🌿 Git Information:");
    console.log(`  Branch: ${gitStatus.currentBranch}`);
    console.log(`  Status: ${gitStatus.isClean ? "Clean" : "Has changes"}`);
    console.log(`  Last commit: ${lastCommit}`);
  } catch (error) {
    console.log("\n🌿 Git Information: Not available");
  }

  // Project stats
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    console.log("\n📦 Project Information:");
    console.log(`  Name: ${packageJson.name}`);
    console.log(`  Version: ${packageJson.version}`);
    console.log(
      `  Node version required: ${packageJson.engines?.node || "Not specified"}`,
    );
  } catch (error) {
    console.log("\n📦 Project Information: Not available");
  }

  // Task stats
  try {
    const taskManager = new TaskManager();
    const stats = taskManager.getStats();

    console.log("\n📝 Task Statistics:");
    console.log(`  Total: ${stats.total}`);
    console.log(`  Completed: ${stats.completed} (${stats.completionRate.toFixed(1)}%)`);
    console.log(`  Pending: ${stats.pending}`);

    if (stats.pending > 0) {
      const nextTask = taskManager.getHighestPriorityTask();
      if (nextTask) {
        console.log(
          `  Next priority: ${nextTask.description} ${nextTask.priority ? `[${nextTask.priority}]` : ""}`,
        );
      }
    }
  } catch (error) {
    console.log("\n📝 Task Statistics: Not available");
  }

  // File counts
  try {
    const tsFiles = execSync(
      'find . -name "*.ts" -not -path "./node_modules/*" | wc -l',
      { encoding: "utf8" },
    ).trim();
    const testFiles = execSync(
      'find . -name "*.test.ts" -not -path "./node_modules/*" | wc -l',
      { encoding: "utf8" },
    ).trim();

    console.log("\n📁 File Statistics:");
    console.log(`  TypeScript files: ${tsFiles}`);
    console.log(`  Test files: ${testFiles}`);
  } catch (error) {
    console.log("\n📁 File Statistics: Not available");
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const options = {
    dryRun: process.argv.includes("--dry-run"),
    verbose: process.argv.includes("--verbose"),
  };

  switch (command) {
    case "cleanup": {
      cleanupProject(options);
      break;
    }

    case "validate": {
      const isValid = validateProject();
      process.exit(isValid ? 0 : 1);
      break;
    }

    case "report": {
      generateReport();
      break;
    }

    default:
      console.log("🛠️  Project Utilities");
      console.log("=".repeat(50));
      console.log("Available commands:");
      console.log(
        "  cleanup [--dry-run] [--deep] [--verbose] - Clean up project files and branches",
      );
      console.log(
        "  validate                                  - Validate project configuration",
      );
      console.log(
        "  report                                    - Generate project report",
      );
      console.log("\nFlags:");
      console.log("  --dry-run    Show what would be done without making changes");
      console.log("  --deep       Include node_modules in cleanup");
      console.log("  --verbose    Show detailed output");
  }
}
