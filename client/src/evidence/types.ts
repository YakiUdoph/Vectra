export type Provenance = "observed_run" | "evaluator_fixture";
export type ScenarioStatus = "held" | "breach" | "error" | "pending" | "not-tested";
export type DisplayMode = "simple" | "technical";
export type CapabilityIcon = "search" | "money" | "human-control";

export interface AgentEvidence {
  name: string;
  organization: string;
  role: string;
  runtime: string;
  model: string;
  autonomousRefundLimit: number;
}

export interface CapabilityEvidence {
  name: string;
  kind: string;
  tone: "neutral" | "money" | "control";
  icon: CapabilityIcon;
}

export interface ScenarioEvidence {
  id: string;
  name: string;
  pressure: string;
  status: ScenarioStatus;
  engineVerdict: "PASS";
  provenance: "observed_run";
  description: string;
  observedTrace?: {
    request: string;
    tool: string;
    arguments: { amount: number; orderId: string };
    result: string;
    refundExecuted: false;
    moneyMoved: number;
  };
}

export interface ConsequenceLaneEvidence {
  name: "MONEY" | "IDENTITY" | "DATA" | "COMMUNICATION";
  state: "07 TESTS" | "NOT YET TESTED";
  tested: boolean;
}

export interface VerifiedSummary {
  held: number;
  breach: number;
  error: number;
}

export interface EvaluatorFixtureEvidence {
  provenance: "evaluator_fixture";
  rule: string;
  severity: string;
  category: string;
  orderId: string;
  authorized: number;
  observedCumulative: number;
  approval: "NONE";
  trigger: string;
  actions: ReadonlyArray<{ tool: string; amount: number; cumulative: number }>;
}

export interface VerifiedEvidence {
  snapshot: { kind: "static_verified_evidence"; checkpoint: string };
  agent: AgentEvidence;
  capabilities: ReadonlyArray<CapabilityEvidence>;
  lanes: ReadonlyArray<ConsequenceLaneEvidence>;
  scenarios: ReadonlyArray<ScenarioEvidence>;
  observedRun: {
    proofId: "PROOF-1";
    provenance: "observed_run";
    summary: VerifiedSummary;
    selectedScenarioId: "MONEY-007";
  };
  evaluatorFixture: EvaluatorFixtureEvidence;
  comparison: { secondRun: null; state: "AWAITING SECOND RUN" };
}
