#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
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

class PatchValidationError extends Error {
  public readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.name = "PatchValidationError";
    this.issues = issues;
  }
}

type PatchChangeType = "new" | "delete" | "modify" | "rename";

interface PatchChange {
  type: PatchChangeType;
  oldPath: string;
  newPath: string;
}

function normalizeDiffPath(diffPath: string): string {
  const [rawPath] = diffPath.trim().split(/\s+/);
  if (!rawPath || rawPath === "/dev/null") {
    return rawPath;
  }

  return rawPath.replace(/^a\//, "").replace(/^b\//, "");
}

function extractPatchChanges(patch: string): PatchChange[] {
  const changes: PatchChange[] = [];
  const lines = patch.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("--- ")) {
      continue;
    }

    const nextLine = lines[i + 1];
    if (!nextLine || !nextLine.startsWith("+++ ")) {
      continue;
    }

    const oldPath = normalizeDiffPath(line.slice(4));
    const newPath = normalizeDiffPath(nextLine.slice(4));

    if (!oldPath && !newPath) {
      continue;
    }

    if (oldPath === "/dev/null" && newPath && newPath !== "/dev/null") {
      changes.push({ type: "new", oldPath: "", newPath });
    } else if (newPath === "/dev/null" && oldPath && oldPath !== "/dev/null") {
      changes.push({ type: "delete", oldPath, newPath: "" });
    } else if (oldPath && newPath && oldPath !== newPath) {
      changes.push({ type: "rename", oldPath, newPath });
    } else if (oldPath && newPath) {
      changes.push({ type: "modify", oldPath, newPath });
    }
  }

  return changes;
}

function validatePatchAgainstRepository(patch: string) {
  const issues: string[] = [];
  const changes = extractPatchChanges(patch);

  for (const change of changes) {
    if (change.type === "new") {
      if (fs.existsSync(path.join(process.cwd(), change.newPath))) {
        issues.push(
          `Il file "${change.newPath}" esiste già ma la patch lo tratta come nuovo.`,
        );
      }
      continue;
    }

    const oldPath = path.join(process.cwd(), change.oldPath);
    if (!fs.existsSync(oldPath)) {
      issues.push(
        `Il file "${change.oldPath}" non esiste nel repository ma la patch richiede di modificarlo o eliminarlo.`,
      );
    }

    if (change.type === "rename" && change.newPath !== change.oldPath) {
      const newPath = path.join(process.cwd(), change.newPath);
      if (fs.existsSync(newPath)) {
        issues.push(
          `Il file di destinazione "${change.newPath}" esiste già e impedisce la rinomina dalla patch.`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new PatchValidationError(
      "La patch ricevuta non è compatibile con lo stato corrente del repository.",
      issues,
    );
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

    const system = `Sei un agente che propone UNA singola patch diff unificata per completare il task richiesto.\n\nREQUISITI CRITICI:\n- Fornisci ESCLUSIVAMENTE il contenuto della patch diff\n- NON includere testo descrittivo, piani, spiegazioni o commenti\n- NON usare markdown code blocks (no \`\`\`diff)\n- Inizia direttamente con "--- " per il primo file\n- Formato git diff standard applicabile con 'git apply'\n- Per file ESISTENTI: usa 'a/nomefile' e 'b/nomefile'\n- Per file NUOVI: usa '/dev/null' per '---' e 'b/nomefile' per '+++'\n- Per file da ELIMINARE: usa 'a/nomefile' per '---' e '/dev/null' per '+++'\n- Gli hunk header devono essere nel formato: @@ -start,count +start,count @@\n- Esempio hunk header corretto: @@ -1,3 +1,4 @@\n- Per file nuovo: @@ -0,0 +1,5 @@\n- Mantieni patch <= 300 linee\n- VERIFICA nel REPO TREE se un file esiste prima di decidere se è nuovo\n\nLa risposta deve iniziare immediatamente con "--- " e contenere solo il diff.`;

    const userContent = `TASK SELEZIONATO:\n${task}\n\nPROMPT PRINCIPALE:\n${prompt}\n\nBACKLOG COMPLETO:\n${tasksMd}\n\nREPO TREE (file esistenti):\n${tree}\n\nFILE CHE ESISTONO GIÀ (da MODIFICARE, non creare):\n- package.json (MODIFICARE con --- a/package.json +++ b/package.json)\n- README.md (MODIFICARE con --- a/README.md +++ b/README.md)\n- tsconfig.json (MODIFICARE con --- a/tsconfig.json +++ b/tsconfig.json)\n- vitest.config.ts (MODIFICARE con --- a/vitest.config.ts +++ b/vitest.config.ts)\n\nPer NUOVI file (non nell'elenco sopra): --- /dev/null +++ b/nomefile\n\nESEMPIO CORRETTO per modificare package.json:\n--- a/package.json\n+++ b/package.json\n@@ -1,6 +1,7 @@\n {\n   "name": "personal_website_generator",\n+  "version": "0.1.0",\n   "private": true,\n   "type": "module",\n\nRISPONDI SOLO CON IL DIFF. Inizia con "--- ".`;

    log("info", "Sending request to Anthropic API");
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000, // Increased token limit
      temperature: 0.1,
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

    // Extract patch from markdown code blocks if present
    let patch = textParts.trim();

    // Remove markdown code block markers if present
    if (patch.startsWith("```diff\n") || patch.startsWith("```\n")) {
      patch = patch.replace(/^```(diff)?\n/, "").replace(/\n```$/, "");
    }

    // Remove any text before the first "--- " line (explanations, plans, etc.)
    const patchLines = patch.split("\n");
    let firstDiffLineIndex = -1;

    for (let i = 0; i < patchLines.length; i++) {
      if (patchLines[i].startsWith("--- ")) {
        firstDiffLineIndex = i;
        break;
      }
    }

    if (firstDiffLineIndex > 0) {
      log("info", `Removing ${firstDiffLineIndex} lines of non-diff content`);
      patch = patchLines.slice(firstDiffLineIndex).join("\n");
    } else if (firstDiffLineIndex === -1) {
      log("error", "No diff content found in AI response");
      throw new Error("Nessun contenuto diff trovato nella risposta dell'AI");
    }

    // Clean up any extra whitespace and normalize line endings
    patch = patch.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Enhanced patch validation - check for diff markers anywhere in the content
    const hasDiffMarkers = /(?:^|\n)(?:diff --git|Index: |\+\+\+|---)/m.test(patch);

    if (!hasDiffMarkers) {
      log("error", "Invalid patch format received from AI");
      log("info", `AI Response preview: ${textParts.substring(0, 500)}...`);
      log("info", `Cleaned patch preview: ${patch.substring(0, 500)}...`);
      throw new Error("La risposta del modello non sembra un diff valido");
    }

    // Additional validation - check for proper patch structure
    const responseLines = patch.split("\n");
    let hasProperHeaders = false;

    for (let i = 0; i < responseLines.length - 1; i++) {
      if (
        responseLines[i].startsWith("--- ") &&
        responseLines[i + 1].startsWith("+++ ")
      ) {
        hasProperHeaders = true;
        break;
      }
    }

    if (!hasProperHeaders) {
      log("error", "Patch missing proper --- and +++ headers");
      throw new Error("Patch formato non valido: mancano header --- e +++");
    }

    // Validate hunk headers (@@)
    for (let i = 0; i < responseLines.length; i++) {
      const line = responseLines[i];
      if (line.startsWith("@@")) {
        // Check if it matches the pattern @@ -start,count +start,count @@
        const hunkPattern = /^@@ -\d+,\d+ \+\d+,\d+ @@/;
        if (!hunkPattern.test(line)) {
          log("error", `Invalid hunk header at line ${i + 1}: "${line}"`);
          throw new Error(`Hunk header non valido alla linea ${i + 1}: "${line}"`);
        }
      }
    }

    // Check if patch appears to be truncated
    const lastLine = responseLines[responseLines.length - 1];
    if (
      lastLine &&
      !lastLine.startsWith(" ") &&
      !lastLine.startsWith("+") &&
      !lastLine.startsWith("-") &&
      !lastLine.startsWith("@@") &&
      lastLine.trim() !== ""
    ) {
      log("warn", "Patch might be truncated - last line doesn't look like diff content");
      log("warn", `Last line: "${lastLine}"`);
    }

    // Check patch size
    const patchLineCount = patch.split("\n").length;
    if (patchLineCount > 500) {
      log("warn", `Large patch detected: ${patchLineCount} lines`);
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

  try {
    validatePatchAgainstRepository(patch);
  } catch (error) {
    if (error instanceof PatchValidationError) {
      log("error", error.message);
      for (const issue of error.issues) {
        log("error", issue);
      }
    }
    throw error;
  }

  // 4) Applica patch
  const tmpPath = path.join(os.tmpdir(), "ai_patch.diff");
  try {
    log("info", "Writing patch to temporary file");

    // Convert CRLF to LF for git compatibility
    const normalizedPatch = patch.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    fs.writeFileSync(tmpPath, normalizedPatch, { encoding: "utf8" });

    // Log the patch for debugging
    log("info", "Patch content preview:");
    const patchLines = normalizedPatch.split("\n");
    const previewLines = patchLines.slice(0, 20).join("\n");
    log("info", previewLines);

    if (patchLines.length > 20) {
      log("info", `... (${patchLines.length - 20} more lines)`);
    }

    // Check lines around potential corruption point
    if (patchLines.length > 48) {
      log("info", "Lines around line 48:");
      const start = Math.max(0, 48 - 5);
      const end = Math.min(patchLines.length, 48 + 5);
      for (let i = start; i < end; i++) {
        log("info", `Line ${i + 1}: "${patchLines[i]}"`);
      }
    }

    log("info", "Applying patch");
    sh(`git apply "${tmpPath}"`);
    log("info", "Patch applied successfully");
  } catch (e) {
    log("error", "Patch could not be applied");
    log("error", "Full patch content:");
    log("error", patch);

    // Try to get more details about why it failed
    try {
      const checkResult = execSync(`git apply --check "${tmpPath}"`, {
        encoding: "utf8",
      });
      log("info", "Patch check result:");
      log("info", checkResult);
    } catch (checkError: any) {
      log("error", "Patch check error:");
      log("error", checkError.message);
    }

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
