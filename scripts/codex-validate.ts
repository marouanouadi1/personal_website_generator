#!/usr/bin/env ts-node
import process from "node:process";
import { loadCodexConfig } from "./codex-config.js";

function main() {
  const configPath = process.argv[2] ?? "codex/config.json";

  try {
    const config = loadCodexConfig(configPath);
    console.log(`Codex config OK. Prompt: ${config.promptFile}, command: ${config.command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Codex config invalid: ${message}`);
    process.exitCode = 1;
  }
}

main();
