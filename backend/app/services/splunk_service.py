import httpx
import asyncio
import json
from typing import Optional
from app.config import get_settings

settings = get_settings()


class SplunkService:
    def __init__(self):
        self.base_url = settings.splunk_base_url
        self.headers = {**settings.splunk_auth, "Content-Type": "application/x-www-form-urlencoded"}
        self.client = httpx.AsyncClient(verify=False, timeout=60.0)

    async def search(self, spl: str, earliest: str = "-24h", latest: str = "now", max_results: int = 100) -> dict:
        # Create search job
        resp = await self.client.post(
            f"{self.base_url}/services/search/jobs",
            headers=self.headers,
            data={"search": f"search {spl}", "earliest_time": earliest, "latest_time": latest, "output_mode": "json"},
        )
        resp.raise_for_status()
        sid = resp.json()["sid"]

        # Poll until done
        for _ in range(30):
            await asyncio.sleep(1)
            status_resp = await self.client.get(
                f"{self.base_url}/services/search/jobs/{sid}",
                headers={**settings.splunk_auth},
                params={"output_mode": "json"},
            )
            job = status_resp.json()["entry"][0]["content"]
            if job["dispatchState"] in ("DONE", "FAILED"):
                break

        if job["dispatchState"] == "FAILED":
            raise Exception(f"Splunk search failed: {job.get('messages', '')}")

        # Fetch results
        results_resp = await self.client.get(
            f"{self.base_url}/services/search/jobs/{sid}/results",
            headers={**settings.splunk_auth},
            params={"output_mode": "json", "count": max_results},
        )
        data = results_resp.json()
        results = data.get("results", [])
        fields = data.get("fields", [])
        field_names = [f["name"] for f in fields if not f["name"].startswith("_")]

        return {"results": results, "field_names": field_names, "total_count": int(job.get("resultCount", 0)), "search_id": sid, "status": "completed"}

    async def get_indexes(self) -> list:
        resp = await self.client.get(
            f"{self.base_url}/services/data/indexes",
            headers={**settings.splunk_auth},
            params={"output_mode": "json", "count": 50},
        )
        resp.raise_for_status()
        return [e["name"] for e in resp.json().get("entry", [])]

    async def validate_spl(self, spl: str) -> dict:
        """Parse/validate SPL without running"""
        resp = await self.client.post(
            f"{self.base_url}/services/search/parser",
            headers=self.headers,
            data={"q": f"search {spl}", "output_mode": "json"},
        )
        return {"valid": resp.status_code == 200, "detail": resp.text}

    async def close(self):
        await self.client.aclose()
