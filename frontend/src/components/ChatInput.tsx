import React, { useState, useRef, useEffect } from "react";
import { Send, Zap, FileText, TrendingUp, Bug, Shield, Loader2 } from "lucide-react";
import { QueryMode } from "../services/api";

const MODES: { mode: QueryMode; icon: React.ReactNode; label: string; color: string; placeholder: string }[] = [
  { mode: "generate", icon: <Zap size={14} />, label: "Generate", color: "text-splunk-green border-splunk-green", placeholder: "e.g. Find failed login attempts in the last 24 hours..." },
  { mode: "explain", icon: <FileText size={14} />, label: "Explain", color: "text-blue-400 border-blue-400", placeholder: "Paste a SPL query to explain..." },
  { mode: "optimize", icon: <TrendingUp size={14} />, label: "Optimize", color: "text-yellow-400 border-yellow-400", placeholder: "Paste a SPL query to optimize..." },
  { mode: "debug", icon: <Bug size={14} />, label: "Debug", color: "text-red-400 border-red-400", placeholder: "Describe your error or paste the failing query..." },
  { mode: "security", icon: <Shield size={14} />, label: "Security", color: "text-purple-400 border-purple-400", placeholder: "e.g. Investigate suspicious login activity from external IPs..." },
];

const SUGGESTIONS: Record<QueryMode, string[]> = {
  generate: ["Find failed login attempts in the last 24 hours", "Top 10 IPs with authentication failures", "HTTP 5xx errors by endpoint"],
  explain: ["index=web status>=500 | stats count by uri", "index=security | stats count by src_ip | sort -count", "index=main | timechart count by sourcetype"],
  optimize: ["index=* error | stats count", "index=main | eval x=1 | search x=1", "index=security | rex field=_raw \"user=(\\w+)\""],
  debug: ["stats command missing aggregation field", "rex: invalid regex pattern", "join: field not found"],
  security: ["Investigate suspicious login activity", "Detect brute force attacks", "Find privilege escalation events"],
};

interface Props {
  onSend: (text: string, mode: QueryMode, spl?: string, errorMsg?: string) => void;
  isLoading: boolean;
  activeSpl?: string;
}

export default function ChatInput({ onSend, isLoading, activeSpl }: Props) {
  const [mode, setMode] = useState<QueryMode>("generate");
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentMode = MODES.find((m) => m.mode === mode)!;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    const needsSpl = ["explain", "optimize"].includes(mode);
    const spl = needsSpl ? (activeSpl || input) : undefined;
    const msg = needsSpl && activeSpl ? `${mode} this query` : input;
    onSend(msg, mode, spl);
    setInput("");
    setShowSuggestions(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  return (
    <div className="border-t border-splunk-border bg-splunk-darker p-4">
      {/* Mode Tabs */}
      <div className="flex gap-1 mb-3">
        {MODES.map(({ mode: m, icon, label, color }) => (
          <button
            key={m}
            onClick={() => { setMode(m); setInput(""); setShowSuggestions(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              mode === m ? `${color} bg-splunk-border` : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      {showSuggestions && input.length < 3 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS[mode].map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); setShowSuggestions(false); textareaRef.current?.focus(); }}
              className="text-xs px-2.5 py-1 rounded-full bg-splunk-border text-slate-300 hover:text-splunk-green hover:border-splunk-green border border-splunk-border transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(e.target.value.length === 0); }}
            onFocus={() => setShowSuggestions(input.length === 0)}
            onKeyDown={handleKey}
            placeholder={currentMode.placeholder}
            rows={1}
            className="w-full bg-splunk-card border border-splunk-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-splunk-green/50 transition-colors spl-editor"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="h-11 w-11 rounded-xl bg-splunk-green flex items-center justify-center hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          {isLoading ? <Loader2 size={18} className="text-black animate-spin" /> : <Send size={18} className="text-black" />}
        </button>
      </div>
      <p className="text-xs text-slate-600 mt-2">⏎ Send · Shift+⏎ Newline</p>
    </div>
  );
}
