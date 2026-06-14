import React from "react";
import { TrendingUp, Shield, Lightbulb, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { Message } from "../hooks/useChat";

interface Props {
  activeMessage: Message | null;
}

export default function AIInsightsPanel({ activeMessage }: Props) {
  const result = activeMessage?.aiResponse?.spl_result;
  const threat = activeMessage?.aiResponse?.threat_summary;

  if (!result) {
    return (
      <aside className="w-72 bg-splunk-card border-l border-splunk-border flex flex-col">
        <div className="px-4 py-3 border-b border-splunk-border">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-splunk-green" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">AI Insights</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-splunk-border flex items-center justify-center mb-3">
            <Activity size={20} className="text-slate-600" />
          </div>
          <p className="text-xs text-slate-500">AI insights will appear here after you generate a query</p>
        </div>

        <div className="p-4 border-t border-splunk-border">
          <p className="text-xs font-medium text-slate-400 mb-2">SPL Quick Reference</p>
          {[
            { cmd: "stats count by X", desc: "Aggregate by field" },
            { cmd: "| sort -count", desc: "Sort descending" },
            { cmd: "| head 10", desc: "Limit results" },
            { cmd: "| eval X=Y", desc: "Create/modify field" },
            { cmd: "| timechart", desc: "Time series chart" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex justify-between items-center py-1.5 border-b border-splunk-border/30 last:border-0">
              <code className="text-xs text-splunk-green font-mono">{cmd}</code>
              <span className="text-xs text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const confidenceColor = result.confidence >= 0.85 ? "text-splunk-green" : result.confidence >= 0.7 ? "text-yellow-400" : "text-red-400";
  const confidenceBg = result.confidence >= 0.85 ? "bg-splunk-green" : result.confidence >= 0.7 ? "bg-yellow-400" : "bg-red-400";

  return (
    <aside className="w-72 bg-splunk-card border-l border-splunk-border flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-splunk-border">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-splunk-green" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">AI Insights</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Confidence Score */}
        <div className="bg-splunk-darker rounded-xl p-3 border border-splunk-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Confidence Score</span>
            <span className={`text-sm font-bold ${confidenceColor}`}>{Math.round(result.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-splunk-border rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${confidenceBg} transition-all`} style={{ width: `${result.confidence * 100}%` }} />
          </div>
        </div>

        {/* Performance Tips */}
        {result.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-yellow-400" />
              <span className="text-xs font-medium text-slate-300">Performance Tips</span>
            </div>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2 bg-splunk-darker rounded-lg p-2.5 border border-splunk-border">
                  <Lightbulb size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-400 leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Context */}
        {result.security_context && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={13} className="text-purple-400" />
              <span className="text-xs font-medium text-slate-300">Security Context</span>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Severity</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  result.security_context.severity === "HIGH" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {result.security_context.severity}
                </span>
              </div>
              {result.security_context.mitre_tactic && (
                <div>
                  <span className="text-xs text-slate-400">MITRE ATT&CK</span>
                  <p className="text-xs text-purple-300 mt-0.5">{result.security_context.mitre_tactic}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Threat Summary */}
        {threat && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-xs font-medium text-slate-300">Recommended Actions</span>
            </div>
            <ul className="space-y-1.5">
              {threat.recommended_actions.map((action, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <CheckCircle size={11} className="text-splunk-green flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-400">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Query Mode Badge */}
        <div className="bg-splunk-darker rounded-xl p-3 border border-splunk-border">
          <p className="text-xs text-slate-500 mb-2">Query Mode</p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-splunk-green/10 border border-splunk-green/30 text-splunk-green font-medium capitalize">
              {activeMessage?.mode}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
