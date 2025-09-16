import fs from "node:fs";
import path from "node:path";

export interface AIConfig {
  allowedPaths: string[];
  branchPrefix: string;
  commitFormat: string;
  maxChangedLines: number;
  commands: Record<string, string>;
  retry: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(configPath: string = "ai/config.json"): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check if config file exists
  const fullConfigPath = path.join(process.cwd(), configPath);
  if (!fs.existsSync(fullConfigPath)) {
    result.isValid = false;
    result.errors.push(`Config file not found: ${configPath}`);
    return result;
  }

  let config: AIConfig;

  // Parse JSON
  try {
    const configContent = fs.readFileSync(fullConfigPath, "utf8");
    config = JSON.parse(configContent) as AIConfig;
  } catch (error) {
    result.isValid = false;
    result.errors.push(
      `Invalid JSON in config file: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  // Validate required fields
  const requiredFields: (keyof AIConfig)[] = [
    "allowedPaths",
    "branchPrefix",
    "maxChangedLines",
    "commands",
    "retry",
  ];

  for (const field of requiredFields) {
    if (!(field in config)) {
      result.isValid = false;
      result.errors.push(`Missing required field: ${field}`);
    }
  }

  if (!result.isValid) {
    return result;
  }

  // Validate field types and values
  if (!Array.isArray(config.allowedPaths)) {
    result.isValid = false;
    result.errors.push("allowedPaths must be an array");
  } else {
    // Check if allowed paths exist
    for (const allowedPath of config.allowedPaths) {
      if (typeof allowedPath !== "string") {
        result.errors.push(`Invalid allowedPath: ${allowedPath} (must be string)`);
        continue;
      }

      const fullPath = path.join(process.cwd(), allowedPath);
      if (!fs.existsSync(fullPath)) {
        result.warnings.push(`Allowed path does not exist: ${allowedPath}`);
      }
    }
  }

  if (typeof config.branchPrefix !== "string") {
    result.isValid = false;
    result.errors.push("branchPrefix must be a string");
  } else if (config.branchPrefix.length === 0) {
    result.warnings.push("branchPrefix is empty");
  }

  if (typeof config.maxChangedLines !== "number") {
    result.isValid = false;
    result.errors.push("maxChangedLines must be a number");
  } else if (config.maxChangedLines <= 0) {
    result.isValid = false;
    result.errors.push("maxChangedLines must be positive");
  } else if (config.maxChangedLines > 1000) {
    result.warnings.push("maxChangedLines is very high (>1000), consider reducing");
  }

  if (typeof config.retry !== "number") {
    result.isValid = false;
    result.errors.push("retry must be a number");
  } else if (config.retry < 0) {
    result.isValid = false;
    result.errors.push("retry must be non-negative");
  } else if (config.retry > 5) {
    result.warnings.push("retry count is high (>5), this might slow down the process");
  }

  if (typeof config.commands !== "object" || config.commands === null) {
    result.isValid = false;
    result.errors.push("commands must be an object");
  } else {
    // Validate essential commands
    const essentialCommands = ["lint", "typecheck", "test", "build"];
    for (const cmd of essentialCommands) {
      if (!(cmd in config.commands)) {
        result.warnings.push(`Missing recommended command: ${cmd}`);
      }
    }

    // Check command format
    for (const [key, value] of Object.entries(config.commands)) {
      if (typeof value !== "string") {
        result.errors.push(`Command ${key} must be a string`);
      } else if (value.trim().length === 0) {
        result.warnings.push(`Command ${key} is empty`);
      }
    }
  }

  if (config.commitFormat && typeof config.commitFormat !== "string") {
    result.warnings.push("commitFormat should be a string");
  }

  return result;
}

export function loadAndValidateConfig(configPath: string = "ai/config.json"): AIConfig {
  const validation = validateConfig(configPath);

  if (!validation.isValid) {
    console.error("Config validation failed:");
    validation.errors.forEach((error) => console.error(`  ❌ ${error}`));
    throw new Error("Invalid configuration");
  }

  if (validation.warnings.length > 0) {
    console.warn("Config validation warnings:");
    validation.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
  }

  const fullConfigPath = path.join(process.cwd(), configPath);
  const configContent = fs.readFileSync(fullConfigPath, "utf8");
  return JSON.parse(configContent) as AIConfig;
}

// CLI interface
if (require.main === module) {
  const configPath = process.argv[2] || "ai/config.json";

  console.log(`Validating config: ${configPath}`);
  const result = validateConfig(configPath);

  if (result.isValid) {
    console.log("✅ Configuration is valid");
    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning) => console.log(`  ⚠️  ${warning}`));
    }
  } else {
    console.log("❌ Configuration is invalid");
    console.log("\nErrors:");
    result.errors.forEach((error) => console.log(`  ❌ ${error}`));

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning) => console.log(`  ⚠️  ${warning}`));
    }

    process.exit(1);
  }
}
