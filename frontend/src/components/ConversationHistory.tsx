import React from "react";
import { MessageSquare, Trash2, Clock } from "lucide-react";
import { Message } from "../hooks/useChat";
import { QueryMode } from "../services/api";

const MODE_COLORS: Record<QueryMode, string> = {
  generate: "text-splunk-green",
  explain: "text-blue-400",
  optimize: "text-yellow-400",
  debug: "text-red-400",
  security: "text-purple-400",
};

const MODE_LABELS: Record<QueryMode, string> = {
  generate: "Generate",
  explain: "Explain",
  optimize: "Optimize",
  debug: "Debug",
  security: "Security",
};

interface Props {
  messages: Message[];
  activeMessage: Message | null;
  onSelect: (msg: Message) => void;
  onClear: () => void;
}

export default function ConversationHistory({ messages, activeMessage, onSelect, onClear }: Props) {
  const userMessages = messages.filter((m) => m.role === "user");

  return (
    <aside className="flex flex-col h-full bg-splunk-card border-r border-splunk-border w-64">
      <div className="flex items-center justify-between px-4 py-3 border-b border-splunk-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-splunk-green" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">History</span>
        </div>
        {userMessages.length > 0 && (
          <button onClick={onClear} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {userMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={24} className="text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No history yet</p>
            <p className="text-xs text-slate-600 mt-1">Start asking questions</p>
          </div>
        ) : (
          userMessages.map((msg) => {
            const assistantMsg = messages.find(
              (m) => m.role === "assistant" && messages.indexOf(m) > messages.indexOf(msg)
            );
            const isActive = activeMessage?.id === assistantMsg?.id;
            return (
              <button
                key={msg.id}
                onClick={() => assistantMsg && onSelect(assistantMsg)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  isActive ? "bg-splunk-border border border-splunk-green/30" : "hover:bg-splunk-border/50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-medium ${MODE_COLORS[msg.mode]}`}>
                    [{MODE_LABELS[msg.mode]}]
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate leading-relaxed">{msg.content}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={10} className="text-slate-600" />
                  <span className="text-xs text-slate-600">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-splunk-border">
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-500">Quick starts:</p>
          {["Failed logins last 24h", "Top 10 error sources", "Brute force detection"].map((q) => (
            <p key={q} className="text-slate-600 hover:text-splunk-green cursor-pointer truncate">
              • {q}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
