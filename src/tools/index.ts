import type { Ignore } from "ignore";
import {
  fileFinder,
  sectionFinder,
  definitionFinder,
  importTracer,
  gitHistory,
} from "./implementations.js";

export { loadIgnoreFilter } from "./search-utils.js";

export interface ToolCall {
  name: string;
  arguments: Record<string, string>;
}

export async function executeToolCall(
  call: ToolCall,
  dir: string,
  ig: Ignore,
): Promise<string> {
  switch (call.name) {
    case "file_finder":
      return fileFinder(call.arguments.query, dir, ig);
    case "section_finder":
      return sectionFinder(call.arguments.query, dir, ig);
    case "definition_finder":
      return definitionFinder(call.arguments.query, dir, ig);
    case "import_tracer":
      return importTracer(call.arguments.query, dir, ig);
    case "git_history":
      return gitHistory(call.arguments.query, dir);
    default:
      return `Unknown tool: ${call.name}`;
  }
}

export const TOOL_DEFINITIONS = [
  {
    name: "file_finder",
    description:
      "Find files matching a keyword. Returns file paths. " +
      "Pair with section_finder using a different keyword to also get code snippets.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A single keyword to search for in file contents. Use concise, specific terms " +
            "(e.g., 'camera', 'auth', 'Router'). Avoid multi-word phrases.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "section_finder",
    description:
      "Find code snippets matching a keyword. Returns file:line:code entries. " +
      "Use alongside file_finder with a different keyword for complete context.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A single keyword to find in source code. Use specific identifiers " +
            "(e.g., 'handleSubmit', 'CameraView', 'fetchUser'). Case-insensitive.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "definition_finder",
    description:
      "Find function, class, type, interface, struct, enum, and other definition declarations " +
      "matching a keyword. Works across languages (JS/TS, Python, Go, Rust, Swift, Ruby, Java). " +
      "Returns up to 15 results. Use this to find where something is defined, not where it is used.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A single keyword matching the name of a function, class, type, or other definition " +
            "(e.g., 'Camera', 'UserService', 'parse_config'). Case-insensitive.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "import_tracer",
    description:
      "Find import, require, include, and use statements that reference a module or keyword. " +
      "Shows the dependency graph — which files depend on the given module. " +
      "Returns up to 15 results. Use this to understand how modules are connected.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A module name or keyword to search for in import statements " +
            "(e.g., 'camera', 'utils', 'express'). Case-sensitive for import paths.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "git_history",
    description:
      "Search git commit history for the 10 most recent commits that added or removed " +
      "code containing the given keyword. Use this when the user references a recent change, " +
      "regression, or wants to understand what changed recently related to a topic.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A keyword to search in commit diffs (e.g., 'camera', 'auth'). " +
            "Git searches for commits where this string was added or removed.",
        },
      },
      required: ["query"],
    },
  },
];
