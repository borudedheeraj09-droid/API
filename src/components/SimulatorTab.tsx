import React, { useState } from "react";
import { 
  Play, ShieldAlert, CheckCircle, ShieldCheck, 
  RefreshCw, Terminal, AlertTriangle 
} from "lucide-react";

interface PresetPayload {
  name: string;
  method: string;
  path: string;
  ip: string;
  ua: string;
  auth: string;
  payload: string;
}

const PRESETS: PresetPayload[] = [
  {
    name: "Standard Legitimate Query",
    method: "GET",
    path: "products/list",
    ip: "8.8.8.8",
    ua: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0",
    auth: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMDEiLCJyb2xlIjoidXNlciJ9.xxx",
    payload: ""
  },
  {
    name: "SQL Injection Probe (SQLMap)",
    method: "GET",
    path: "inventory/query",
    ip: "193.56.28.188",
    ua: "sqlmap/1.8.2#stable (https://sqlmap.org)",
    auth: "",
    payload: '{"search_term": "books\' UNION SELECT username, password FROM users --"}'
  },
  {
    name: "Privilege Escalation on Admin Endpoint",
    method: "PUT",
    path: "admin/settings",
    ip: "45.89.230.12",
    ua: "python-requests/2.31.0",
    auth: "Bearer expired_or_malformed_token",
    payload: '{"allow_unauthenticated_registration": true}'
  },
  {
    name: "Tor-routed Web Scraping Attack",
    method: "GET",
    path: "products/list",
    ip: "185.220.101.44",
    ua: "curl/7.88.1",
    auth: "",
    payload: ""
  },
  {
    name: "XSS Script Injection",
    method: "POST",
    path: "products/list",
    ip: "8.8.8.8",
    ua: "Mozilla/5.0 Chrome/120.0.0",
    auth: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMDEiLCJyb2xlIjoidXNlciJ9.xxx",
    payload: '{"review": "<script>alert(\'XSS\')</script>"}'
  },
  {
    name: "Directory Path Traversal Attempt",
    method: "GET",
    path: "inventory/query",
    ip: "193.56.28.188",
    ua: "curl/7.88.1",
    auth: "",
    payload: '{"file": "../../../../etc/passwd"}'
  }
];

interface SimulatorTabProps {
  onTrafficTriggered: () => void;
}

export default function SimulatorTab({ onTrafficTriggered }: SimulatorTabProps) {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("products/list");
  const [clientIp, setClientIp] = useState("8.8.8.8");
  const [userAgent, setUserAgent] = useState("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0");
  const [clientId, setClientId] = useState("client_app_329a");
  const [authHeader, setAuthHeader] = useState("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMDEiLCJyb2xlIjoidXNlciJ9.xxx");
  const [payload, setPayload] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<any | null>(null);

  const applyPreset = (preset: PresetPayload) => {
    setMethod(preset.method);
    setPath(preset.path);
    setClientIp(preset.ip);
    setUserAgent(preset.ua);
    setAuthHeader(preset.auth);
    setPayload(preset.payload);
  };

  const handleSend = async () => {
    setIsSending(true);
    setResponse(null);

    // Build gateway intercept url
    const normalizedPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `/gateway/api/v1/${normalizedPath}`;

    try {
      let parsedBody: any = undefined;
      if (payload && (method === "POST" || method === "PUT" || method === "DELETE")) {
        try {
          parsedBody = JSON.parse(payload);
        } catch {
          parsedBody = { raw: payload };
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Client-ID": clientId,
        "X-Client-IP": clientIp,
        "X-Simulated-User-Agent": userAgent
      };

      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const res = await fetch(url, {
        method: method,
        headers: headers,
        body: parsedBody ? JSON.stringify(parsedBody) : undefined
      });

      const data = await res.json();
      
      const riskScore = res.headers.get("X-API-VORA-Risk-Score") || "0";
      const verdict = res.headers.get("X-API-VORA-Verdict") || "ALLOW";
      const tokensRemaining = res.headers.get("X-API-VORA-Tokens-Remaining") || "0";

      setResponse({
        status: res.status,
        headers: {
          "X-API-VORA-Risk-Score": riskScore,
          "X-API-VORA-Verdict": verdict,
          "X-API-VORA-Tokens-Remaining": tokensRemaining,
          "Content-Type": "application/json"
        },
        data: data
      });

      onTrafficTriggered();
    } catch (err: any) {
      setResponse({
        status: 500,
        headers: {},
        data: { error: "Network communication error with gateway proxy", details: err.message }
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left panel: Request Builder */}
      <div className="lg:col-span-6 space-y-4">
        {/* Presets Card */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <h4 className="font-bold text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-2">Threat Vector Preset Templates</h4>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="text-left text-[11px] p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 transition truncate cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl space-y-4 shadow-xs">
          <h3 className="font-bold text-sm text-zinc-900 font-display">Client Request Matrix</h3>

          <div className="grid grid-cols-3 gap-3">
            {/* Method */}
            <div className="col-span-1">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Path */}
            <div className="col-span-2">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">Endpoint Path</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-zinc-400 font-mono text-xs">/v1/</span>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-white border border-zinc-250 rounded-lg p-2 pl-9 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
                  placeholder="products/list"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Client IP */}
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">Client IP Origin</label>
              <input
                type="text"
                value={clientIp}
                onChange={(e) => setClientIp(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
                placeholder="8.8.8.8"
              />
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">X-Client-ID Header</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
                placeholder="client_app_329a"
              />
            </div>
          </div>

          {/* User Agent */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">User-Agent Header</label>
            <input
              type="text"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
              placeholder="Mozilla/5.0 (Windows NT 10.0)"
            />
          </div>

          {/* Authorization Bearer */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">Authorization Bearer Token</label>
            <input
              type="text"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono"
              placeholder="Bearer eyJhbGciOiJIUzI1..."
            />
          </div>

          {/* Request Payload */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">JSON Request Payload (POST/PUT Body)</label>
              <span className="text-[10px] font-mono text-zinc-400">JSON Format</span>
            </div>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={4}
              className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
              placeholder='{"q": "query parameters"}'
            />
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 active:scale-[0.99] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shadow-sm"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gateway Analyzing Request...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white shrink-0" />
                <span>Execute Inspected Request</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right panel: Live Diagnostics Terminal */}
      <div className="lg:col-span-6 space-y-4">
        {/* Terminal Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden font-mono text-xs flex flex-col h-[585px] shadow-sm">
          {/* Header */}
          <div className="bg-zinc-50 px-4 py-3 flex items-center justify-between border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-600" />
              <span className="text-zinc-800 font-bold font-display text-[11px] tracking-tight">GATEWAY DIAGNOSTICS DECODER</span>
            </div>
            {response && (
              <span className={`h-2 w-2 rounded-full ${
                response.headers["X-API-VORA-Verdict"] === "ALLOW" ? "bg-emerald-500" :
                response.headers["X-API-VORA-Verdict"] === "CHALLENGE" ? "bg-amber-500" : "bg-red-500"
              }`} />
            )}
          </div>

          {/* Terminal Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/40">
            {!response && !isSending && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
                <Terminal className="w-10 h-10 text-zinc-300 stroke-[1.5]" />
                <div className="max-w-xs space-y-1">
                  <p className="font-bold text-zinc-800">Terminal Idle</p>
                  <p className="text-[11px] text-zinc-400 font-sans">Craft an API payload on the left and dispatch it to fire the adaptive security decision loop.</p>
                </div>
              </div>
            )}

            {isSending && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
                <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
                <p className="text-[11px] font-sans text-zinc-500 animate-pulse">API-VORA proxy inspecting client IP, request patterns, and cryptographic payload signatures...</p>
              </div>
            )}

            {response && (
              <div className="space-y-4">
                {/* Visual Action Alert */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  response.headers["X-API-VORA-Verdict"] === "ALLOW"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : response.headers["X-API-VORA-Verdict"] === "CHALLENGE"
                      ? "bg-amber-50 border-amber-100 text-amber-800"
                      : "bg-red-50 border-red-100 text-red-850"
                }`}>
                  <div className="flex items-center gap-2">
                    {response.headers["X-API-VORA-Verdict"] === "ALLOW" ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    ) : response.headers["X-API-VORA-Verdict"] === "CHALLENGE" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-extrabold font-display text-[11px] tracking-wide uppercase">
                        GATEWAY ACTION: {response.headers["X-API-VORA-Verdict"]}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Threat Score: {response.headers["X-API-VORA-Risk-Score"]}/100 • HTTP {response.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-zinc-400 font-bold">Bucket Tokens</p>
                    <p className="font-bold font-mono text-zinc-800">{response.headers["X-API-VORA-Tokens-Remaining"]} left</p>
                  </div>
                </div>

                {/* Raw HTTP Details */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1.5">Proxy Header Exchange</p>
                  <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-1 text-[11px] overflow-x-auto text-zinc-600 shadow-xs">
                    <p className="text-zinc-900 font-bold">{method} /gateway/api/v1/{path} HTTP/1.1</p>
                    <p>Host: api-vora.security.internal</p>
                    <p>Authorization: {authHeader ? authHeader.substring(0, 30) + "..." : "None"}</p>
                    <p>X-Client-ID: {clientId}</p>
                    <p>X-Forwarded-For: {clientIp}</p>
                    <p className="text-zinc-300">---</p>
                    <p className={response.status === 200 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                      HTTP/1.1 {response.status} {response.status === 200 ? "OK" : response.status === 403 ? "Forbidden" : response.status === 429 ? "Too Many Requests" : "Unauthorized"}
                    </p>
                    <p>X-API-VORA-Risk-Score: {response.headers["X-API-VORA-Risk-Score"]}</p>
                    <p>X-API-VORA-Verdict: {response.headers["X-API-VORA-Verdict"]}</p>
                  </div>
                </div>

                {/* Response payload body */}
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1.5">Interceptor Response Body</p>
                  <pre className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-zinc-800 text-[10.5px] overflow-x-auto max-h-[160px] shadow-xs">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>

                {/* Actionable Remediation Warning */}
                {response.data?.mitigation && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg space-y-1">
                    <p className="text-[10px] uppercase font-bold text-red-700">Actionable Remediation Warning</p>
                    <p className="text-zinc-700 text-[11px] leading-relaxed font-sans">
                      {response.data.mitigation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
