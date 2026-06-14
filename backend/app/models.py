from pydantic import BaseModel
from typing import Optional, List, Any
from enum import Enum


class QueryMode(str, Enum):
    generate = "generate"
    explain = "explain"
    optimize = "optimize"
    debug = "debug"
    security = "security"


class AIRequest(BaseModel):
    message: str
    mode: QueryMode = QueryMode.generate
    spl: Optional[str] = None
    error_message: Optional[str] = None
    conversation_history: Optional[List[dict]] = []


class SPLResult(BaseModel):
    spl: str
    explanation: str
    confidence: float
    recommendations: List[str] = []
    optimized_spl: Optional[str] = None
    security_context: Optional[dict] = None
    ai_engine: Optional[str] = None  # which AI engine handled the request


class SearchRequest(BaseModel):
    spl: str
    earliest_time: str = "-24h"
    latest_time: str = "now"
    max_results: int = 100


class SearchResponse(BaseModel):
    results: List[dict]
    field_names: List[str]
    total_count: int
    search_id: str
    status: str


class AIResponse(BaseModel):
    spl_result: Optional[SPLResult] = None
    message: str
    mode: QueryMode
    search_results: Optional[SearchResponse] = None
    threat_summary: Optional[dict] = None
