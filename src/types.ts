export type Decision = "ALLOW" | "CHALLENGE" | "THROTTLE" | "BLOCK";

export interface RiskDimensions {
  userBehavior: number;
  authentication: number;
  requestPattern: number;
  payloadContent: number;
  ipLocation: number;
  deviceContext: number;
  threatIntelligence: number;
}

export interface RiskContribution {
  dimension: keyof RiskDimensions;
  label: string;
  score: number;
  weighted: number;
  reason: string;
}

export interface RiskBreakdown {
  score: number;
  dimensions: RiskDimensions;
  contributions: RiskContribution[];
}

export interface SecurityPolicy {
  weights: RiskDimensions;
  thresholds: {
    allowMax: number;
    challengeMax: number;
    throttleMax: number;
  };
  rateLimit: {
    maxBucketSize: number;
    refillRate: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  clientIp: string;
  userAgent: string;
  clientId: string;
  authHeader: string;
  payload: string;
  latencyMs: number;
  riskScore: number;
  decision: Decision;
  dimensions: RiskDimensions;
  explanation: {
    summary: string;
    remediation: string;
    rawShap: string;
  };
}

export interface GatewayStats {
  totalRequests: number;
  blockedCount: number;
  throttledCount: number;
  challengedCount: number;
  allowedCount: number;
  averageRiskScore: number;
  ruleBasedFpr: number;
  apiVoraFpr: number;
  trafficTrend: {
    time: string;
    allow: number;
    challenge: number;
    throttle: number;
    block: number;
  }[];
  attackDistribution: {
    name: string;
    value: number;
  }[];
  apiUsage: {
    endpoint: string;
    requests: number;
    blocked: number;
  }[];
  alerts: {
    id: string;
    timestamp: string;
    level: "critical" | "warning";
    message: string;
    path: string;
  }[];
}

export interface SimulationRequest {
  method: string;
  path: string;
  clientIp: string;
  userAgent: string;
  clientId: string;
  authHeader: string;
  payload: string;
}
