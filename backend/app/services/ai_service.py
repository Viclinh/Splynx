"""
AI Service — Splynx

AI engine priority:
  1. Splunk AI Toolkit (AITK) — splunk-openai SDK, OpenAI-compatible endpoint
     hosted inside Splunk (splunk_aitk_url + splunk_token required)
  2. Amazon Bedrock (Claude) — fallback if AITK not configured
  3. Smart Template Engine — fully offline fallback, no credentials needed
"""

import re
from typing import Optional
from app.config import get_settings
from app.models import QueryMode, SPLResult

settings = get_settings()

SPL_COMMANDS = {
    "stats": "Aggregates events using statistical functions (count, sum, avg, etc.)",
    "eval": "Creates or modifies fields using expressions",
    "where": "Filters results using Boolean expressions",
    "table": "Returns results in tabular format with specified fields",
    "sort": "Sorts results by field values",
    "head": "Returns the first N results",
    "tail": "Returns the last N results",
    "rex": "Extracts fields using regex",
    "timechart": "Creates a time-series chart aggregation",
    "dedup": "Removes duplicate events",
    "join": "Combines results from two searches",
    "lookup": "Enriches events with data from a lookup table",
    "transaction": "Groups events into transactions",
    "fields": "Includes or excludes specific fields",
    "rename": "Renames fields",
    "search": "Filters events by keyword or field-value pairs",
    "iplocation": "Adds geographic data to IP address fields",
    "geostats": "Generates statistics for geographic data visualization",
}

SECURITY_TEMPLATES = {
    "brute_force": {
        "spl": "index=security (action=failure OR action=failed)\n| stats count by src_ip, user\n| where count > 10\n| sort -count",
        "description": "Detects brute-force login attempts by counting failures per source IP",
    },
    "suspicious_login": {
        "spl": "index=security action=success\n| stats count by user, src_ip\n| join user [search index=security action=failure | stats count as fail_count by user | where fail_count > 5]\n| table user, src_ip, count, fail_count",
        "description": "Finds successful logins that were preceded by multiple failures",
    },
    "malware": {
        "spl": 'index=endpoint (process_name=* OR file_path=*)\n| eval risk=if(match(process_name,"(cmd|powershell|wscript|cscript)") AND parent_process!="explorer.exe","HIGH","LOW")\n| where risk="HIGH"\n| stats count by host, process_name, parent_process, user',
        "description": "Identifies suspicious process executions indicative of malware activity",
    },
    "privilege_escalation": {
        "spl": 'index=windows EventCode IN (4672, 4673, 4674)\n| stats count by user, host, EventCode\n| where count > 5\n| eval event_type=case(EventCode=4672,"Special privileges assigned",EventCode=4673,"Privileged service called",true(),"Privileged object operation")',
        "description": "Detects privilege escalation events using Windows security event codes",
    },
    "abnormal_behavior": {
        "spl": "index=security\n| stats count by user, src_ip\n| eventstats avg(count) as avg_count, stdev(count) as stdev_count by user\n| eval z_score=(count-avg_count)/stdev_count\n| where z_score > 3\n| table user, src_ip, count, z_score",
        "description": "Uses statistical analysis to detect abnormal user behavior patterns",
    },
}

# ── Prompt builder ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are Splynx, a Splunk AI Query Copilot expert in SPL (Search Processing Language). "
    "Help users generate, explain, optimize, and debug SPL queries. "
    "Always wrap SPL queries in ```spl code blocks. "
    "Be concise. Include performance recommendations when relevant."
)


def _build_messages(mode: QueryMode, message: str, spl: Optional[str],
                    error_message: Optional[str], history: list) -> list:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for h in (history or [])[-4:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

    if mode == QueryMode.generate:
        content = f"Generate an optimized SPL query for: {message}\nProvide: 1) SPL query, 2) explanation of each command, 3) performance tips."
    elif mode == QueryMode.explain:
        content = f"Explain this SPL query in detail:\n```spl\n{spl}\n```\nCover: indexes, filters, commands used, and expected output."
    elif mode == QueryMode.optimize:
        content = f"Optimize this SPL query:\n```spl\n{spl}\n```\nIdentify performance issues and provide an optimized version."
    elif mode == QueryMode.debug:
        content = f"Debug this SPL query:\n```spl\n{spl}\n```\nError: {error_message}\nExplain the problem and provide a fixed query."
    elif mode == QueryMode.security:
        content = f"Generate a Splunk security investigation SPL query for: {message}\nInclude: detection SPL, investigation steps, risk explanation, and recommended response actions."
    else:
        content = message

    messages.append({"role": "user", "content": content})
    return messages


# ── AITK (Splunk AI Toolkit) ───────────────────────────────────────────────────

async def _call_aitk(messages: list) -> str:
    """
    Splunk AI Toolkit — uses the splunk-openai SDK which wraps Splunk's
    OpenAI-compatible hosted model endpoint running inside your Splunk deployment.

    Requires:
      SPLUNK_AITK_URL  = https://<splunk-host>:8089/services/openai/v1
      SPLUNK_TOKEN     = your Splunk auth token
      SPLUNK_AITK_MODEL = llama3-sqlcoder-8b  (or whichever model is hosted)
    """
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        base_url=settings.splunk_aitk_url,
        api_key=settings.splunk_token,   # Splunk token used as the API key
    )

    response = await client.chat.completions.create(
        model=settings.splunk_aitk_model,
        messages=messages,
        max_tokens=2048,
        temperature=0.2,
    )
    return response.choices[0].message.content


# ── Amazon Bedrock (Claude) ────────────────────────────────────────────────────

async def _call_bedrock(messages: list) -> str:
    """Amazon Bedrock Claude — secondary AI engine"""
    import boto3, json

    # Convert OpenAI-style messages to Bedrock format
    system_text = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]

    client = boto3.client(
        "bedrock-runtime",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
        "system": system_text,
        "messages": user_messages,
    }
    resp = client.invoke_model(modelId=settings.bedrock_model_id, body=json.dumps(body))
    return json.loads(resp["body"].read())["content"][0]["text"]


# ── Response parser ────────────────────────────────────────────────────────────

def _extract_spl(text: str) -> Optional[str]:
    match = re.search(r"```(?:spl|splunk)?\s*([\s\S]+?)```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    lines, spl_lines, in_spl = text.split("\n"), [], False
    for line in lines:
        s = line.strip()
        if re.match(r"^(index=|sourcetype=|source=|\|)", s):
            in_spl = True
        if in_spl:
            if not s and spl_lines:
                break
            spl_lines.append(s)
    return "\n".join(spl_lines) if spl_lines else None


def _parse_response(text: str, mode: QueryMode) -> SPLResult:
    spl = _extract_spl(text) or ""
    recs = [r.strip() for r in re.findall(r"(?:^|\n)[•\-\*\d]+\.?\s+(.+)", text) if len(r.strip()) > 10][:5]
    optimized_spl = None
    if mode == QueryMode.optimize:
        m = re.search(r"(?:optimized|improved|recommended)[^\n]*\n([\s\S]+?)(?:\n\n|$)", text, re.IGNORECASE)
        if m:
            optimized_spl = _extract_spl(m.group(1))
    return SPLResult(spl=spl, explanation=text, confidence=0.88, recommendations=recs, optimized_spl=optimized_spl)


# ── MITRE helper ───────────────────────────────────────────────────────────────

def _infer_mitre(message: str) -> str:
    tactics = {
        "brute": "TA0006 - Credential Access",
        "login": "TA0001 - Initial Access",
        "privilege": "TA0004 - Privilege Escalation",
        "malware": "TA0002 - Execution",
        "lateral": "TA0008 - Lateral Movement",
        "exfil": "TA0010 - Exfiltration",
    }
    for kw, tactic in tactics.items():
        if kw in message.lower():
            return tactic
    return "TA0001 - Initial Access"


# ── Main entry point ───────────────────────────────────────────────────────────

async def process_ai_request(mode: QueryMode, message: str, spl: Optional[str] = None,
                              error_message: Optional[str] = None, history: list = []) -> SPLResult:
    """
    AI priority chain:
      1. Splunk AI Toolkit (AITK) via splunk-openai SDK
      2. Amazon Bedrock (Claude)
      3. Smart template engine (offline fallback)
    """
    # Security template shortcuts (instant, no AI call needed)
    if mode == QueryMode.security:
        for key, tmpl in SECURITY_TEMPLATES.items():
            if key.replace("_", " ") in message.lower() or key in message.lower():
                return SPLResult(
                    spl=tmpl["spl"],
                    explanation=tmpl["description"],
                    confidence=0.92,
                    recommendations=["Adjust time range with earliest/latest", "Add index filter for better performance"],
                    security_context={"template": key, "severity": "HIGH", "mitre_tactic": _infer_mitre(message)},
                )

    messages = _build_messages(mode, message, spl, error_message, history)

    # 1. Try Splunk AI Toolkit (AITK)
    if settings.aitk_configured:
        try:
            text = await _call_aitk(messages)
            result = _parse_response(text, mode)
            result.ai_engine = "Splunk AI Toolkit (AITK)"
            if mode == QueryMode.security:
                result.security_context = {
                    "severity": "HIGH" if any(w in message.lower() for w in ["brute", "attack", "malware", "escalat"]) else "MEDIUM",
                    "mitre_tactic": _infer_mitre(message),
                }
            return result
        except Exception as e:
            print(f"[AITK] Error: {e} — trying Bedrock")

    # 2. Try Amazon Bedrock
    if settings.bedrock_configured:
        try:
            text = await _call_bedrock(messages)
            result = _parse_response(text, mode)
            result.ai_engine = "Amazon Bedrock (Claude)"
            if mode == QueryMode.security:
                result.security_context = {
                    "severity": "HIGH" if any(w in message.lower() for w in ["brute", "attack", "malware", "escalat"]) else "MEDIUM",
                    "mitre_tactic": _infer_mitre(message),
                }
            return result
        except Exception as e:
            print(f"[Bedrock] Error: {e} — falling back to templates")

    # 3. Smart template fallback
    return _smart_template_fallback(mode, message, spl, error_message)


# ── Smart template fallback ────────────────────────────────────────────────────

def _smart_template_fallback(mode: QueryMode, message: str, spl: Optional[str], error_message: Optional[str]) -> SPLResult:
    msg_lower = (message or "").lower()

    if mode == QueryMode.generate:
        if "failed login" in msg_lower or "authentication fail" in msg_lower:
            q = "index=security (action=failure OR action=failed)\n| stats count by src_ip, user\n| sort -count\n| head 10"
            exp = "Searches the security index for failed login events, aggregates by source IP and user, sorted by count."
        elif "top" in msg_lower and ("ip" in msg_lower or "address" in msg_lower):
            q = "index=security action=failure\n| stats count by src_ip\n| sort -count\n| head 10"
            exp = "Finds the top source IPs with the most failed events — useful for identifying attack sources."
        elif "error" in msg_lower and ("web" in msg_lower or "http" in msg_lower or "500" in msg_lower):
            q = "index=web status>=500\n| stats count by uri, status\n| sort -count"
            exp = "Searches web logs for HTTP 5xx server errors, grouped by URI and status code."
        elif "slow" in msg_lower or "performance" in msg_lower or "latency" in msg_lower:
            q = "index=web\n| eval response_time=tonumber(response_time_ms)\n| stats avg(response_time) as avg_ms, max(response_time) as max_ms, p95(response_time) as p95_ms by uri\n| sort -avg_ms\n| head 20"
            exp = "Analyzes web request response times to identify slow endpoints using percentile statistics."
        elif "user" in msg_lower and ("activ" in msg_lower or "behav" in msg_lower):
            q = "index=security\n| stats count by user, action, src_ip\n| sort -count"
            exp = "Summarizes user activity including actions taken and source IPs."
        elif "disk" in msg_lower or "cpu" in msg_lower or "memory" in msg_lower:
            q = "index=os\n| stats avg(cpu_load_percent) as avg_cpu, avg(mem_used_percent) as avg_mem, avg(disk_used_percent) as avg_disk by host\n| sort -avg_cpu"
            exp = "Monitors system resource utilization (CPU, memory, disk) across hosts."
        else:
            q = f"index=main\n| search {message}\n| stats count by source\n| sort -count"
            exp = f"Generic search for: {message}. Refine by specifying an index and relevant fields."
        return SPLResult(spl=q, explanation=exp, confidence=0.75, ai_engine="Template Engine",
                         recommendations=["Specify a concrete index for better performance", "Add time range with earliest= and latest=", "Use field extractions to reduce scan volume"])

    elif mode == QueryMode.explain:
        cmds = re.findall(r"(?:^|\|)\s*(\w+)", spl or "")
        exps = [f"`{c}`: {SPL_COMMANDS[c]}" for c in cmds if c in SPL_COMMANDS]
        return SPLResult(spl=spl or "", explanation="Query breakdown:\n" + "\n".join(exps) if exps else "This query searches and processes Splunk events.",
                         confidence=0.90, ai_engine="Template Engine",
                         recommendations=["Add index filter for faster search", "Consider tstats for indexed field searches"])

    elif mode == QueryMode.optimize:
        recs, optimized = [], spl or ""
        if "index=*" in (spl or ""):
            recs.append("⚠️ Replace index=* with a specific index to dramatically reduce search time")
            optimized = optimized.replace("index=*", "index=main")
        if "| search" in (spl or ""):
            recs.append("💡 Move filter conditions before the pipe to reduce data early in the pipeline")
        if "| stats" in (spl or "") and "| eval" in (spl or ""):
            recs.append("💡 Perform eval before stats to reduce field computations")
        if not recs:
            recs = ["✅ Query structure looks efficient", "Consider summary indexes for frequently run reports"]
        return SPLResult(spl=spl or "", explanation="Performance analysis complete.", confidence=0.88, ai_engine="Template Engine",
                         recommendations=recs, optimized_spl=optimized if optimized != spl else None)

    elif mode == QueryMode.debug:
        fixes = {
            "stats": "Ensure stats has an aggregation function and by clause: `| stats count by field_name`",
            "eval": "Check eval syntax: `| eval new_field=expression`. Ensure string values are quoted.",
            "rex": "Verify regex is valid: `| rex field=_raw \"(?<name>pattern)\"`",
            "join": "Join requires matching field names and a valid subsearch.",
            "lookup": "Ensure lookup table exists and key field name matches.",
        }
        for cmd, fix in fixes.items():
            if cmd in (error_message or "").lower() or cmd in (spl or "").lower():
                return SPLResult(spl=spl or "", explanation=fix, confidence=0.85, ai_engine="Template Engine",
                                 recommendations=["Verify field names with `| fieldsummary`", "Test with a small time window first"])
        return SPLResult(spl=spl or "", explanation=f"Check field names, pipe syntax, and time range. Error: {error_message}",
                         confidence=0.70, ai_engine="Template Engine",
                         recommendations=["Use `| fieldsummary` to inspect available fields"])

    # Security fallback
    tmpl = SECURITY_TEMPLATES["suspicious_login"]
    return SPLResult(spl=tmpl["spl"], explanation=tmpl["description"], confidence=0.80, ai_engine="Template Engine",
                     recommendations=["Adjust thresholds for your baseline", "Add iplocation for geographic context"],
                     security_context={"severity": "HIGH", "mitre_tactic": "TA0001 - Initial Access"})
