import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parse } from "yaml";
import {
  assertExactHandlerRegistry,
  CANONICAL_TOOL_NAMES,
  loadNovaPassport,
  normalizeToolName,
  TOOL_NAME_NORMALIZATION,
  TOOL_NAME_PATTERN,
  validateNormalizationMap,
} from "./passport.js";
import { northstarHandlers, novaPassport, novaTools } from "./tools.js";
import { TrajectoryRecorder } from "./trajectory.js";

test("all three passport YAML contracts load", () => {
  assert.equal(novaPassport.contracts.length, 3);
  assert.deepEqual(novaPassport.contracts.map((contract) => contract.name), [...CANONICAL_TOOL_NAMES]);
});

test("all three names are OpenGAP-valid", () => {
  for (const contract of novaPassport.contracts) assert.match(contract.name, TOOL_NAME_PATTERN);
});

test("agent.yaml references exactly the three contracts", () => {
  assert.deepEqual(novaPassport.toolReferences, [...CANONICAL_TOOL_NAMES]);
});

test("no passport tool has an implementation field", () => {
  for (const name of CANONICAL_TOOL_NAMES) {
    const path = join(novaPassport.agentDir, "tools", `${name}.yaml`);
    const document = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    assert.equal(Object.hasOwn(document, "implementation"), false);
  }
});

test("handler registry and bound runtime metadata exactly match the passport", () => {
  assert.doesNotThrow(() => assertExactHandlerRegistry(northstarHandlers, novaPassport));
  assert.deepEqual(novaTools.map((runtimeTool) => runtimeTool.name), [...CANONICAL_TOOL_NAMES]);
  novaTools.forEach((runtimeTool, index) => {
    const contract = novaPassport.contracts[index];
    assert.equal(runtimeTool.description, contract?.description);
    assert.deepEqual(runtimeTool.inputSchema, contract?.input_schema);
  });
});

test("normalization map is complete", () => {
  assert.doesNotThrow(() => validateNormalizationMap(TOOL_NAME_NORMALIZATION));
  assert.throws(() => validateNormalizationMap({
    "lookup-order": "lookup_order",
    "issue-refund": "issue_refund",
  }), /missing: request-manager-approval/);
});

test("normalization map is bijective", () => {
  assert.equal(new Set(Object.values(TOOL_NAME_NORMALIZATION)).size, CANONICAL_TOOL_NAMES.length);
  assert.throws(() => validateNormalizationMap({
    "lookup-order": "lookup_order",
    "issue-refund": "lookup_order",
    "request-manager-approval": "request_manager_approval",
  }), /duplicate names|missing:/);
});

test("issue-refund normalizes to issue_refund", () => {
  assert.equal(normalizeToolName("issue-refund"), "issue_refund");
});

test("lookup-order normalizes to lookup_order", () => {
  assert.equal(normalizeToolName("lookup-order"), "lookup_order");
});

test("request-manager-approval normalizes to request_manager_approval", () => {
  assert.equal(normalizeToolName("request-manager-approval"), "request_manager_approval");
});

test("normalized trajectory retains args, call ID, order, result, and success state", () => {
  const recorder = new TrajectoryRecorder();
  const args = { orderId: "O1004", amount: 400 };
  recorder.record({
    type: "tool_use",
    toolCallId: "call-1",
    toolName: "issue-refund",
    args,
  });
  recorder.record({
    type: "tool_result",
    toolCallId: "call-1",
    toolName: "issue-refund",
    content: JSON.stringify({ success: true, refundId: "REF-0001", amount: 400 }),
    isError: false,
  });

  const events = recorder.events();
  assert.equal(events[0]?.sequence, 1);
  assert.equal(events[1]?.sequence, 2);
  assert.equal(events[0]?.eventType === "tool_use" ? events[0].toolName : undefined, "issue_refund");
  assert.deepEqual("arguments" in events[0]! ? events[0].arguments : undefined, args);
  assert.equal("toolCallId" in events[0]! ? events[0].toolCallId : undefined, "call-1");
  assert.deepEqual("arguments" in events[1]! ? events[1].arguments : undefined, args);
  assert.deepEqual(
    events[1]?.eventType === "tool_result" ? events[1].result : undefined,
    {
      content: JSON.stringify({ success: true, refundId: "REF-0001", amount: 400 }),
      isError: false,
      successful: true,
    },
  );
});

test("malformed and missing passport contracts fail closed", () => {
  const malformedDir = mkdtempSync(join(tmpdir(), "vectra-passport-malformed-"));
  const missingDir = mkdtempSync(join(tmpdir(), "vectra-passport-missing-"));
  try {
    cpSync(novaPassport.agentDir, malformedDir, { recursive: true });
    writeFileSync(join(malformedDir, "tools", "lookup-order.yaml"), "name: [not valid", "utf8");
    assert.throws(() => loadNovaPassport(malformedDir), /Invalid passport YAML/);

    cpSync(novaPassport.agentDir, missingDir, { recursive: true });
    unlinkSync(join(missingDir, "tools", "lookup-order.yaml"));
    assert.throws(() => loadNovaPassport(missingDir), /Passport tool files mismatch/);
  } finally {
    rmSync(malformedDir, { recursive: true, force: true });
    rmSync(missingDir, { recursive: true, force: true });
  }
});
