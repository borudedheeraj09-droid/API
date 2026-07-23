import React, { useState } from "react";
import { AuditLog } from "../types";
import Markdown from "react-markdown";
import { 
  Search, ShieldAlert, CheckCircle, AlertTriangle, 
  Slash, Sparkles, Brain, Cpu, Terminal, ChevronRight, X, ChevronLeft,
  RefreshCw, Info, ShieldCheck
} from "lucide-react";

interface LogsTabProps {
  logs: AuditLog[];
  onExplainLog: (logId: string) => Promise<string>;
}

export default function LogsTab({ logs, onExplainLog }: LogsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<string>("ALL");
  const [minScore, setMinScore] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Log for detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.clientIp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userAgent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVerdict = verdictFilter === "ALL" || log.decision === verdictFilter;
    const matchesScore = log.riskScore >= minScore;

    return matchesSearch && matchesVerdict && matchesScore;
  });

  // Paginated logs
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;

  const handleLogClick = (log: AuditLog) => {
    setSelectedLog(log);
    setAiExplanation("");
  };

  const handleRequestExplanation = async (logId: string) => {
    setIsExplaining(true);
    setAiExplanation("");
    try {
      const markdown = await onExplainLog(logId);
      setAiExplanation(markdown);
    } catch (err: any) {
      setAiExplanation(`### Anomaly Core pipeline failed\n\nCould not fetch incident details: ${err.message}`);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Strip */}
      <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, IP, endpoint path, or agent..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white border border-zinc-200 rounded-lg p-2 pl-9 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono shadow-xs"
          />
        </div>

        {/* Verdict Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-zinc-400 font-bold shrink-0">Verdict:</span>
          <select
            value={verdictFilter}
            onChange={(e) => { setVerdictFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-zinc-200 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono shadow-xs"
          >
            <option value="ALL">ALL TRAFFIC</option>
            <option value="ALLOW">ALLOW</option>
            <option value="CHALLENGE">CHALLENGE</option>
            <option value="THROTTLE">THROTTLE</option>
            <option value="BLOCK">BLOCK</option>
          </select>
        </div>

        {/* Score Range Filter */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[10px] uppercase text-zinc-400 font-bold shrink-0">Min Risk:</span>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minScore}
            onChange={(e) => { setMinScore(parseInt(e.target.value)); setCurrentPage(1); }}
            className="accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-zinc-900 font-bold shrink-0 w-8 text-right">{minScore}+</span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Logs Table (Left) */}
        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-150 text-zinc-500 font-mono text-[10px] uppercase font-bold">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Origin IP</th>
                  <th className="py-3 px-4">Method & Path</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-zinc-600">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 italic font-sans">
                      No security audit records match your query filters.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => handleLogClick(log)}
                      className={`hover:bg-zinc-50/50 cursor-pointer transition ${
                        selectedLog?.id === log.id ? "bg-zinc-50/70 border-l-2 border-l-zinc-900" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0 animate-pulse" />
                          <span>{log.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">{log.clientIp}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                            log.method === "POST" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" :
                            log.method === "PUT" ? "bg-amber-50 text-amber-700 border border-amber-200/50" :
                            log.method === "DELETE" ? "bg-red-50 text-red-700 border border-red-200/50" : "bg-zinc-100 text-zinc-700 border border-zinc-200/50"
                          }`}>
                            {log.method}
                          </span>
                          <span className="text-zinc-800 font-semibold truncate">{log.path}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-10 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                log.riskScore > 75 ? "bg-red-500" :
                                log.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"
                              }`} 
                              style={{ width: `${log.riskScore}%` }} 
                            />
                          </div>
                          <span className={`font-bold ${
                            log.riskScore > 75 ? "text-red-600" :
                            log.riskScore > 40 ? "text-amber-600" : "text-emerald-600"
                          }`}>
                            {log.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.decision === "ALLOW" ? "bg-emerald-50 border border-emerald-200/60 text-emerald-700" :
                          log.decision === "CHALLENGE" ? "bg-amber-50 border border-amber-200/60 text-amber-700" :
                          log.decision === "THROTTLE" ? "bg-blue-50 border border-blue-200/60 text-blue-700" :
                          "bg-red-50 border border-red-200/60 text-red-700"
                        }`}>
                          {log.decision}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="bg-zinc-50/50 px-4 py-3 flex items-center justify-between border-t border-zinc-200 text-xs font-mono text-zinc-500">
              <span>
                Page {currentPage} of {totalPages} ({filteredLogs.length} matching)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Log Drawer & AI Forensics Explainer (Right) */}
        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-2xl overflow-hidden h-[545px] flex flex-col justify-between shadow-xs">
          {!selectedLog ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-3">
              <Terminal className="w-10 h-10 text-zinc-300 stroke-[1.5]" />
              <div className="max-w-xs space-y-1">
                <p className="font-bold text-zinc-800 font-display text-sm">Forensics Node Idle</p>
                <p className="text-[11px] font-sans">Select a threat log row on the left to review payload dimensions and trigger the Gemini Explainable AI audit.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Drawer Header */}
              <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-600" />
                  <span className="text-zinc-850 font-bold font-display text-[11px] tracking-tight uppercase">Audit Logs: {selectedLog.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)} 
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Meta block */}
                <div className="grid grid-cols-2 gap-2.5 font-mono text-[10px]">
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-200 shadow-xs">
                    <p className="text-zinc-400 uppercase font-bold text-[8.5px]">Client Address</p>
                    <p className="text-zinc-800 mt-0.5 truncate font-semibold">{selectedLog.clientIp}</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-200 shadow-xs">
                    <p className="text-zinc-400 uppercase font-bold text-[8.5px]">Client ID</p>
                    <p className="text-zinc-800 mt-0.5 truncate font-semibold">{selectedLog.clientId}</p>
                  </div>
                </div>

                {/* Subheader: SHAP Explains */}
                <div>
                  <p className="text-[9.5px] uppercase font-bold font-mono text-zinc-400 mb-1.5">Gateway Dimension Contributions</p>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    {Object.entries(selectedLog.dimensions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-1.5 rounded bg-zinc-50/40 border border-zinc-150">
                        <span className="text-zinc-500 font-semibold capitalize text-[10px]">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`font-bold ${value > 60 ? 'text-red-600' : value > 25 ? 'text-amber-600' : 'text-zinc-700'}`}>{value}</span>
                          <div className="w-12 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${value > 60 ? 'bg-red-500' : value > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${value}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payload details if exists */}
                {selectedLog.payload && (
                  <div>
                    <p className="text-[9.5px] uppercase font-bold font-mono text-zinc-400 mb-1.5">Captured Payload Content</p>
                    <pre className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-zinc-800 text-[10px] overflow-x-auto max-h-[100px] shadow-xs">
                      {selectedLog.payload}
                    </pre>
                  </div>
                )}

                {/* AI Explanation container */}
                <div className="border-t border-zinc-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-zinc-700" />
                      <span className="text-zinc-800 font-bold font-display text-[11px] tracking-tight uppercase">API-VORA AI Explanation Report</span>
                    </div>
                    
                    {!aiExplanation && !isExplaining && (
                      <button
                        onClick={() => handleRequestExplanation(selectedLog.id)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 fill-white text-white shrink-0" />
                        <span>Explain Event</span>
                      </button>
                    )}
                  </div>

                  {isExplaining && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
                      <p className="text-[10px] font-mono text-zinc-500">Querying Gemini security models for incident summary...</p>
                    </div>
                  )}

                  {aiExplanation && (
                    <div className="prose max-w-none text-[11px] text-zinc-700 leading-relaxed font-sans border border-zinc-250 bg-zinc-50/50 p-3 rounded-lg overflow-y-auto max-h-[200px] markdown-body shadow-xs">
                      <Markdown>{aiExplanation}</Markdown>
                    </div>
                  )}

                  {!aiExplanation && !isExplaining && (
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-start gap-2 text-zinc-500 text-[11px] font-sans shadow-xs">
                      <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>
                        Run the AI explain pipeline to generate automated security summaries, threat vectors fingerprint analysis, and standard remediation lists.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
