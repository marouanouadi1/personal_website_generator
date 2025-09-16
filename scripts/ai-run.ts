#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

function sh(cmd: string) {
  return execSync(cmd, { stdio: "inherit" });
}

async function getPatchFromLLM(task: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY env var");
  }

  const client = new Anthropic({ apiKey });

  // Gather prompt ingredients
  const prompt = fs.readFileSync("ai/PROMPT.md", "utf8");
  const tasksMd = fs.readFileSync("ai/TASKS.md", "utf8");

  // Simple repo tree (only few levels for brevity)
  function list(dir: string, depth = 0): string {
    if (depth > 3) return ""; // limit
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
  }
  const tree = list(process.cwd());

  const system = `Sei un agente che propone UNA singola patch diff unificata (formato '*** Begin Patch' se vuoi, ma preferibilmente unified diff semplice) per completare il task richiesto.\nRequisiti:\n- Non modificare file fuori da allowedPaths se definiti.\n- Mantieni patch <= 300 linee.\n- Solo diff, nessuna spiegazione.`;

  const userContent = `TASK SELEZIONATO:\n${task}\n\nPROMPT PRINCIPALE:\n${prompt}\n\nBACKLOG COMPLETO:\n${tasksMd}\n\nREPO TREE:\n${tree}\n\nFornisci ora SOLO la patch unified diff applicabile con 'git apply'.`;

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
  const textParts = msg.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");

  // Heuristic: ensure starts with diff markers
  const patch = textParts.match(/(^|\n)(\+\+\+|diff --git|Index: )/)
    ? textParts
    : textParts.trim();
  if (!/diff --git|^\+\+\+/.test(patch)) {
    throw new Error("La risposta del modello non sembra un diff valido");
  }
  return patch;
}

async function main() {
  // 1) Leggi backlog e scegli il primo task aperto
  const tasks = fs.readFileSync("ai/TASKS.md", "utf8");
  const match = tasks.match(/- \[ \] .+/);
  const next = match ? match[0].replace(/- \[ \] /, "").trim() : undefined;
  if (!next) {
    console.log("Nessun task aperto.");
    return;
  }

  // 2) Crea branch
  const branch = `ai/${next.toLowerCase().replace(/\W+/g, "-")}`;
  sh(`git checkout -b ${branch}`);

  // 3) Ottieni patch dall'AI
  console.log("Richiedo patch a Claude Sonnet per il task:", next);
  const patch = await getPatchFromLLM(next);

  // 4) Applica patch
  const tmpPath = path.join(process.cwd(), "tmp_patch.diff");
  fs.writeFileSync(tmpPath, patch);
  try {
    sh(`git apply ${tmpPath}`);
  } catch (e) {
    console.error(patch);
    throw new Error("Patch non applicabile");
  } finally {
    fs.unlinkSync(tmpPath);
  }

  // 5) Qualità
  sh("pnpm lint");
  sh("pnpm typecheck");
  sh("pnpm test -i");
  sh("pnpm build");

  // 6) Commit + JOURNAL
  sh(`git add -A`);
  sh(`git commit -m "feat: ${next} [ai]"`);
  const commit = execSync("git rev-parse --short HEAD").toString().trim();
  fs.appendFileSync(
    "ai/JOURNAL.md",
    `\n## ${new Date().toISOString()}\nTask: ${next}\nCommit: ${commit}\n`,
  );
  // 7) Push + PR (opzionale con GitHub CLI)
  // sh(`git push -u origin ${branch}`);
  // sh(`gh pr create --fill`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
