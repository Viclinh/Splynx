import React, { useEffect, useRef, useState } from "react";
import { Zap, PanelLeft, PanelRight } from "lucide-react";
import Header from "./components/Header";
import ConversationHistory from "./components/ConversationHistory";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import SPLEditor from "./components/SPLEditor";
import AIInsightsPanel from "./components/AIInsightsPanel";
import { useChat } from "./hooks/useChat";
import { getHealth } from "./services/api";
import { QueryMode } from "./services/api";

const DEMO_SUGGESTIONS = [
  { label: "🔐 Failed Logins", query: "Find failed login attempts in the last 24 hours", mode: "generate" as QueryMode },
  { label: "🌐 Top Attack IPs", query: "Find the top 10 IP addresses with failed authentication attempts", mode: "generate" as QueryMode },
  { label: "⚡ HTTP Errors", query: "Show HTTP 500 errors grouped by endpoint", mode: "generate" as QueryMode },
  { label: "🛡 Brute Force", query: "Detect brute force attacks", mode: "security" as QueryMode },
  { label: "👤 Suspicious Logins", query: "Investigate suspicious login activity from external IP addresses", mode: "security" as QueryMode },
];

export default function App() {
  const { messages, isLoading, activeMessage, setActiveMessage, sendMessage, executeSearch, clearHistory } = useChat();
  const [splunkConnected, setSplunkConnected] = useState(false);
  const [aiEngine, setAiEngine] = useState("Template Engine (Demo Mode)");
  const [activeSpl, setActiveSpl] = useState("");
  const [isSearchRunning, setIsSearchRunning] = useState<string | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getHealth().then((h) => {
      setSplunkConnected(h.splunk_connected);
      setAiEngine(h.ai_engine || "Template Engine (Demo Mode)");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync active SPL when activeMessage changes
  useEffect(() => {
    if (activeMessage?.aiResponse?.spl_result?.spl) {
      setActiveSpl(activeMessage.aiResponse.spl_result.spl);
    }
  }, [activeMessage]);

  const handleRunSearch = async (spl: string, msgId: string) => {
    setIsSearchRunning(msgId);
    try {
      await executeSearch(spl, msgId);
    } catch (e: any) {
      alert(`Search error: ${e.message}`);
    } finally {
      setIsSearchRunning(null);
    }
  };

  const handleSelectMessage = (msg: any) => {
    setActiveMessage(msg);
    if (msg.aiResponse?.spl_result?.spl) setActiveSpl(msg.aiResponse.spl_result.spl);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-splunk-darker text-slate-200 overflow-hidden">
      <Header splunkConnected={splunkConnected} aiEngine={aiEngine} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: History */}
        {showLeft && (
          <ConversationHistory
            messages={messages}
            activeMessage={activeMessage}
            onSelect={handleSelectMessage}
            onClear={clearHistory}
          />
        )}

        {/* Center: Chat + Editor */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Toggle buttons */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-splunk-border bg-splunk-card">
            <button onClick={() => setShowLeft(!showLeft)} className="text-slate-500 hover:text-splunk-green transition-colors">
              <PanelLeft size={14} />
            </button>
            <div className="flex-1" />
            <button onClick={() => setShowRight(!showRight)} className="text-slate-500 hover:text-splunk-green transition-colors">
              <PanelRight size={14} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Chat */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                  <WelcomeScreen onSuggestion={(q, m) => sendMessage(q, m)} />
                ) : (
                  <div className="py-4">
                    {messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        onRunSearch={handleRunSearch}
                        isSearching={isSearchRunning === msg.id}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <ChatInput onSend={sendMessage} isLoading={isLoading} activeSpl={activeSpl} />
            </div>

            {/* SPL Editor (resizable panel) */}
            {activeSpl && (
              <div className="w-96 border-l border-splunk-border flex flex-col">
                <SPLEditor
                  spl={activeSpl}
                  onSplChange={setActiveSpl}
                  onRun={(spl) => {
                    const msgId = activeMessage?.id || messages[messages.length - 1]?.id;
                    if (msgId) handleRunSearch(spl, msgId);
                  }}
                  isRunning={!!isSearchRunning}
                  originalSpl={activeMessage?.aiResponse?.spl_result?.spl}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Insights */}
        {showRight && <AIInsightsPanel activeMessage={activeMessage} />}
      </div>
    </div>
  );
}

function WelcomeScreen({ onSuggestion }: { onSuggestion: (q: string, m: QueryMode) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <div className="w-16 h-16 rounded-2xl bg-splunk-green flex items-center justify-center mb-6 glow-green">
        <Zap size={32} className="text-black" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Splunk AI Query Copilot</h2>
      <p className="text-slate-400 text-center max-w-md mb-8">
        Your AI-powered assistant for generating, explaining, and optimizing SPL queries. Ask anything in natural language.
      </p>

      <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
        {DEMO_SUGGESTIONS.map(({ label, query, mode }) => (
          <button
            key={label}
            onClick={() => onSuggestion(query, mode)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-splunk-card border border-splunk-border hover:border-splunk-green/50 hover:bg-splunk-border transition-all text-left group"
          >
            <span className="text-sm">{label}</span>
            <span className="text-xs text-slate-500 flex-1">{query}</span>
            <span className="text-splunk-green opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-6 text-xs text-slate-600">
        {["SPL Generation", "Query Explanation", "Performance Optimization", "Security Investigation"].map((f) => (
          <span key={f} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-splunk-green" />{f}
          </span>
        ))}
      </div>
    </div>
  );
}
