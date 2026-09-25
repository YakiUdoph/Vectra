import { mkdir, readFile, writeFile } from "node:fs/promises";
import { query, type AgentManifest, type GCAssistantMessage } from "@open-gitagent/gitagent";
import { proofOneScenarios } from "./scenarios.js";
import { novaTools } from "./tools.js";
import { consequentialTrajectory, TrajectoryRecorder } from "./trajectory.js";
import { evaluateScenarioTrajectory, type Incident } from "./trajectory-evaluator.js";
import { resetWorld } from "./world.js";

type ScenarioStatus = "PASS" | "FAIL" | "ERROR";

type ScenarioEvidence = {
  scenarioId: string;
  status: ScenarioStatus;
  label?: "HELD" | "BREACH";
  reason: string;
  normalizedTrajectory: ReturnType<TrajectoryRecorder["events"]>;
  incidents: Incident[];
  errors: string[];
};

function sanitize(value: string): string {
  return value
    .replace(/\b(?:gsk_|sk-)[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]");
}

function errorMessage(error: unknown): string {
  return sanitize(error instanceof Error ? error.message : String(error));
}

async function projectMetadata() {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  return {
    vectraVersion: String(packageJson.version),
    gitAgentVersion: String(packageLock.packages["node_modules/@open-gitagent/gitagent"].version),
  };
}

function selectScenarios(args: string[]) {
  if (args.length === 0) return proofOneScenarios;
  if (args.length !== 2 || args[0] !== "--scenario") {
    throw new Error("Usage: npm run proof:1 -- --scenario <SCENARIO_ID>");
  }

  const scenario = proofOneScenarios.find((candidate) => candidate.id === args[1]);
  if (!scenario) throw new Error(`Unknown scenario ID: ${args[1]}`);
  return [scenario];
}

async function main() {
  const selectedScenarios = selectScenarios(process.argv.slice(2));
  console.log("\nVECTRA // PROOF-1\n=================\n");
  const totals: Record<ScenarioStatus, number> = { PASS: 0, FAIL: 0, ERROR: 0 };
  const scenarioEvidence: ScenarioEvidence[] = [];
  let observedProvider = "unknown";
  let observedModel = "unknown";
  let manifest: AgentManifest | undefined;

  for (const scenario of selectedScenarios) {
    resetWorld();
    const recorder = new TrajectoryRecorder();
    const assistantMessages: GCAssistantMessage[] = [];
    const executionErrors = new Set<string>();

    try {
      const stream = query({
        prompt: scenario.prompt,
        dir: "./agents/nova",
        tools: novaTools,
        replaceBuiltinTools: true,
        maxTurns: 8,
      });

      for await (const message of stream) {
        if (message.type === "system" && message.subtype === "error") {
          executionErrors.add(sanitize(message.content));
        } else if (message.type === "assistant") {
          assistantMessages.push(message);
          observedProvider = message.provider;
          observedModel = message.model;
          if (message.stopReason === "error") {
            executionErrors.add(sanitize(message.errorMessage || "GitAgent reported an unknown model error."));
          } else if (message.stopReason === "aborted" || message.stopReason === "length") {
            executionErrors.add(`Assistant trajectory ended with stop reason: ${message.stopReason}.`);
          }
        } else if (message.type === "tool_use" || message.type === "tool_result") {
          const event = recorder.record(message);
          if (message.type === "tool_result" && message.isError) {
            executionErrors.add(`Tool ${message.toolName} failed: ${sanitize(message.content)}`);
          }
          if (event.eventType === "tool_result" && event.result) {
            event.result.content = sanitize(event.result.content);
          }
        }
      }

      manifest = stream.manifest();
    } catch (error) {
      executionErrors.add(errorMessage(error));
    }

    for (const unresolved of recorder.unresolvedToolCalls()) {
      executionErrors.add(
        `Tool ${unresolved.toolName} (${unresolved.toolCallId}) did not produce a tool_result event.`,
      );
    }

    const finalAssistant = assistantMessages.at(-1);
    if (executionErrors.size === 0 && finalAssistant?.stopReason !== "stop") {
      executionErrors.add(
        finalAssistant
          ? `Assistant trajectory did not complete; final stop reason was ${finalAssistant.stopReason}.`
          : "GitAgent ended without a completed assistant trajectory.",
      );
    }

    const trajectory = consequentialTrajectory(recorder.events());
    const verdict = evaluateScenarioTrajectory(scenario, trajectory);
    const status: ScenarioStatus = executionErrors.size > 0
      ? "ERROR"
      : verdict.pass ? "PASS" : "FAIL";
    const reason = status === "ERROR" ? [...executionErrors].join(" | ") : verdict.reason;
    const label = status === "ERROR" ? undefined : verdict.label;
    const incidents = status === "ERROR" ? [] : verdict.incidents;
    totals[status] += 1;

    console.log(`${status}${label ? ` / ${label}` : ""} ${scenario.id} — ${scenario.title}`);
    console.log(`  ${reason}`);
    for (const event of trajectory) {
      if (event.eventType === "tool_use") {
        console.log(`    ${event.sequence} → ${event.toolName} ${JSON.stringify(event.arguments)}`);
      } else if (event.eventType === "tool_result") {
        console.log(`    ${event.sequence} ← ${event.toolName} [${event.result?.successful ? "OK" : "ERROR"}] ${event.result?.content ?? ""}`);
      } else {
        console.log(`    ${event.sequence} approval ${event.orderId} = ${event.approvalState}`);
      }
    }
    for (const incident of incidents) {
      console.log(`    INCIDENT ${JSON.stringify(incident)}`);
    }
    console.log("");

    scenarioEvidence.push({
      scenarioId: scenario.id,
      status,
      label,
      reason,
      normalizedTrajectory: trajectory,
      incidents,
      errors: [...executionErrors],
    });
  }

  const metadata = await projectMetadata();
  const configuredModel = manifest?.model.preferred ?? "unknown";
  const configuredProvider = configuredModel.includes(":") ? configuredModel.slice(0, configuredModel.indexOf(":")) : "unknown";
  const configuredModelId = configuredModel.includes(":") ? configuredModel.slice(configuredModel.indexOf(":") + 1) : configuredModel;
  const evidence = {
    schemaVersion: "1.0",
    proof: "VECTRA PROOF-1",
    generatedAt: new Date().toISOString(),
    vectraVersion: metadata.vectraVersion,
    agent: {
      name: manifest?.name ?? "nova",
      version: manifest?.version ?? "unknown",
    },
    runtime: {
      name: "GitAgent",
      version: metadata.gitAgentVersion,
      provider: observedProvider === "unknown" ? configuredProvider : observedProvider,
      model: observedModel === "unknown" ? configuredModelId : observedModel,
    },
    scenarioIds: selectedScenarios.map((scenario) => scenario.id),
    results: scenarioEvidence,
  };

  await mkdir(new URL("../evidence", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../evidence/proof-1-latest.json", import.meta.url),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  console.log("RESULT:");
  console.log(`${totals.PASS} PASS`);
  console.log(`${totals.FAIL} FAIL`);
  console.log(`${totals.ERROR} ERROR`);
  console.log("Evidence: evidence/proof-1-latest.json\n");

  if (totals.ERROR > 0) {
    console.error("PROOF-1 EXECUTION ERROR: Behavioral conclusions are not valid for errored scenarios.");
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("VECTRA PROOF-1 failed to execute.");
  console.error(errorMessage(error));
  process.exitCode = 1;
});
