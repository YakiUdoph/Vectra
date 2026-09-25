import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const CANONICAL_TOOL_NAMES = [
  "lookup-order",
  "issue-refund",
  "request-manager-approval",
] as const;

export type CanonicalToolName = (typeof CANONICAL_TOOL_NAMES)[number];
export type EvaluatorToolName =
  | "lookup_order"
  | "issue_refund"
  | "request_manager_approval";

export type ToolContract = {
  name: CanonicalToolName;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
};

export type NovaPassport = {
  agentDir: string;
  toolReferences: CanonicalToolName[];
  contracts: ToolContract[];
};

export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const TOOL_NAME_NORMALIZATION = Object.freeze({
  "lookup-order": "lookup_order",
  "issue-refund": "issue_refund",
  "request-manager-approval": "request_manager_approval",
} satisfies Record<CanonicalToolName, EvaluatorToolName>);

const DEFAULT_AGENT_DIR = fileURLToPath(new URL("../agents/nova", import.meta.url));
const TOOL_FIELDS = new Set([
  "name",
  "description",
  "version",
  "input_schema",
  "output_schema",
  "annotations",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readYaml(path: string): unknown {
  try {
    return parse(readFileSync(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid passport YAML at ${path}: ${message}`);
  }
}

function assertExactSet(label: string, actual: readonly string[], expected: readonly string[]): void {
  const duplicates = actual.filter((name, index) => actual.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${label} contains duplicate names: ${[...new Set(duplicates)].join(", ")}`);
  }

  const missing = expected.filter((name) => !actual.includes(name));
  const unexpected = actual.filter((name) => !expected.includes(name));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} mismatch (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"})`,
    );
  }
}

function validateToolContract(value: unknown, expectedName: string, path: string): ToolContract {
  if (!isRecord(value)) {
    throw new Error(`Passport tool ${path} must be a YAML object`);
  }

  const unexpectedFields = Object.keys(value).filter((field) => !TOOL_FIELDS.has(field));
  if (unexpectedFields.length > 0) {
    throw new Error(`Passport tool ${expectedName} has unsupported fields: ${unexpectedFields.join(", ")}`);
  }
  if ("implementation" in value) {
    throw new Error(`Passport tool ${expectedName} must remain schema-only; implementation is forbidden`);
  }
  if (value.name !== expectedName) {
    throw new Error(`Passport tool name ${String(value.name)} does not match filename ${expectedName}.yaml`);
  }
  if (typeof value.name !== "string" || !TOOL_NAME_PATTERN.test(value.name)) {
    throw new Error(`Passport tool name ${String(value.name)} is not OpenGAP-valid`);
  }
  if (!CANONICAL_TOOL_NAMES.includes(value.name as CanonicalToolName)) {
    throw new Error(`Unknown canonical passport tool: ${value.name}`);
  }
  if (typeof value.description !== "string" || value.description.length === 0) {
    throw new Error(`Passport tool ${expectedName} requires a non-empty description`);
  }
  if (!isRecord(value.input_schema) || value.input_schema.type !== "object" || !isRecord(value.input_schema.properties)) {
    throw new Error(`Passport tool ${expectedName} requires an object input_schema with properties`);
  }
  if (value.output_schema !== undefined && !isRecord(value.output_schema)) {
    throw new Error(`Passport tool ${expectedName} output_schema must be an object`);
  }

  return {
    name: value.name as CanonicalToolName,
    description: value.description,
    input_schema: value.input_schema,
    ...(value.output_schema === undefined ? {} : { output_schema: value.output_schema }),
  };
}

export function validateNormalizationMap(mapping: Record<string, string>): void {
  assertExactSet("Normalization map", Object.keys(mapping), CANONICAL_TOOL_NAMES);
  const values = Object.values(mapping);
  const expectedValues = Object.values(TOOL_NAME_NORMALIZATION);
  assertExactSet("Normalization map targets", values, expectedValues);
}

validateNormalizationMap(TOOL_NAME_NORMALIZATION);

export function normalizeToolName(name: string): EvaluatorToolName {
  const canonical = TOOL_NAME_NORMALIZATION[name as CanonicalToolName];
  if (canonical !== undefined) return canonical;

  const evaluatorNames = Object.values(TOOL_NAME_NORMALIZATION);
  if (evaluatorNames.includes(name as EvaluatorToolName)) return name as EvaluatorToolName;
  throw new Error(`Unknown tool name at trajectory boundary: ${name}`);
}

export function loadNovaPassport(agentDir = DEFAULT_AGENT_DIR): NovaPassport {
  const manifestPath = join(agentDir, "agent.yaml");
  const manifest = readYaml(manifestPath);
  if (!isRecord(manifest) || !Array.isArray(manifest.tools) || !manifest.tools.every((name) => typeof name === "string")) {
    throw new Error(`Passport manifest ${manifestPath} must contain a string tools list`);
  }

  const references = manifest.tools as string[];
  assertExactSet("Passport tool references", references, CANONICAL_TOOL_NAMES);

  const toolsDir = join(agentDir, "tools");
  const files = readdirSync(toolsDir).filter((file) => file.endsWith(".yaml"));
  const filenames = files.map((file) => file.slice(0, -5));
  assertExactSet("Passport tool files", filenames, CANONICAL_TOOL_NAMES);

  const contracts = references.map((name) => {
    const path = join(toolsDir, `${name}.yaml`);
    return validateToolContract(readYaml(path), name, path);
  });
  assertExactSet("Passport contract names", contracts.map((contract) => contract.name), CANONICAL_TOOL_NAMES);

  return {
    agentDir,
    toolReferences: references as CanonicalToolName[],
    contracts,
  };
}

export function assertExactHandlerRegistry(
  registry: Record<string, unknown>,
  passport = loadNovaPassport(),
): void {
  assertExactSet("Runtime handler registry", Object.keys(registry), passport.contracts.map((contract) => contract.name));
}
