#!/usr/bin/env ts-node
import path from "node:path";
import process from "node:process";
import { buildLoopCommand, loadCodexConfig } from "./codex-config.js";

function toPosix(inputPath: string): string {
  return inputPath.split(path.sep).join("/");
}

function main() {
  const configPath = process.argv[2] ?? "codex/config.json";

  try {
    const config = loadCodexConfig(configPath);
    const loopCommand = buildLoopCommand(config);
    const workingDir = path.resolve(config.workingDirectory);

    console.log("Recommended Codex loop command:\n");
    if (workingDir !== process.cwd()) {
      console.log(`# Ensure you run the loop inside the repo`);
      console.log(`cd "${toPosix(workingDir)}"`);
    }
    console.log(loopCommand);

    if (config.metadata) {
      const lines: string[] = [];
      if (config.metadata.tasksFile) {
        lines.push(`Backlog: ${config.metadata.tasksFile}`);
      }
      if (config.metadata.journalFile) {
        lines.push(`Journal: ${config.metadata.journalFile}`);
      }
      if (config.metadata.constraintsFile) {
        lines.push(`Constraints: ${config.metadata.constraintsFile}`);
      }
      if (config.metadata.scratchpadDir) {
        lines.push(`Scratchpad: ${config.metadata.scratchpadDir}`);
      }

      if (lines.length > 0) {
        console.log("\nReference files:");
        for (const line of lines) {
          console.log(`- ${line}`);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to prepare Codex loop: ${message}`);
    process.exitCode = 1;
  }
}

main();
