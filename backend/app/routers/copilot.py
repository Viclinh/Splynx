from fastapi import APIRouter, HTTPException
from app.models import AIRequest, AIResponse, SearchRequest, SearchResponse
from app.services.ai_service import process_ai_request
from app.services.splunk_service import SplunkService
from app.models import QueryMode

router = APIRouter(prefix="/api", tags=["copilot"])


@router.post("/query", response_model=AIResponse)
async def process_query(req: AIRequest):
    """Main AI endpoint: generate, explain, optimize, debug, or security queries"""
    try:
        spl_result = await process_ai_request(
            mode=req.mode,
            message=req.message,
            spl=req.spl,
            error_message=req.error_message,
            history=req.conversation_history or [],
        )

        # Build threat summary for security mode
        threat_summary = None
        if req.mode == QueryMode.security and spl_result.security_context:
            threat_summary = {
                "severity": spl_result.security_context.get("severity", "MEDIUM"),
                "mitre_tactic": spl_result.security_context.get("mitre_tactic", "Unknown"),
                "recommended_actions": [
                    "Block suspicious IP addresses at the firewall",
                    "Reset credentials for affected accounts",
                    "Enable MFA for all privileged accounts",
                    "Review and audit authentication logs",
                    "Escalate to SOC team if confirmed breach",
                ],
            }

        return AIResponse(
            spl_result=spl_result,
            message=spl_result.explanation,
            mode=req.mode,
            threat_summary=threat_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def run_search(req: SearchRequest):
    """Execute SPL query against Splunk"""
    svc = SplunkService()
    try:
        result = await svc.search(req.spl, req.earliest_time, req.latest_time, req.max_results)
        return SearchResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Splunk search error: {str(e)}")
    finally:
        await svc.close()


@router.get("/indexes")
async def get_indexes():
    """Get available Splunk indexes"""
    svc = SplunkService()
    try:
        indexes = await svc.get_indexes()
        return {"indexes": indexes}
    except Exception as e:
        # Return demo indexes if Splunk not connected
        return {"indexes": ["main", "security", "web", "os", "endpoint", "network", "_internal"], "demo": True}
    finally:
        await svc.close()


@router.post("/validate")
async def validate_spl(body: dict):
    """Validate SPL syntax"""
    spl = body.get("spl", "")
    svc = SplunkService()
    try:
        result = await svc.validate_spl(spl)
        return result
    except Exception as e:
        return {"valid": None, "detail": "Splunk not connected - validation unavailable"}
    finally:
        await svc.close()


@router.get("/health")
async def health():
    """Health check + Splunk connectivity + AI engine status"""
    from app.config import get_settings
    cfg = get_settings()
    svc = SplunkService()
    splunk_ok = False
    try:
        await svc.get_indexes()
        splunk_ok = True
    except:
        pass
    finally:
        await svc.close()

    ai_engine = "Template Engine (Demo Mode)"
    if cfg.aitk_configured:
        ai_engine = "Splunk AI Toolkit (AITK)"
    elif cfg.bedrock_configured:
        ai_engine = "Amazon Bedrock (Claude)"

    return {
        "status": "ok",
        "splunk_connected": splunk_ok,
        "ai_engine": ai_engine,
        "aitk_configured": cfg.aitk_configured,
        "bedrock_configured": cfg.bedrock_configured,
    }
