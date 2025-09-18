import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  validateCodexConfig,
  buildLoopCommand,
  quoteShellValue,
  type CodexConfig,
} from "../scripts/codex-config.js";

describe("validateCodexConfig", () => {
  let tempDir: string;
  let promptPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-config-test-"));
    promptPath = path.join(tempDir, "prompt.md");
    fs.writeFileSync(promptPath, "# prompt\n");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("accepts a well-formed configuration", () => {
    const rawConfig = {
      promptFile: "prompt.md",
      command: "codex --no-cache",
      delaySeconds: 3,
      workingDirectory: ".",
      env: {
        TOKEN: "abc123",
      },
      metadata: {
        tasksFile: "codex/tasks.md",
      },
    };

    const result = validateCodexConfig(rawConfig, { baseDir: tempDir });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.config?.promptFile).toBe("prompt.md");
    expect(result.config?.command).toBe("codex --no-cache");
    expect(result.config?.delaySeconds).toBe(3);
    expect(result.config?.env?.TOKEN).toBe("abc123");
    expect(result.config?.metadata?.tasksFile).toBe("codex/tasks.md");
  });

  it("fails when required fields are missing", () => {
    const result = validateCodexConfig({}, { baseDir: tempDir });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("promptFile"))).toBe(true);
    expect(result.errors.some((error) => error.includes("command"))).toBe(true);
  });

  it("flags invalid env values", () => {
    const rawConfig = {
      promptFile: "prompt.md",
      command: "codex",
      env: {
        TOKEN: 42,
      },
    };

    const result = validateCodexConfig(rawConfig, { baseDir: tempDir });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("env"))).toBe(true);
  });

  it("ensures the prompt exists", () => {
    fs.rmSync(promptPath, { force: true });

    const rawConfig = {
      promptFile: "prompt.md",
      command: "codex",
    };

    const result = validateCodexConfig(rawConfig, { baseDir: tempDir });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("Prompt file"))).toBe(true);
  });
});

describe("buildLoopCommand", () => {
  it("builds a loop command with env vars and delay", () => {
    const config: CodexConfig = {
      promptFile: "codex/prompt.md",
      command: "codex --stdin",
      delaySeconds: 4,
      workingDirectory: process.cwd(),
      env: {
        OPENAI_API_KEY: "sk-test",
        CUSTOM: "value with spaces",
      },
    };

    const command = buildLoopCommand(config);

    expect(command.startsWith("while :; do cat \"")).toBe(true);
    expect(command).toContain("OPENAI_API_KEY=sk-test");
    expect(command).toContain("CUSTOM='value with spaces'");
    expect(command.endsWith("sleep 4; done")).toBe(true);
  });
});

describe("quoteShellValue", () => {
  it("wraps values with spaces", () => {
    expect(quoteShellValue("hello world")).toBe("'hello world'");
  });

  it("preserves safe tokens", () => {
    expect(quoteShellValue("sk-test-123")).toBe("sk-test-123");
  });

  it("escapes single quotes", () => {
    expect(quoteShellValue("it's ok")).toBe("'it'\\''s ok'");
  });
});
