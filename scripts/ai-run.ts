#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

function log(level: "info" | "error" | "warn", message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;

  // Crea la directory logs se non esiste
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Scrivi nel file di log con il nome basato sulla data
  const logFileName = `ai-run-${new Date().toISOString().split("T")[0]}.log`;
  const logFilePath = path.join(logsDir, logFileName);

  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (error) {
    // Fallback su console se il file non può essere scritto
    console.error(`Failed to write to log file: ${error}`);
    console.log(logMessage.trim());
  }
}

function sh(cmd: string, options?: { ignoreError?: boolean }) {
  try {
    log("info", `Executing: ${cmd}`);
    return execSync(cmd, { stdio: "inherit" });
  } catch (error) {
    log("error", `Command failed: ${cmd}`);
    if (!options?.ignoreError) {
      throw error;
    }
  }
}

async function getPatchFromLLM(task: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY env var");
  }

  function list(dir: string, depth = 0): string {
    if (depth > 3) return ""; // limit
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries
        .map((e) => {
          if (e.name.startsWith(".")) return ""; // skip dotfiles except .eslintrc etc
          const rel = path.relative(process.cwd(), path.join(dir, e.name));
          if (e.isDirectory()) {
            return (
              `${"  ".repeat(depth)}- ${rel}/\n` + list(path.join(dir, e.name), depth + 1)
            );
          }
          if (rel.length > 2000) return ""; // guard
          return `${"  ".repeat(depth)}- ${rel}\n`;
        })
        .join("");
    } catch (error) {
      log("warn", `Could not read directory: ${dir}`);
      return "";
    }
  }

  try {
    log("info", "Initializing Anthropic client");
    const client = new Anthropic({ apiKey });

    // Gather prompt ingredients with error handling
    let prompt = "";
    let tasksMd = "";

    try {
      prompt = fs.readFileSync("ai/PROMPT.md", "utf8");
    } catch (error) {
      log("warn", "PROMPT.md not found, using empty prompt");
    }

    try {
      tasksMd = fs.readFileSync("ai/TASKS.md", "utf8");
    } catch (error) {
      log("warn", "TASKS.md not found, using empty tasks");
    }

    // Simple repo tree (only few levels for brevity)
    log("info", "Generating repository tree");
    const tree = list(process.cwd());

    const system = `Sei un agente che propone UNA singola patch diff unificata (formato '*** Begin Patch' se vuoi, ma preferibilmente unified diff semplice) per completare il task richiesto.\nRequisiti:\n- Non modificare file fuori da allowedPaths se definiti.\n- Mantieni patch <= 300 linee.\n- Solo diff, nessuna spiegazione.`;

    const userContent = `TASK SELEZIONATO:\n${task}\n\nPROMPT PRINCIPALE:\n${prompt}\n\nBACKLOG COMPLETO:\n${tasksMd}\n\nREPO TREE:\n${tree}\n\nFornisci ora SOLO la patch unified diff applicabile con 'git apply'.`;

    log("info", "Sending request to Anthropic API");
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0,
      system,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    // Extract text content
    type MessageContent =
      | { type: "text"; text: string }
      | { type: string; [key: string]: unknown };
    const textParts = (msg.content as MessageContent[])
      .filter((c) => c.type === "text")
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");

    log("info", `Received response of ${textParts.length} characters`);

    // Better validation for patch content
    const patch = textParts.match(/(^|\n)(\+\+\+|diff --git|Index: )/)
      ? textParts
      : textParts.trim();

    // Enhanced patch validation
    if (!/diff --git|^\+\+\+|^---/.test(patch)) {
      log("error", "Invalid patch format received from AI");
      log("info", `AI Response preview: ${textParts.substring(0, 500)}...`);
      throw new Error("La risposta del modello non sembra un diff valido");
    }

    // Check patch size
    const patchLines = patch.split("\n").length;
    if (patchLines > 500) {
      log("warn", `Large patch detected: ${patchLines} lines`);
    }

    log("info", "Patch validation successful");
    return patch;
  } catch (error: any) {
    log("error", `AI request failed: ${error.message}`);
    if (error.response) {
      log(
        "error",
        `API Response: ${error.response.status} - ${error.response.statusText}`,
      );
    }
    throw error;
  }
}

async function main() {
  log("info", "Starting AI assistant");

  // 1) Leggi backlog e scegli il primo task aperto
  let tasks: string;
  try {
    tasks = fs.readFileSync("ai/TASKS.md", "utf8");
  } catch (error) {
    log("error", "Could not read ai/TASKS.md");
    throw new Error("ai/TASKS.md file not found");
  }

  const match = tasks.match(/- \[ \] .+/);
  const next = match ? match[0].replace(/- \[ \] /, "").trim() : undefined;
  if (!next) {
    log("info", "No open tasks found");
    log("info", "Nessun task aperto.");
    return;
  }

  log("info", `Selected task: ${next}`);

  // 2) Crea branch
  const branch = `ai/${next.toLowerCase().replace(/\W+/g, "-")}`;

  try {
    // Check if we're already on this branch
    const currentBranch = execSync("git branch --show-current").toString().trim();
    if (currentBranch === branch) {
      log("info", `Already on branch: ${branch}`);
    } else {
      // Check if branch exists
      try {
        execSync(`git show-ref --verify --quiet refs/heads/${branch}`, {
          stdio: "ignore",
        });
        log("info", `Branch ${branch} exists, switching to it`);
        sh(`git checkout ${branch}`);
      } catch {
        log("info", `Creating new branch: ${branch}`);
        sh(`git checkout -b ${branch}`);
      }
    }
  } catch (error) {
    log("error", "Failed to create or switch to branch");
    throw error;
  }

  // 3) Ottieni patch dall'AI
  log("info", `Richiedo patch a Claude Sonnet per il task: ${next}`);
  let patch: string;
  try {
    patch = await getPatchFromLLM(next);
  } catch (error) {
    log("error", "Failed to get patch from AI");
    throw error;
  }

  // 4) Applica patch
  const tmpPath = path.join(process.cwd(), "tmp_patch.diff");
  try {
    log("info", "Writing patch to temporary file");
    fs.writeFileSync(tmpPath, patch);

    log("info", "Applying patch");
    sh(`git apply ${tmpPath}`);
    log("info", "Patch applied successfully");
  } catch (e) {
    log("error", "Patch could not be applied");
    log("error", "Patch content:");
    log("error", patch);
    throw new Error("Patch non applicabile");
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
      log("info", "Cleaned up temporary patch file");
    }
  }

  // 5) Qualità - run quality checks with better error handling
  const qualityChecks = [
    { cmd: "pnpm lint", name: "linting" },
    { cmd: "pnpm typecheck", name: "type checking" },
    { cmd: "pnpm test -i", name: "testing" },
    { cmd: "pnpm build", name: "building" },
  ];

  for (const check of qualityChecks) {
    try {
      log("info", `Running ${check.name}`);
      sh(check.cmd);
      log("info", `${check.name} passed`);
    } catch (error) {
      log("error", `${check.name} failed`);
      // Continue with other checks but log the failure
    }
  }

  // 6) Commit + JOURNAL
  try {
    log("info", "Staging changes");
    sh(`git add -A`);

    log("info", "Committing changes");
    sh(`git commit -m "feat: ${next} [ai]"`);

    const commit = execSync("git rev-parse --short HEAD").toString().trim();
    log("info", `Created commit: ${commit}`);

    // Update journal
    const journalEntry = `\n## ${new Date().toISOString()}\nTask: ${next}\nCommit: ${commit}\n`;
    fs.appendFileSync("ai/JOURNAL.md", journalEntry);
    log("info", "Updated journal");
  } catch (error) {
    log("error", "Failed to commit changes");
    throw error;
  }

  log("info", "AI assistant completed successfully");

  // 7) Push + PR (opzionale con GitHub CLI)
  // sh(`git push -u origin ${branch}`);
  // sh(`gh pr create --fill`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
