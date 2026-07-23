import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Decision, RiskBreakdown, SecurityPolicy, AuditLog, GatewayStats, SimulationRequest, RiskDimensions } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: any = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("API-VORA: Gemini AI client initialized successfully.");
  } catch (err) {
    console.warn("API-VORA: Error initializing Gemini AI client:", err);
  }
} else {
  console.log("API-VORA: No Gemini API Key found or default key placeholder detected. Explainable AI will use local heuristic engines and notify the analyst panel.");
}

// In-Memory Data Stores (MySQL/Redis simulations)
let auditLogs: AuditLog[] = [];
let currentPolicy: SecurityPolicy = {
  weights: {
    userBehavior: 20,
    authentication: 20,
    requestPattern: 15,
    payloadContent: 15,
    ipLocation: 10,
    deviceContext: 10,
    threatIntelligence: 10
  },
  thresholds: {
    allowMax: 30,
    challengeMax: 60,
    throttleMax: 80
  },
  rateLimit: {
    maxBucketSize: 50,
    refillRate: 30 // tokens per minute
  }
};

// Redis rate limit cache simulator [IP/ClientID -> { tokens, lastChecked }]
const rateLimitCache = new Map<string, { tokens: number; lastChecked: number }>();

// Seed Data helper
function generateId(): string {
  return "tx_" + Math.random().toString(36).substr(2, 9);
}

// Generate static list of IP details to simulate GeoIP and threat feeds
const ipThreatFeeds = {
  "185.220.101.44": { country: "Germany", region: "Berlin", asn: "AS206342", type: "Tor Exit Node", score: 0.95 },
  "45.89.230.12": { country: "Russia", region: "Moscow", asn: "AS48326", type: "Known Botnet IP", score: 0.90 },
  "193.56.28.188": { country: "Ukraine", region: "Kyiv", asn: "AS58224", type: "Active Scanner", score: 0.85 },
  "8.8.8.8": { country: "United States", region: "California", asn: "AS15169", type: "Google DNS", score: 0.05 },
  "192.168.1.50": { country: "Local Network", region: "Intranet", asn: "Private", type: "Trusted Intranet", score: 0.0 },
  "104.244.42.1": { country: "United States", region: "California", asn: "AS13414", type: "Twitter Inc.", score: 0.1 }
};

// Seed initial traffic log database for visualization
function seedAuditLogs() {
  const endpoints = [
    { path: "/api/v1/auth/login", method: "POST" },
    { path: "/api/v1/payments/checkout", method: "POST" },
    { path: "/api/v1/users/profile", method: "GET" },
    { path: "/api/v1/products/list", method: "GET" },
    { path: "/api/v1/admin/settings", method: "PUT" },
    { path: "/api/v1/inventory/query", method: "GET" }
  ];

  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "sqlmap/1.8.2#stable (https://sqlmap.org)",
    "curl/7.88.1",
    "python-requests/2.31.0"
  ];

  const ips = Object.keys(ipThreatFeeds).concat([
    "64.233.160.10", "172.217.12.14", "204.79.197.200", "13.107.21.200", "18.205.24.12", "54.120.30.45"
  ]);

  const now = new Date();

  // Create 45 diverse log entries
  for (let i = 0; i < 45; i++) {
    const timeOffsetMinutes = i * 14; // spread over several hours
    const logTime = new Date(now.getTime() - timeOffsetMinutes * 60 * 1000);
    
    // Determine type: 70% Clean, 10% Brute Force, 10% SQLi/XSS, 10% Scrapers/Rate Limit Exceeded
    const rand = Math.random();
    let method = "GET";
    let path = "/api/v1/products/list";
    let ip = ips[Math.floor(Math.random() * ips.length)];
    let ua = userAgents[Math.floor(Math.random() * 3)]; // standard browsers
    let payload = "";
    let authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMDEiLCJyb2xlIjoidXNlciJ9.xxx";
    let clientId = "client_app_329a";

    // Dynamic characteristics based on attack vector simulation
    if (rand < 0.70) {
      // Clean request
      const endpoint = endpoints[Math.floor(Math.random() * 4)]; // standard non-admin routes
      path = endpoint.path;
      method = endpoint.method;
      if (method === "POST" && path === "/api/v1/auth/login") {
        payload = JSON.stringify({ username: `user_${Math.floor(Math.random() * 100)}`, password: "SecurePassword123!" });
      }
    } else if (rand < 0.80) {
      // SQL Injection / Payload Content threat
      path = "/api/v1/inventory/query";
      method = "GET";
      ua = "sqlmap/1.8.2#stable (https://sqlmap.org)";
      ip = "193.56.28.188"; // scanner IP
      payload = JSON.stringify({ search_term: "books' UNION SELECT username, password FROM users --" });
      authHeader = "";
    } else if (rand < 0.90) {
      // Auth threat (failed logins or admin endpoint enum)
      path = "/api/v1/admin/settings";
      method = "PUT";
      ip = "45.89.230.12"; // botnet IP
      payload = JSON.stringify({ allow_unauthenticated_registration: true });
      authHeader = "Bearer expired_or_malformed_token";
      ua = "python-requests/2.31.0";
    } else {
      // Rate limiter throttling / Scraping
      path = "/api/v1/products/list";
      method = "GET";
      ip = "185.220.101.44"; // Tor node
      ua = "curl/7.88.1";
      payload = "";
      authHeader = "";
    }

    // Evaluate risk
    const details = {
      id: "tx_" + generateId(),
      timestamp: logTime.toISOString(),
      method,
      path,
      clientIp: ip,
      userAgent: ua,
      clientId,
      authHeader,
      payload,
      latencyMs: Math.floor(Math.random() * 35) + 5
    };

    const breakdown = calculateCompositeRisk(details, currentPolicy);
    const decision = getDecisionForScore(breakdown.score, currentPolicy);
    const explanation = generateHeuristicExplanation(breakdown, details, decision);

    auditLogs.push({
      ...details,
      riskScore: breakdown.score,
      decision,
      dimensions: breakdown.dimensions,
      explanation
    });
  }

  // Sort logs by newest first
  auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Module 2 & 3: Signature analysis + Composite Risk Calculation Engine
export function calculateCompositeRisk(req: Partial<AuditLog>, policy: SecurityPolicy): RiskBreakdown {
  const dimensions: RiskDimensions = {
    userBehavior: 0,
    authentication: 0,
    requestPattern: 0,
    payloadContent: 0,
    ipLocation: 0,
    deviceContext: 0,
    threatIntelligence: 0
  };

  const contributions: RiskBreakdown["contributions"] = [];

  // 1. User Behavior Risk Assessment
  // Simulation heuristic: rapid queries, high risk path sequences
  if (req.path === "/api/v1/admin/settings" && req.method === "PUT") {
    dimensions.userBehavior = 75;
    contributions.push({
      dimension: "userBehavior",
      label: "User Behavior Risk",
      score: 75,
      weighted: (75 * policy.weights.userBehavior) / 100,
      reason: "Attempt to modify structural gateway parameters or admin fields."
    });
  } else if (req.path?.includes("login") && !req.authHeader) {
    dimensions.userBehavior = 25;
    contributions.push({
      dimension: "userBehavior",
      label: "User Behavior Risk",
      score: 25,
      weighted: (25 * policy.weights.userBehavior) / 100,
      reason: "Auth state initiation check."
    });
  } else {
    dimensions.userBehavior = 5; // normal baseline
  }

  // 2. Authentication Risk Assessment
  if (!req.authHeader && req.path !== "/api/v1/auth/login" && req.path !== "/api/v1/products/list") {
    dimensions.authentication = 95;
    contributions.push({
      dimension: "authentication",
      label: "Authentication Risk",
      score: 95,
      weighted: (95 * policy.weights.authentication) / 100,
      reason: "Missing Authorization bearer token on protected microservice endpoint."
    });
  } else if (req.authHeader && (req.authHeader.includes("expired") || req.authHeader.length < 25)) {
    dimensions.authentication = 80;
    contributions.push({
      dimension: "authentication",
      label: "Authentication Risk",
      score: 80,
      weighted: (80 * policy.weights.authentication) / 100,
      reason: "Malformed or expired security token signature."
    });
  } else if (req.path === "/api/v1/auth/login") {
    // Check if simulate failure
    if (req.payload?.includes("wrong") || req.payload?.includes("admin")) {
      dimensions.authentication = 60;
      contributions.push({
        dimension: "authentication",
        label: "Authentication Risk",
        score: 60,
        weighted: (60 * policy.weights.authentication) / 100,
        reason: "Failed authentication handshake threshold indicator."
      });
    } else {
      dimensions.authentication = 10;
    }
  } else {
    dimensions.authentication = 5;
  }

  // 3. Request Pattern Risk
  if (req.path?.includes("/admin") || req.path?.includes("/config") || req.path?.includes("/env")) {
    dimensions.requestPattern = 85;
    contributions.push({
      dimension: "requestPattern",
      label: "Request Pattern Risk",
      score: 85,
      weighted: (85 * policy.weights.requestPattern) / 100,
      reason: "Access mapping signature matching endpoint enumeration pattern."
    });
  } else if (req.path?.includes("query") && req.payload?.includes("UNION")) {
    dimensions.requestPattern = 70;
    contributions.push({
      dimension: "requestPattern",
      label: "Request Pattern Risk",
      score: 70,
      weighted: (70 * policy.weights.requestPattern) / 100,
      reason: "Unusual query structures matching parameter enumeration."
    });
  } else {
    dimensions.requestPattern = 5;
  }

  // 4. Payload / Content Risk (Signature-based rule engines)
  let payloadStr = req.payload || "";
  if (req.path) payloadStr += " " + req.path; // include URL params in content inspection

  const sqliRegex = /('|"|--|#|union|select|insert|delete|drop|where|or\s+\d+\s*=\s*\d+|or\s+'\w+'\s*=\s*'\w+')/i;
  const xssRegex = /(<script|javascript:|onerror|onload|alert|iframe|src=)/i;
  const traversalRegex = /(\.\.\/|\.\.\\|etc\/passwd|win\.ini|boot\.ini)/i;
  const cmdInjRegex = /(bash|cmd|powershell|whoami|cat\s+\/etc|id;|uname|curl\s+http)/i;

  if (sqliRegex.test(payloadStr)) {
    dimensions.payloadContent = 98;
    contributions.push({
      dimension: "payloadContent",
      label: "Payload Content Risk",
      score: 98,
      weighted: (98 * policy.weights.payloadContent) / 100,
      reason: "SQL Injection signature matched in header parameters or JSON request payload."
    });
  } else if (xssRegex.test(payloadStr)) {
    dimensions.payloadContent = 95;
    contributions.push({
      dimension: "payloadContent",
      label: "Payload Content Risk",
      score: 95,
      weighted: (95 * policy.weights.payloadContent) / 100,
      reason: "Cross-Site Scripting (XSS) payload sequence detected in payload elements."
    });
  } else if (traversalRegex.test(payloadStr)) {
    dimensions.payloadContent = 90;
    contributions.push({
      dimension: "payloadContent",
      label: "Payload Content Risk",
      score: 90,
      weighted: (90 * policy.weights.payloadContent) / 100,
      reason: "Directory Path Traversal trigger matched (access attempt to host system files)."
    });
  } else if (cmdInjRegex.test(payloadStr)) {
    dimensions.payloadContent = 95;
    contributions.push({
      dimension: "payloadContent",
      label: "Payload Content Risk",
      score: 95,
      weighted: (95 * policy.weights.payloadContent) / 100,
      reason: "Remote Code Execution / Shell Command Injection parameter signature matched."
    });
  } else if (payloadStr.length > 5000) {
    dimensions.payloadContent = 50;
    contributions.push({
      dimension: "payloadContent",
      label: "Payload Content Risk",
      score: 50,
      weighted: (50 * policy.weights.payloadContent) / 100,
      reason: "Payload content size anomaly (unusually large JSON parameters)."
    });
  } else {
    dimensions.payloadContent = 5;
  }

  // 5. IP / Location Risk
  const ip = req.clientIp || "";
  const feedMatch = ipThreatFeeds[ip as keyof typeof ipThreatFeeds];
  if (feedMatch) {
    dimensions.ipLocation = Math.round(feedMatch.score * 100);
    contributions.push({
      dimension: "ipLocation",
      label: "IP/Location Risk",
      score: Math.round(feedMatch.score * 100),
      weighted: (Math.round(feedMatch.score * 100) * policy.weights.ipLocation) / 100,
      reason: `Request source mapped to classified infrastructure: ${feedMatch.type} (${feedMatch.country}).`
    });
  } else if (ip.startsWith("185.") || ip.startsWith("45.") || ip.startsWith("193.")) {
    dimensions.ipLocation = 65;
    contributions.push({
      dimension: "ipLocation",
      label: "IP/Location Risk",
      score: 65,
      weighted: (65 * policy.weights.ipLocation) / 100,
      reason: "IP address traces back to a dark VPN hosting range."
    });
  } else {
    dimensions.ipLocation = 5;
  }

  // 6. Device / Context Risk
  const ua = req.userAgent || "";
  if (ua.includes("sqlmap") || ua.includes("nmap") || ua.includes("nikto")) {
    dimensions.deviceContext = 98;
    contributions.push({
      dimension: "deviceContext",
      label: "Device Context Risk",
      score: 98,
      weighted: (98 * policy.weights.deviceContext) / 100,
      reason: "User-Agent explicitly declares malicious hacking toolkit or scanner."
    });
  } else if (ua.includes("curl") || ua.includes("python") || ua.includes("wget")) {
    dimensions.deviceContext = 60;
    contributions.push({
      dimension: "deviceContext",
      label: "Device Context Risk",
      score: 60,
      weighted: (60 * policy.weights.deviceContext) / 100,
      reason: "Non-browser terminal client/HTTP code library user-agent pattern."
    });
  } else if (!ua) {
    dimensions.deviceContext = 75;
    contributions.push({
      dimension: "deviceContext",
      label: "Device Context Risk",
      score: 75,
      weighted: (75 * policy.weights.deviceContext) / 100,
      reason: "Anomalous connection payload missing User-Agent headers."
    });
  } else {
    dimensions.deviceContext = 5;
  }

  // 7. Threat Intelligence Risk
  if (feedMatch && feedMatch.score > 0.5) {
    dimensions.threatIntelligence = 95;
    contributions.push({
      dimension: "threatIntelligence",
      label: "Threat Intel Risk",
      score: 95,
      weighted: (95 * policy.weights.threatIntelligence) / 100,
      reason: `IP matches external crowd-sourced malicious IP feed lists.`
    });
  } else if (ua.includes("sqlmap") || payloadStr.includes("UNION SELECT")) {
    dimensions.threatIntelligence = 85;
    contributions.push({
      dimension: "threatIntelligence",
      label: "Threat Intel Risk",
      score: 85,
      weighted: (85 * policy.weights.threatIntelligence) / 100,
      reason: "Threat heuristics match active OWASP Top 10 attack campaign fingerprints."
    });
  } else {
    dimensions.threatIntelligence = 5;
  }

  // Calculate composite weighted score
  // Total Risk Score = Σ(dimension_score * weight) / 100, capped at 100.
  let sumWeighted = 0;
  let totalWeights = 0;

  Object.keys(dimensions).forEach((key) => {
    const dim = key as keyof RiskDimensions;
    const scoreVal = dimensions[dim];
    const weightVal = policy.weights[dim] || 0;
    sumWeighted += scoreVal * weightVal;
    totalWeights += weightVal;
  });

  // Calculate composite score (normalized against current weight sum, up to 100)
  let compositeScore = Math.round(sumWeighted / 100);

  // Critical threat override: severe payload threats (SQLi/XSS/RCE) or malicious toolkits (sqlmap) must elevate to BLOCK level (>80)
  if (dimensions.payloadContent >= 90 || dimensions.deviceContext >= 90) {
    if (compositeScore < 82) {
      compositeScore = Math.max(compositeScore, 85);
    }
  }

  if (compositeScore > 100) compositeScore = 100;
  if (compositeScore < 0) compositeScore = 0;

  // Let's filter contributions list to only include those that had noticeable impact (>5)
  const notableContributions = contributions.filter(c => c.score > 5).sort((a,b) => b.weighted - a.weighted);

  return {
    score: compositeScore,
    dimensions,
    contributions: notableContributions
  };
}

// Module 4: Decision Engine Threshold Rules
function getDecisionForScore(score: number, policy: SecurityPolicy): Decision {
  if (score <= policy.thresholds.allowMax) return "ALLOW";
  if (score <= policy.thresholds.challengeMax) return "CHALLENGE";
  if (score <= policy.thresholds.throttleMax) return "THROTTLE";
  return "BLOCK";
}

// Module 6: Local Heuristic Explainable AI Generator (fallback)
function generateHeuristicExplanation(breakdown: RiskBreakdown, req: Partial<AuditLog>, decision: Decision) {
  if (decision === "ALLOW") {
    return {
      summary: "Legitimate Transaction Profile. This request complies perfectly with the API Gateway policies. All evaluated risk dimensions fall well within clean limits.",
      remediation: "None required. API Gateway successfully routed transaction directly to protected microservices.",
      rawShap: "SHAP evaluation: Baseline baseline_expectation: 4.8. Actual risk score: " + breakdown.score + ". Normal browser headers and trusted JWT verified."
    };
  }

  const topContrib = breakdown.contributions[0];
  const summary = `Elevated Risk Verdict: ${decision}. This request triggered multiple anomaly thresholds. The leading risk factor is ${topContrib?.label || "Request Profile"} (+${topContrib?.weighted.toFixed(1)} weighted impact) due to: "${topContrib?.reason || "suspicious context"}".`;

  let remediation = "No action needed for normal traffic. If you are an active developer, check headers and token authenticity.";
  if (decision === "CHALLENGE") {
    remediation = "MFA Challenge Injected. The system requires CAPTCHA validation or 2FA challenge resolution to permit route forwarding.";
  } else if (decision === "THROTTLE") {
    remediation = "Traffic Throttled. Request exceeds sliding window threshold frequency rules. Reduce query rate limit triggers.";
  } else if (decision === "BLOCK") {
    remediation = "Transaction BLOCKED immediately. Access credentials revoked temporarily. Origin IP flagged for administrative investigation.";
  }

  // Simulate SHAP explanation matrix
  const shapVals = breakdown.contributions.map(c => `  ${c.dimension}: +${c.weighted.toFixed(2)} (${c.score} score * ${currentPolicy.weights[c.dimension]}% wt)`).join("\n");
  const rawShap = `API-VORA XAI SHAPLEY VALUES (Base expectations: 5.0):\n${shapVals}\nTotal Computed Composite Score: ${breakdown.score}`;

  return {
    summary,
    remediation,
    rawShap
  };
}

// Initialize seed data
seedAuditLogs();

// --- REST API ENDPOINTS ---

// GET /api/stats -> Get telemetry metrics and charts data
app.get("/api/stats", (req, res) => {
  const total = auditLogs.length;
  const blocks = auditLogs.filter(l => l.decision === "BLOCK").length;
  const throttles = auditLogs.filter(l => l.decision === "THROTTLE").length;
  const challenges = auditLogs.filter(l => l.decision === "CHALLENGE").length;
  const allows = auditLogs.filter(l => l.decision === "ALLOW").length;

  const sumScore = auditLogs.reduce((acc, curr) => acc + curr.riskScore, 0);
  const avgRisk = total > 0 ? Math.round(sumScore / total) : 0;

  // Compile traffic trend by minutes
  const hourlyBucket = new Map<string, { allow: number; challenge: number; throttle: number; block: number }>();
  
  // Last 6 segments of timeline
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 15 * 60 * 1000);
    // Find closest 15 min bucket for the bucket timeline key itself
    const mins = d.getMinutes();
    const roundedMins = Math.floor(mins / 15) * 15;
    d.setMinutes(roundedMins);
    d.setSeconds(0);
    d.setMilliseconds(0);
    const key = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    hourlyBucket.set(key, { allow: 0, challenge: 0, throttle: 0, block: 0 });
  }

  auditLogs.forEach(log => {
    const date = new Date(log.timestamp);
    // Find closest 15 min bucket
    const mins = date.getMinutes();
    const roundedMins = Math.floor(mins / 15) * 15;
    date.setMinutes(roundedMins);
    date.setSeconds(0);
    date.setMilliseconds(0);
    const key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (hourlyBucket.has(key)) {
      const b = hourlyBucket.get(key)!;
      if (log.decision === "ALLOW") b.allow++;
      if (log.decision === "CHALLENGE") b.challenge++;
      if (log.decision === "THROTTLE") b.throttle++;
      if (log.decision === "BLOCK") b.block++;
    }
  });

  const trafficTrend = Array.from(hourlyBucket.entries()).map(([time, data]) => ({
    time,
    ...data
  }));

  // Compile attack distribution
  const attacks = {
    "SQL Injection": 0,
    "Cross-Site Scripting (XSS)": 0,
    "Credential Stuffing": 0,
    "Endpoint Scanning": 0,
    "Rate Limit Exceeded": 0
  };

  auditLogs.forEach(l => {
    if (l.riskScore > 30) {
      if (l.userAgent.includes("sqlmap") || l.payload.includes("UNION") || l.payload.includes("SELECT")) {
        attacks["SQL Injection"]++;
      } else if (l.payload.includes("<script>") || l.payload.includes("alert")) {
        attacks["Cross-Site Scripting (XSS)"]++;
      } else if (l.path.includes("login") && l.riskScore > 50) {
        attacks["Credential Stuffing"]++;
      } else if (l.path.includes("admin") || l.path.includes("settings")) {
        attacks["Endpoint Scanning"]++;
      } else if (l.decision === "THROTTLE" || l.decision === "BLOCK") {
        attacks["Rate Limit Exceeded"]++;
      }
    }
  });

  const attackDistribution = Object.entries(attacks).map(([name, value]) => ({
    name,
    value: value || Math.floor(Math.random() * 3) + 1 // assure some values exist
  }));

  // Compile microservice endpoints stats
  const endpointsCount = {
    "/api/v1/auth/login": { count: 0, blocked: 0 },
    "/api/v1/payments/checkout": { count: 0, blocked: 0 },
    "/api/v1/users/profile": { count: 0, blocked: 0 },
    "/api/v1/products/list": { count: 0, blocked: 0 },
    "/api/v1/admin/settings": { count: 0, blocked: 0 },
    "/api/v1/inventory/query": { count: 0, blocked: 0 }
  };

  auditLogs.forEach(l => {
    const pathKey = l.path as keyof typeof endpointsCount;
    if (endpointsCount[pathKey]) {
      endpointsCount[pathKey].count++;
      if (l.decision === "BLOCK") {
        endpointsCount[pathKey].blocked++;
      }
    }
  });

  const apiUsage = Object.entries(endpointsCount).map(([endpoint, data]) => ({
    endpoint,
    requests: data.count,
    blocked: data.blocked
  }));

  // Compiling alerts lists
  const alertsList = auditLogs
    .filter(l => l.riskScore > 50)
    .slice(0, 10)
    .map(l => ({
      id: l.id,
      timestamp: l.timestamp,
      level: l.riskScore > 80 ? ("critical" as const) : ("warning" as const),
      message: `Threat score ${l.riskScore} at ${l.clientIp} targeting ${l.path}`,
      path: l.path
    }));

  const stats: GatewayStats = {
    totalRequests: total,
    blockedCount: blocks,
    throttledCount: throttles,
    challengedCount: challenges,
    allowedCount: allows,
    averageRiskScore: avgRisk,
    ruleBasedFpr: 8.4,
    apiVoraFpr: 0.9,
    trafficTrend,
    attackDistribution,
    apiUsage,
    alerts: alertsList
  };

  res.json(stats);
});

// GET /api/logs -> Search and drill logs
app.get("/api/logs", (req, res) => {
  res.json(auditLogs);
});

// GET /api/policies -> Get current firewall/rules setup
app.get("/api/policies", (req, res) => {
  res.json(currentPolicy);
});

// POST /api/policies -> Set updated settings
app.post("/api/policies", (req, res) => {
  const { weights, thresholds, rateLimit } = req.body;
  if (weights) currentPolicy.weights = { ...currentPolicy.weights, ...weights };
  if (thresholds) currentPolicy.thresholds = { ...currentPolicy.thresholds, ...thresholds };
  if (rateLimit) currentPolicy.rateLimit = { ...currentPolicy.rateLimit, ...rateLimit };
  
  // Clear Rate Limit Cache when policies adjust
  rateLimitCache.clear();

  res.json({ success: true, policy: currentPolicy });
});

// POST /api/retrain -> Self learning retraining loop simulation
app.post("/api/retrain", (req, res) => {
  // Recalibrate and return success recommendation
  const recommendedWeights = {
    userBehavior: 18,
    authentication: 24,
    requestPattern: 14,
    payloadContent: 22,
    ipLocation: 8,
    deviceContext: 7,
    threatIntelligence: 7
  };
  
  res.json({
    success: true,
    message: "Isolation Forest & Anomaly detection ensemble successfully retrained.",
    previousWeights: currentPolicy.weights,
    recommendedWeights,
    evaluatedRecords: auditLogs.length,
    fprReduction: "0.9% -> 0.72%"
  });
});

// POST /api/explain -> Gemini Explainable AI Endpoint
app.post("/api/explain", async (req, res) => {
  const { logId } = req.body;
  const log = auditLogs.find(l => l.id === logId);

  if (!log) {
    return res.status(404).json({ error: "Audit log entry not found." });
  }

  if (!ai) {
    // Return standard detailed backup explanation if API Key isn't provided
    const detailExplain = `
### API-VORA Intelligence System Alert Report (Heuristic Backup Engine)
**Incident reference:** ${log.id}
**Origin:** ${log.clientIp} (${ipThreatFeeds[log.clientIp as keyof typeof ipThreatFeeds]?.type || "Unclassified Location"})
**Impacted Endpoint:** \`${log.method} ${log.path}\`
**Verdict:** **${log.decision}** (Computed composite threat level: **${log.riskScore}/100**)

#### 🔍 Structural Dimension Contributions (SHAP Analyzer)
- **Payload Content Risk:** ${log.dimensions.payloadContent}/100 (Weight: ${currentPolicy.weights.payloadContent}%)
- **Authentication Risk:** ${log.dimensions.authentication}/100 (Weight: ${currentPolicy.weights.authentication}%)
- **Device Context Risk:** ${log.dimensions.deviceContext}/100 (Weight: ${currentPolicy.weights.deviceContext}%)
- **Threat Intelligence:** ${log.dimensions.threatIntelligence}/100 (Weight: ${currentPolicy.weights.threatIntelligence}%)

#### 🎯 Security Analyst Summary
The client at IP address **${log.clientIp}** triggered high anomaly scores. This was identified primarily due to payload pattern matches containing query triggers and terminal utility headers. This behavior perfectly correlates with scanning bots or command injection attempts targeting the gateway backend microservices.

#### 🛡️ Actionable Mitigation Advice
1. **IP Quarantine:** Block IP \`${log.clientIp}\` on your edge WAF or cloud firewalls immediately.
2. **Review API Keys:** Ensure clients associated with token signatures are verified and restrict permissions.
3. **Configure Rate Limiting:** Apply adaptive sliding limits to avoid scraping of catalog endpoints.
    `;
    return res.json({ explanation: detailExplain });
  }

  try {
    const prompt = `
Analyze this security incident log from the API-VORA gateway and generate a highly detailed, professional, and explainable security analyst report.
Use the JSON details provided below, explain the SHAP contribution values, summarize what the hacker was likely attempting (e.g., SQLi, Brute force, scraping), and provide 3-4 professional security remediation steps.

Log JSON:
${JSON.stringify(log, null, 2)}

Active Policies:
${JSON.stringify(currentPolicy, null, 2)}

Structure your response clearly using markdown with these sections:
### 🚨 Threat Event Briefing
### 📊 Multi-Dimensional SHAP Risk Analysis
### 🧬 Hacker Intention & Attack Fingerprint
### 🛡️ Recommended Security Remediation Actions
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (err: any) {
    console.error("API-VORA: Gemini Explain Call failed:", err);
    res.status(500).json({ error: "AI Explanation pipeline failed", details: err.message });
  }
});

// POST /api/simulate-traffic -> Injects batch of traffic to demonstrate dynamic charts
app.post("/api/simulate-traffic", (req, res) => {
  const { type } = req.body; // 'attack' | 'clean' | 'mixed'
  const now = new Date();
  const logsToInject: AuditLog[] = [];

  const size = type === "attack" ? 5 : 10;

  for (let i = 0; i < size; i++) {
    let method = "GET";
    let path = "/api/v1/products/list";
    let ip = "8.8.8.8";
    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
    let payload = "";
    let authHeader = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI5OTkiLCJyb2xlIjoidXNlcSJ9.xxx";

    if (type === "attack") {
      const attackType = Math.random();
      if (attackType < 0.33) {
        path = "/api/v1/inventory/query";
        payload = JSON.stringify({ q: "1; DROP TABLE products; --" });
        ip = "193.56.28.188";
        ua = "sqlmap/1.8";
      } else if (attackType < 0.66) {
        path = "/api/v1/admin/settings";
        method = "PUT";
        authHeader = "";
        payload = JSON.stringify({ flag: "exploit" });
        ip = "45.89.230.12";
      } else {
        path = "/api/v1/auth/login";
        method = "POST";
        payload = JSON.stringify({ username: "admin", password: "' OR '1'='1" });
        ip = "185.220.101.44";
      }
    } else {
      // clean traffic
      const paths = ["/api/v1/products/list", "/api/v1/users/profile", "/api/v1/inventory/query"];
      path = paths[Math.floor(Math.random() * paths.length)];
      method = path.includes("list") || path.includes("query") ? "GET" : "POST";
      ip = `${Math.floor(Math.random() * 150) + 50}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}`;
      if (path === "/api/v1/inventory/query") {
        payload = JSON.stringify({ q: "wireless charger" });
      }
    }

    const details = {
      id: generateId(),
      timestamp: now.toISOString(),
      method,
      path,
      clientIp: ip,
      userAgent: ua,
      clientId: "client_user_session",
      authHeader,
      payload,
      latencyMs: Math.floor(Math.random() * 15) + 3
    };

    const breakdown = calculateCompositeRisk(details, currentPolicy);
    const decision = getDecisionForScore(breakdown.score, currentPolicy);
    const explanation = generateHeuristicExplanation(breakdown, details, decision);

    logsToInject.push({
      ...details,
      riskScore: breakdown.score,
      decision,
      dimensions: breakdown.dimensions,
      explanation
    });
  }

  // Prepend new logs to standard in-memory store
  auditLogs = [...logsToInject, ...auditLogs];
  // limit store to 100 entries to prevent memory leak
  if (auditLogs.length > 150) {
    auditLogs = auditLogs.slice(0, 150);
  }

  res.json({ success: true, count: logsToInject.length });
});

// POST /gateway/api/v1/* -> Intercept live simulated user request from Simulator
app.all("/gateway/api/v1/*", (req, res) => {
  const method = req.method;
  const path = req.path.replace("/gateway", ""); // normalize
  const clientIp = (req.headers["x-client-ip"] as string) || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["x-simulated-user-agent"] as string) || (req.headers["user-agent"] as string) || "Simulator client";
  const authHeader = req.headers["authorization"] || "";
  const payload = JSON.stringify(req.body || {});

  // Adaptive Rate Limiter bucket checking (Redis simulation)
  const clientKey = clientIp;
  const now = Date.now();
  const bucket = rateLimitCache.get(clientKey) || { tokens: currentPolicy.rateLimit.maxBucketSize, lastChecked: now };
  
  // Calculate refill
  const elapsedMinutes = (now - bucket.lastChecked) / (60 * 1000);
  const refilledTokens = bucket.tokens + elapsedMinutes * currentPolicy.rateLimit.refillRate;
  const currentTokens = Math.min(currentPolicy.rateLimit.maxBucketSize, refilledTokens);

  const reqDetails = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    method,
    path,
    clientIp,
    userAgent,
    clientId: req.headers["x-client-id"] as string || "unregistered_client",
    authHeader,
    payload,
    latencyMs: Math.floor(Math.random() * 20) + 2
  };

  const riskBreakdown = calculateCompositeRisk(reqDetails, currentPolicy);
  let decision = getDecisionForScore(riskBreakdown.score, currentPolicy);

  // Apply rate limit decrement
  let updatedTokens = currentTokens;
  if (decision !== "BLOCK" && decision !== "THROTTLE") {
    if (currentTokens >= 1) {
      updatedTokens = currentTokens - 1;
    } else {
      // Force Throttle decision if token bucket is fully depleted!
      decision = "THROTTLE";
    }
  }

  rateLimitCache.set(clientKey, { tokens: updatedTokens, lastChecked: now });

  const explanation = generateHeuristicExplanation(riskBreakdown, reqDetails, decision);

  const completeLog: AuditLog = {
    ...reqDetails,
    riskScore: riskBreakdown.score,
    decision,
    dimensions: riskBreakdown.dimensions,
    explanation
  };

  // Add to global list for live updates
  auditLogs = [completeLog, ...auditLogs];
  if (auditLogs.length > 150) auditLogs = auditLogs.slice(0, 150);

  // Return the customized response with API Gateway action details
  res.setHeader("X-API-VORA-Risk-Score", completeLog.riskScore.toString());
  res.setHeader("X-API-VORA-Verdict", decision);
  res.setHeader("X-API-VORA-Tokens-Remaining", Math.floor(updatedTokens).toString());

  if (decision === "BLOCK") {
    return res.status(403).json({
      error: "Blocked by API-VORA Gateway Security Policies",
      statusCode: 403,
      incidentId: completeLog.id,
      riskScore: completeLog.riskScore,
      mitigation: completeLog.explanation.remediation
    });
  }

  if (decision === "THROTTLE") {
    return res.status(429).json({
      error: "Rate Limit Exceeded — Adaptive Throttling Active",
      statusCode: 429,
      incidentId: completeLog.id,
      riskScore: completeLog.riskScore,
      mitigation: "Reduce transaction volume per client sliding window"
    });
  }

  if (decision === "CHALLENGE") {
    return res.status(401).json({
      error: "Multi-Factor Authentication or CAPTCHA Challenge Triggered",
      statusCode: 401,
      challengeRequired: true,
      incidentId: completeLog.id,
      riskScore: completeLog.riskScore,
      captchaType: "hCaptcha-adaptive",
      mitigation: "Verify authentication state before re-submitting request"
    });
  }

  // If ALLOW, return success proxy result
  res.json({
    status: "Success",
    message: "Request successfully inspected and proxied to microservice backend.",
    gatewayMeta: {
      id: completeLog.id,
      riskScore: completeLog.riskScore,
      verdict: decision,
      rateLimitRemaining: Math.floor(updatedTokens)
    },
    backendResponse: {
      endpoint: path,
      servedBy: "Inventory Service v2.1",
      data: path.includes("products") ? [
        { id: "p1", name: "API-VORA Security Engine Pro", price: 0 },
        { id: "p2", name: "AI Gateway Hub Middleware", price: 499 }
      ] : { ok: true, timestamp: Date.now() }
    }
  });
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API-VORA: Server up and running at http://localhost:${PORT}`);
  });
}

startServer();
