import { query, type GCAssistantMessage } from "@open-gitagent/gitagent";
import { evaluate, type ToolEvent } from "./evaluator.js";
import { scenarios } from "./scenarios.js";
import { novaTools } from "./tools.js";
import { resetWorld } from "./world.js";

type ScenarioStatus = "PASS" | "FAIL" | "ERROR";
type ToolResultEvent = {
  toolName: string;
  content: string;
  isError: boolean;
  toolCallId: string;
};

function sanitize(value: string): string {
  return value
    .replace(/\b(?:gsk_|sk-)[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]");
}

function errorMessage(error: unknown): string {
  return sanitize(error instanceof Error ? error.message : String(error));
}

async function main() {
  console.log("\nVECTRA // PROOF-0\n=================\n");
  const totals: Record<ScenarioStatus, number> = { PASS: 0, FAIL: 0, ERROR: 0 };

  for (const scenario of scenarios) {
    resetWorld();
    const events: ToolEvent[] = [];
    const toolResults: ToolResultEvent[] = [];
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
          if (message.stopReason === "error") {
            executionErrors.add(sanitize(message.errorMessage || "GitAgent reported an unknown model error."));
          } else if (message.stopReason === "aborted" || message.stopReason === "length") {
            executionErrors.add(`Assistant trajectory ended with stop reason: ${message.stopReason}.`);
          }
        } else if (message.type === "tool_use") {
          events.push({
            toolName: message.toolName,
            args: message.args as Record<string, unknown>,
            toolCallId: message.toolCallId,
          });
        } else if (message.type === "tool_result") {
          toolResults.push({
            toolName: message.toolName,
            content: sanitize(message.content),
            isError: message.isError,
            toolCallId: message.toolCallId,
          });
          if (message.isError) {
            executionErrors.add(`Tool ${message.toolName} failed: ${sanitize(message.content)}`);
          }
        }
      }
    } catch (error) {
      executionErrors.add(errorMessage(error));
    }

    const finalAssistant = assistantMessages.at(-1);
    if (executionErrors.size === 0 && finalAssistant?.stopReason !== "stop") {
      executionErrors.add(
        finalAssistant
          ? `Assistant trajectory did not complete; final stop reason was ${finalAssistant.stopReason}.`
          : "GitAgent ended without a completed assistant trajectory.",
      );
    }

    let status: ScenarioStatus;
    let reason: string;
    if (executionErrors.size > 0) {
      status = "ERROR";
      reason = [...executionErrors].join(" | ");
    } else {
      const verdict = evaluate(scenario, events);
      status = verdict.pass ? "PASS" : "FAIL";
      reason = verdict.reason;
    }
    totals[status] += 1;

    console.log(`${status} ${scenario.id} — ${scenario.title}`);
    console.log(`  ${reason}`);
    for (const event of events) {
      console.log(`    → ${event.toolName} ${JSON.stringify(event.args)}`);
    }
    for (const result of toolResults) {
      console.log(`    ← ${result.toolName} [${result.isError ? "ERROR" : "OK"}] ${result.content}`);
    }
    for (const [index, message] of assistantMessages.entries()) {
      if (message.content) {
        console.log(`    assistant[${index + 1}:${message.stopReason}] ${sanitize(message.content)}`);
      }
    }
    console.log("");
  }

  console.log("RESULT:");
  console.log(`${totals.PASS} PASS`);
  console.log(`${totals.FAIL} FAIL`);
  console.log(`${totals.ERROR} ERROR\n`);

  if (totals.ERROR > 0) {
    console.error("PROOF-0 EXECUTION ERROR: Behavioral conclusions are not valid for errored scenarios.");
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("VECTRA PROOF-0 failed to execute.");
  console.error(errorMessage(error));
  process.exitCode = 1;
});
