import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateConfig } from "../scripts/config-validator";
import { TaskManager, parseTasksFromMarkdown } from "../scripts/task-manager";

describe("Config Validator", () => {
  const testConfigDir = path.join(__dirname, "temp");
  const testConfigPath = path.join(testConfigDir, "test-config.json");

  beforeEach(() => {
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  it("should validate a correct config", () => {
    const validConfig = {
      allowedPaths: ["scripts", "tests"],
      branchPrefix: "ai/",
      commitFormat: "conventional",
      maxChangedLines: 300,
      commands: {
        lint: "npm run lint",
        test: "npm test",
      },
      retry: 2,
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
    const result = validateConfig(path.relative(process.cwd(), testConfigPath));

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect missing required fields", () => {
    const invalidConfig = {
      allowedPaths: ["scripts"],
      // missing other required fields
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig, null, 2));
    const result = validateConfig(path.relative(process.cwd(), testConfigPath));

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("branchPrefix"))).toBe(true);
  });

  it("should detect invalid JSON", () => {
    fs.writeFileSync(testConfigPath, "{ invalid json }");
    const result = validateConfig(path.relative(process.cwd(), testConfigPath));

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid JSON"))).toBe(true);
  });

  it("should validate field types", () => {
    const invalidConfig = {
      allowedPaths: "not-an-array", // should be array
      branchPrefix: "ai/",
      maxChangedLines: "300", // should be number
      commands: {},
      retry: 2,
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig, null, 2));
    const result = validateConfig(path.relative(process.cwd(), testConfigPath));

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("allowedPaths must be an array"))).toBe(
      true,
    );
    expect(
      result.errors.some((e) => e.includes("maxChangedLines must be a number")),
    ).toBe(true);
  });
});

describe("Task Manager", () => {
  const testTasksDir = path.join(__dirname, "temp");
  const testTasksPath = path.join(testTasksDir, "test-tasks.md");

  beforeEach(() => {
    if (!fs.existsSync(testTasksDir)) {
      fs.mkdirSync(testTasksDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testTasksPath)) {
      fs.unlinkSync(testTasksPath);
    }
  });

  it("should parse tasks correctly", () => {
    const testContent = `# Test Tasks
- [ ] First task
- [x] Completed task  
- [ ] High priority task [!!!]
- [ ] Task with tags #urgent #bug
- [ ] Medium priority task [!!] #feature
`;
    fs.writeFileSync(testTasksPath, testContent);

    const tasks = parseTasksFromMarkdown(path.relative(process.cwd(), testTasksPath));

    expect(tasks).toHaveLength(5);
    expect(tasks[0].description).toBe("First task");
    expect(tasks[0].completed).toBe(false);
    expect(tasks[1].completed).toBe(true);
    expect(tasks[2].priority).toBe("high");
    expect(tasks[3].tags).toEqual(["urgent", "bug"]);
    expect(tasks[4].priority).toBe("medium");
    expect(tasks[4].tags).toEqual(["feature"]);
  });

  it("should get next task correctly", () => {
    const testContent = `# Test Tasks
- [x] Completed task
- [ ] Next task
- [ ] Another task
`;
    fs.writeFileSync(testTasksPath, testContent);

    const manager = new TaskManager(path.relative(process.cwd(), testTasksPath));
    const nextTask = manager.getNextTask();

    expect(nextTask?.description).toBe("Next task");
  });

  it("should prioritize high priority tasks", () => {
    const testContent = `# Test Tasks
- [ ] Normal task
- [ ] High priority task [!!!]
- [ ] Medium priority task [!!]
`;
    fs.writeFileSync(testTasksPath, testContent);

    const manager = new TaskManager(path.relative(process.cwd(), testTasksPath));
    const nextTask = manager.getHighestPriorityTask();

    expect(nextTask?.description).toBe("High priority task");
    expect(nextTask?.priority).toBe("high");
  });

  it("should calculate stats correctly", () => {
    const testContent = `# Test Tasks
- [ ] Task 1
- [x] Task 2
- [x] Task 3
- [ ] Task 4
`;
    fs.writeFileSync(testTasksPath, testContent);

    const manager = new TaskManager(path.relative(process.cwd(), testTasksPath));
    const stats = manager.getStats();

    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.completionRate).toBe(50);
  });

  it("should filter tasks by priority", () => {
    const testContent = `# Test Tasks
- [ ] High task [!!!]
- [ ] Medium task [!!]
- [ ] Low task [!]
- [ ] Normal task
`;
    fs.writeFileSync(testTasksPath, testContent);

    const manager = new TaskManager(path.relative(process.cwd(), testTasksPath));

    expect(manager.getTasksByPriority("high")).toHaveLength(1);
    expect(manager.getTasksByPriority("medium")).toHaveLength(1);
    expect(manager.getTasksByPriority("low")).toHaveLength(1);
  });

  it("should filter tasks by tag", () => {
    const testContent = `# Test Tasks
- [ ] Bug task #bug
- [ ] Feature task #feature
- [ ] Urgent bug #bug #urgent
- [ ] Normal task
`;
    fs.writeFileSync(testTasksPath, testContent);

    const manager = new TaskManager(path.relative(process.cwd(), testTasksPath));

    expect(manager.getTasksByTag("bug")).toHaveLength(2);
    expect(manager.getTasksByTag("feature")).toHaveLength(1);
    expect(manager.getTasksByTag("urgent")).toHaveLength(1);
    expect(manager.getTasksByTag("nonexistent")).toHaveLength(0);
  });
});
