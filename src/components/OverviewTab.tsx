import React from "react";
import { GatewayStats } from "../types";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";
import { 
  Activity, CheckCircle, ShieldAlert, Slash, 
  AlertOctagon, Gauge, ShieldCheck, Clock
} from "lucide-react";

interface OverviewTabProps {
  stats: GatewayStats | null;
  onSimulateTraffic: (type: "clean" | "attack" | "mixed") => void;
  isSimulating: boolean;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function OverviewTab({ stats, onSimulateTraffic, isSimulating }: OverviewTabProps) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <Activity className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
        <p className="text-sm text-zinc-500 font-medium">Synchronizing telemetries from API-VORA security core...</p>
      </div>
    );
  }

  // Formatting large numbers
  const formatNum = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="space-y-6">
      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total requests */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-zinc-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold mb-1">Total Inspected</p>
          <p className="text-2xl font-bold text-zinc-900 font-display">{formatNum(stats.totalRequests)}</p>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">Direct API requests</p>
        </div>

        {/* Allowed requests */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-emerald-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-emerald-600 font-bold mb-1">Allowed Route</p>
          <p className="text-2xl font-bold text-zinc-900 font-display flex items-baseline gap-1.5">
            {formatNum(stats.allowedCount)}
            <span className="text-[10px] text-emerald-600 font-medium">
              ({stats.totalRequests > 0 ? Math.round((stats.allowedCount / stats.totalRequests) * 100) : 0}%)
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Proxied to backend</span>
          </div>
        </div>

        {/* Challenged requests */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-amber-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-amber-600 font-bold mb-1">Challenged</p>
          <p className="text-2xl font-bold text-zinc-900 font-display flex items-baseline gap-1.5">
            {formatNum(stats.challengedCount)}
            <span className="text-[10px] text-amber-600 font-medium">
              ({stats.totalRequests > 0 ? Math.round((stats.challengedCount / stats.totalRequests) * 100) : 0}%)
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>MFA enforced</span>
          </div>
        </div>

        {/* Throttled requests */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-blue-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-blue-600 font-bold mb-1">Throttled</p>
          <p className="text-2xl font-bold text-zinc-900 font-display flex items-baseline gap-1.5">
            {formatNum(stats.throttledCount)}
            <span className="text-[10px] text-blue-600 font-medium">
              ({stats.totalRequests > 0 ? Math.round((stats.throttledCount / stats.totalRequests) * 100) : 0}%)
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
            <Slash className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Rate limits active</span>
          </div>
        </div>

        {/* Blocked requests */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-red-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-red-600 font-bold mb-1">Blocked</p>
          <p className="text-2xl font-bold text-zinc-900 font-display flex items-baseline gap-1.5">
            {formatNum(stats.blockedCount)}
            <span className="text-[10px] text-red-600 font-medium">
              ({stats.totalRequests > 0 ? Math.round((stats.blockedCount / stats.totalRequests) * 100) : 0}%)
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Signatures denied</span>
          </div>
        </div>

        {/* Average Threat Risk */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl relative overflow-hidden shadow-xs hover:border-purple-300 transition-colors">
          <p className="text-[10px] uppercase tracking-wider font-mono text-purple-600 font-bold mb-1">Avg Risk</p>
          <p className="text-2xl font-bold text-zinc-900 font-display flex items-baseline gap-1.5">
            {stats.averageRiskScore}
            <span className="text-[10px] text-zinc-400 font-normal">/100</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
            <Gauge className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Confidence index</span>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Trend */}
        <div className="lg:col-span-2 min-w-0 bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <h4 className="font-bold text-sm text-zinc-900 font-display mb-1">Adaptive Security Traffic Trend</h4>
            <p className="text-xs text-zinc-500 mb-4">Inspected request routing actions over 15-minute transaction intervals.</p>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.trafficTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAllow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorChallenge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorThrottle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBlock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e4e4e7", borderRadius: "8px", color: "#18181b", fontSize: "12px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                  itemStyle={{ padding: "1px 0" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                <Area type="monotone" dataKey="allow" name="Allow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAllow)" />
                <Area type="monotone" dataKey="challenge" name="Challenge" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorChallenge)" />
                <Area type="monotone" dataKey="throttle" name="Throttle" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorThrottle)" />
                <Area type="monotone" dataKey="block" name="Block" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBlock)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attack Vector Distribution */}
        <div className="min-w-0 bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <h4 className="font-bold text-sm text-zinc-900 font-display mb-1">Attack Vector Footprints</h4>
            <p className="text-xs text-zinc-500 mb-4">Distribution of threat signatures intercepted by signature engines.</p>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats.attackDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.attackDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e4e4e7", borderRadius: "8px", color: "#18181b", fontSize: "11px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Label */}
            <div className="absolute inset-y-0 flex flex-col items-center justify-center pt-[-15px] pointer-events-none">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Threats</span>
              <span className="text-xl font-bold text-zinc-900 font-display">
                {stats.attackDistribution.reduce((a, b) => a + b.value, 0)}
              </span>
            </div>
          </div>
          
          {/* Custom Legends Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-zinc-100 pt-3">
            {stats.attackDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-zinc-500 truncate">{entry.name}</span>
                <span className="text-zinc-800 font-semibold shrink-0 ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Dashboard Strip: False Positive Rate Advantage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-br from-zinc-50 to-white border border-zinc-200 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-zinc-100 rounded-full blur-2xl" />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-800">
              <ShieldCheck className="w-5 h-5 text-zinc-900" />
              <h4 className="font-bold text-sm text-zinc-900 font-display">AI False Positive Advantage</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              API-VORA&apos;s adaptive scoring reduces legitimate client blocks by utilizing continuous SHAP context vectors.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 font-mono text-xs">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold">Legacy Static WAF</p>
              <p className="text-lg font-bold text-zinc-400">{stats.ruleBasedFpr}% FPR</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-900 uppercase font-bold">API-VORA Adaptive</p>
              <p className="text-xl font-bold text-emerald-600 flex items-center gap-1 justify-end">
                {stats.apiVoraFpr}% <span className="text-[10px] text-zinc-500 font-normal">FPR</span>
              </p>
            </div>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div className="md:col-span-2 bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col shadow-xs">
          <h4 className="font-bold text-sm text-zinc-900 font-display mb-1">Critical Security Alerts Log</h4>
          <p className="text-xs text-zinc-500 mb-3">Live feed of anomalous traffic requiring mitigation validation.</p>
          
          <div className="flex-1 overflow-y-auto max-h-[140px] space-y-2 pr-1 font-mono text-[11px]">
            {stats.alerts.length === 0 ? (
              <p className="text-center text-zinc-400 py-6 italic font-sans text-xs">No anomalous incidents detected in current window.</p>
            ) : (
              stats.alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-2 rounded border flex items-center justify-between gap-3 ${
                    alert.level === "critical" 
                      ? "bg-red-50 border-red-100 text-red-800" 
                      : "bg-amber-50 border-amber-100 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`h-1.5 w-1.5 rounded-full ${alert.level === "critical" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="font-bold text-[9px] uppercase tracking-wider">{alert.level}</span>
                    <span className="text-zinc-600 truncate">{alert.message}</span>
                  </div>
                  <span className="text-zinc-400 text-[10px] shrink-0 font-medium">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom section: Microservice Endpoint Traffic Map */}
      <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
        <div className="mb-4">
          <h4 className="font-bold text-sm text-zinc-900 font-display mb-1">Target Endpoints Routing Metrics</h4>
          <p className="text-xs text-zinc-500">Total transaction traffic and blocked percentage across the microservices ecosystem.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-150 text-zinc-500 font-mono text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Protected Endpoint Path</th>
                <th className="py-2.5 px-3 text-right">Transaction Requests</th>
                <th className="py-2.5 px-3 text-right">Blocked Incidents</th>
                <th className="py-2.5 px-3 text-right">Block Ratio</th>
                <th className="py-2.5 px-3 text-right">Gateway Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
              {stats.apiUsage.map((api) => {
                const ratio = api.requests > 0 ? (api.blocked / api.requests) * 100 : 0;
                return (
                  <tr key={api.endpoint} className="hover:bg-zinc-50/60 transition">
                    <td className="py-3 px-3 text-zinc-900 font-semibold">{api.endpoint}</td>
                    <td className="py-3 px-3 text-right text-zinc-600">{formatNum(api.requests)}</td>
                    <td className="py-3 px-3 text-right text-red-600 font-semibold">{formatNum(api.blocked)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-zinc-600 font-semibold">{ratio.toFixed(1)}%</span>
                        <div className="w-12 bg-zinc-100 h-1.5 rounded overflow-hidden">
                          <div 
                            className={`h-full ${ratio > 40 ? 'bg-red-500' : ratio > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, ratio)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide ${
                        ratio > 50 
                          ? 'bg-red-50 text-red-700 border border-red-100' 
                          : ratio > 20 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {ratio > 50 ? "Heavy Attack" : ratio > 20 ? "Caution" : "Secure"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
