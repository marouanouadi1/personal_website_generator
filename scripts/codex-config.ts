import fs from "node:fs";
import path from "node:path";

export interface CodexConfig {
  promptFile: string;
  command: string;
  delaySeconds: number;
  workingDirectory: string;
  env?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  config?: CodexConfig;
}

const DEFAULT_DELAY_SECONDS = 5;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function quoteShellValue(value: string): string {
  if (value === "") {
    return "''";
  }

  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function formatEnvVariables(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${quoteShellValue(value)}`)
    .join(" ");
}

export function validateCodexConfig(
  rawConfig: unknown,
  options: { baseDir?: string } = {},
): ValidationResult {
  const baseDir = options.baseDir ? path.resolve(options.baseDir) : process.cwd();
  const errors: string[] = [];

  if (!isPlainObject(rawConfig)) {
    return {
      isValid: false,
      errors: ["Configuration must be a JSON object"],
    };
  }

  const promptFile = rawConfig.promptFile;
  const promptValue = typeof promptFile === "string" ? promptFile.trim() : "";
  if (promptValue === "") {
    errors.push("`promptFile` is required and must be a non-empty string");
  }

  const command = rawConfig.command;
  const commandValue = typeof command === "string" ? command.trim() : "";
  if (commandValue === "") {
    errors.push("`command` is required and must be a non-empty string");
  }

  let delaySeconds = DEFAULT_DELAY_SECONDS;
  if ("delaySeconds" in rawConfig) {
    if (typeof rawConfig.delaySeconds !== "number" || Number.isNaN(rawConfig.delaySeconds)) {
      errors.push("`delaySeconds` must be a number if provided");
    } else if (rawConfig.delaySeconds < 0) {
      errors.push("`delaySeconds` cannot be negative");
    } else {
      delaySeconds = rawConfig.delaySeconds;
    }
  }

  let workingDirectory = baseDir;
  if ("workingDirectory" in rawConfig) {
    if (typeof rawConfig.workingDirectory !== "string" || rawConfig.workingDirectory.trim() === "") {
      errors.push("`workingDirectory` must be a non-empty string when provided");
    } else {
      workingDirectory = path.resolve(baseDir, rawConfig.workingDirectory.trim());
    }
  }

  if (!fs.existsSync(workingDirectory) || !fs.statSync(workingDirectory).isDirectory()) {
    errors.push(`Working directory does not exist: ${workingDirectory}`);
  }

  let resolvedPrompt = "";
  if (promptValue !== "") {
    resolvedPrompt = path.resolve(workingDirectory, promptValue);
    if (!fs.existsSync(resolvedPrompt) || !fs.statSync(resolvedPrompt).isFile()) {
      errors.push(`Prompt file not found: ${resolvedPrompt}`);
    }
  }

  let env: Record<string, string> | undefined;
  if ("env" in rawConfig) {
    if (!isPlainObject(rawConfig.env)) {
      errors.push("`env` must be an object mapping environment variables to string values");
    } else {
      const entries = Object.entries(rawConfig.env);
      const invalidEntry = entries.find(([, value]) => typeof value !== "string");
      if (invalidEntry) {
        errors.push("All `env` values must be strings");
      } else {
        env = entries.reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = value as string;
          return acc;
        }, {});
      }
    }
  }

  let metadata: Record<string, string> | undefined;
  if ("metadata" in rawConfig) {
    if (!isPlainObject(rawConfig.metadata)) {
      errors.push("`metadata` must be an object with string values");
    } else {
      const invalidEntry = Object.entries(rawConfig.metadata).find(([, value]) => typeof value !== "string");
      if (invalidEntry) {
        errors.push("All `metadata` values must be strings");
      } else {
        metadata = Object.entries(rawConfig.metadata).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            acc[key] = value as string;
            return acc;
          },
          {},
        );
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    config: {
      promptFile: promptValue,
      command: commandValue,
      delaySeconds,
      workingDirectory,
      env,
      metadata,
    },
  };
}

export function loadCodexConfig(configPath = "codex/config.json"): CodexConfig {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found at ${absolutePath}`);
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read config file: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in config file: ${message}`);
  }

  const validation = validateCodexConfig(parsed, {
    baseDir: path.dirname(absolutePath),
  });

  if (!validation.isValid || !validation.config) {
    throw new Error(`Codex config invalid:\n- ${validation.errors.join("\n- ")}`);
  }

  return validation.config;
}

export function buildLoopCommand(config: CodexConfig): string {
  const promptPath = path.resolve(config.workingDirectory, config.promptFile);
  const normalizedPromptPath = promptPath.split(path.sep).join("/");

  const segments: string[] = [];
  const envPrefix = config.env && Object.keys(config.env).length > 0 ? formatEnvVariables(config.env) : "";
  const pipeline = `cat "${normalizedPromptPath}" | ${envPrefix ? `${envPrefix} ` : ""}${config.command}`;

  segments.push(pipeline);

  if (config.delaySeconds > 0) {
    segments.push(`sleep ${config.delaySeconds}`);
  }

  return `while :; do ${segments.join("; ")}; done`;
}
