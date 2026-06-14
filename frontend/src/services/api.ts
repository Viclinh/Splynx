import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  timeout: 60000,
});

export type QueryMode = "generate" | "explain" | "optimize" | "debug" | "security";

export interface AIRequest {
  message: string;
  mode: QueryMode;
  spl?: string;
  error_message?: string;
  conversation_history?: { role: string; content: string }[];
}

export interface SPLResult {
  spl: string;
  explanation: string;
  confidence: number;
  recommendations: string[];
  optimized_spl?: string;
  security_context?: { severity: string; mitre_tactic?: string };
  ai_engine?: string;
}

export interface AIResponse {
  spl_result: SPLResult;
  message: string;
  mode: QueryMode;
  threat_summary?: {
    severity: string;
    mitre_tactic: string;
    recommended_actions: string[];
  };
}

export interface SearchResponse {
  results: Record<string, string>[];
  field_names: string[];
  total_count: number;
  search_id: string;
  status: string;
}

export const queryAI = (req: AIRequest) =>
  api.post<AIResponse>("/api/query", req).then((r) => r.data);

export const runSearch = (spl: string, earliest = "-24h", latest = "now") =>
  api.post<SearchResponse>("/api/search", { spl, earliest_time: earliest, latest_time: latest, max_results: 100 }).then((r) => r.data);

export const getHealth = () =>
  api.get<{ status: string; splunk_connected: boolean; ai_engine: string; aitk_configured: boolean; bedrock_configured: boolean }>("/api/health").then((r) => r.data);

export const getIndexes = () =>
  api.get<{ indexes: string[]; demo?: boolean }>("/api/indexes").then((r) => r.data);
