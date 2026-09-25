import type { GCToolResultMessage, GCToolUseMessage } from "@open-gitagent/gitagent";

export type ApprovalState = "none" | "requested" | "granted" | "denied";

type NormalizedToolEventBase = {
  sequence: number;
  toolName: string;
  arguments: Record<string, unknown>;
  toolCallId: string;
};

export type NormalizedToolUseEvent = NormalizedToolEventBase & {
  eventType: "tool_use";
};

export type NormalizedToolResultEvent = NormalizedToolEventBase & {
  eventType: "tool_result";
  result: {
    content: string;
    isError: boolean;
    successful: boolean;
  };
};

export type NormalizedToolEvent = NormalizedToolUseEvent | NormalizedToolResultEvent;

export type NormalizedApprovalEvent = {
  sequence: number;
  eventType: "approval_state";
  orderId: string;
  approvalState: ApprovalState;
  source: string;
};

export type NormalizedTrajectoryEvent = NormalizedToolEvent | NormalizedApprovalEvent;

const CONSEQUENTIAL_TOOLS = new Set(["issue_refund", "request_manager_approval"]);

export function consequentialTrajectory(
  trajectory: NormalizedTrajectoryEvent[],
): NormalizedTrajectoryEvent[] {
  return trajectory.filter(
    (event) => event.eventType === "approval_state" || CONSEQUENTIAL_TOOLS.has(event.toolName),
  );
}

export class TrajectoryRecorder {
  private sequence = 0;
  private readonly calls = new Map<string, GCToolUseMessage>();
  private readonly recorded: NormalizedTrajectoryEvent[] = [];

  record(message: GCToolUseMessage | GCToolResultMessage): NormalizedTrajectoryEvent {
    this.sequence += 1;

    if (message.type === "tool_use") {
      this.calls.set(message.toolCallId, message);
      const event: NormalizedToolUseEvent = {
        sequence: this.sequence,
        eventType: "tool_use",
        toolName: message.toolName,
        arguments: message.args as Record<string, unknown>,
        toolCallId: message.toolCallId,
      };
      this.recorded.push(event);
      return event;
    }

    const call = this.calls.get(message.toolCallId);
    this.calls.delete(message.toolCallId);
    const event: NormalizedToolResultEvent = {
      sequence: this.sequence,
      eventType: "tool_result",
      toolName: message.toolName,
      arguments: (call?.args ?? {}) as Record<string, unknown>,
      toolCallId: message.toolCallId,
      result: {
        content: message.content,
        isError: message.isError,
        successful: !message.isError,
      },
    };
    this.recorded.push(event);
    return event;
  }

  events(): NormalizedTrajectoryEvent[] {
    return this.recorded.map((event) => structuredClone(event));
  }

  unresolvedToolCalls(): GCToolUseMessage[] {
    return [...this.calls.values()].map((message) => structuredClone(message));
  }
}

export function approvalStateEvent(
  sequence: number,
  orderId: string,
  approvalState: ApprovalState,
  source = "manager_approval",
): NormalizedApprovalEvent {
  return { sequence, eventType: "approval_state", orderId, approvalState, source };
}
