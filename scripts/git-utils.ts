import { execSync } from "node:child_process";

export interface GitStatus {
  currentBranch: string;
  hasUncommittedChanges: boolean;
  hasUntrackedFiles: boolean;
  isClean: boolean;
}

export function getGitStatus(): GitStatus {
  try {
    const currentBranch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();

    let hasUncommittedChanges = false;
    let hasUntrackedFiles = false;

    try {
      // Check for uncommitted changes (staged and unstaged)
      execSync("git diff --quiet && git diff --cached --quiet", { stdio: "ignore" });
    } catch {
      hasUncommittedChanges = true;
    }

    try {
      // Check for untracked files
      const untrackedFiles = execSync("git ls-files --others --exclude-standard", {
        encoding: "utf8",
      });
      hasUntrackedFiles = untrackedFiles.trim().length > 0;
    } catch {
      // If command fails, assume no untracked files
      hasUntrackedFiles = false;
    }

    return {
      currentBranch,
      hasUncommittedChanges,
      hasUntrackedFiles,
      isClean: !hasUncommittedChanges && !hasUntrackedFiles,
    };
  } catch (error) {
    throw new Error(
      `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function branchExists(branchName: string): boolean {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function createBranch(branchName: string, force: boolean = false): void {
  const status = getGitStatus();

  if (!force && !status.isClean) {
    const changes = [];
    if (status.hasUncommittedChanges) changes.push("uncommitted changes");
    if (status.hasUntrackedFiles) changes.push("untracked files");

    throw new Error(
      `Cannot create branch with ${changes.join(" and ")}. Use force=true to override.`,
    );
  }

  if (branchExists(branchName)) {
    console.warn(`Branch ${branchName} already exists, switching to it`);
    execSync(`git checkout ${branchName}`);
  } else {
    console.log(`Creating new branch: ${branchName}`);
    execSync(`git checkout -b ${branchName}`);
  }
}

export function switchToBranch(branchName: string): void {
  if (!branchExists(branchName)) {
    throw new Error(`Branch ${branchName} does not exist`);
  }

  const status = getGitStatus();
  if (status.currentBranch === branchName) {
    console.log(`Already on branch: ${branchName}`);
    return;
  }

  if (!status.isClean) {
    throw new Error(`Cannot switch branch with uncommitted changes`);
  }

  execSync(`git checkout ${branchName}`);
  console.log(`Switched to branch: ${branchName}`);
}

export function deleteBranch(branchName: string, force: boolean = false): void {
  const status = getGitStatus();

  if (status.currentBranch === branchName) {
    throw new Error(`Cannot delete current branch: ${branchName}`);
  }

  if (!branchExists(branchName)) {
    console.warn(`Branch ${branchName} does not exist`);
    return;
  }

  const deleteFlag = force ? "-D" : "-d";
  try {
    execSync(`git branch ${deleteFlag} ${branchName}`);
    console.log(`Deleted branch: ${branchName}`);
  } catch (error) {
    if (!force) {
      console.error(
        `Failed to delete branch ${branchName}. Use force=true to force delete.`,
      );
    }
    throw error;
  }
}

export function listBranches(pattern?: string): string[] {
  try {
    const command = pattern ? `git branch --list "${pattern}"` : "git branch";
    const output = execSync(command, { encoding: "utf8" });

    return output
      .split("\n")
      .map((line) => line.trim().replace(/^\*?\s*/, ""))
      .filter((line) => line.length > 0);
  } catch (error) {
    throw new Error(
      `Failed to list branches: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function cleanupAIBranches(dryRun: boolean = false): void {
  console.log(
    dryRun
      ? "Dry run: listing AI branches that would be deleted"
      : "Cleaning up AI branches",
  );

  try {
    const aiBranches = listBranches("ai/*");

    if (aiBranches.length === 0) {
      console.log("No AI branches found");
      return;
    }

    const status = getGitStatus();

    for (const branch of aiBranches) {
      if (branch === status.currentBranch) {
        console.warn(`Skipping current branch: ${branch}`);
        continue;
      }

      if (dryRun) {
        console.log(`Would delete: ${branch}`);
      } else {
        try {
          deleteBranch(branch, true);
        } catch (error) {
          console.error(
            `Failed to delete ${branch}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "Error during cleanup:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export function getCommitHash(length: number = 7): string {
  try {
    return execSync(`git rev-parse --short=${length} HEAD`, { encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(
      `Failed to get commit hash: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function hasCommits(): boolean {
  try {
    execSync("git rev-parse HEAD", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "status": {
      console.log("Git Status:", getGitStatus());
      break;
    }

    case "cleanup": {
      const dryRun = process.argv[3] === "--dry-run";
      cleanupAIBranches(dryRun);
      break;
    }

    case "list": {
      const pattern = process.argv[3];
      const branches = listBranches(pattern);
      console.log("Branches:", branches);
      break;
    }

    default:
      console.log("Available commands:");
      console.log("  status    - Show git status");
      console.log("  cleanup   - Clean up AI branches (add --dry-run to preview)");
      console.log("  list      - List branches (optionally with pattern)");
  }
}
