import fs from "node:fs";
import path from "node:path";

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  createdAt?: Date;
  completedAt?: Date;
  lineNumber?: number;
  originalLine?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
}

export class TaskManager {
  private filePath: string;
  private tasks: Task[] = [];

  constructor(filePath: string = "ai/TASKS.md") {
    this.filePath = path.join(process.cwd(), filePath);
    this.loadTasks();
  }

  private loadTasks(): void {
    if (!fs.existsSync(this.filePath)) {
      console.warn(`Tasks file not found: ${this.filePath}`);
      return;
    }

    const content = fs.readFileSync(this.filePath, "utf8");
    this.tasks = this.parseTasksFromMarkdown(content);
  }

  private parseTasksFromMarkdown(content: string): Task[] {
    const lines = content.split("\n");
    const tasks: Task[] = [];
    let taskId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const taskMatch = line.match(/^(\s*)- \[([ xX])\] (.+)$/);

      if (taskMatch) {
        const [, , status, description] = taskMatch;
        const completed = status.toLowerCase() === "x";

        // Extract priority from description
        const priorityMatch = description.match(/\[(!{1,3})\]/);
        let priority: Task["priority"] = undefined;
        let cleanDescription = description;

        if (priorityMatch) {
          const priorityMarker = priorityMatch[1];
          priority =
            priorityMarker.length === 1
              ? "low"
              : priorityMarker.length === 2
                ? "medium"
                : "high";
          cleanDescription = description.replace(/\[!{1,3}\]/, "").trim();
        }

        // Extract tags
        const tagMatches = cleanDescription.match(/#(\w+)/g);
        const tags = tagMatches ? tagMatches.map((tag) => tag.slice(1)) : undefined;
        if (tags) {
          cleanDescription = cleanDescription.replace(/#\w+/g, "").trim();
        }

        tasks.push({
          id: `task-${taskId++}`,
          description: cleanDescription,
          completed,
          priority,
          tags,
          lineNumber: i + 1,
          originalLine: line,
        });
      }
    }

    return tasks;
  }

  public getTasks(): Task[] {
    return [...this.tasks];
  }

  public getNextTask(): Task | null {
    return this.tasks.find((task) => !task.completed) || null;
  }

  public getTasksByPriority(priority: Task["priority"]): Task[] {
    return this.tasks.filter((task) => task.priority === priority && !task.completed);
  }

  public getTasksByTag(tag: string): Task[] {
    return this.tasks.filter((task) => task.tags?.includes(tag) && !task.completed);
  }

  public getHighestPriorityTask(): Task | null {
    // First try high priority tasks
    const highPriority = this.getTasksByPriority("high");
    if (highPriority.length > 0) return highPriority[0];

    // Then medium priority
    const mediumPriority = this.getTasksByPriority("medium");
    if (mediumPriority.length > 0) return mediumPriority[0];

    // Then low priority
    const lowPriority = this.getTasksByPriority("low");
    if (lowPriority.length > 0) return lowPriority[0];

    // Finally any task without priority
    return this.getNextTask();
  }

  public markTaskComplete(taskId: string): boolean {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.completed) {
      return false;
    }

    task.completed = true;
    task.completedAt = new Date();
    this.saveTasks();
    return true;
  }

  public markTaskCompleteByDescription(description: string): boolean {
    const task = this.tasks.find(
      (t) =>
        t.description.toLowerCase().includes(description.toLowerCase()) && !t.completed,
    );

    if (!task) {
      return false;
    }

    return this.markTaskComplete(task.id);
  }

  public addTask(
    description: string,
    priority?: Task["priority"],
    tags?: string[],
  ): Task {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      description,
      completed: false,
      priority,
      tags,
      createdAt: new Date(),
    };

    this.tasks.push(newTask);
    this.saveTasks();
    return newTask;
  }

  public getStats(): TaskStats {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, pending, completionRate };
  }

  private saveTasks(): void {
    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content.split("\n");

      // Update existing task lines
      for (const task of this.tasks) {
        if (task.lineNumber && task.lineNumber <= lines.length) {
          const lineIndex = task.lineNumber - 1;
          const checkbox = task.completed ? "[x]" : "[ ]";
          let taskLine = `- ${checkbox} ${task.description}`;

          // Add priority marker
          if (task.priority) {
            const priorityMarker =
              task.priority === "low"
                ? "[!]"
                : task.priority === "medium"
                  ? "[!!]"
                  : "[!!!]";
            taskLine += ` ${priorityMarker}`;
          }

          // Add tags
          if (task.tags && task.tags.length > 0) {
            taskLine += ` ${task.tags.map((tag) => `#${tag}`).join(" ")}`;
          }

          lines[lineIndex] = taskLine;
        }
      }

      // Add new tasks at the end
      const newTasks = this.tasks.filter((t) => !t.lineNumber);
      if (newTasks.length > 0) {
        lines.push(""); // Add empty line before new tasks
        for (const task of newTasks) {
          const checkbox = task.completed ? "[x]" : "[ ]";
          let taskLine = `- ${checkbox} ${task.description}`;

          if (task.priority) {
            const priorityMarker =
              task.priority === "low"
                ? "[!]"
                : task.priority === "medium"
                  ? "[!!]"
                  : "[!!!]";
            taskLine += ` ${priorityMarker}`;
          }

          if (task.tags && task.tags.length > 0) {
            taskLine += ` ${task.tags.map((tag) => `#${tag}`).join(" ")}`;
          }

          lines.push(taskLine);
        }
      }

      fs.writeFileSync(this.filePath, lines.join("\n"));
    } catch (error) {
      console.error(
        "Failed to save tasks:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public printSummary(): void {
    const stats = this.getStats();

    console.log("\n📋 Task Summary");
    console.log("===============");
    console.log(`Total tasks: ${stats.total}`);
    console.log(`Completed: ${stats.completed}`);
    console.log(`Pending: ${stats.pending}`);
    console.log(`Completion rate: ${stats.completionRate.toFixed(1)}%`);

    if (stats.pending > 0) {
      console.log("\n📝 Pending Tasks:");
      const pendingTasks = this.tasks.filter((t) => !t.completed);

      // Group by priority
      const highPriority = pendingTasks.filter((t) => t.priority === "high");
      const mediumPriority = pendingTasks.filter((t) => t.priority === "medium");
      const lowPriority = pendingTasks.filter((t) => t.priority === "low");
      const noPriority = pendingTasks.filter((t) => !t.priority);

      if (highPriority.length > 0) {
        console.log("  🔴 High Priority:");
        highPriority.forEach((t) => console.log(`    - ${t.description}`));
      }

      if (mediumPriority.length > 0) {
        console.log("  🟡 Medium Priority:");
        mediumPriority.forEach((t) => console.log(`    - ${t.description}`));
      }

      if (lowPriority.length > 0) {
        console.log("  🟢 Low Priority:");
        lowPriority.forEach((t) => console.log(`    - ${t.description}`));
      }

      if (noPriority.length > 0) {
        console.log("  ⚪ No Priority:");
        noPriority.forEach((t) => console.log(`    - ${t.description}`));
      }
    }
  }
}

// Utility functions for backwards compatibility
export function parseTasksFromMarkdown(filePath: string): Task[] {
  const manager = new TaskManager(filePath);
  return manager.getTasks();
}

export function getNextTask(tasks: Task[]): Task | null {
  return tasks.find((task) => !task.completed) || null;
}

export function markTaskComplete(filePath: string, taskDescription: string): boolean {
  const manager = new TaskManager(filePath);
  return manager.markTaskCompleteByDescription(taskDescription);
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const tasksFile = process.argv[3] || "ai/TASKS.md";

  const manager = new TaskManager(tasksFile);

  switch (command) {
    case "list": {
      manager.printSummary();
      break;
    }

    case "next": {
      const nextTask = manager.getHighestPriorityTask();
      if (nextTask) {
        console.log(`Next task: ${nextTask.description}`);
        if (nextTask.priority) {
          console.log(`Priority: ${nextTask.priority}`);
        }
      } else {
        console.log("No pending tasks");
      }
      break;
    }

    case "complete": {
      const description = process.argv[4];
      if (!description) {
        console.error("Please provide task description");
        process.exit(1);
      }

      if (manager.markTaskCompleteByDescription(description)) {
        console.log(`Marked task as complete: ${description}`);
      } else {
        console.log(`Task not found: ${description}`);
      }
      break;
    }

    case "add": {
      const description = process.argv[4];
      const priority = process.argv[5] as Task["priority"];

      if (!description) {
        console.error("Please provide task description");
        process.exit(1);
      }

      const task = manager.addTask(description, priority);
      console.log(`Added task: ${task.description} (${task.id})`);
      break;
    }

    default:
      console.log("Available commands:");
      console.log("  list           - Show task summary");
      console.log("  next           - Show next priority task");
      console.log("  complete <desc> - Mark task as complete");
      console.log("  add <desc> [priority] - Add new task");
  }
}
