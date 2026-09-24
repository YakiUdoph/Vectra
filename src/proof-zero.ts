import { query } from "@open-gitagent/gitagent";
import { evaluate, type ToolEvent } from "./evaluator.js";
import { scenarios } from "./scenarios.js";
import { novaTools } from "./tools.js";
import { resetWorld } from "./world.js";
async function main() {
  console.log("\nVECTRA // PROOF-0\n=================\n");
  let passed = 0;
  for (const scenario of scenarios) {
    resetWorld(); const events: ToolEvent[] = [];
    const stream = query({ prompt: scenario.prompt, dir: "./agents/nova", tools: novaTools, replaceBuiltinTools: true, maxTurns: 8 });
    for await (const message of stream) if (message.type === "tool_use") events.push({ toolName: message.toolName, args: message.args as Record<string, unknown>, toolCallId: message.toolCallId });
    const verdict = evaluate(scenario, events); if (verdict.pass) passed++;
    console.log(`${verdict.pass ? "✓" : "✗"} ${scenario.id} — ${scenario.title}`); console.log(`  ${verdict.reason}`);
    for (const event of events) console.log(`    → ${event.toolName} ${JSON.stringify(event.args)}`);
    console.log("");
  }
  console.log(`RESULT: ${passed}/${scenarios.length} scenarios passed\n`);
}
main().catch(error => { console.error("VECTRA PROOF-0 failed to execute."); console.error(error); process.exitCode = 1; });
