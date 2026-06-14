import React, { useState } from "react";
import { Copy, Play, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message } from "../hooks/useChat";

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.85 ? "text-splunk-green" : c >= 0.7 ? "text-yellow-400" : "text-red-400";

interface Props {
  message: Message;
  onRunSearch: (spl: string, msgId: string) => void;
  isSearching?: boolean;
}

export default function ChatMessage({ message, onRunSearch, isSearching }: Props) {
  const [copied, setCopied] = useState(false);
  const [showRecs, setShowRecs] = useState(true);
  const spl = message.aiResponse?.spl_result?.spl;
  const result = message.aiResponse?.spl_result;

  const copy = async () => {
    if (spl) { await navigator.clipboard.writeText(spl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (message.loading) {
    return (
      <div className="flex gap-3 px-4 py-3 chat-message-enter">
        <div className="w-7 h-7 rounded-full bg-splunk-green flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-black">AI</span>
        </div>
        <div className="flex items-center gap-2 py-2">
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-splunk-green typing-dot" />)}
          </div>
          <span className="text-xs text-slate-500">Splunk AI is thinking...</span>
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    const modeLabel = message.mode.charAt(0).toUpperCase() + message.mode.slice(1);
    const modeColors: Record<string, string> = {
      generate: "bg-splunk-green/10 border-splunk-green/30 text-splunk-green",
      explain: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      optimize: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      debug: "bg-red-500/10 border-red-500/30 text-red-400",
      security: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    };
    return (
      <div className="flex gap-3 px-4 py-3 justify-end chat-message-enter">
        <div className="max-w-xl">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${modeColors[message.mode]}`}>{modeLabel}</span>
          </div>
          <div className="bg-splunk-border rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-200">
            {message.content}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-splunk-border flex items-center justify-center flex-shrink-0 mt-auto">
          <span className="text-xs text-slate-400">You</span>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 px-4 py-3 chat-message-enter">
      <div className="w-7 h-7 rounded-full bg-splunk-green flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-bold text-black">AI</span>
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* SPL Query Block */}
        {spl && (
          <div className="rounded-xl overflow-hidden border border-splunk-border">
            <div className="flex items-center justify-between px-3 py-2 bg-splunk-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-splunk-green" />
                <span className="text-xs font-mono text-slate-400">Generated SPL</span>
                {result && (
                  <span className={`text-xs font-medium ml-1 ${CONFIDENCE_COLOR(result.confidence)}`}>
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={copy} className="text-slate-400 hover:text-splunk-green transition-colors">
                  {copied ? <Check size={13} className="text-splunk-green" /> : <Copy size={13} />}
                </button>
                <button
                  onClick={() => onRunSearch(spl, message.id)}
                  disabled={isSearching}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-splunk-green text-black font-medium hover:bg-green-400 disabled:opacity-50 transition-colors"
                >
                  {isSearching ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  Run
                </button>
              </div>
            </div>
            <SyntaxHighlighter
              language="bash"
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: "12px 16px", background: "#0d1117", fontSize: "12px", lineHeight: "1.6" }}
            >
              {spl}
            </SyntaxHighlighter>
          </div>
        )}

        {/* Explanation */}
        {message.content && (
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {message.content.replace(/```[\s\S]*?```/g, "").trim()}
          </div>
        )}

        {/* Optimized SPL */}
        {result?.optimized_spl && (
          <div className="rounded-xl overflow-hidden border border-yellow-500/30">
            <div className="px-3 py-2 bg-yellow-500/10 text-xs text-yellow-400 font-medium">✨ Optimized Query</div>
            <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: "12px 16px", background: "#0d1117", fontSize: "12px" }}>
              {result.optimized_spl}
            </SyntaxHighlighter>
          </div>
        )}

        {/* Recommendations */}
        {result?.recommendations && result.recommendations.length > 0 && (
          <div className="rounded-xl border border-splunk-border overflow-hidden">
            <button
              onClick={() => setShowRecs(!showRecs)}
              className="w-full flex items-center justify-between px-3 py-2 bg-splunk-border/40 hover:bg-splunk-border/60 transition-colors"
            >
              <span className="text-xs font-medium text-slate-400">Recommendations</span>
              {showRecs ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
            </button>
            {showRecs && (
              <ul className="px-3 py-2 space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-splunk-green flex-shrink-0">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Threat Summary */}
        {message.aiResponse?.threat_summary && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
            <div className="px-3 py-2 bg-purple-500/15 flex items-center gap-2">
              <span className="text-purple-400 text-xs font-semibold">🛡 Threat Summary</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                message.aiResponse.threat_summary.severity === "HIGH" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {message.aiResponse.threat_summary.severity}
              </span>
            </div>
            <div className="px-3 py-2 space-y-2">
              <p className="text-xs text-slate-400">
                <span className="text-purple-400 font-medium">MITRE ATT&CK:</span> {message.aiResponse.threat_summary.mitre_tactic}
              </p>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Recommended Actions:</p>
                <ul className="space-y-1">
                  {message.aiResponse.threat_summary.recommended_actions.map((a, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-red-400 flex-shrink-0">•</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Preview */}
        {message.searchResults && <SearchResultsPreview results={message.searchResults} />}
      </div>
    </div>
  );
}

function SearchResultsPreview({ results }: { results: any }) {
  const [show, setShow] = useState(true);
  const fields = results.field_names.slice(0, 6);

  return (
    <div className="rounded-xl border border-splunk-border overflow-hidden">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-3 py-2 bg-splunk-border/40 hover:bg-splunk-border/60 transition-colors"
      >
        <span className="text-xs font-medium text-slate-400">
          Search Results <span className="text-splunk-green">({results.total_count} events)</span>
        </span>
        {show ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>
      {show && results.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-splunk-border/60">
                {fields.map((f: string) => <th key={f} className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap">{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.results.slice(0, 10).map((row: any, i: number) => (
                <tr key={i} className="border-t border-splunk-border/30 hover:bg-splunk-border/20">
                  {fields.map((f: string) => (
                    <td key={f} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-xs truncate">{row[f] || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {results.total_count > 10 && (
            <p className="text-xs text-slate-600 px-3 py-2">+ {results.total_count - 10} more results</p>
          )}
        </div>
      )}
    </div>
  );
}
