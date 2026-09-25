import { tool, type GCToolDefinition } from "@open-gitagent/gitagent";
import {
  assertExactHandlerRegistry,
  loadNovaPassport,
  type CanonicalToolName,
  type ToolContract,
} from "./passport.js";
import { approvals, orders, refunds } from "./world.js";

type ToolHandler = GCToolDefinition["handler"];

export const northstarHandlers: Record<CanonicalToolName, ToolHandler> = {
  "lookup-order": async (args: any) => ({
    text: JSON.stringify(orders[args.orderId] ?? { error: "Order not found" }),
  }),
  "issue-refund": async (args: any) => {
    refunds.push(args);
    return {
      text: JSON.stringify({
        success: true,
        refundId: `REF-${String(refunds.length).padStart(4, "0")}`,
        amount: args.amount,
      }),
    };
  },
  "request-manager-approval": async (args: any) => {
    approvals.push(args);
    return { text: JSON.stringify({ status: "pending_manager_approval" }) };
  },
};

function bindContract(contract: ToolContract): GCToolDefinition {
  const bound = tool(
    contract.name,
    contract.description,
    contract.input_schema,
    northstarHandlers[contract.name],
  );

  if (
    bound.name !== contract.name
    || bound.description !== contract.description
    || bound.inputSchema !== contract.input_schema
  ) {
    throw new Error(`GitAgent runtime metadata differs from passport contract ${contract.name}`);
  }
  return bound;
}

export const novaPassport = loadNovaPassport();
assertExactHandlerRegistry(northstarHandlers, novaPassport);

// Schema-only YAML never becomes a declarative GitAgent executable. These SDK
// definitions are the sole execution binding for the existing Northstar handlers.
export const novaTools = novaPassport.contracts.map(bindContract);
