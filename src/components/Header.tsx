import React, { useState, useEffect } from "react";
import { Cpu, Shield, RefreshCw, Clock } from "lucide-react";
import { motion } from "motion/react";

interface HeaderProps {
  serverConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ serverConnected, onRefresh, isRefreshing }: HeaderProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((p) => p.type === "year")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const day = parts.find((p) => p.type === "day")?.value || "";
      const hour = parts.find((p) => p.type === "hour")?.value || "";
      const minute = parts.find((p) => p.type === "minute")?.value || "";
      const second = parts.find((p) => p.type === "second")?.value || "";
      setTime(`${year}-${month}-${day} ${hour}:${minute}:${second} IST`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-zinc-200/80 bg-white/85 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <motion.div 
          className="bg-zinc-50 border border-zinc-200 p-2 rounded-lg text-zinc-900 flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.05, backgroundColor: "#f4f4f5" }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.08, 0.94, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Cpu className="w-5 h-5 text-zinc-900" />
          </motion.div>
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold font-display tracking-tight text-zinc-900">API-VORA</h1>
            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-medium">
              v1.0
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-sans">
            AI-Powered Adaptive API Security & Explainable Risk Gateway
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        {/* UTC Time */}
        <div className="flex items-center gap-2 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg text-zinc-600 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-medium">{time}</span>
        </div>

        {/* Server status */}
        <div className="flex items-center gap-2 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg shadow-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${serverConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
          <span className="text-zinc-600 font-medium">
            {serverConnected ? "INGRESS ACTIVE" : "CONNECTING"}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white px-3.5 py-1.5 rounded-lg font-sans font-semibold transition cursor-pointer disabled:opacity-50 text-xs shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync Gateway</span>
        </button>
      </div>
    </header>
  );
}
