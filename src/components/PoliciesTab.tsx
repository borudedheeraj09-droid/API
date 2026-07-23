import React, { useState, useEffect } from "react";
import { SecurityPolicy, RiskDimensions } from "../types";
import { Sliders, Save, Cpu, Info, Check, Sparkles, Shield } from "lucide-react";
import { motion } from "motion/react";

interface PoliciesTabProps {
  policy: SecurityPolicy | null;
  onSavePolicy: (policy: SecurityPolicy) => Promise<boolean>;
  onRetrainEngine: () => Promise<any>;
}

export default function PoliciesTab({ policy, onSavePolicy, onRetrainEngine }: PoliciesTabProps) {
  const [weights, setWeights] = useState<RiskDimensions | null>(null);
  const [thresholds, setThresholds] = useState<SecurityPolicy["thresholds"] | null>(null);
  const [rateLimit, setRateLimit] = useState<SecurityPolicy["rateLimit"] | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Retraining result state
  const [retrainResult, setRetrainResult] = useState<any | null>(null);

  useEffect(() => {
    if (policy) {
      setWeights({ ...policy.weights });
      setThresholds({ ...policy.thresholds });
      setRateLimit({ ...policy.rateLimit });
    }
  }, [policy]);

  if (!weights || !thresholds || !rateLimit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <Sliders className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
        <p className="text-sm text-zinc-500 font-medium">Loading security policy matrices from gateway...</p>
      </div>
    );
  }

  // Calculate sum of weights
  const weightsTotal = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (key: keyof RiskDimensions, value: number) => {
    setWeights(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleThresholdChange = (key: keyof SecurityPolicy["thresholds"], value: number) => {
    setThresholds(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleRateLimitChange = (key: keyof SecurityPolicy["rateLimit"], value: number) => {
    setRateLimit(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const success = await onSavePolicy({
      weights,
      thresholds,
      rateLimit
    });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainResult(null);
    try {
      const data = await onRetrainEngine();
      setRetrainResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetraining(false);
    }
  };

  const applyRecommendedWeights = () => {
    if (retrainResult?.recommendedWeights) {
      setWeights({ ...retrainResult.recommendedWeights });
      setRetrainResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Retrain Loop Banner */}
      <div className="bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden shadow-xs">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-zinc-800">
            <motion.div
              animate={{
                y: [0, -3, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-zinc-900"
            >
              <Shield className="w-5 h-5" />
            </motion.div>
            <h3 className="font-extrabold text-sm font-display text-zinc-900">API-VORA Anomaly Retraining Loop</h3>
          </div>
          <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
            Run an in-memory Isolation Forest recalibration on current traffic logs to adjust risk weights. Reduces false positives and tightens boundary heuristics automatically.
          </p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={isRetraining}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white rounded-xl text-xs font-semibold cursor-pointer transition disabled:opacity-50 z-10 shrink-0 shadow-sm"
        >
          {isRetraining ? "Retraining Engine..." : "Retrain Anomaly Model"}
        </button>
      </div>

      {/* Retrain Recommendations Overlay */}
      {retrainResult && (
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="w-5 h-5 animate-bounce text-emerald-600" />
            <h4 className="font-bold text-sm font-display">Recalibration Tuning Model Available</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1 shadow-xs">
              <p className="text-[10px] text-zinc-400 font-bold">EVALUATED RECORDS</p>
              <p className="text-lg font-extrabold text-zinc-900">{retrainResult.evaluatedRecords} Requests</p>
            </div>
            <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1 shadow-xs">
              <p className="text-[10px] text-zinc-400 font-bold">FALSE POSITIVE MITIGATION</p>
              <p className="text-lg font-extrabold text-emerald-700">{retrainResult.fprReduction}</p>
            </div>
            <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1 shadow-xs">
              <p className="text-[10px] text-zinc-400 font-bold">RESULT STATUS</p>
              <p className="text-lg font-extrabold text-zinc-900">Converged Successfully</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-emerald-100 pt-4">
            <p className="text-xs text-zinc-600 leading-normal max-w-xl font-sans">
              Model advises adjusting weight vectors (Authentication, Payload inspection, Device heuristics) to better isolate bot patterns from legitimate client browsers.
            </p>
            <button
              onClick={applyRecommendedWeights}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-xs self-start sm:self-auto shrink-0"
            >
              Apply Recommended Ratios
            </button>
          </div>
        </div>
      )}

      {/* Main Configurations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Decision Weights Slider */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 p-5 rounded-2xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-zinc-900 font-display">Dimension Risk Weights</h4>
              <p className="text-xs text-zinc-500">Assign weights to threat vector dimensions. Composite threat score utilizes these ratios.</p>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="text-[9px] text-zinc-400 uppercase font-bold">Total Weight</p>
              <p className={`font-extrabold ${weightsTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {weightsTotal}%
              </p>
            </div>
          </div>

          {weightsTotal !== 100 && (
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2 text-amber-800 text-[10.5px]">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-sans leading-relaxed">
                Weights total {weightsTotal}%. It is advised to balance ratios to exactly 100% for proper linear SHAP metric normalization, though the system will automatically auto-normalize during scoring.
              </span>
            </div>
          )}

          <div className="space-y-4">
            {/* 1. User Behavior Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">User Behavior Anomaly</span>
                <span className="text-zinc-900 font-bold">{weights.userBehavior}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.userBehavior}
                onChange={(e) => handleWeightChange("userBehavior", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 2. Authentication Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">Authentication Integrity</span>
                <span className="text-zinc-900 font-bold">{weights.authentication}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.authentication}
                onChange={(e) => handleWeightChange("authentication", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 3. Request Pattern Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">Request Endpoint Pattern</span>
                <span className="text-zinc-900 font-bold">{weights.requestPattern}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.requestPattern}
                onChange={(e) => handleWeightChange("requestPattern", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 4. Payload Content Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">Payload Content Inspection</span>
                <span className="text-zinc-900 font-bold">{weights.payloadContent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.payloadContent}
                onChange={(e) => handleWeightChange("payloadContent", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 5. IP Location Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">IP Geo Threat Intel</span>
                <span className="text-zinc-900 font-bold">{weights.ipLocation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.ipLocation}
                onChange={(e) => handleWeightChange("ipLocation", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 6. Device Context Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">Device Client Fingerprint</span>
                <span className="text-zinc-900 font-bold">{weights.deviceContext}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.deviceContext}
                onChange={(e) => handleWeightChange("deviceContext", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 7. Threat Intelligence Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-700 font-semibold">Real-Time Threat Intelligence Feed</span>
                <span className="text-zinc-900 font-bold">{weights.threatIntelligence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.threatIntelligence}
                onChange={(e) => handleWeightChange("threatIntelligence", parseInt(e.target.value))}
                className="w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Decision Thresholds and Rate Limiting */}
        <div className="lg:col-span-5 space-y-6">
          {/* Decision Limits */}
          <div className="bg-white border border-zinc-200 p-5 rounded-2xl space-y-4 shadow-xs">
            <div>
              <h4 className="font-extrabold text-sm text-zinc-900 font-display">Decision Score Limits</h4>
              <p className="text-xs text-zinc-500">Define sliding score borders for router actions (0-100).</p>
            </div>

            <div className="space-y-4">
              {/* Allow Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-600 font-semibold">Allow Threshold Limit</span>
                  <span className="text-zinc-900 font-extrabold">≤ {thresholds.allowMax}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={thresholds.allowMax}
                  onChange={(e) => handleThresholdChange("allowMax", parseInt(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-zinc-400 font-sans">Scores below this value pass directly to routing.</p>
              </div>

              {/* Challenge Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-600 font-semibold">Challenge Threshold Limit</span>
                  <span className="text-zinc-900 font-extrabold">≤ {thresholds.challengeMax}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="75"
                  value={thresholds.challengeMax}
                  onChange={(e) => handleThresholdChange("challengeMax", parseInt(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-zinc-400 font-sans">Scores below this value receive multi-factor CAPTCHA validation.</p>
              </div>

              {/* Throttle Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-blue-600 font-semibold">Throttling Limit</span>
                  <span className="text-zinc-900 font-extrabold">≤ {thresholds.throttleMax}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="90"
                  value={thresholds.throttleMax}
                  onChange={(e) => handleThresholdChange("throttleMax", parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-zinc-400 font-sans">Scores below this value are aggressively rate limited.</p>
              </div>
            </div>
          </div>

          {/* Redis Token Bucket Limit */}
          <div className="bg-white border border-zinc-200 p-5 rounded-2xl space-y-4 shadow-xs">
            <div>
              <h4 className="font-extrabold text-sm text-zinc-900 font-display">Token Bucket Rate Limiting</h4>
              <p className="text-xs text-zinc-500">Configure sliding window params (simulated Redis cluster).</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">Max Bucket Size</label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={rateLimit.maxBucketSize}
                  onChange={(e) => handleRateLimitChange("maxBucketSize", parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono shadow-xs"
                />
                <p className="text-[9px] text-zinc-400 mt-1 font-sans leading-relaxed">Max requests burst allowable.</p>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1 font-bold">Refill Rate (tokens/min)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rateLimit.refillRate}
                  onChange={(e) => handleRateLimitChange("refillRate", parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-250 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono shadow-xs"
                />
                <p className="text-[9px] text-zinc-400 mt-1 font-sans leading-relaxed">Token replenish frequency.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 border-t border-zinc-200 pt-5">
        {saveSuccess && (
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Security configurations synced to Gateway successfully!
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shadow-sm"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>{isSaving ? "Syncing Config..." : "Commit Security Policy Changes"}</span>
        </button>
      </div>
    </div>
  );
}
