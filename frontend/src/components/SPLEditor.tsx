import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Play, Loader2, RotateCcw } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  spl: string;
  onSplChange: (spl: string) => void;
  onRun: (spl: string) => void;
  isRunning?: boolean;
  originalSpl?: string;
}

export default function SPLEditor({ spl, onSplChange, onRun, isRunning, originalSpl }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(spl);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(spl); }, [spl]);

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyEdit = () => {
    onSplChange(draft);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-splunk-darker">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-splunk-border bg-splunk-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-splunk-green/70" />
          </div>
          <span className="text-xs text-slate-500 font-mono ml-1">query.spl</span>
        </div>
        <div className="flex items-center gap-2">
          {originalSpl && draft !== originalSpl && (
            <button onClick={() => { setDraft(originalSpl); onSplChange(originalSpl); }} className="text-slate-500 hover:text-yellow-400 transition-colors" title="Reset">
              <RotateCcw size={13} />
            </button>
          )}
          <button onClick={copy} className="text-slate-500 hover:text-splunk-green transition-colors">
            {copied ? <Check size={13} className="text-splunk-green" /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => (isEditing ? applyEdit() : setIsEditing(true))}
            className="text-xs px-2.5 py-1 rounded-md border border-splunk-border text-slate-400 hover:text-splunk-green hover:border-splunk-green transition-colors"
          >
            {isEditing ? "Apply" : "Edit"}
          </button>
          <button
            onClick={() => onRun(draft)}
            disabled={isRunning || !draft.trim()}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md bg-splunk-green text-black font-semibold hover:bg-green-400 disabled:opacity-40 transition-colors"
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run Query
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-full bg-[#0d1117] text-slate-200 p-4 resize-none focus:outline-none spl-editor text-xs"
            spellCheck={false}
            autoFocus
          />
        ) : (
          <div onClick={() => setIsEditing(true)} className="cursor-text min-h-full">
            {draft ? (
              <SyntaxHighlighter
                language="bash"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: "16px", background: "#0d1117", minHeight: "100%", fontSize: "12.5px", lineHeight: "1.7" }}
              >
                {draft}
              </SyntaxHighlighter>
            ) : (
              <div className="p-4 text-slate-600 text-sm spl-editor">
                {`// Your SPL query will appear here\n// Generate a query using the chat interface`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
