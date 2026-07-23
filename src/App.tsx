import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Terminal, Sliders, Database, 
  ShieldAlert, Activity, ShieldCheck, Lock, ShieldAlert as AlertIcon
} from "lucide-react";
import Header from "./components/Header.tsx";
import OverviewTab from "./components/OverviewTab.tsx";
import SimulatorTab from "./components/SimulatorTab.tsx";
import PoliciesTab from "./components/PoliciesTab.tsx";
import LogsTab from "./components/LogsTab.tsx";
import { GatewayStats, SecurityPolicy, AuditLog } from "./types.ts";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "simulator" | "policies" | "logs">("dashboard");
  const [serverConnected, setServerConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Core synchronized server states
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Initial and subsequent fetch handlers
  const syncGateway = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [statsRes, policyRes, logsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/policies"),
        fetch("/api/logs")
      ]);

      if (statsRes.ok && policyRes.ok && logsRes.ok) {
        const statsData = await statsRes.json();
        const policyData = await policyRes.json();
        const logsData = await logsRes.json();

        setStats(statsData);
        setPolicy(policyData);
        setLogs(logsData);
        setServerConnected(true);
      } else {
        setServerConnected(false);
      }
    } catch (err) {
      console.warn("API-VORA: Error connecting to gateway telemetry backend", err);
      setServerConnected(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Poll stats and logs periodically to keep dashboard lively
  useEffect(() => {
    syncGateway();
    
    const interval = setInterval(() => {
      syncGateway(true);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleSimulateTraffic = async (type: "clean" | "attack" | "mixed") => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/simulate-traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        await syncGateway(true);
      }
    } catch (err) {
      console.error("API-VORA: Traffic simulation dispatch failed", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSavePolicy = async (updatedPolicy: SecurityPolicy): Promise<boolean> => {
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPolicy)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPolicy(data.policy);
          await syncGateway(true);
          return true;
        }
      }
    } catch (err) {
      console.error("API-VORA: Security policy sync failed", err);
    }
    return false;
  };

  const handleRetrainEngine = async (): Promise<any> => {
    try {
      const res = await fetch("/api/retrain", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.error("API-VORA: Retrain loop failed", err);
    }
    throw new Error("Tuning engine failed to converge");
  };

  const handleExplainLog = async (logId: string): Promise<string> => {
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId })
      });
      if (res.ok) {
        const data = await res.json();
        return data.explanation;
      }
    } catch (err) {
      console.error("API-VORA: AI explanation fetch failed", err);
    }
    throw new Error("Could not contact Explainable AI pipeline");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans select-none selection:bg-zinc-200">
      {/* Top sticky masthead */}
      <Header 
        serverConnected={serverConnected} 
        onRefresh={() => syncGateway(false)} 
        isRefreshing={isRefreshing} 
      />

      {/* Main interface body layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Navigation Rail (Top Horizontal Bar) */}
        <aside className="w-full shrink-0">
          {/* Main navigation */}
          <div className="flex flex-wrap gap-2.5">
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Security Dashboard</span>
            </button>

            {/* Interceptor Tab */}
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60"
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <span>Request Interceptor</span>
            </button>

            {/* Configurator Tab */}
            <button
              onClick={() => setActiveTab("policies")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                activeTab === "policies"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Policy Configurator</span>
            </button>

            {/* Forensics Tab */}
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                activeTab === "logs"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60"
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Forensics & Audit</span>
            </button>
          </div>
        </aside>

        {/* Tab view area */}
        <main className="flex-1 min-w-0">
          {!serverConnected ? (
            <div className="flex flex-col items-center justify-center text-center py-24 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <Activity className="w-10 h-10 text-zinc-400 animate-spin mb-4" />
              <h3 className="font-bold text-sm font-display text-zinc-900 mb-1.5">Gateway Ingress Handshake</h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-4 leading-relaxed">
                Waiting for the API-VORA background microservice processes to finish startup boot cycles. Verify your dev server is active.
              </p>
              <button
                onClick={() => syncGateway(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-xs"
              >
                Retry Handshake
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <OverviewTab 
                  stats={stats} 
                  onSimulateTraffic={handleSimulateTraffic} 
                  isSimulating={isSimulating} 
                />
              )}
              {activeTab === "simulator" && (
                <SimulatorTab 
                  onTrafficTriggered={() => syncGateway(true)} 
                />
              )}
              {activeTab === "policies" && (
                <PoliciesTab 
                  policy={policy} 
                  onSavePolicy={handleSavePolicy} 
                  onRetrainEngine={handleRetrainEngine} 
                />
              )}
              {activeTab === "logs" && (
                <LogsTab 
                  logs={logs} 
                  onExplainLog={handleExplainLog} 
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Humble Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 px-6 text-center text-[11px] font-mono text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <p>© 2026 API-VORA — AI-Powered Security Gateway. All rights reserved.</p>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Lock className="w-3.5 h-3.5 text-zinc-400" />
          <span>AES-GCM Adaptive Shield Active</span>
        </div>
      </footer>
    </div>
  );
}
