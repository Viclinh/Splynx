import React from "react";
import { Zap, Shield, Settings, HelpCircle } from "lucide-react";

interface Props {
  splunkConnected: boolean;
  aiEngine: string;
}

export default function Header({ splunkConnected, aiEngine }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-splunk-border bg-splunk-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-splunk-green flex items-center justify-center">
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Splynx</h1>
            <p className="text-xs text-splunk-green leading-none mt-0.5">Splunk AI Query Copilot</p>
          </div>
        </div>
        <div className="h-5 w-px bg-splunk-border mx-1" />
        <span className="text-xs text-slate-400">AI: {aiEngine}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${
            aiEngine.includes("AITK") ? "bg-splunk-green animate-pulse" :
            aiEngine.includes("Bedrock") ? "bg-blue-400 animate-pulse" :
            "bg-yellow-500"
          }`} />
          <span className="text-xs text-slate-400">
            {splunkConnected ? "Splunk Connected" : "Demo Mode"}
          </span>
        </div>
        <Shield size={16} className="text-slate-400 hover:text-splunk-green cursor-pointer" />
        <Settings size={16} className="text-slate-400 hover:text-splunk-green cursor-pointer" />
        <HelpCircle size={16} className="text-slate-400 hover:text-splunk-green cursor-pointer" />
      </div>
    </header>
  );
}
