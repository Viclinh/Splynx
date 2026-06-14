import { useState, useCallback } from "react";
import { queryAI, runSearch, AIResponse, SearchResponse, QueryMode } from "../services/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: QueryMode;
  aiResponse?: AIResponse;
  searchResults?: SearchResponse;
  timestamp: Date;
  loading?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    const full: Message = { ...msg, id: Date.now().toString(), timestamp: new Date() };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  const sendMessage = useCallback(
    async (text: string, mode: QueryMode, spl?: string, errorMsg?: string) => {
      addMessage({ role: "user", content: text, mode });
      const loadingMsg = addMessage({ role: "assistant", content: "", mode, loading: true });

      setIsLoading(true);
      try {
        const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
        const response = await queryAI({ message: text, mode, spl, error_message: errorMsg, conversation_history: history });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, loading: false, content: response.message, aiResponse: response }
              : m
          )
        );

        const updated = { ...loadingMsg, loading: false, content: response.message, aiResponse: response };
        setActiveMessage(updated);
        return response;
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, loading: false, content: `Error: ${err.message || "Request failed"}` }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addMessage]
  );

  const executeSearch = useCallback(async (spl: string, msgId: string) => {
    try {
      const results = await runSearch(spl);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, searchResults: results } : m))
      );
      return results;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || err.message);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setActiveMessage(null);
  }, []);

  return { messages, isLoading, activeMessage, setActiveMessage, sendMessage, executeSearch, clearHistory };
}
