import { describe, it, expect } from "vitest";
import { branchExists, listBranches, getGitStatus } from "../scripts/git-utils";

describe("Git Utils", () => {
  it("should check if current branch exists", () => {
    // This test assumes we're in a git repository
    const status = getGitStatus();
    expect(branchExists(status.currentBranch)).toBe(true);
  });

  it("should list branches", () => {
    const branches = listBranches();
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);
  });

  it("should get git status", () => {
    const status = getGitStatus();
    expect(status).toHaveProperty("currentBranch");
    expect(status).toHaveProperty("hasUncommittedChanges");
    expect(status).toHaveProperty("hasUntrackedFiles");
    expect(status).toHaveProperty("isClean");
    expect(typeof status.currentBranch).toBe("string");
    expect(typeof status.hasUncommittedChanges).toBe("boolean");
    expect(typeof status.hasUntrackedFiles).toBe("boolean");
    expect(typeof status.isClean).toBe("boolean");
  });

  it("should return false for non-existent branch", () => {
    const fakeBranchName = "non-existent-branch-" + Date.now();
    expect(branchExists(fakeBranchName)).toBe(false);
  });

  it("should filter branches by pattern", () => {
    // Try to get main/master branch
    const mainBranches = listBranches("main");
    const masterBranches = listBranches("master");

    // At least one should exist in most repos
    expect(mainBranches.length + masterBranches.length).toBeGreaterThanOrEqual(1);
  });
});
