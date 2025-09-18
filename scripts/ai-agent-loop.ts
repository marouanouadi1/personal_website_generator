#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import "dotenv/config";
import { TaskManager, type Task } from "./task-manager.js";

interface AiConfig {
  allowedPaths?: string[];
  branchPrefix?: string;
  commands?: Record<string, string>;
  model?: string;
  maxIterations?: number;
  retry?: number;
}

interface FinalizeTaskArgs {
  commitMessage: string;
  push?: boolean;
}

interface RunCommandArgs {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

interface ListDirectoryArgs {
  path?: string;
  recursive?: boolean;
  depth?: number;
}

interface ReadFileArgs {
  path: string;
  encoding?: BufferEncoding;
}

interface WriteFileArgs {
  path: string;
  content: string;
}

interface AppendFileArgs {
  path: string;
  content: string;
}

interface DeletePathArgs {
  path: string;
}

interface ToolContext {
  repoRoot: string;
  allowedPaths: string[];
  task: Task;
}

interface ResolvePathOptions {
  enforceAllowed?: boolean;
}

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MAX_ITERATIONS = 40;

function loadConfig(): AiConfig {
  const configPath = path.join(process.cwd(), "ai", "config.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw) as AiConfig;
  } catch (error) {
    console.warn("Failed to load ai/config.json, using defaults", error);
    return {};
  }
}

function slugifyTask(task: Task): string {
  return task.description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "task";
}

function ensureBranch(branch: string) {
  const currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  if (currentBranch === branch) {
    return;
  }

  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branch}`);
    execSync(`git checkout ${branch}`, { stdio: "inherit" });
  } catch {
    execSync(`git checkout -b ${branch}`, { stdio: "inherit" });
  }
}

function normalizeAllowedPath(p: string): string {
  const normalized = path.normalize(p).replace(/\\/g, "/");
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function isPathAllowed(relativePath: string, allowed: string[]): boolean {
  if (allowed.length === 0) {
    return true;
  }

  const target = normalizeAllowedPath(relativePath);
  return allowed.some((base) => {
    if (base === "") return true;
    if (target === base) return true;
    return target.startsWith(`${base}/`);
  });
}

function resolvePath(
  inputPath: string,
  context: ToolContext,
  options: ResolvePathOptions = {},
): string {
  if (!inputPath || inputPath.trim() === "") {
    throw new Error("Path cannot be empty");
  }

  const relative = path
    .normalize(inputPath)
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");

  const fullPath = path.resolve(context.repoRoot, relative);
  if (!fullPath.startsWith(context.repoRoot)) {
    throw new Error("Access outside repository root is not allowed");
  }

  if (options.enforceAllowed !== false && !isPathAllowed(relative, context.allowedPaths)) {
    throw new Error(`Path '${relative}' is not allowed by configuration`);
  }

  return fullPath;
}

function listDirectory(args: ListDirectoryArgs, context: ToolContext) {
  const relativePath = args.path ? args.path : ".";
  const fullPath = path.resolve(context.repoRoot, relativePath);
  if (!fullPath.startsWith(context.repoRoot)) {
    throw new Error("Cannot list directories outside repository root");
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    throw new Error(`Directory '${relativePath}' does not exist`);
  }

  const depthLimit = Math.max(1, Math.min(args.depth ?? 2, 5));
  const recursive = Boolean(args.recursive);

  function walk(dir: string, depth: number): any {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      const rel = path.relative(context.repoRoot, entryPath).replace(/\\/g, "/");
      const item: Record<string, unknown> = {
        name: entry.name,
        path: rel,
        type: entry.isDirectory() ? "directory" : "file",
      };
      if (entry.isDirectory() && recursive && depth < depthLimit) {
        item.children = walk(entryPath, depth + 1);
      }
      return item;
    });
  }

  return walk(fullPath, 1);
}

function readFile(args: ReadFileArgs, context: ToolContext) {
  const fullPath = resolvePath(args.path, context, { enforceAllowed: false });
  const encoding = args.encoding ?? "utf8";
  const content = fs.readFileSync(fullPath, { encoding });
  return {
    path: path.relative(context.repoRoot, fullPath).replace(/\\/g, "/"),
    encoding,
    content,
  };
}

function writeFile(args: WriteFileArgs, context: ToolContext) {
  const fullPath = resolvePath(args.path, context);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, args.content, "utf8");
  return {
    path: path.relative(context.repoRoot, fullPath).replace(/\\/g, "/"),
    bytesWritten: Buffer.byteLength(args.content, "utf8"),
  };
}

function appendFile(args: AppendFileArgs, context: ToolContext) {
  const fullPath = resolvePath(args.path, context);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.appendFileSync(fullPath, args.content, "utf8");
  return {
    path: path.relative(context.repoRoot, fullPath).replace(/\\/g, "/"),
    bytesAppended: Buffer.byteLength(args.content, "utf8"),
  };
}

function deletePath(args: DeletePathArgs, context: ToolContext) {
  const fullPath = resolvePath(args.path, context);
  if (!fs.existsSync(fullPath)) {
    return { removed: false, message: "Path does not exist" };
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  return {
    removed: true,
    path: path.relative(context.repoRoot, fullPath).replace(/\\/g, "/"),
  };
}

function runCommand(args: RunCommandArgs, context: ToolContext) {
  const command = args.command.trim();
  if (!command) {
    throw new Error("Command cannot be empty");
  }

  const cwd = args.cwd
    ? path.resolve(context.repoRoot, args.cwd)
    : context.repoRoot;

  if (!cwd.startsWith(context.repoRoot)) {
    throw new Error("Command must run within repository");
  }

  const timeout = Math.max(1_000, Math.min(args.timeoutMs ?? 120_000, 300_000));
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    command,
    exitCode: result.status ?? null,
    stdout: result.stdout?.slice(0, 8_000) ?? "",
    stderr: result.stderr?.slice(0, 8_000) ?? "",
  };
}

function gitStatus(context: ToolContext) {
  const status = execSync("git status --short", {
    cwd: context.repoRoot,
    encoding: "utf8",
  });
  return { status };
}

function finalizeTask(args: FinalizeTaskArgs, context: ToolContext) {
  const commitMessage = args.commitMessage?.trim();
  if (!commitMessage) {
    throw new Error("commitMessage is required");
  }

  const status = execSync("git status --short", {
    cwd: context.repoRoot,
    encoding: "utf8",
  }).trim();

  if (!status) {
    return { committed: false, message: "No changes to commit" };
  }

  execSync("git add -A", { cwd: context.repoRoot, stdio: "inherit" });

  const commitResult = spawnSync("git", ["commit", "-m", commitMessage], {
    cwd: context.repoRoot,
    encoding: "utf8",
  });

  if (commitResult.status !== 0) {
    throw new Error(commitResult.stderr || "Failed to create commit");
  }

  const commitHash = execSync("git rev-parse --short HEAD", {
    cwd: context.repoRoot,
    encoding: "utf8",
  }).trim();

  const journalEntry = `\n## ${new Date().toISOString()}\nTask: ${context.task.description}\nCommit: ${commitHash}\n`;
  const journalPath = path.join(context.repoRoot, "ai", "JOURNAL.md");
  fs.appendFileSync(journalPath, journalEntry, "utf8");

  if (args.push) {
    const pushResult = spawnSync("git", ["push"], {
      cwd: context.repoRoot,
      encoding: "utf8",
    });
    if (pushResult.status !== 0) {
      throw new Error(pushResult.stderr || "Failed to push changes");
    }
  }

  return { committed: true, commitHash };
}

const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List files and folders within a directory relative to the repository root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory to inspect. Defaults to repository root.",
          },
          recursive: {
            type: "boolean",
            description: "Whether to include nested directories.",
          },
          depth: {
            type: "integer",
            description: "Maximum recursion depth when recursive is true.",
            minimum: 1,
            maximum: 5,
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the full contents of a text file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          encoding: {
            type: "string",
            description: "File encoding (default utf8).",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Overwrite a file with new content (creates directories if needed).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_file",
      description: "Append content to the end of a file (creates file if missing).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_path",
      description: "Delete a file or directory.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Execute a shell command within the repository (use for linting, tests, builds, etc).",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          cwd: {
            type: "string",
            description: "Working directory relative to repository root.",
          },
          timeoutMs: {
            type: "integer",
            description: "Maximum execution time in milliseconds (default 120000).",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Get the short git status for the repository.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_task",
      description:
        "Stage all changes, create a git commit, update the AI journal, and optionally push to remote.",
      parameters: {
        type: "object",
        properties: {
          commitMessage: { type: "string" },
          push: {
            type: "boolean",
            description: "Whether to push the commit to the remote repository.",
          },
        },
        required: ["commitMessage"],
      },
    },
  },
];

async function handleToolCall(
  toolCall: ChatCompletionMessageToolCall,
  context: ToolContext,
): Promise<string> {
  const name = toolCall.function.name;
  const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

  switch (name) {
    case "list_directory":
      return JSON.stringify(listDirectory(args as ListDirectoryArgs, context), null, 2);
    case "read_file":
      return JSON.stringify(readFile(args as ReadFileArgs, context));
    case "write_file":
      return JSON.stringify(writeFile(args as WriteFileArgs, context));
    case "append_file":
      return JSON.stringify(appendFile(args as AppendFileArgs, context));
    case "delete_path":
      return JSON.stringify(deletePath(args as DeletePathArgs, context));
    case "run_command":
      return JSON.stringify(runCommand(args as RunCommandArgs, context));
    case "git_status":
      return JSON.stringify(gitStatus(context));
    case "finalize_task":
      return JSON.stringify(finalizeTask(args as FinalizeTaskArgs, context));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function runAgentForTask(task: Task, config: AiConfig) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const model = config.model ?? DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });
  const repoRoot = process.cwd();
  const allowedPaths = (config.allowedPaths ?? []).map(normalizeAllowedPath);

  const context: ToolContext = {
    repoRoot,
    allowedPaths,
    task,
  };

  const promptPath = path.join(repoRoot, "ai", "PROMPT.md");
  const tasksPath = path.join(repoRoot, "ai", "TASKS.md");
  const promptContent = fs.existsSync(promptPath)
    ? fs.readFileSync(promptPath, "utf8")
    : "";
  const tasksContent = fs.existsSync(tasksPath)
    ? fs.readFileSync(tasksPath, "utf8")
    : "";

  const commandEntries = Object.entries(config.commands ?? {});
  const commandList =
    commandEntries.length > 0
      ? commandEntries.map(([key, value]) => `- ${key}: ${value}`).join("\n")
      : "(no commands specified)";

  const allowedPathsText =
    allowedPaths.length > 0
      ? allowedPaths.map((p) => (p === "" ? "/" : p)).join(", ")
      : "(no restrictions)";

  const systemPrompt = `You are an autonomous senior full-stack engineer working on a codebase located at ${repoRoot}.
You have direct access to the repository through the provided tools. Follow these rules:
- Make deliberate, incremental changes and verify them with the test and lint commands when appropriate.
- Only modify files that fall under the allowed paths: ${allowedPathsText}.
- Read files before editing them to understand context.
- Update ai/TASKS.md to mark tasks complete when you finish them.
- When the task is complete and the repository is ready to commit, call the finalize_task tool exactly once with a high-quality commit message.
- Prefer running available project commands (lint, typecheck, test, build) before finalizing.
- Do not assume state from previous runs; inspect the repository as needed.
`;

  const initialUserContent = `Next task to implement:
${task.description}

Original task line: ${task.originalLine ?? "(not available)"}
Priority: ${task.priority ?? "unspecified"}
Tags: ${(task.tags ?? []).join(", ") || "none"}

Project prompt:
${promptContent}

Full task backlog:
${tasksContent}

Available project commands:
${commandList}
`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: initialUserContent },
  ];

  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0,
    });

    const choice = response.choices[0];
    const message = choice.message;
    if (!message) {
      throw new Error("Received empty message from model");
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message as ChatCompletionMessageParam);

      for (const toolCall of message.tool_calls) {
        try {
          const result = await handleToolCall(toolCall, context);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: typeof result === "string" ? result : JSON.stringify(result),
          });
        } catch (error: any) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message ?? String(error) }),
          });
        }
      }
      continue;
    }

    messages.push(message as ChatCompletionMessageParam);

    if (choice.finish_reason === "stop" || choice.finish_reason === "length") {
      break;
    }
  }

  const remainingChanges = execSync("git status --short", {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  if (remainingChanges) {
    console.warn("Agent session ended with uncommitted changes. Review and rerun if necessary.");
  }
}

async function main() {
  const config = loadConfig();
  const taskManager = new TaskManager();
  const nextTask = taskManager.getNextTask();

  if (!nextTask) {
    console.log("No pending tasks found in ai/TASKS.md");
    return;
  }

  const branchPrefix = config.branchPrefix ?? "ai/";
  const branchName = `${branchPrefix}${slugifyTask(nextTask)}`;
  ensureBranch(branchName);

  console.log(`Running agent for task: ${nextTask.description}`);
  await runAgentForTask(nextTask, config);
  console.log("Agent run completed");
}

void main().catch((error) => {
  console.error("Agent loop failed:", error);
  process.exitCode = 1;
});
